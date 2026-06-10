/**
 * Authentification — pont vers NextAuth v4 (stratégie JWT, session cookie)
 * du backend SferaLuna existant. On réutilise les routes REST exposées
 * par NextAuth (`/api/auth/*`) plutôt que de réimplémenter l'auth côté mobile.
 *
 * Flux credentials (email + mot de passe) :
 *   1. GET  /api/auth/csrf            → { csrfToken }
 *   2. POST /api/auth/callback/credentials  (csrfToken, email, password, json: true)
 *   3. GET  /api/auth/session         → { user, expires } | {}
 *
 * OAuth (Google / Apple Sign In) : nécessite Expo AuthSession + la
 * configuration des bundle IDs / Services ID côté Google Cloud / Apple
 * Developer (voir CLAUDE.md du backend, section Apple Sign In). Tant que
 * cette configuration native n'est pas faite, les boutons Google/Apple
 * affichent un message explicite plutôt que d'échouer silencieusement.
 */
import { http, apiFetch, ApiError, API_BASE_URL } from './http';

export type AuthProvider = 'credentials' | 'google' | 'apple';
export type UserPlan = 'free' | 'essential-monthly' | 'premium-monthly' | 'elite-monthly';
export type SubscriptionStatus = 'inactive' | 'active' | 'trialing' | 'past_due' | 'canceled';
export type ProfileVisibility = 'public' | 'matches' | 'premium' | 'invisible';

export interface SessionUser {
  id: string;
  _id: string;
  email: string;
  name?: string;
  image?: string;
  pseudonyme: string;
  role: 'user' | 'admin';
  provider: AuthProvider;
  banned?: boolean;
  hasCompletedProfile: boolean;
  plan: UserPlan;
  isPremium: boolean;
  subscriptionStatus: SubscriptionStatus;
  premiumStartedAt?: string | null;
  premiumExpiresAt?: string | null;
  identityVerified?: boolean;
}

export interface Session {
  user: SessionUser;
  expires: string;
}

/**
 * Le Mode Fantôme (`visibilite: "invisible"`) est réservé aux abonnements
 * `premium-monthly` et `elite-monthly`. Règle métier stricte du backend
 * (voir src/models/User.ts et /api/users/visibility) — à ne jamais
 * contourner côté client.
 */
export function canUseGhostMode(plan: UserPlan | undefined | null): boolean {
  return plan === 'premium-monthly' || plan === 'elite-monthly';
}

/**
 * Libellé FR du plan d'abonnement, cohérent avec les noms affichés sur
 * l'écran /premium et avec `getPlanLabel` côté backend (buildPremiumPayload).
 */
const PLAN_LABELS: Record<UserPlan, string> = {
  free: 'Gratuit',
  'essential-monthly': 'Essentiel',
  'premium-monthly': 'Premium',
  'elite-monthly': 'Elite',
};

export function getPlanLabel(plan: UserPlan | undefined | null): string {
  if (!plan) return PLAN_LABELS.free;
  return PLAN_LABELS[plan] ?? PLAN_LABELS.free;
}

/**
 * `true` si le plan est l'un des trois abonnements payants (par opposition
 * au plan gratuit). Utile pour afficher un badge ou un statut d'abonnement
 * même dans les cas limites où `isPremium` côté serveur serait `false`
 * (ex. abonnement `past_due` / `canceled` mais plan encore renseigné).
 */
export function isPaidPlan(plan: UserPlan | undefined | null): boolean {
  return plan === 'essential-monthly' || plan === 'premium-monthly' || plan === 'elite-monthly';
}

/**
 * Libellé FR du statut d'abonnement, cohérent avec `getSubscriptionStatusLabel`
 * côté backend (buildPremiumPayload dans /api/users/profile).
 */
const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  inactive: 'Inactif',
  active: 'Actif',
  trialing: "Période d'essai",
  past_due: 'Paiement en retard',
  canceled: 'Annulé',
};

export function getSubscriptionStatusLabel(status: SubscriptionStatus | undefined | null): string {
  if (!status) return SUBSCRIPTION_STATUS_LABELS.inactive;
  return SUBSCRIPTION_STATUS_LABELS[status] ?? SUBSCRIPTION_STATUS_LABELS.inactive;
}

/** Formate une date ISO en "12 juin 2026" (locale FR), ou `null` si absente/invalide. */
export function formatFrDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function getCsrfToken(): Promise<string> {
  const data = await http.get<{ csrfToken: string }>('/api/auth/csrf');
  return data.csrfToken;
}

/**
 * Connexion par email + mot de passe via le provider Credentials de NextAuth.
 * Le cookie de session est posé automatiquement par le backend et conservé
 * par le moteur réseau natif (voir lib/http.ts).
 */
