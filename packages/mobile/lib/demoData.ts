/**
 * ─────────────────────────────────────────────────────────────
 *  SferaLuna — Données de démonstration (mode capture App Store)
 * ─────────────────────────────────────────────────────────────
 *
 *  Contenu 100% FICTIF, conçu pour les captures d'écran de la fiche
 *  App Store. Il met en scène l'expérience « app vivante » et surtout
 *  les différenciateurs du 4.3(b) : identité vérifiée, sécurité,
 *  communauté (VibeSphere / VibeMentor / événements Luna).
 *
 *  ⚠️  Ne représente aucune personne réelle. Les portraits proviennent
 *      de randomuser.me (visages générés, libres pour maquettes/démo).
 *      Toutes les fonctionnalités montrées existent réellement dans l'app.
 *
 *  Activé UNIQUEMENT quand EXPO_PUBLIC_DEMO_MODE=1 (voir lib/demoMode.ts).
 *  Ne jamais livrer un build de production avec ce flag activé.
 */
import type {
  PublicProfile,
  MatchSummary,
  ChatMessage,
  NotificationsSummary,
  VibePost,
  MentorPost,
  LunaEvent,
  CircleProfile,
  ProfileVisitor,
  VibePlan,
} from './api';

// ── Helpers de dates (relatives à « maintenant ») ────────────
const now = Date.now();
const min = (n: number) => new Date(now - n * 60_000).toISOString();
const hr = (n: number) => new Date(now - n * 3_600_000).toISOString();
const day = (n: number) => new Date(now - n * 86_400_000).toISOString();
const inDays = (n: number) => new Date(now + n * 86_400_000).toISOString();

const W = (i: number) => `https://randomuser.me/api/portraits/women/${i}.jpg`;

// ── Identifiants stables ─────────────────────────────────────
export const DEMO_ME_ID = 'demo-me';

const IDS = {
  clara: 'demo-u-clara',
  jade: 'demo-u-jade',
  ines: 'demo-u-ines',
  lea: 'demo-u-lea',
  sofia: 'demo-u-sofia',
  manon: 'demo-u-manon',
  chloe: 'demo-u-chloe',
  anais: 'demo-u-anais',
  louna: 'demo-u-louna',
};

// ─────────────────────────────────────────────────────────────
//  SESSION  (GET /api/auth/session) — utilisatrice « connectée »
//  Sans ça, le splash renverrait vers l'écran de connexion et les
//  écrans authentifiés (donc les captures) resteraient inaccessibles.
// ─────────────────────────────────────────────────────────────
export const demoSession = {
  user: {
    id: DEMO_ME_ID,
    _id: DEMO_ME_ID,
    email: 'margaux@example.com',
    name: 'Margaux',
    image: W(68),
    pseudonyme: 'Margaux',
    role: 'user' as const,
    provider: 'credentials' as const,
    hasCompletedProfile: true,
    plan: 'premium-monthly' as const,
    isPremium: true,
    subscriptionStatus: 'active' as const,
    identityVerified: true,
  },
  expires: inDays(30),
};

// ─────────────────────────────────────────────────────────────
//  MON PROFIL  (GET /api/users/profile)
// ─────────────────────────────────────────────────────────────
export const demoMyProfile = {
  success: true as const,
  user: {
    _id: DEMO_ME_ID,
    pseudonyme: 'Margaux',
    age: 34,
    localisation: 'Toulouse',
    bio: "Passionnée de photographie argentique et de longues soirées à refaire le monde. Je cherche une connexion sincère, sans jeux ni faux-semblants. 🌙",
    interets: ['Photographie', 'Voyages', 'Cuisine', 'Cinéma', 'Randonnée'],
    intentions: ['rencontre-sérieuse', 'amitié'],
    orientation: 'Hétérosexuelle',
    question: 'Ce qui me fait craquer',
    reponse: "L'humour et la curiosité.",
    image: W(68),
    photos: [W(65), W(90), W(12)],
    identityVerified: true,
    visibilite: 'invisible' as const, // Mode Fantôme actif (plan premium)
    createdAt: day(120),
  },
  premium: {
    plan: 'premium-monthly' as const,
    isPremium: true,
    subscriptionStatus: 'active' as const,
    premiumStartedAt: day(60),
    premiumExpiresAt: inDays(5),
  },
  metadata: {
    profileCompletion: {
      percentage: 100,
      completedFields: [
        'pseudonyme', 'age', 'localisation', 'bio', 'interets',
        'intentions', 'orientation', 'image', 'photos', 'identite',
      ],
      missingFields: [],
    },
    lastUpdated: hr(6),
  },
};

