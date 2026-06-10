# SferaLuna App Mobile — CLAUDE.md

Application mobile React Native / Expo pour SferaLuna, site de rencontre premium français. Branché sur le backend Next.js existant (`/Users/jeyko.dev/Projects/sferaluna`).

---

## Architecture

```
packages/mobile/
├── app/
│   ├── _layout.tsx                    ← Root layout (push notifications, session gate)
│   ├── (auth)/                        ← onboarding.tsx, login.tsx, register.tsx
│   └── (app)/
│       ├── (tabs)/
│       │   ├── discover.tsx           ← Découverte (swipe, filtres, modal match)
│       │   ├── messages.tsx           ← Liste matches
│       │   ├── alerts.tsx             ← Notifications (résumé compteurs)
│       │   ├── profile.tsx            ← Mon profil (édition, galerie 3 photos, visiteurs)
│       │   └── settings.tsx           ← Réglages (abonnement, fantôme, biométrie)
│       ├── chat/[matchId].tsx         ← Chat temps réel Pusher
│       ├── profil/[id].tsx            ← Profil public + galerie photos
│       ├── premium.tsx                ← Abonnement Stripe (redirect WebBrowser)
│       ├── vibesphere.tsx             ← Feed humeurs
│       ├── vibementor.tsx             ← Q&A communauté
│       ├── vibeplanner.tsx            ← Plans de sorties (branché API)
│       ├── circle.tsx                 ← Circle of Six
│       ├── evenements.tsx             ← Événements Luna
│       ├── communaute.tsx             ← Forum communauté
│       ├── mode-fantome.tsx           ← Mode Fantôme (premium/elite only)
│       ├── securite.tsx               ← Sécurité du compte
│       ├── confidentialite.tsx        ← Politique de confidentialité
│       └── [faq|guide|contact|equipe].tsx
├── components/
│   ├── SwipeCard.tsx                  ← Carte swipeable (Animated + PanResponder)
│   ├── MatchModal.tsx                 ← Modal match mutuel
│   ├── FilterModal.tsx                ← Filtres découverte
│   ├── LinearGradient.tsx             ← Wrapper expo-linear-gradient
│   ├── GlassCard.tsx / GlassInput.tsx / GradientButton.tsx
│   └── Toast.tsx
└── lib/
    ├── api.ts                         ← Toutes les fonctions API (fetch vers backend Next.js)
    ├── auth.ts                        ← Session (getSession, signIn, signOut, OAuth Google/Apple)
    ├── biometrics.ts                  ← expo-local-authentication helper
    ├── notifications.ts               ← Push notifications Expo (register, handlers)
    ├── http.ts                        ← Client HTTP avec gestion erreurs
    └── theme.ts                       ← Colors, Spacing, Radius
```

---

## Stack technique

| Outil | Version |
|---|---|
| Expo SDK | ~54.0.33 |
| React Native | 0.81.5 |
| expo-router | ~6.0.23 |
| TanStack Query | ^5.96.1 |
| Phosphor Icons | ^3.0.6 |
| Pusher JS | ^8.4.0 |
| expo-notifications | ~0.32.17 |
| expo-apple-authentication | ~8.0.8 |
| expo-auth-session | ~7.0.11 |

**Preview web :** `bun run web` depuis `packages/mobile` — port 4300 via react-native-web.

---

## Règles critiques

### Animations / gestes
**Ne jamais importer `react-native-reanimated` ou `Gesture`/`GestureDetector` de `react-native-gesture-handler`.** Ces libs crashent la preview react-native-web (pas de JSI). Utiliser uniquement :
- `Animated` + `PanResponder` de `react-native` (voir `components/SwipeCard.tsx`)
- `Animated.spring` avec `friction`/`tension` (**pas** `damping`/`stiffness`)

### Plans et règles métier
Même règles que le backend — identiques à `src/models/User.ts` :
- Plans : `free`, `essential-monthly` (9,99€), `premium-monthly` (19,99€), `elite-monthly` (34,99€)
- Statuts : `inactive`, `active`, `trialing`, `past_due`, `canceled`
- Mode Fantôme (`visibilite: "invisible"`) : `premium-monthly` et `elite-monthly` uniquement
- **`isPremium` est server-computed — ne jamais le piloter côté client**

### Stripe
Flow = redirect WebBrowser (pas PaymentSheet). `POST /api/stripe/create-checkout-session` retourne `{ url }`, à ouvrir via `expo-web-browser`'s `openAuthSessionAsync`. Après retour, invalider le cache TanStack Query pour récupérer le nouvel état.

