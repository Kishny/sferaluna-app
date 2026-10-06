/**
 * ─────────────────────────────────────────────────────────────
 *  SferaLuna — Mode capture (démo pour les captures App Store)
 * ─────────────────────────────────────────────────────────────
 *
 *  Quand EXPO_PUBLIC_DEMO_MODE=1, toutes les requêtes GET de l'app
 *  sont servies depuis lib/demoData.ts au lieu de taper le backend.
 *  Objectif : remplir les écrans de contenu fictif crédible pour les
 *  captures d'écran (aucun appel réseau, aucune donnée réelle).
 *
 *  Les mutations (POST/PUT/PATCH/DELETE) renvoient un succès neutre
 *  pour que l'UI reste stable pendant les captures.
 *
 *  ⚠️  À n'utiliser QUE pour les captures. Ne jamais publier un build
 *      de production avec ce flag activé.
 *
 *  Activation :   EXPO_PUBLIC_DEMO_MODE=1 bun run web
 *  Désactivation : retirer la variable (comportement normal, API réelle)
 */
import {
  demoMyProfile,
  demoProfilesResponse,
  demoProfiles,
  demoMatches,
  demoMessagesResponse,
  demoNotifications,
  demoVibesResponse,
  demoMentorResponse,
  demoEventsResponse,
  demoCircleResponse,
  demoVisitorsResponse,
  demoVibePlansResponse,
  demoSession,
  demoCommunityResponse,
} from './demoData';
import type { PublicProfileFull } from './api';

export const DEMO_MODE: boolean =
  process.env.EXPO_PUBLIC_DEMO_MODE === '1' ||
  process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

type Query = Record<string, string | number | boolean | undefined | null> | undefined;

/** Sentinelle : requête non gérée explicitement → succès neutre. */
const NEUTRAL_OK = { success: true } as const;

function fullProfile(userId: string): { success: true; profile: PublicProfileFull } {
  const base = demoProfiles.find((p) => p._id === userId) ?? demoProfiles[0];
  return {
    success: true,
    profile: {
      ...base,
      bio: "Amoureuse des choses simples et des conversations qui durent jusqu'au bout de la nuit. Je crois aux rencontres sincères. 🌙",
      orientation: 'Hétérosexuelle',
      question: 'Ce qui compte pour moi',
    },
  };
}

/**
 * Résout une requête en mode démo.
 * @returns la réponse fictive typée (toujours, quand DEMO_MODE est actif).
 */
/**
 * État d'abonnement fictif. Par défaut : abonnée Premium via l'App Store (comme
 * demoMyProfile). EXPO_PUBLIC_DEMO_SUB=none | stripe pour voir les autres écrans.
 */
function demoSubscriptionStatus() {
  const mode = process.env.EXPO_PUBLIC_DEMO_SUB;
  const subscribed = mode !== 'none';
  return {
    success: true,
    subscription: {
      plan: subscribed ? 'premium-monthly' : 'free',
      planLabel: subscribed ? 'Premium' : 'Gratuit',
      isPremium: subscribed,
      subscriptionStatus: subscribed ? 'active' : 'inactive',
      premiumExpiresAt: subscribed ? demoMyProfile.premium.premiumExpiresAt : null,
      source: !subscribed ? null : mode === 'stripe' ? 'stripe' : 'apple',
      cancelAtPeriodEnd: false,
    },
  };
}

export function resolveDemoRequest<T>(
  path: string,
  method: string,
  query: Query,
): T {
  // On ignore le query-string éventuel présent dans le path.
  const clean = path.split('?')[0].replace(/\/+$/, '');

  // ── Mutations : succès neutre (like, visite, visibilité, etc.) ──
  if (method !== 'GET') {
    if (clean === '/api/likes') return { success: true, matched: false } as T;
    if (clean === '/api/users/visibility') {
      return { success: true, visibilite: 'invisible' } as T;
    }
    return NEUTRAL_OK as T;
  }

  // ── Lectures ──
  // Session « connectée » : indispensable pour que le splash mène aux écrans
  // authentifiés (et donc aux captures) au lieu de l'écran de connexion.
  if (clean === '/api/auth/session') return demoSession as T;
  if (clean === '/api/users/profile') return demoMyProfile as T;
  if (clean === '/api/subscription/status') return demoSubscriptionStatus() as T;
  if (clean === '/api/profiles') return demoProfilesResponse as T;
  if (clean.startsWith('/api/profiles/')) {
    const id = clean.slice('/api/profiles/'.length);
    return fullProfile(id) as T;
  }
  if (clean === '/api/matches') {
    return { success: true, matches: demoMatches, metadata: { total: demoMatches.length } } as T;
  }
  if (clean.startsWith('/api/messages/')) {
    const matchId = clean.slice('/api/messages/'.length);
    return demoMessagesResponse(matchId) as T;
  }
  if (clean === '/api/notifications') return demoNotifications as T;
  if (clean === '/api/vibesphere') return demoVibesResponse as T;
  if (clean === '/api/vibementor') return demoMentorResponse as T;
  if (clean === '/api/events') return demoEventsResponse as T;
  if (clean === '/api/community') return demoCommunityResponse as T;
  if (clean === '/api/circle') return demoCircleResponse as T;
  if (clean === '/api/visitors') return demoVisitorsResponse as T;
  if (clean === '/api/vibeplanner') {
    const matchId = query?.matchId != null ? String(query.matchId) : undefined;
    return demoVibePlansResponse(matchId) as T;
  }

  // Route non gérée → succès neutre (évite tout crash pendant les captures).
  return NEUTRAL_OK as T;
}