export async function signInWithCredentials(email: string, password: string): Promise<Session> {
  const csrfToken = await getCsrfToken();

  const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/auth/callback/credentials?json=true`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, email, password, json: 'true' }).toString(),
  });

  if (!res.ok) {
    throw new ApiError('Email ou mot de passe incorrect.', res.status, 'INVALID_CREDENTIALS');
  }

  const session = await getSession();

  if (!session) {
    throw new ApiError('Email ou mot de passe incorrect.', 401, 'INVALID_CREDENTIALS');
  }

  return session;
}

/** Crée un compte (email + mot de passe). Une vérification d'email est ensuite requise. */
export async function registerWithCredentials(name: string, email: string, password: string) {
  return apiFetch<{ success: boolean; message: string }>('/api/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
}

/** Récupère la session courante (null si non connecté). */
export async function getSession(): Promise<Session | null> {
  const data = await http.get<Partial<Session>>('/api/auth/session');
  if (!data || !data.user) return null;
  return data as Session;
}

/** Déconnexion : invalide le cookie de session côté serveur. */
export async function signOut(): Promise<void> {
  const csrfToken = await getCsrfToken();
  await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/auth/signout?json=true`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, json: 'true' }).toString(),
  });
}

/**
 * Connexion Google (natif iOS + Android).
 *
 * Flow :
 *   1. expo-auth-session ouvre Google OAuth dans le navigateur système
 *   2. Google retourne un code → échangé contre un id_token
 *   3. L'id_token est envoyé à /api/auth/mobile-signin (backend SferaLuna)
 *   4. Le backend vérifie le token, forge un cookie de session NextAuth
 *
 * Prérequis (à configurer dans Google Cloud Console) :
 *   - Client OAuth iOS avec bundle ID `com.sferaluna.app`
 *   - Client OAuth Android avec le SHA-1 du keystore
 *   - Client OAuth Web (pour expo-auth-session en web fallback)
 *   - Les client IDs doivent être mis en EXPO_PUBLIC_GOOGLE_CLIENT_ID_*
 */
export async function signInWithGoogle(): Promise<Session> {
  // @ts-ignore — expo-auth-session installé via bun install
  const { makeRedirectUri } = await import('expo-auth-session');
  const WebBrowser = await import('expo-web-browser');
  await WebBrowser.maybeCompleteAuthSession();

  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
  };

  const redirectUri = makeRedirectUri({ scheme: 'sferaluna', path: 'auth' });

  const clientId =
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_NATIVE ??
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ??
    '';

  if (!clientId) {
    throw new ApiError(
      "EXPO_PUBLIC_GOOGLE_CLIENT_ID_NATIVE non configuré. Ajoutez-le dans .env.",
      501,
      'PROVIDER_NOT_CONFIGURED'
    );
  }

  const result = await WebBrowser.openAuthSessionAsync(
    `https://accounts.google.com/o/oauth2/v2/auth?` +
      new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        prompt: 'select_account',
      }).toString(),
    redirectUri
  );

  if (result.type !== 'success') {
    throw new ApiError('Connexion Google annulée.', 0, 'CANCELLED');
  }

  const params = new URL(result.url).searchParams;
  const code = params.get('code');
  if (!code) throw new ApiError('Code OAuth Google manquant.', 400, 'OAUTH_ERROR');

  // Échange du code contre un id_token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!tokenRes.ok) throw new ApiError("Échange du code Google échoué.", 401, 'OAUTH_ERROR');
  const tokens = await tokenRes.json() as { id_token?: string };
  if (!tokens.id_token) throw new ApiError("id_token Google absent.", 401, 'OAUTH_ERROR');

  return _mobileSignIn({ provider: 'google', idToken: tokens.id_token });
}

/**
 * Connexion Apple Sign In (iOS uniquement — expo-apple-authentication).
 * Sur Android, lève une erreur explicite.
 */
export async function signInWithApple(): Promise<Session> {
  const Platform = await import('react-native').then((m) => m.Platform);
  if (Platform.OS !== 'ios') {
    throw new ApiError(
      "Apple Sign In est disponible uniquement sur iOS.",
      400,
      'APPLE_IOS_ONLY'
    );
  }

  // @ts-ignore — expo-apple-authentication installé via bun install
  const AppleAuthentication = await import('expo-apple-authentication');
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new ApiError("identityToken Apple absent.", 401, 'APPLE_ERROR');
  }

  const name = [
    credential.fullName?.givenName,
    credential.fullName?.familyName,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return _mobileSignIn({
    provider: 'apple',
    identityToken: credential.identityToken,
    email: credential.email ?? undefined,
    name,
  });
}

/** Appelle le backend /api/auth/mobile-signin et retourne la session. */
async function _mobileSignIn(
  body:
    | { provider: 'google'; idToken: string }
    | { provider: 'apple'; identityToken: string; email?: string; name?: string }
): Promise<Session> {
  const res = await apiFetch<{ success: true; user: SessionUser }>(
    '/api/auth/mobile-signin',
    { method: 'POST', body }
  );

  const session = await getSession();
  if (!session) {
    throw new ApiError('Session introuvable après authentification.', 500, 'SESSION_ERROR');
  }
  return session;
}

/**
 * Point d'entrée unifié (rétrocompatibilité login.tsx).
 * Redirige vers signInWithGoogle() ou signInWithApple().
 */
export async function signInWithProvider(provider: 'google' | 'apple'): Promise<Session> {
  if (provider === 'google') return signInWithGoogle();
  return signInWithApple();
}
