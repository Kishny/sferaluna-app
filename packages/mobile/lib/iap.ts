/**
 * Achat intégré Apple (iPhone uniquement).
 *
 * Le parcours :
 *   1. on demande au serveur l'identifiant d'achat du compte connecté
 *      (POST /api/apple/account-token) ;
 *   2. Apple affiche sa feuille de paiement et renvoie une preuve signée ;
 *   3. on envoie cette preuve au serveur (POST /api/apple/verify-purchase),
 *      qui la vérifie et active la formule ;
 *   4. seulement ensuite, on dit à Apple que l'achat est bien livré.
 *
 * L'app ne décide jamais elle-même qu'une membre est abonnée : c'est le
 * serveur qui le dit, après vérification de la preuve.
 *
 * Le module natif est chargé à la demande, pour que l'aperçu web, Android et
 * les anciennes versions installées (sans le module) continuent de démarrer.
 */

import { Platform } from 'react-native';
import { fetchAppleAccountToken, verifyApplePurchase, type CheckoutPlan, type ApplePurchaseResult } from './api';
import { ApiError } from './http';
import { DEMO_MODE } from './demoMode';

export const APPLE_PRODUCT_IDS: Record<CheckoutPlan, string> = {
  'essential-monthly': 'com.sferaluna.app.essentiel.mensuel',
  'premium-monthly': 'com.sferaluna.app.premium.mensuel',
  'elite-monthly': 'com.sferaluna.app.elite.mensuel',
};

const PLAN_BY_PRODUCT = Object.fromEntries(
  Object.entries(APPLE_PRODUCT_IDS).map(([plan, productId]) => [productId, plan as CheckoutPlan]),
) as Record<string, CheckoutPlan>;

/** L'achat intégré concerne l'iPhone ; le mode démo l'imite pour les aperçus. */
export const IAP_PLATFORM = Platform.OS === 'ios' || DEMO_MODE;

export type IapErrorKind =
  | 'cancelled' // la membre a fermé la feuille de paiement
  | 'pending' // achat en attente (validation parentale, banque…)
  | 'unavailable' // boutique injoignable ou module absent de cette version
  | 'other_account' // l'abonnement Apple appartient déjà à un autre compte SferaLuna
  | 'rejected' // le serveur a refusé la preuve
  | 'network' // preuve reçue mais serveur injoignable : rien n'est perdu
  | 'nothing_to_restore'
  | 'failed';

export class IapError extends Error {
  kind: IapErrorKind;
  constructor(kind: IapErrorKind, message: string) {
    super(message);
    this.name = 'IapError';
    this.kind = kind;
  }
}

export const IAP_MESSAGES: Record<IapErrorKind, string> = {
  cancelled: '',
  pending: 'Votre achat est en attente de validation. Votre formule s’activera dès qu’il sera confirmé.',
  unavailable: 'L’App Store est indisponible pour le moment. Réessayez dans un instant.',
  other_account: 'Cet abonnement Apple est déjà rattaché à un autre compte SferaLuna. Connectez-vous avec ce compte pour en profiter.',
  rejected: 'Nous n’avons pas pu valider cet achat. Si vous avez été débitée, touchez « Restaurer mes achats ».',
  network: 'Achat reçu, mais la connexion a été interrompue avant l’activation. Touchez « Restaurer mes achats » pour terminer.',
  nothing_to_restore: 'Aucun abonnement actif n’a été trouvé sur ce compte Apple.',
  failed: 'L’achat n’a pas abouti. Vous n’avez pas été débitée.',
};

export interface StorePlan {
  plan: CheckoutPlan;
  productId: string;
  /** Prix tel qu'Apple l'affiche pour le pays de la membre (ex. « 19,99 € »). */
  displayPrice: string;
}

type IapModule = typeof import('expo-iap');
type StorePurchase = import('expo-iap').Purchase;

let cached: IapModule | null | undefined;

function loadModule(): IapModule | null {
  if (Platform.OS !== 'ios') return null;
  if (cached === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cached = require('expo-iap') as IapModule;
    } catch {
      cached = null;
    }
  }
  return cached;
}

let connecting: Promise<IapModule> | null = null;

/** Ouvre la connexion à l'App Store (une seule fois, partagée). */
function connect(): Promise<IapModule> {
  if (!connecting) {
    connecting = (async () => {
      const iap = loadModule();
      if (!iap) throw new IapError('unavailable', IAP_MESSAGES.unavailable);
      try {
        await iap.initConnection();
      } catch {
        throw new IapError('unavailable', IAP_MESSAGES.unavailable);
      }
      return iap;
    })();
    // Un échec ne doit pas rester en mémoire : la tentative suivante repart de zéro.
    connecting.catch(() => { connecting = null; });
  }
  return connecting;
}

const DEMO_PLANS: StorePlan[] = [
  { plan: 'essential-monthly', productId: APPLE_PRODUCT_IDS['essential-monthly'], displayPrice: '9,99 €' },
  { plan: 'premium-monthly', productId: APPLE_PRODUCT_IDS['premium-monthly'], displayPrice: '19,99 €' },
  { plan: 'elite-monthly', productId: APPLE_PRODUCT_IDS['elite-monthly'], displayPrice: '34,99 €' },
];

