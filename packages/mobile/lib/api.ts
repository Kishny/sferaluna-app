/**
 * Client API typé pour le backend SferaLuna existant
 * (/Users/jeyko.dev/Projects/sferaluna — Next.js App Router, MongoDB,
 * réutilisé tel quel, ne pas recréer).
 *
 * Toutes les routes nécessitent une session NextAuth valide (cookie posé
 * via lib/auth.ts) ; `http` (lib/http.ts) l'envoie automatiquement.
 */
import { http, apiFetch, API_BASE_URL } from './http';
import type { ProfileVisibility, UserPlan, SubscriptionStatus } from './auth';

// ─────────────────────────────────────────────
// Types partagés (alignés sur src/models/User.ts)
// ─────────────────────────────────────────────

export interface PublicProfile {
  _id: string;
  pseudonyme: string;
  age?: number;
  localisation?: string;
  interets: string[];
  intentions: string[];
  visibilite: ProfileVisibility;
  image?: string;
  photos?: string[];
  identityVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MatchUser {
  _id: string;
  pseudonyme: string;
  age?: number;
  localisation?: string;
  interets: string[];
  intentions: string[];
  image?: string;
  identityVerified?: boolean;
  visibilite: ProfileVisibility;
  hasCompletedProfile: boolean;
  updatedAt?: string;
}

export interface MatchSummary {
  matchId: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  isActive: boolean;
  user: MatchUser | null;
}

export interface ChatMessage {
  _id: string;
  matchId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsSummary {
  total: number;
  unreadMessages: number;
  newMatches: number;
  newVisits: number;
  since: string;
}

// ─────────────────────────────────────────────
// Découverte / matching
// GET  /api/profiles, POST /api/likes, POST /api/visitors
// ─────────────────────────────────────────────

export interface ProfilesResponse {
  profiles: PublicProfile[];
  pagination: { total: number; page: number; limit: number; totalPages: number; hasMore: boolean };
  filters: { userIsPremium: boolean; ageMin: number; ageMax: number };
}

export interface DiscoverFilters {
  ageMin?: number;
  ageMax?: number;
  intentions?: string[];
  localisation?: string;
  /** Réservé premium-monthly / elite-monthly côté backend (ignoré sinon) */
  orientation?: string;
  /** Réservé premium-monthly / elite-monthly côté backend (ignoré sinon) */
  actifRecemment?: boolean;
}

export function fetchProfiles(params?: { page?: number; limit?: number } & DiscoverFilters) {
  return http.get<{ success: true } & ProfilesResponse>('/api/profiles', {
    page: params?.page,
    limit: params?.limit,
    localisation: params?.localisation,
    age_min: params?.ageMin,
    age_max: params?.ageMax,
    intentions: params?.intentions?.length ? params.intentions.join(',') : undefined,
    orientation: params?.orientation,
    actif_recemment: params?.actifRecemment ? 'true' : undefined,
  });
}

export interface LikeResult {
  matched: boolean;
  matchId?: string;
}

/** POST /api/likes { targetUserId } → { matched, matchId? } — un match mutuel crée une conversation. */
export function likeProfile(targetUserId: string) {
  return http.post<{ success: true } & LikeResult>('/api/likes', { targetUserId });
}

/** POST /api/visitors { visitedUserId } — enregistre automatiquement la visite d'un profil. */
export function recordProfileVisit(visitedUserId: string) {
  return http.post<{ success: true }>('/api/visitors', { visitedUserId });
}

// ─────────────────────────────────────────────
// Matches & messagerie
// GET /api/matches, GET/POST /api/messages/[matchId]
// ─────────────────────────────────────────────

export function fetchMatches() {
  return http.get<{ success: true; matches: MatchSummary[]; metadata: { total: number } }>('/api/matches');
}

export interface MessagesResponse {
  messages: ChatMessage[];
  currentUserId: string;
  otherUserId: string | null;
  hasMore: boolean;
  pagination: { limit: number; before: string | null; nextBefore: string | null };
}

export function fetchMessages(matchId: string, params?: { before?: string; limit?: number }) {
  return http.get<{ success: true } & MessagesResponse>(`/api/messages/${matchId}`, {
    before: params?.before,
    limit: params?.limit,
  });
}

/** POST /api/messages/[matchId] { content } — diffusé en temps réel via Pusher (canal private-match-{matchId}). */
export function sendMessage(matchId: string, content: string) {
  return http.post<{ success: true; message: ChatMessage }>(`/api/messages/${matchId}`, { content });
}

// ─────────────────────────────────────────────
// Notifications
// GET/POST /api/notifications
// ─────────────────────────────────────────────

export function fetchNotificationsSummary() {
  return http.get<{ success: true } & NotificationsSummary>('/api/notifications');
}

/** Marque les notifications comme vues (met à jour lastSeenNotificationsAt). */
export function markNotificationsSeen() {
  return http.post<{ success: true }>('/api/notifications');
}

// ─────────────────────────────────────────────
// Profil utilisateur
// GET/PUT /api/users/profile, POST /api/users/visibility, POST /api/users/update-profile
// ─────────────────────────────────────────────

export interface PremiumPayload {
  plan: UserPlan;
  isPremium: boolean;
  subscriptionStatus: SubscriptionStatus;
  premiumStartedAt?: string | null;
  premiumExpiresAt?: string | null;
}

export function fetchMyProfile() {
  return http.get<{
    success: true;
    user: Record<string, unknown> & { _id: string; pseudonyme: string; visibilite: ProfileVisibility };
    premium: PremiumPayload;
    metadata: {
      profileCompletion: { percentage: number; completedFields: string[]; missingFields: string[] };
      lastUpdated: string;
    };
  }>('/api/users/profile');
}

export function updateMyProfile(payload: Record<string, unknown>) {
  return http.put<{ success: true; user: Record<string, unknown> }>('/api/users/profile', payload);
}

/**
 * Change la visibilité du profil. Le backend refuse "invisible" pour les
 * plans free / essential-monthly (règle métier serveur — voir canUseGhostMode
 * dans lib/auth.ts pour anticiper côté UI et éviter un aller-retour inutile).
 */
export function updateVisibility(visibilite: ProfileVisibility) {
  return http.put<{ success: true; visibilite: ProfileVisibility; message?: string }>(
    '/api/users/visibility',
    { visibilite }
  );
}

// ─────────────────────────────────────────────
// Abonnement & paiement (Stripe — réutilisé tel quel)
// `isPremium` est calculé serveur, jamais piloté côté client.
// ─────────────────────────────────────────────

export type CheckoutPlan = 'essential-monthly' | 'premium-monthly' | 'elite-monthly';

/** POST /api/stripe/create-checkout-session { plan } → { url } : ouvrir l'URL dans une WebView/navigateur. */
/**
 * `withdrawalWaiver` : le serveur refuse le paiement tant que la membre n'a pas
 * expressément demandé l'accès immédiat et renoncé à son droit de rétractation
 * (même case à cocher que sur la page de paiement du site).
 */
export function createCheckoutSession(plan: CheckoutPlan, withdrawalWaiver: boolean) {
  return http.post<{ success: true; url: string }>('/api/stripe/create-checkout-session', { plan, withdrawalWaiver });
}

export function fetchSubscriptionStatus() {
  return http.get<{
    success: true;
    plan: UserPlan;
    isPremium: boolean;
    subscriptionStatus: SubscriptionStatus;
    label: string;
    features: Record<string, unknown>;
    limits: Record<string, unknown>;
  }>('/api/subscription/status');
}

export function cancelSubscription() {
  return http.post<{ success: true }>('/api/stripe/cancel');
}

export function pauseSubscription() {
  return http.post<{ success: true }>('/api/stripe/pause');
}

export function reactivateSubscription() {
  return http.post<{ success: true }>('/api/stripe/reactivate');
}

// ─────────────────────────────────────────────
// Sécurité du compte (Stripe Identity + reset mot de passe — backend existant)
// ─────────────────────────────────────────────

/**
 * POST /api/identity-verification → crée une session Stripe Identity et
 * renvoie une URL HÉBERGÉE par Stripe (pas un client_secret malgré ce que
 * laisse penser le code backend) à ouvrir dans un navigateur — flux
 * hosted-redirect, pas de SDK natif Stripe Identity côté mobile.
 * Le `return_url` Stripe pointe vers ${NEXT_PUBLIC_APP_URL}/mon-compte côté web.
 */
export function createIdentityVerificationSession() {
  return http.post<{ url: string; sessionId: string }>('/api/identity-verification');
}

/**
 * POST /api/auth/reset-password { email } → envoie un email (Resend) avec un
 * lien de réinitialisation (token valable 1h, uniquement pour les comptes
 * provider "credentials"). Réponse anti-énumération : toujours `success: true`,
 * que le compte existe ou non.
 */
export function requestPasswordReset(email: string) {
  return http.post<{ success: true; message: string }>('/api/auth/reset-password', { email });
}

// ─────────────────────────────────────────────
// Circle of Six
// GET /api/circle → 6 profils curatés/semaine
// ─────────────────────────────────────────────

export interface CircleProfile {
  _id: string;
  pseudonyme: string;
  age?: number;
  localisation?: string;
  interets: string[];
  intentions: string[];
  image?: string;
  identityVerified?: boolean;
  visibilite: ProfileVisibility;
  hasCompletedProfile: boolean;
  compatibilityScore: number;
  compatibilityHints: string[];
}

export function fetchCircle() {
  return http.get<{ success: true; profiles: CircleProfile[]; weekOf: string }>('/api/circle');
}

// ─────────────────────────────────────────────
// VibeSphere — feed social d'humeurs
// GET /api/vibesphere, POST /api/vibesphere, POST /api/vibesphere/[id] (like)
// ─────────────────────────────────────────────

export type VibeMood =
  | 'joyeuse' | 'sereine' | 'mélancolique' | 'amoureuse'
  | 'curieuse' | 'fière' | 'mystérieuse';

export const VIBE_MOODS: { mood: VibeMood; emoji: string; label: string }[] = [
  { mood: 'joyeuse',       emoji: '🌸', label: 'Joyeuse'       },
  { mood: 'sereine',       emoji: '🌙', label: 'Sereine'        },
  { mood: 'mélancolique',  emoji: '🌧️', label: 'Mélancolique'   },
  { mood: 'amoureuse',     emoji: '💕', label: 'Amoureuse'      },
  { mood: 'curieuse',      emoji: '✨', label: 'Curieuse'       },
  { mood: 'fière',         emoji: '🌟', label: 'Fière'          },
  { mood: 'mystérieuse',   emoji: '🔮', label: 'Mystérieuse'    },
];

export interface VibeAuthor {
  _id: string;
  pseudonyme: string;
  image?: string;
  age?: number;
  identityVerified?: boolean;
}

export interface VibePost {
  _id: string;
  userId: VibeAuthor;
  content: string;
  mood: VibeMood;
  emoji: string;
  likesCount: number;
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

export function fetchVibesphere(params?: { before?: string; limit?: number }) {
  return http.get<{ success: true; posts: VibePost[]; hasMore: boolean; pagination: { nextBefore: string | null } }>(
    '/api/vibesphere', { before: params?.before, limit: params?.limit }
  );
}

export function createVibe(payload: { content: string; mood: VibeMood; emoji: string }) {
  return http.post<{ success: true; post: VibePost }>('/api/vibesphere', payload);
}

export function toggleVibelike(postId: string) {
  return http.post<{ success: true; liked: boolean; likesCount: number }>(`/api/vibesphere/${postId}`, { action: 'like' });
}

// ─────────────────────────────────────────────
// VibeMentor — Q&A communauté
// GET /api/vibementor, POST /api/vibementor, POST /api/vibementor/[id]
// ─────────────────────────────────────────────

export type MentorCategory =
  | 'premier-contact' | 'profil' | 'rencontre' | 'relation' | 'securite' | 'autre';

export const MENTOR_CATEGORIES: { value: MentorCategory | 'all'; label: string; emoji: string }[] = [
  { value: 'all',            label: 'Tout',           emoji: '✨' },
  { value: 'premier-contact', label: 'Premier contact', emoji: '💬' },
  { value: 'profil',         label: 'Profil',         emoji: '🌸' },
  { value: 'rencontre',      label: 'Rencontre',      emoji: '🌙' },
  { value: 'relation',       label: 'Relation',       emoji: '💕' },
  { value: 'securite',       label: 'Sécurité',       emoji: '🛡️' },
  { value: 'autre',          label: 'Autre',          emoji: '🔮' },
];

export interface MentorAnswer {
  _id: string;
  userId: { _id: string; pseudonyme: string; image?: string };
  content: string;
  likes: string[];
  isAccepted: boolean;
  createdAt: string;
}

export interface MentorPost {
  _id: string;
  userId: { _id: string; pseudonyme: string; image?: string };
  question: string;
  category: MentorCategory;
  answers: MentorAnswer[];
  likesCount: number;
  likedByMe: boolean;
  answersCount: number;
  isSolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export function fetchVibementor(params?: { category?: MentorCategory | 'all'; before?: string; limit?: number }) {
  return http.get<{ success: true; posts: MentorPost[]; hasMore: boolean }>(
    '/api/vibementor', {
      category: params?.category && params.category !== 'all' ? params.category : undefined,
      before: params?.before,
      limit: params?.limit,
    }
  );
}

export function createMentorQuestion(payload: { question: string; category: MentorCategory }) {
  return http.post<{ success: true; post: MentorPost }>('/api/vibementor', payload);
}

export function answerMentorQuestion(postId: string, content: string) {
  return http.post<{ success: true }>(`/api/vibementor/${postId}`, { action: 'answer', content });
}

export function likeMentorQuestion(postId: string) {
  return http.post<{ success: true; liked: boolean }>(`/api/vibementor/${postId}`, { action: 'like' });
}

// ─────────────────────────────────────────────
// VibePlanner — propositions de rendez-vous
// GET /api/vibeplanner, POST /api/vibeplanner, PATCH /api/vibeplanner
// ─────────────────────────────────────────────

export type VibePlanStatus = 'pending' | 'accepted' | 'rejected';

export const VIBEPLAN_CATEGORIES: { value: string; label: string; emoji: string }[] = [
  { value: 'cafe',        label: 'Café',        emoji: '☕' },
  { value: 'restaurant',  label: 'Restaurant',  emoji: '🍽️' },
  { value: 'balade',      label: 'Balade',      emoji: '🌿' },
  { value: 'culture',     label: 'Culture',     emoji: '🎨' },
  { value: 'appel-video', label: 'Appel vidéo', emoji: '💻' },
  { value: 'autre',       label: 'Autre',       emoji: '✨' },
];

export interface VibePlan {
  _id: string;
  matchId: string | { _id: string; user1Id: string; user2Id: string };
  proposedById: { _id: string; pseudonyme: string; image?: string };
  title: string;
  description: string;
  category: string;
  emoji: string;
  scheduledAt?: string | null;
  status: VibePlanStatus;
  createdAt: string;
  updatedAt: string;
}

export function fetchVibeplanner(matchId?: string) {
  return http.get<{ success: true; plans: VibePlan[] }>(
    '/api/vibeplanner', matchId ? { matchId } : undefined
  );
}

export function createVibePlan(payload: {
  matchId: string;
  title: string;
  description: string;
  category: string;
  emoji: string;
  scheduledAt?: string | null;
}) {
  return http.post<{ success: true; plan: VibePlan }>('/api/vibeplanner', payload);
}

export function updateVibePlanStatus(planId: string, status: VibePlanStatus) {
  return http.patch<{ success: true; plan: VibePlan }>('/api/vibeplanner', { planId, status });
}

// ─────────────────────────────────────────────
// Profil public d'une utilisatrice
// ─────────────────────────────────────────────

export interface PublicProfileFull extends PublicProfile {
  bio?: string;
  orientation?: string;
  question?: string;
  // reponse intentionnellement absent (privé)
}

export function fetchPublicProfile(userId: string) {
  return http.get<{ success: true; profile: PublicProfileFull }>(`/api/profiles/${userId}`);
}

// ─────────────────────────────────────────────
// Visiteurs de profil (Premium)
// ─────────────────────────────────────────────

export interface ProfileVisitor {
  visitorId: string;
  pseudonyme: string;
  image?: string;
  identityVerified?: boolean;
  visitedAt: string;
}

/** Visite telle que renvoyée par GET /api/visitors. */
interface ServerVisit {
  user?: { _id: string; pseudonyme?: string; image?: string; identityVerified?: boolean };
  lastVisit?: string;
  // Ancienne forme à plat, encore servie par le mode démo.
  visitorId?: string;
  pseudonyme?: string;
  image?: string;
  identityVerified?: boolean;
  visitedAt?: string;
}

/** Réservé aux formules Premium et Elite côté serveur (403 sinon). */
export async function fetchVisitors() {
  const res = await http.get<{ success: true; visitors: ServerVisit[] }>('/api/visitors');
  const visitors: ProfileVisitor[] = (res.visitors ?? []).map((v) => ({
    visitorId: v.user?._id ?? v.visitorId ?? '',
    pseudonyme: v.user?.pseudonyme ?? v.pseudonyme ?? '',
    image: v.user?.image || v.image || undefined,
    identityVerified: v.user?.identityVerified ?? v.identityVerified,
    visitedAt: v.lastVisit ?? v.visitedAt ?? '',
  })).filter((v) => v.visitorId);
  return { success: true as const, visitors };
}

// ─────────────────────────────────────────────
// Événements Luna
// ─────────────────────────────────────────────

export interface LunaEvent {
  _id: string;
  title: string;
  description: string;
  date: string;          // ISO
  location: string;
  capacity?: number;
  registeredCount: number;
  isRegistered: boolean; // côté client, calculé par le backend
  imageUrl?: string;
  createdAt: string;
}

/** Événement tel que renvoyé par GET /api/events (noms de champs du serveur). */
type ServerEvent = Omit<LunaEvent, 'registeredCount' | 'capacity'> & {
  attendeeCount?: number;
  maxAttendees?: number;
  registeredCount?: number;
  capacity?: number;
};

export async function fetchEvents() {
  const res = await http.get<{ success: true; events: ServerEvent[] }>('/api/events');
  const events: LunaEvent[] = (res.events ?? []).map((e) => ({
    ...e,
    registeredCount: e.attendeeCount ?? e.registeredCount ?? 0,
    capacity: e.maxAttendees ?? e.capacity,
  }));
  return { success: true as const, events };
}

export async function toggleEventRegistration(eventId: string) {
  const res = await http.post<{
    success: true; registered?: boolean; attendeeCount?: number; isRegistered?: boolean; registeredCount?: number;
  }>(`/api/events/${eventId}`);
  return {
    success: true as const,
    isRegistered: res.registered ?? res.isRegistered ?? false,
    registeredCount: res.attendeeCount ?? res.registeredCount ?? 0,
  };
}

// ─────────────────────────────────────────────
// Communauté Luna
// ─────────────────────────────────────────────

// Catégories : mêmes valeurs que le serveur (models/CommunityPost) et le site.
export type CommunityCategory =
  | 'general'
  | 'conseils'
  | 'sorties'
  | 'bien-etre'
  | 'humour'
  | 'rencontres';

export const COMMUNITY_CATEGORIES: { value: CommunityCategory | 'all'; label: string; emoji: string }[] = [
  { value: 'all',        label: 'Tout',       emoji: '🌙' },
  { value: 'general',    label: 'Général',    emoji: '💬' },
  { value: 'conseils',   label: 'Conseils',   emoji: '💡' },
  { value: 'sorties',    label: 'Sorties',    emoji: '🎉' },
  { value: 'bien-etre',  label: 'Bien-être',  emoji: '🌿' },
  { value: 'humour',     label: 'Humour',     emoji: '😄' },
  { value: 'rencontres', label: 'Rencontres', emoji: '🤝' },
];

export interface CommunityComment {
  _id: string;
  authorId: string;
  authorName: string;
  authorImage?: string;
  content: string;
  createdAt: string;
}

export interface CommunityPost {
  _id: string;
  authorId: string;
  authorName: string;
  authorImage?: string;
  identityVerified?: boolean;
  title: string;
  content: string;
  category: CommunityCategory;
  likesCount: number;
  isLiked: boolean;
  isPinned: boolean;
  comments: CommunityComment[];
  createdAt: string;
}

/** Auteur tel que peuplé par le serveur (`userId`), ou simple identifiant. */
type ServerAuthor = { _id?: string; pseudonyme?: string; image?: string; identityVerified?: boolean } | string | null | undefined;

interface ServerCommunityPost {
  _id: string;
  userId?: ServerAuthor;
  title?: string;
  content: string;
  category: CommunityCategory;
  likes?: string[];
  likesCount?: number;
  likedByMe?: boolean;
  isPinned?: boolean;
  comments?: { _id: string; userId?: ServerAuthor; content: string; createdAt: string }[];
  createdAt: string;
}

function authorOf(author: ServerAuthor) {
  if (author && typeof author === 'object') {
    return { id: author._id ?? '', name: author.pseudonyme || 'Membre', image: author.image || undefined, verified: author.identityVerified };
  }
  return { id: typeof author === 'string' ? author : '', name: 'Membre', image: undefined, verified: undefined };
}

/** Convertit un post du serveur vers la forme utilisée par les écrans. */
function toCommunityPost(post: ServerCommunityPost): CommunityPost {
  const author = authorOf(post.userId);
  return {
    _id: post._id,
    authorId: author.id,
    authorName: author.name,
    authorImage: author.image,
    identityVerified: author.verified,
    title: post.title ?? '',
    content: post.content,
    category: post.category,
    likesCount: post.likesCount ?? post.likes?.length ?? 0,
    isLiked: post.likedByMe ?? false,
    isPinned: post.isPinned ?? false,
    comments: (post.comments ?? []).map((c) => {
      const commentAuthor = authorOf(c.userId);
      return {
        _id: c._id,
        authorId: commentAuthor.id,
        authorName: commentAuthor.name,
        authorImage: commentAuthor.image,
        content: c.content,
        createdAt: c.createdAt,
      };
    }),
    createdAt: post.createdAt,
  };
}

/**
 * GET /api/community — le serveur renvoie tous les posts de la catégorie en
 * une fois (pas de pagination) : `nextBefore` reste donc toujours vide.
 */
export async function fetchCommunity(params?: { category?: CommunityCategory | 'all'; before?: string; limit?: number }) {
  const res = await http.get<{ success: true; posts: ServerCommunityPost[] }>('/api/community', {
    category: params?.category && params.category !== 'all' ? params.category : undefined,
  });
  return {
    success: true as const,
    posts: (res.posts ?? []).map(toCommunityPost),
    nextBefore: undefined as string | undefined,
  };
}

/** POST /api/community — le serveur exige un titre et l'emoji de la catégorie. */
export async function createCommunityPost(payload: { title: string; content: string; category: CommunityCategory }) {
  const emoji = COMMUNITY_CATEGORIES.find((c) => c.value === payload.category)?.emoji ?? '💬';
  const res = await http.post<{ success: true; post?: ServerCommunityPost }>('/api/community', { ...payload, emoji });
  return { success: true as const, post: res.post ? toCommunityPost(res.post) : undefined };
}

export async function likeCommunityPost(postId: string) {
  const res = await http.post<{ success: true; post?: ServerCommunityPost }>(`/api/community/${postId}`, { action: 'like' });
  return { success: true as const, post: res.post ? toCommunityPost(res.post) : undefined };
}

export async function commentCommunityPost(postId: string, content: string) {
  const res = await http.post<{ success: true; post?: ServerCommunityPost }>(`/api/community/${postId}`, { action: 'comment', content });
  return { success: true as const, post: res.post ? toCommunityPost(res.post) : undefined };
}

export function deleteCommunityPost(postId: string) {
  return http.delete<{ success: true }>(`/api/community/${postId}`);
}

// ─────────────────────────────────────────────
// Médias (Cloudinary — réutilisé tel quel)
// ─────────────────────────────────────────────

/**
 * Upload d'une photo de profil vers Cloudinary via le backend.
 * `file` est un objet { uri, name, type } tel que retourné par
 * expo-image-picker, envoyé en multipart/form-data.
 */
export async function uploadAvatar(file: { uri: string; name: string; type: string }) {
  const form = new FormData();

  if (file.uri.startsWith('data:') || file.uri.startsWith('blob:')) {
    // Web : convertir en Blob
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const webFile = new File([blob], file.name, { type: file.type || blob.type });
    form.append('file', webFile);
  } else {
    // Native
    // @ts-expect-error — FormData de React Native accepte { uri, name, type }
    form.append('file', file);
  }

  const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/upload/avatar`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
    body: form,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || data?.success === false) {
    throw new Error(data?.error ?? "Échec de l'envoi de la photo.");
  }

  return data as { success: true; url: string };
}

/**
 * Ajoute une photo supplémentaire (max 3) — POST /api/upload/photo
 *
 * Sur native (iOS/Android), React Native's FormData accepte { uri, name, type }.
 * Sur web (react-native-web), expo-image-picker retourne un data: ou blob: URI :
 * il faut convertir en Blob réel avant d'appeler FormData.append().
 */
export async function uploadPhoto(file: { uri: string; name: string; type: string }) {
  const form = new FormData();

  if (file.uri.startsWith('data:') || file.uri.startsWith('blob:')) {
    // Web : convertir en Blob puis l'attacher comme File
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const webFile = new File([blob], file.name, { type: file.type || blob.type });
    form.append('file', webFile);
  } else {
    // Native : React Native's FormData accepte { uri, name, type }
    // @ts-expect-error — FormData de React Native accepte { uri, name, type }
    form.append('file', file);
  }

  const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/upload/photo`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
    body: form,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || data?.success === false) {
    throw new Error(data?.error ?? "Échec de l'envoi de la photo.");
  }