// ─────────────────────────────────────────────────────────────
//  DÉCOUVERTE  (GET /api/profiles)
// ─────────────────────────────────────────────────────────────
export const demoProfiles: PublicProfile[] = [
  {
    _id: IDS.clara,
    pseudonyme: 'Clara',
    age: 31,
    localisation: 'Bordeaux',
    interets: ['Œnologie', 'Yoga', 'Littérature', 'Jazz'],
    intentions: ['rencontre-sérieuse'],
    visibilite: 'public',
    image: W(44),
    photos: [W(44), W(52), W(9)],
    identityVerified: true,
    createdAt: day(40),
    updatedAt: hr(3),
  },
  {
    _id: IDS.jade,
    pseudonyme: 'Jade',
    age: 29,
    localisation: 'Lyon',
    interets: ['Escalade', 'Cuisine végétale', 'Podcasts', 'Voyages'],
    intentions: ['rencontre-sérieuse', 'aventure'],
    visibilite: 'public',
    image: W(31),
    photos: [W(31), W(76)],
    identityVerified: true,
    createdAt: day(22),
    updatedAt: hr(9),
  },
  {
    _id: IDS.ines,
    pseudonyme: 'Inès',
    age: 36,
    localisation: 'Toulouse',
    interets: ['Danse', 'Architecture', 'Vin nature', 'Cinéma'],
    intentions: ['rencontre-sérieuse'],
    visibilite: 'public',
    image: W(20),
    photos: [W(20), W(85), W(3)],
    identityVerified: true,
    createdAt: day(15),
    updatedAt: hr(1),
  },
  {
    _id: IDS.lea,
    pseudonyme: 'Léa',
    age: 33,
    localisation: 'Nantes',
    interets: ['Peinture', 'Course à pied', 'Théâtre'],
    intentions: ['amitié', 'rencontre-sérieuse'],
    visibilite: 'public',
    image: W(57),
    photos: [W(57), W(41)],
    identityVerified: false,
    createdAt: day(8),
    updatedAt: hr(12),
  },
  {
    _id: IDS.sofia,
    pseudonyme: 'Sofia',
    age: 28,
    localisation: 'Montpellier',
    interets: ['Surf', 'Musique électronique', 'Photographie'],
    intentions: ['aventure', 'discussion'],
    visibilite: 'public',
    image: W(63),
    photos: [W(63), W(29), W(17)],
    identityVerified: true,
    createdAt: day(30),
    updatedAt: hr(5),
  },
];

export const demoProfilesResponse = {
  success: true as const,
  profiles: demoProfiles,
  pagination: { total: 42, page: 1, limit: 10, totalPages: 5, hasMore: true },
  filters: { userIsPremium: true, ageMin: 28, ageMax: 45 },
};

// ─────────────────────────────────────────────────────────────
//  MATCHES & MESSAGERIE  (GET /api/matches)
// ─────────────────────────────────────────────────────────────
const MATCH_CLARA = 'demo-match-clara';
const MATCH_INES = 'demo-match-ines';
const MATCH_SOFIA = 'demo-match-sofia';

export const demoMatches: MatchSummary[] = [
  {
    matchId: MATCH_CLARA,
    createdAt: day(3),
    updatedAt: min(8),
    lastMessageAt: min(8),
    isActive: true,
    user: {
      _id: IDS.clara,
      pseudonyme: 'Clara',
      age: 31,
      localisation: 'Bordeaux',
      interets: ['Œnologie', 'Yoga', 'Littérature'],
      intentions: ['rencontre-sérieuse'],
      image: W(44),
      identityVerified: true,
      visibilite: 'matches',
      hasCompletedProfile: true,
      updatedAt: hr(3),
    },
  },
  {
    matchId: MATCH_INES,
    createdAt: day(2),
    updatedAt: hr(4),
    lastMessageAt: hr(4),
    isActive: true,
    user: {
      _id: IDS.ines,
      pseudonyme: 'Inès',
      age: 36,
      localisation: 'Toulouse',
      interets: ['Danse', 'Architecture', 'Cinéma'],
      intentions: ['rencontre-sérieuse'],
      image: W(20),
      identityVerified: true,
      visibilite: 'matches',
      hasCompletedProfile: true,
      updatedAt: hr(1),
    },
  },
  {
    matchId: MATCH_SOFIA,
    createdAt: day(1),
    updatedAt: hr(20),
    lastMessageAt: hr(20),
    isActive: true,
    user: {
      _id: IDS.sofia,
      pseudonyme: 'Sofia',
      age: 28,
      localisation: 'Montpellier',
      interets: ['Surf', 'Photographie'],
      intentions: ['aventure', 'discussion'],
      image: W(63),
      identityVerified: true,
      visibilite: 'matches',
      hasCompletedProfile: true,
      updatedAt: hr(5),
    },
  },
];