/** Les formules en vente, avec le prix fourni par Apple. */
export async function fetchStorePlans(): Promise<StorePlan[]> {
  if (DEMO_MODE) return DEMO_PLANS;
  const iap = await connect();
  let products: Awaited<ReturnType<IapModule['fetchProducts']>>;
  try {
    products = await iap.fetchProducts({ skus: Object.values(APPLE_PRODUCT_IDS), type: 'subs' });
  } catch {
    throw new IapError('unavailable', IAP_MESSAGES.unavailable);
  }
  const plans: StorePlan[] = [];
  for (const product of products ?? []) {
    const plan = PLAN_BY_PRODUCT[product.id];
    if (plan && product.displayPrice) {
      plans.push({ plan, productId: product.id, displayPrice: product.displayPrice });
    }
  }
  return plans;
}

function isErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === code;
}

/**
 * Envoie la preuve d'achat au serveur puis, s'il l'a traitée, clôt la
 * transaction côté Apple. Tant qu'elle n'est pas close, Apple la représente :
 * une coupure réseau à ce moment-là se rattrape avec « Restaurer mes achats ».
 */
async function deliver(iap: IapModule, purchase: StorePurchase): Promise<ApplePurchaseResult> {
  const signedTransaction = purchase.purchaseToken;
  if (!signedTransaction) throw new IapError('rejected', IAP_MESSAGES.rejected);

  let result: ApplePurchaseResult;
  try {
    result = await verifyApplePurchase(signedTransaction);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === 'PURCHASE_BELONGS_TO_OTHER_ACCOUNT') {
        throw new IapError('other_account', IAP_MESSAGES.other_account);
      }
      if (error.status >= 400 && error.status < 500 && error.status !== 401 && error.status !== 429) {
        throw new IapError('rejected', IAP_MESSAGES.rejected);
      }
    }
    throw new IapError('network', IAP_MESSAGES.network);
  }

  try {
    await iap.finishTransaction({ purchase, isConsumable: false });
  } catch {
    // Sans gravité : la formule est activée, Apple représentera la transaction.
  }
  return result;
}

/** Lance l'achat d'une formule et renvoie l'état d'abonnement confirmé par le serveur. */
export async function purchasePlan(plan: CheckoutPlan): Promise<ApplePurchaseResult> {
  if (DEMO_MODE) throw new IapError('unavailable', 'Achat indisponible dans l’aperçu de démonstration.');
  const iap = await connect();

  // L'identifiant d'achat relie la transaction Apple au compte connecté : sans
  // lui, le serveur ne pourrait pas rattacher les renouvellements à la membre.
  let appAccountToken: string;
  try {
    appAccountToken = (await fetchAppleAccountToken()).appAccountToken;
  } catch {
    throw new IapError('failed', 'Connexion impossible. Vérifiez votre réseau et réessayez.');
  }

  let outcome: Awaited<ReturnType<IapModule['requestPurchase']>>;
  try {
    outcome = await iap.requestPurchase({
      request: {
        apple: {
          sku: APPLE_PRODUCT_IDS[plan],
          appAccountToken,
          andDangerouslyFinishTransactionAutomatically: false,
        },
      },
      type: 'subs',
    });
  } catch (error) {
    if (isErrorCode(error, 'user-cancelled')) throw new IapError('cancelled', '');
    if (isErrorCode(error, 'pending') || isErrorCode(error, 'deferred-payment')) {
      throw new IapError('pending', IAP_MESSAGES.pending);
    }
    throw new IapError('failed', IAP_MESSAGES.failed);
  }

  const purchase = Array.isArray(outcome) ? outcome[0] : outcome;
  if (!purchase || purchase.purchaseState === 'pending') {
    throw new IapError('pending', IAP_MESSAGES.pending);
  }
  return deliver(iap, purchase);
}

/**
 * Retrouve l'abonnement actif du compte Apple et le fait valider par le serveur.
 * `askApple` : demande à Apple de resynchroniser (peut afficher la connexion au
 * compte Apple) — réservé au bouton « Restaurer mes achats ».
 * Renvoie `null` s'il n'y a rien à restaurer.
 */
export async function restorePlan(askApple: boolean): Promise<ApplePurchaseResult | null> {
  if (DEMO_MODE) return null;
  const iap = await connect();

  let purchases: StorePurchase[];
  try {
    if (askApple) await iap.restorePurchases();
    purchases = await iap.getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
  } catch (error) {
    if (isErrorCode(error, 'user-cancelled')) throw new IapError('cancelled', '');
    throw new IapError('unavailable', IAP_MESSAGES.unavailable);
  }

  const ours = purchases
    .filter((purchase) => PLAN_BY_PRODUCT[purchase.productId] && purchase.purchaseToken)
    .sort((a, b) => (b.transactionDate ?? 0) - (a.transactionDate ?? 0));
  if (ours.length === 0) return null;

  return deliver(iap, ours[0]);
}

/** Ouvre la page « Abonnements » du compte Apple (changer de formule, résilier). */
export async function openAppleSubscriptions(): Promise<boolean> {
  const iap = loadModule();
  if (!iap) return false;
  try {
    await iap.deepLinkToSubscriptions();
    return true;
  } catch {
    return false;
  }
}