  return data as { success: true; url: string; photos: string[] };
}

/**
 * Supprime une photo supplémentaire — DELETE /api/upload/photo?url=<encoded>
 */
export async function deletePhoto(url: string) {
  const res = await fetch(
    `${API_BASE_URL.replace(/\/$/, '')}/api/upload/photo?url=${encodeURIComponent(url)}`,
    { method: 'DELETE', credentials: 'include', headers: { Accept: 'application/json' } }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok || data?.success === false) {
    throw new Error(data?.error ?? "Échec de la suppression.");
  }

  return data as { success: true; photos: string[] };
}

/**
 * Marque comme lus les messages reçus dans un match — POST /api/messages/[matchId]/read
 */
export async function markMessagesRead(matchId: string) {
  return http.post(`/api/messages/${matchId}/read`);
}

/**
 * Upload une image de chat — POST /api/upload/chat-image
 * Retourne { url: string }
 */
export async function uploadChatImage(file: { uri: string; name: string; type: string }) {
  const formData = new FormData();
  formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any);

  const res = await fetch(
    `${API_BASE_URL.replace(/\/$/, '')}/api/upload/chat-image`,
    { method: 'POST', credentials: 'include', body: formData }
  );

  const data = await res.json().catch(() => null);
  if (!res.ok || data?.success === false) {
    throw new Error(data?.error ?? "Échec de l'upload.");
  }