// Conversation affichée dans l'écran Chat (match avec Clara)
export const demoMessagesByMatch: Record<string, ChatMessage[]> = {
  [MATCH_CLARA]: [
    {
      _id: 'demo-msg-1', matchId: MATCH_CLARA, senderId: IDS.clara,
      content: "Coucou Margaux ! J'ai vu qu'on partageait la passion de la photo argentique 📷",
      readAt: hr(23), createdAt: day(1), updatedAt: day(1),
    },
    {
      _id: 'demo-msg-2', matchId: MATCH_CLARA, senderId: DEMO_ME_ID,
      content: "Hello Clara ! Oui 😊 Tu développes toi-même ou tu passes par un labo ?",
      readAt: hr(22), createdAt: hr(23), updatedAt: hr(23),
    },
    {
      _id: 'demo-msg-3', matchId: MATCH_CLARA, senderId: IDS.clara,
      content: "Je développe le noir et blanc à la maison, c'est presque méditatif. Ça te dirait un café pour en parler cette semaine ?",
      readAt: hr(20), createdAt: hr(21), updatedAt: hr(21),
    },
    {
      _id: 'demo-msg-4', matchId: MATCH_CLARA, senderId: DEMO_ME_ID,
      content: "Avec grand plaisir ! J'aime bien qu'ici les profils soient vérifiés, on se sent en confiance pour se rencontrer 🌙",
      readAt: min(30), createdAt: hr(19), updatedAt: hr(19),
    },
    {
      _id: 'demo-msg-5', matchId: MATCH_CLARA, senderId: IDS.clara,
      content: "Exactement ! Jeudi 18h au Café Lumière, ça te va ?",
      readAt: null, createdAt: min(8), updatedAt: min(8),
    },
  ],
  [MATCH_INES]: [
    {
      _id: 'demo-msg-i1', matchId: MATCH_INES, senderId: IDS.ines,
      content: "On est toutes les deux à Toulouse ! Tu connais le nouveau lieu culturel aux Abattoirs ?",
      readAt: hr(4), createdAt: hr(5), updatedAt: hr(5),
    },
    {
      _id: 'demo-msg-i2', matchId: MATCH_INES, senderId: DEMO_ME_ID,
      content: "Oui j'adore ! On pourrait y aller ensemble un dimanche ✨",
      readAt: null, createdAt: hr(4), updatedAt: hr(4),
    },
  ],
};

export function demoMessagesResponse(matchId: string) {
  const messages = demoMessagesByMatch[matchId] ?? [];
  const other = demoMatches.find((m) => m.matchId === matchId)?.user?._id ?? null;
  return {
    success: true as const,
    messages,
    currentUserId: DEMO_ME_ID,
    otherUserId: other,
    hasMore: false,
    pagination: { limit: 30, before: null, nextBefore: null },
  };
}

// ─────────────────────────────────────────────────────────────
//  NOTIFICATIONS  (GET /api/notifications) — résumé compteurs
// ─────────────────────────────────────────────────────────────
export const demoNotifications: { success: true } & NotificationsSummary = {
  success: true,
  total: 7,
  unreadMessages: 2,
  newMatches: 3,
  newVisits: 2,
  since: day(7),
};

