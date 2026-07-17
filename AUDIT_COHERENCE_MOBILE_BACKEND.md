# Audit de cohérence Mobile ↔ Backend

**Projets comparés :** `sferaluna-app/packages/mobile` (Expo/RN) ↔ `sferaluna` (Next.js/MongoDB).
**Date :** 17 juillet 2026.

---

## ✅ Ce qui est cohérent

| Élément | Mobile | Backend | Verdict |
|---|---|---|---|
| **Plans** | `free`, `essential-monthly`, `premium-monthly`, `elite-monthly` (`lib/auth.ts:21`) | idem (`User.ts:419`, enum) | ✅ identiques |
| **Prix** | 9,99 / 19,99 / 34,99 € (écran premium) | `config.ts` : 0 / 9.99 / 19.99 / 34.99 | ✅ identiques |
| **Statuts abonnement** | `inactive`, `active`, `trialing`, `past_due`, `canceled` (`auth.ts:22`) | idem (`User.ts:431`) | ✅ identiques |
| **Libellés plan/statut FR** | Essentiel/Premium/Elite · Actif/Inactif… | idem (virtuals `User.ts:714,730`) | ✅ identiques |
| **Visibilité profil** | `public`, `matches`, `premium`, `invisible` (`auth.ts:23`) | idem (`User.ts:367`) | ✅ identiques |
| **isPremium** | lu uniquement, jamais piloté côté client | recalculé serveur (`active`/`trialing`, `User.ts:773`) | ✅ conforme |
| **identityVerified** | lu depuis `/api/users/profile` (gate KYC) | renvoyé via `toObject({virtuals:true})` | ✅ présent → le gate fonctionne |

---

## 🔴 Écart détecté — Mode Fantôme

**Règle métier officielle** (`CLAUDE.md`, instructions projet, mobile `canUseGhostMode`) :
> Le Mode Fantôme (`visibilite: "invisible"`) est réservé à **`premium-monthly` et `elite-monthly` uniquement**.

**Mobile** — respecte la règle : `canUseGhostMode(plan)` renvoie `true` seulement pour `premium-monthly` / `elite-monthly` (`lib/auth.ts:55`). L'option est masquée pour les autres.

**Backend** — **ne respecte PAS la règle.** La route `POST /api/users/visibility` autorise `invisible` dès que :
```ts
const isPremiumActive =
  user.isPremium && (subscriptionStatus === "active" || "trialing");
```
Or `isPremium` est `true` pour **tout** abonnement actif, y compris **`essential-monthly` (9,99 €)**. La route ne charge même pas le champ `plan` (`.select("_id isPremium subscriptionStatus")`).

**Conséquence :** un abonné **Essentiel** peut activer le Mode Fantôme via l'API (et via le site web s'il l'expose), alors que la règle et l'app mobile le réservent à Premium/Elite. Incohérence entre la règle affichée et le comportement serveur.

### Correctif proposé (backend)

Dans `src/app/api/users/visibility/route.ts` :
1. Charger `plan` : `.select("_id isPremium subscriptionStatus plan")`.
2. Gater sur le tier, pas sur `isPremium` :
```ts
if (visibilite === "invisible") {
  const canGhost =
    (user.plan === "premium-monthly" || user.plan === "elite-monthly") &&
    (user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing");
  if (!canGhost) {
    return NextResponse.json(
      { success: false, error: "Le mode Fantôme est réservé aux offres Premium et Elite.", code: "PREMIUM_REQUIRED" },
      { status: 403 }
    );
  }
}
```
Ainsi le backend applique exactement la même règle que le mobile.

> ⚠️ À vérifier aussi côté **site web** (`mon-compte`) : s'il expose le réglage de visibilité, il doit appliquer le même gating premium/elite.

---

## Écart — étendue réelle et corrections appliquées ✅

En traçant **toutes** les écritures de `visibilite`, l'écart Mode Fantôme s'est révélé plus large qu'une seule route. État avant / après :

| Point d'entrée | Avant | Après |
|---|---|---|
| `POST /api/users/visibility` | gate sur `isPremium` → Essentiel passait | ✅ gate sur feature `ghostMode` (premium/elite) |
| `POST /api/users/update-profile` | **aucun gate** → même un compte gratuit pouvait passer invisible | ✅ gate `ghostMode` ajouté |
| `PUT /api/users/profile` | déjà correct (`canUseGhostMode`) | ✅ inchangé |
| Web `mode-fantome/page.tsx` | affiché dès `isPremium` (Essentiel voyait le toggle) | ✅ gate sur `can("ghostMode")` |
| Web `mon-compte/page.tsx` (toggle) | gate sur `isPremiumActive` (Essentiel actif passait) | ✅ gate sur plan `premium/elite` |

Les **trois routes serveur** appliquent désormais la même source de vérité (`SubscriptionChecker.hasFeature("ghostMode")` / config abonnements), et les **deux écrans web** n'exposent le Mode Fantôme qu'aux offres Premium/Elite — exactement comme l'app mobile (`canUseGhostMode`). `isPremiumActive` (utilisé ailleurs pour les features premium générales) n'a **pas** été modifié.

Typecheck : aucune nouvelle erreur (les 5 erreurs restantes dans `mon-compte` sont les erreurs Framer Motion `ease` déjà connues/pré-existantes).

## Synthèse

Écart unique sur le Mode Fantôme, mais présent sur **5 points d'entrée** (2 routes serveur trop permissives + 1 backdoor totale + 2 écrans web). Tout est désormais aligné sur la règle « premium-monthly / elite-monthly uniquement ». Le reste (plans, prix, statuts, visibilité, isPremium, identityVerified) était déjà parfaitement cohérent.