  return data as { success: true; url: string };
}

/**
 * Archive / désarchive une conversation — PATCH /api/matches/[id]/archive
 */
export async function archiveMatch(matchId: string) {
  return http.patch(`/api/matches/${matchId}/archive`);
}

/**
 * Met en sourdine une conversation — PATCH /api/matches/[id]/mute
 * minutes = 0 pour désactiver
 */
export async function muteMatch(matchId: string, minutes: number) {
  return http.patch(`/api/matches/${matchId}/mute`, { minutes });
}

/**
 * Supprime une conversation — DELETE /api/matches/[id]
 */
export async function deleteMatch(matchId: string) {
  return apiFetch(`/api/matches/${matchId}`, { method: 'DELETE' });
}

/**
 * Suppression définitive du compte — DELETE /api/users/me
 * (obligatoire Apple App Store guideline 5.1.1)
 */
export async function deleteMyAccount() {
  return apiFetch('/api/users/me', { method: 'DELETE' });
}

/**
 * Bloquer une utilisatrice — POST /api/users/block { targetUserId }
 */
export async function blockUser(targetUserId: string) {
  return http.post('/api/users/block', { targetUserId });
}

/**
 * Débloquer une utilisatrice — DELETE /api/users/block { targetUserId }
 */
export async function unblockUser(targetUserId: string) {
  return apiFetch('/api/users/block', { method: 'DELETE', body: { targetUserId } });
}