// ─────────────────────────────────────────────────────────────
//  VIBESPHERE  (GET /api/vibesphere) — feed d'humeurs
// ─────────────────────────────────────────────────────────────
export const demoVibes: VibePost[] = [
  {
    _id: 'demo-vibe-1',
    userId: { _id: IDS.jade, pseudonyme: 'Jade', image: W(31), age: 29, identityVerified: true },
    content: "Première rando de la saison ce matin, le lever de soleil valait chaque courbature 🌄",
    mood: 'joyeuse', emoji: '🌸', likesCount: 24, likedByMe: false,
    createdAt: hr(2), updatedAt: hr(2),
  },
  {
    _id: 'demo-vibe-2',
    userId: { _id: IDS.ines, pseudonyme: 'Inès', image: W(20), age: 36, identityVerified: true },
    content: "Soirée cocooning, thé fumant et vieux vinyles. Parfois le calme est le plus beau des luxes.",
    mood: 'sereine', emoji: '🌙', likesCount: 41, likedByMe: true,
    createdAt: hr(6), updatedAt: hr(6),
  },
  {
    _id: 'demo-vibe-3',
    userId: { _id: IDS.sofia, pseudonyme: 'Sofia', image: W(63), age: 28, identityVerified: true },
    content: "Je crois que je commence à croire aux belles rencontres sincères 💕",
    mood: 'amoureuse', emoji: '💕', likesCount: 58, likedByMe: false,
    createdAt: hr(11), updatedAt: hr(11),
  },
  {
    _id: 'demo-vibe-4',
    userId: { _id: IDS.clara, pseudonyme: 'Clara', image: W(44), age: 31, identityVerified: true },
    content: "Nouvelle expo photo demain, qui est chaud·e pour un avis éclairé ? ✨",
    mood: 'curieuse', emoji: '✨', likesCount: 17, likedByMe: false,
    createdAt: day(1), updatedAt: day(1),
  },
];

export const demoVibesResponse = {
  success: true as const,
  posts: demoVibes,
  hasMore: false,
  pagination: { nextBefore: null },
};

// ─────────────────────────────────────────────────────────────
//  VIBEMENTOR  (GET /api/vibementor) — Q&A communauté
// ─────────────────────────────────────────────────────────────
export const demoMentorPosts: MentorPost[] = [
  {
    _id: 'demo-mentor-1',
    userId: { _id: IDS.lea, pseudonyme: 'Léa', image: W(57) },
    question: "Comment vérifier qu'un premier rendez-vous se passe en toute sécurité ?",
    category: 'securite',
    answers: [
      {
        _id: 'demo-ans-1',
        userId: { _id: IDS.ines, pseudonyme: 'Inès', image: W(20) },
        content: "J'utilise le Circle of Six : je partage le lieu et l'heure à deux amies de confiance avant chaque rencontre. Ça change tout niveau sérénité.",
        likes: [IDS.clara, IDS.jade, IDS.sofia], isAccepted: true, createdAt: hr(8),
      },
      {
        _id: 'demo-ans-2',
        userId: { _id: IDS.clara, pseudonyme: 'Clara', image: W(44) },
        content: "Toujours un lieu public pour la première fois, et je privilégie les profils à l'identité vérifiée 🛡️",
        likes: [IDS.lea], isAccepted: false, createdAt: hr(7),
      },
    ],
    likesCount: 32, likedByMe: true, answersCount: 2, isSolved: true,
    createdAt: hr(10), updatedAt: hr(7),
  },
  {
    _id: 'demo-mentor-2',
    userId: { _id: IDS.sofia, pseudonyme: 'Sofia', image: W(63) },
    question: "Un bon moyen de lancer la conversation sans faire trop classique ?",
    category: 'premier-contact',
    answers: [
      {
        _id: 'demo-ans-3',
        userId: { _id: IDS.jade, pseudonyme: 'Jade', image: W(31) },
        content: "Je rebondis toujours sur un détail précis du profil, jamais un simple « salut ». Ça montre qu'on a vraiment lu.",
        likes: [IDS.sofia, IDS.clara], isAccepted: false, createdAt: hr(14),
      },
    ],
    likesCount: 19, likedByMe: false, answersCount: 1, isSolved: false,
    createdAt: hr(16), updatedAt: hr(14),
  },
  {
    _id: 'demo-mentor-3',
    userId: { _id: IDS.clara, pseudonyme: 'Clara', image: W(44) },
    question: "Quelles photos choisir pour un profil authentique et pas trop retouché ?",
    category: 'profil',
    answers: [],
    likesCount: 11, likedByMe: false, answersCount: 0, isSolved: false,
    createdAt: day(1), updatedAt: day(1),
  },
];

export const demoMentorResponse = {
  success: true as const,
  posts: demoMentorPosts,
  hasMore: false,
};

