# Plan de captures + App Preview — resoumission 4.3(b)

**But :** produire un jeu de captures et une vidéo qui, au premier regard, disent « plateforme de sécurité + communauté féminine vérifiée » — pas « app de rencontre ». C'est le signal n°1 pour lever le 4.3(b).

---

## 0. Préparer l'environnement de capture

Les écrans doivent être **remplis** (jamais d'état vide). Le mode démo est fait pour ça — contenu 100 % fictif, profils vérifiés, feed animé.

```bash
cd packages/mobile
EXPO_PUBLIC_DEMO_MODE=1 bun run start   # puis 'i' pour le simulateur
```

Si le flag n'est pas pris : ajouter `EXPO_PUBLIC_DEMO_MODE=1` dans `packages/mobile/.env`, recharger (`r`), **puis le retirer avant tout build de prod**.

**Appareils requis par Apple (App Store Connect) :**
- iPhone 6,9″ (ex. iPhone 17 Pro Max — l'appareil de review) → **obligatoire**
- iPhone 6,5″ (fallback) → recommandé
- iPad : seulement si vous activez le support iPad (voir plan iPad). Sinon, non requis.

Simulateur conseillé pour la capture : **iPhone 17 Pro Max** (identique à l'appareil de review). Capture : `Cmd+S` dans le simulateur, ou barre supérieure. Masquer l'heure/batterie n'est pas nécessaire, mais une barre d'état propre est un plus.

---

## 1. Ordre des captures (le plus important)

L'ordre raconte l'histoire. La découverte de profils passe **en dernier**.

| # | Écran à capturer | Comment y aller (mode démo) | Texte d'accroche (overlay) |
|---|---|---|---|
| 1 | **Vérification d'identité** | Écran du gate KYC (compte non vérifié) — ou l'écran Sécurité montrant « Identité vérifiée » | « Chaque membre vérifie son identité » |
| 2 | **Hub Accueil** (Circle of Six en tête) | Onglet Accueil | « Un espace pensé pour votre sécurité » |
| 3 | **Circle of Six** | Accueil → carte Circle of Six | « Votre réseau de sécurité personnel » |
| 4 | **VibeSphere** (feed communauté) | Accueil → VibeSphere | « Une communauté féminine bienveillante » |
| 5 | **Événements Luna** | Accueil → Événements | « Des rencontres en vrai, en toute confiance » |
| 6 | **Mode Fantôme / confidentialité** | Réglages → Sécurité / Mode Fantôme | « Vous contrôlez votre visibilité » |
| 7 | **Découverte de profils vérifiés** | Accueil → carte « Découvrir & matcher » | « Des rencontres authentiques, entre profils vérifiés » |

> 5 à 7 captures suffisent. Si vous n'en gardez que 5 : #1, #3, #4, #5, #7.

---

## 2. Note pour la capture n°1 (gate KYC)

Le gate KYC ne s'affiche que pour un compte **non vérifié**. Deux façons de le capturer :

- **Option A (fidèle) :** en mode démo, `demoMyProfile.identityVerified` est à `true` (pour que les autres écrans soient accessibles). Pour capturer le gate, passez temporairement cette valeur à `false` dans `lib/demoData.ts`, capturez l'écran « Vérifiez votre identité », puis remettez `true`.
- **Option B (plus simple) :** capturez plutôt l'écran **Réglages → Sécurité du compte** qui affiche le badge « Identité vérifiée » — il communique la même idée (vérification réelle) sans manipuler le flag.

---

## 3. Habillage des captures (overlay)

Pour que le message passe même sans ouvrir l'app, ajoutez un bandeau de texte au-dessus de chaque capture (Figma, Canva, ou un outil type Screenshots.pro / Previewed) :

- **Fond** : dégradé sombre cohérent avec l'app (`#1a0b2e` → `#2d1b69`).
- **Texte** : blanc, gras, 1 ligne, court (voir colonne « accroche »).
- **Cadre** : optionnel, mockup iPhone. Garder un style sobre et premium.
- **Cohérence** : même position de bandeau (haut) sur les 7 captures.

Ton général : sécurité, authenticité, bienveillance, entre-femmes. Éviter tout vocabulaire « swipe / match / célibataire » dans les accroches.

---

## 4. Script App Preview (vidéo, 15–30 s)

À enregistrer depuis le simulateur (`Cmd+R` pour enregistrer l'écran via QuickTime, ou capture d'écran vidéo du simulateur), en mode démo. Ouvrir sur la sécurité, jamais sur le swipe.

| Temps | Plan (navigation à filmer) | Texte à l'écran / voix off |
|---|---|---|
| 0–4 s | Écran de vérification d'identité (ou badge « vérifié ») | « Sur SferaLuna, chaque membre est vérifié. » |
| 4–9 s | Hub Accueil → tap sur Circle of Six | « Un réseau de sécurité qui veille sur vous. » |
| 9–15 s | VibeSphere (scroll du feed) + Événements Luna | « Une vraie communauté féminine. » |
| 15–21 s | Réglages → Mode Fantôme (toggle visibilité) | « Vous gardez le contrôle. » |
| 21–27 s | Carte « Découvrir & matcher » → un profil vérifié | « Et des rencontres authentiques, en confiance. » |
| 27–30 s | Logo SferaLuna | « SferaLuna — entre femmes, en sécurité. » |

**Conseils de tournage :**
- Mouvements lents et fluides ; laisser respirer chaque écran ~1 s avant d'agir.
- Filmer en mode démo pour des écrans pleins et jolis.
- Résolution : celle du simulateur iPhone 6,9″. Apple accepte 886×1920 / 1080×1920 selon l'appareil.
- Durée stricte : **15 à 30 s** (exigence App Store Connect).

---

## 5. Check-list de livraison

- [ ] Lancer le simulateur iPhone 17 Pro Max en `EXPO_PUBLIC_DEMO_MODE=1`
- [ ] Capturer les 7 écrans dans l'ordre du §1
- [ ] Ajouter les bandeaux d'accroche (§3)
- [ ] Enregistrer l'App Preview selon le script (§4)
- [ ] Vérifier : aucune accroche ne contient « swipe / match / dating »
- [ ] Retirer `EXPO_PUBLIC_DEMO_MODE` avant tout build de production
- [ ] Uploader captures + preview dans App Store Connect (fiche FR)

---

*Une fois ces visuels prêts + les métadonnées de l'Axe 1 collées, il ne reste qu'à pousser le nouveau build et resoumettre avec la note reviewer déjà rédigée.*