### Notifications
`GET /api/notifications` retourne uniquement un résumé (`{ total, unreadMessages, newMatches, newVisits }`), pas un feed individuel. L'écran Alertes affiche des compteurs + liens vers les sections concernées.

### Package manager
Ce dépôt utilise **Bun** (monorepo `bun.lock`). La sandbox Claude ne peut pas installer de nouvelles dépendances (registry npm bloqué en 403). Après ajout d'un package dans `package.json`, demander à l'utilisateur de lancer `bun install` depuis la racine du repo.

---

## Variables d'environnement (packages/mobile)

```
EXPO_PUBLIC_API_URL=http://localhost:3000   # en dev → https://www.sferaluna.com en prod
```

L'`API_BASE_URL` dans `lib/http.ts` lit `process.env.EXPO_PUBLIC_API_URL` avec fallback `http://localhost:3000`.

---

## Routes backend ajoutées pour le mobile

Ces routes existent dans `/Users/jeyko.dev/Projects/sferaluna/src/app/api/` :

| Route | Méthode | Usage |
|---|---|---|
| `/api/auth/mobile-signin` | POST | OAuth Google/Apple → session cookie NextAuth |
| `/api/users/push-token` | PUT | Sauvegarde `expoPushToken` |
| `/api/upload/photo` | POST | Ajoute une photo (max 3, Cloudinary `sferaluna/photos`) |
| `/api/upload/photo?url=` | DELETE | Supprime une photo + Cloudinary destroy |

Champs ajoutés au modèle `User` : `photos: string[]`, `expoPushToken`, `expoPushTokenUpdatedAt`.

---

## Commandes utiles

```bash
# Preview web (port 4300)
cd packages/mobile && bun run web

# Typecheck mobile
cd packages/mobile && npx tsc --noEmit

# Typecheck backend
cd ../../sferaluna && npx tsc --noEmit

# Build EAS (après eas init)
eas build --platform ios --profile production
eas build --platform android --profile production

# Soumettre aux stores
eas submit --platform ios
eas submit --platform android
```

---

## Erreurs TypeScript pré-existantes (à ignorer)

Ces erreurs existaient avant les travaux récents — ne pas les corriger sauf demande explicite :

**Backend (`/Users/jeyko.dev/Projects/sferaluna`) :**
- `Framer Motion Variants` : `commencer/page.tsx`, `fonctionnalites/page.tsx`, `mon-compte/page.tsx`, `valeurs/page.tsx`, `Header.tsx` — mauvais typage des `ease` strings
- `Subscription.ts` : `SubscriptionPlanId` et `SubscriptionStatus` non exportés depuis `lib/subscription/config.ts`
- `User.ts` lignes 610-629 : pre-save hook sur champs `select: false` (`password`, `reponse`, tokens)
- `.next/types/` : erreurs auto-générées Next.js sur `authOptions` export et types route handler

Pour vérifier qu'une erreur est bien nouvelle (introduite par une modif) : `git diff HEAD --name-only` et filtrer le tsc output sur ces fichiers uniquement.

---

## État actuel — Ce qui est fait ✅ / Ce qui reste 🚧

### Fait ✅
- Tous les écrans branché API (découverte, messages, profil, notifications, premium, vibes, events, communauté, etc.)
- Auth email/password + OAuth Google + OAuth Apple (via `/api/auth/mobile-signin`)
- Biométrie (Face ID / empreinte) avec persistent secure store
- Galerie photos (3 photos supplémentaires, upload/suppression Cloudinary)
- Push notifications (Expo Push API, envoi sur message/match)
- Configuration App Store + Play Store (`app.json`, `eas.json`)
- Mode Fantôme, sécurité, confidentialité

### Reste à faire 🚧
1. **Photos sur le site web** — section "Mes photos" dans `mon-compte` + galerie dans `profil/[id]` (mêmes routes API, déjà disponibles)
2. `bun install` (nouvelles dépendances à installer localement)
3. `eas init` (lier le projet Expo, remplacer `REPLACE_WITH_YOUR_EAS_PROJECT_ID`)
4. Configurer `eas.json` avec les vrais credentials App Store (appleId, ascAppId, appleTeamId) et Play Store (serviceAccountKeyPath)
5. Configurer `EXPO_PUBLIC_API_URL` en production
6. Tester Apple Sign In de bout en bout en prod
7. Activer Google Pay dans le dashboard Stripe