// ─────────────────────────────────────────────────────────────
//  ÉVÉNEMENTS LUNA  (GET /api/events)
// ─────────────────────────────────────────────────────────────
export const demoEvents: LunaEvent[] = [
  {
    _id: 'demo-event-1',
    title: 'Apéro Lunaire — Rooftop Toulouse',
    description: "Une soirée conviviale et sécurisée pour rencontrer la communauté SferaLuna autour d'un verre. Accès réservé aux membres à l'identité vérifiée.",
    date: inDays(6), location: 'Rooftop Le Belvédère, Toulouse',
    capacity: 40, registeredCount: 28, isRegistered: true,
    imageUrl: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&q=80',
    createdAt: day(10),
  },
  {
    _id: 'demo-event-2',
    title: 'Atelier photographie',
    description: "Balade photo dans le Vieux-Bordeaux suivie d'un brunch. Un cadre doux pour créer des liens sincères.",
    date: inDays(13), location: 'Place de la Bourse, Bordeaux',
    capacity: 20, registeredCount: 14, isRegistered: false,
    imageUrl: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&q=80',
    createdAt: day(6),
  },
  {
    _id: 'demo-event-3',
    title: 'Cercle de parole — Confiance & Sécurité',
    description: "Un échange bienveillant entre membres autour du bien-être et de la sécurité dans les rencontres, animé par notre équipe.",
    date: inDays(20), location: 'En ligne (visioconférence)',
    capacity: 60, registeredCount: 37, isRegistered: false,
    createdAt: day(4),
  },
];

export const demoEventsResponse = { success: true as const, events: demoEvents };

// ─────────────────────────────────────────────────────────────
//  COMMUNAUTÉ  (GET /api/community) — même forme que le serveur
// ─────────────────────────────────────────────────────────────
export const demoCommunityResponse = {
  success: true as const,
  posts: [
    {
      _id: 'demo-post-1',
      userId: { _id: IDS.clara, pseudonyme: 'Clara', image: W(44) },
      title: 'Vos adresses de cafés où travailler à Bordeaux ?',
      content: "Je cherche des endroits calmes avec du bon café pour mes après-midi de télétravail. Vous avez des coups de cœur ?",
      category: 'sorties', emoji: '🎉', isPinned: false,
      likesCount: 12, likedByMe: false, createdAt: hr(3),
      comments: [
        { _id: 'demo-c-1', userId: { _id: IDS.jade, pseudonyme: 'Jade' }, content: 'Le Café Lumière, sans hésiter !', createdAt: hr(2) },
        { _id: 'demo-c-2', userId: { _id: IDS.ines, pseudonyme: 'Inès' }, content: "J'y vais souvent, on peut s'y retrouver.", createdAt: hr(1) },
      ],
    },
    {
      _id: 'demo-post-2',
      userId: { _id: IDS.sofia, pseudonyme: 'Sofia', image: W(68) },
      title: 'Reprendre le sport à plusieurs',
      content: "Qui serait partante pour une sortie course à pied le dimanche matin ? Niveau débutante, l'idée est surtout de se motiver ensemble.",
      category: 'bien-etre', emoji: '🌿', isPinned: false,
      likesCount: 8, likedByMe: true, createdAt: hr(9),
      comments: [
        { _id: 'demo-c-3', userId: { _id: IDS.lea, pseudonyme: 'Léa' }, content: 'Moi ! Dimanche prochain ?', createdAt: hr(6) },
      ],
    },
    {
      _id: 'demo-post-3',
      userId: { _id: IDS.manon, pseudonyme: 'Manon', image: W(32) },
      title: 'Un livre qui vous a marquée cette année',
      content: 'Je termine tout juste un roman que je n’ai pas pu lâcher. Et vous, quelle lecture conseilleriez-vous ?',
      category: 'general', emoji: '💬', isPinned: false,
      likesCount: 15, likedByMe: false, createdAt: day(1),
      comments: [],
    },
  ],
};

// ─────────────────────────────────────────────────────────────
//  CIRCLE OF SIX  (GET /api/circle)
// ─────────────────────────────────────────────────────────────
export const demoCircle: CircleProfile[] = [
  {
    _id: IDS.clara, pseudonyme: 'Clara', age: 31, localisation: 'Bordeaux',
    interets: ['Œnologie', 'Yoga', 'Littérature'], intentions: ['rencontre-sérieuse'],
    image: W(44), identityVerified: true, visibilite: 'public', hasCompletedProfile: true,
    compatibilityScore: 94, compatibilityHints: ['Photographie', 'Littérature', 'Même intention'],
  },
  {
    _id: IDS.ines, pseudonyme: 'Inès', age: 36, localisation: 'Toulouse',
    interets: ['Danse', 'Architecture', 'Cinéma'], intentions: ['rencontre-sérieuse'],
    image: W(20), identityVerified: true, visibilite: 'public', hasCompletedProfile: true,
    compatibilityScore: 89, compatibilityHints: ['Même ville', 'Cinéma', 'Culture'],
  },
  {
    _id: IDS.jade, pseudonyme: 'Jade', age: 29, localisation: 'Lyon',
    interets: ['Escalade', 'Voyages', 'Podcasts'], intentions: ['aventure'],
    image: W(31), identityVerified: true, visibilite: 'public', hasCompletedProfile: true,
    compatibilityScore: 85, compatibilityHints: ['Voyages', 'Nature'],
  },
  {
    _id: IDS.sofia, pseudonyme: 'Sofia', age: 28, localisation: 'Montpellier',
    interets: ['Surf', 'Photographie'], intentions: ['discussion'],
    image: W(63), identityVerified: true, visibilite: 'public', hasCompletedProfile: true,
    compatibilityScore: 82, compatibilityHints: ['Photographie', 'Voyages'],
  },
  {
    _id: IDS.manon, pseudonyme: 'Manon', age: 32, localisation: 'Nantes',
    interets: ['Cuisine', 'Théâtre', 'Vin nature'], intentions: ['rencontre-sérieuse'],
    image: W(75), identityVerified: true, visibilite: 'public', hasCompletedProfile: true,
    compatibilityScore: 80, compatibilityHints: ['Cuisine', 'Culture'],
  },
  {
    _id: IDS.chloe, pseudonyme: 'Chloé', age: 30, localisation: 'Toulouse',
    interets: ['Randonnée', 'Musique', 'Cinéma'], intentions: ['amitié', 'rencontre-sérieuse'],
    image: W(48), identityVerified: false, visibilite: 'public', hasCompletedProfile: true,
    compatibilityScore: 78, compatibilityHints: ['Même ville', 'Randonnée', 'Cinéma'],
  },
];

export const demoCircleResponse = {
  success: true as const,
  profiles: demoCircle,
  weekOf: day(2),
};

// ─────────────────────────────────────────────────────────────
//  VISITEURS DU PROFIL  (GET /api/visitors) — Premium
// ─────────────────────────────────────────────────────────────
export const demoVisitors: ProfileVisitor[] = [
  { visitorId: IDS.jade, pseudonyme: 'Jade', image: W(31), identityVerified: true, visitedAt: hr(2) },
  { visitorId: IDS.manon, pseudonyme: 'Manon', image: W(75), identityVerified: true, visitedAt: hr(9) },
  { visitorId: IDS.anais, pseudonyme: 'Anaïs', image: W(39), identityVerified: false, visitedAt: day(1) },
  { visitorId: IDS.louna, pseudonyme: 'Louna', image: W(82), identityVerified: true, visitedAt: day(2) },
];

export const demoVisitorsResponse = { success: true as const, visitors: demoVisitors };

// ─────────────────────────────────────────────────────────────
//  VIBEPLANNER  (GET /api/vibeplanner) — plans de sorties
// ─────────────────────────────────────────────────────────────
export const demoVibePlans: VibePlan[] = [
  {
    _id: 'demo-plan-1',
    matchId: MATCH_CLARA,
    proposedById: { _id: IDS.clara, pseudonyme: 'Clara', image: W(44) },
    title: 'Café & photo argentique',
    description: "On se retrouve au Café Lumière pour parler pellicules ?",
    category: 'cafe', emoji: '☕',
    scheduledAt: inDays(2), status: 'accepted',
    createdAt: hr(19), updatedAt: hr(18),
  },
  {
    _id: 'demo-plan-2',
    matchId: MATCH_INES,
    proposedById: { _id: DEMO_ME_ID, pseudonyme: 'Margaux', image: W(68) },
    title: 'Expo aux Abattoirs',
    description: "Dimanche après-midi, ça te tente ?",
    category: 'culture', emoji: '🎨',
    scheduledAt: inDays(5), status: 'pending',
    createdAt: hr(4), updatedAt: hr(4),
  },
];

export function demoVibePlansResponse(matchId?: string) {
  const plans = matchId
    ? demoVibePlans.filter((p) => (typeof p.matchId === 'string' ? p.matchId : p.matchId._id) === matchId)
    : demoVibePlans;
  return { success: true as const, plans };
}
