# Plan de différenciation — Sortir du rejet 4.3(b)

**Soumission :** adaf971c-8eee-40aa-b80f-7e7bb97b8fc9 · Version 1.0 (26)
**Date :** 16 juillet 2026
**Contexte :** 2 réponses déjà envoyées (Resolution Center + appel Board), re-rejetées.

---

## 1. Diagnostic : pourquoi les appels ont échoué

Les deux réponses (`APP_REVIEW_4.3b_RESPONSE.md`, `APP_REVIEW_BOARD_APPEAL.md`) **argumentaient** que l'app est différente. Elles étaient bonnes, mais elles se sont heurtées à un mur structurel du 4.3(b) :

> Un rejet 4.3(b) se joue sur **la première impression du reviewer**, pas sur un paragraphe d'explication.

Le reviewer ouvre l'app, voit un **deck de swipe de visages** (`discover.tsx`), une fiche App Store catégorisée « Rencontres » avec des captures de swipe/match → il coche « encore une app de dating ». Ce qu'on écrit ensuite dans le Resolution Center ne défait pas cette impression. Les faits (KYC, communauté, sécurité) sont **réels mais invisibles au premier contact.**

**Conclusion : il faut changer ce que le reviewer voit, pas ce qu'on lui dit.** Le plan ci-dessous est priorisé par ratio impact/effort.

---

## 2. Axe 1 — Métadonnées App Store (impact MAXIMAL, effort faible)

C'est 80 % du levier. Aucune ligne de code à changer, uniquement App Store Connect.

**Catégorie.** Retirer « Rencontres » (Dating) comme catégorie primaire. Passer en **Lifestyle** ou **Réseaux sociaux**, primaire, avec Lifestyle en secondaire. La catégorie « Dating » déclenche mécaniquement l'examen 4.3 saturé. (Vérifier que le contenu reste cohérent — voir Axe 3.)

**Nom + sous-titre.** Le sous-titre est ce que le reviewer lit avant même d'ouvrir l'app. Éviter tout vocabulaire « rencontre/match/célibataire ». Piste :
- Sous-titre orienté sécurité/communauté : *« Communauté sécurisée, vérifiée, entre femmes »* ou *« Rencontres vérifiées & réseau de sécurité »* — mettre la vérification et la sécurité AVANT la rencontre.

**Captures d'écran (le signal n°1).** Aujourd'hui, si les captures montrent le swipe deck en premier, l'app se lit « dating ». À réordonner :
1. Écran de **vérification d'identité KYC** (Stripe Identity) — « Chaque membre est vérifié »
2. **Circle of Six** — le réseau de sécurité personnel
3. **VibeSphere / communauté / événements Luna**
4. **Mode Fantôme** — contrôles de confidentialité
5. *Seulement ensuite*, la découverte de profils — et la présenter comme « profils vérifiés », pas comme un swipe Tinder.

**Vidéo de prévisualisation (App Preview).** 15–30 s qui ouvrent sur le KYC et la sécurité, pas sur le swipe. Une App Preview qui raconte « plateforme de sécurité + communauté féminine » vaut dix paragraphes d'appel.

**Description.** Réécrire le premier paragraphe autour de : femmes 28+, vérification obligatoire, sécurité (Circle of Six), communauté (VibeSphere/Mentor/Planner, événements). Le mot « rencontre » n'apparaît qu'en second plan.

**Mots-clés.** Retirer les kw génériques de dating (tinder-like, célibataire, match…) qui rangent l'app dans le peloton saturé. Privilégier : sécurité, femmes, vérifié, communauté, entre-femmes.

---

## 3. Axe 2 — Onboarding & UX : gate le reviewer sur ce qui différencie (impact fort, effort moyen)

Le reviewer teste l'app dans l'ordre où elle se présente. Il faut qu'il **rencontre la différenciation dans les 60 premières secondes.**

**a) KYC obligatoire et visible dès l'onboarding.** La vérification d'identité (Stripe Identity) doit être un **écran d'onboarding bloquant**, pas un réglage caché. Le reviewer doit buter dessus : « pour accéder à la communauté, vérifiez votre identité ». C'est la preuve *démontrée* (pas argumentée) que l'app n'est pas à inscription ouverte.
> Fournir un **compte de démo pré-vérifié** dans les notes de review pour qu'il puisse passer le gate.

**b) Désactiver/reléguer le swipe comme écran d'accueil.** Le `discover.tsx` en mode swipe est le déclencheur visuel du « clone dating ». Options par ordre de préférence :
- Remplacer l'onglet d'accueil par un **hub communauté/sécurité** (feed VibeSphere + Circle of Six + événements). La découverte de profils devient un onglet secondaire.
- OU transformer la découverte de « swipe deck » en **liste de profils vérifiés** (grille/liste), qui ne ressemble pas à Tinder. Le geste swipe lui-même est une part de la « duplicate functionality » pointée par Apple.

**c) Mettre Circle of Six et la sécurité au premier plan** dans la navigation (onglet dédié visible, pas enfoui dans les réglages).

---

## 4. Axe 3 — Renforcer les features réellement non-dating (impact moyen, effort variable)

Le 4.3(b) reproche la *duplication de fonctionnalité*. Plus la valeur de l'app vient d'ailleurs que du matching, plus l'argument tombe. Vos écrans existants à valoriser / durcir :

- **`circle.tsx` (Circle of Six)** — en faire une vraie fonctionnalité de sécurité utilisable seule (partage de trajet, check-in, alerte contacts). C'est votre différenciateur le plus fort et le moins « dating ».
- **`vibesphere.tsx` / `vibementor.tsx` / `vibeplanner.tsx`** — fil communautaire, entraide, plans de sorties : la brique « réseau social de niche », pas rencontre.
- **`evenements.tsx` (Événements Luna)** — événements en présentiel = valeur hors-app, difficile à qualifier de « clone dating ».
- **`securite.tsx` / `mode-fantome.tsx`** — contrôles de confidentialité avancés.

Objectif : qu'un membre puisse **utiliser l'app avec de la valeur même sans jamais matcher.** Si c'est vrai fonctionnellement, l'app n'est plus « une app de rencontre parmi d'autres ».

---

## 5. Axe 4 — Hygiène anti-template (l'app a été générée via Runable)

Le 4.3(b) frappe fort les apps qui *ressemblent à un template réutilisé*. À vérifier avant resoumission :

- **Identité visuelle unique** : icône, splash, palette, typo distinctives (vous avez déjà la palette lunaire — bien). S'assurer qu'aucun asset générique/placeholder Runable ne subsiste.
- **Pas de textes lorem/placeholder** ni d'écrans « démo » dans le build soumis.
- **`supportsTablet: false`** dans `app.json` alors qu'Apple review sur **iPad Air M3** : l'app tourne en mode compatibilité iPhone sur iPad. Ça ne cause pas le 4.3(b) mais ça donne une impression « pas fini ». À décider : soit assumer iPhone-only proprement, soit activer un vrai support iPad.
- Vérifier qu'aucune autre app du même compte développeur ne partage le même template (Apple recoupe par compte).

---

## 6. Axe 5 — Le package de resoumission

Une fois les axes 1–4 traités, resoumettre un **nouveau build** (obligatoire — un simple message ne relancera pas l'examen) avec :

1. **Nouveau numéro de build** + métadonnées mises à jour (Axe 1).
2. **App Preview vidéo** orientée sécurité/communauté.
3. **Note au reviewer courte et factuelle** (pas un re-plaidoyer). Elle doit dire *ce qui a changé concrètement* :
   > « Depuis la version précédente, nous avons repositionné l'app autour de la sécurité et de la communauté féminine vérifiée. La vérification d'identité (Stripe Identity) est désormais obligatoire dès l'onboarding — voir le compte de démo ci-dessous. L'écran d'accueil met en avant Circle of Six (réseau de sécurité personnel) et la communauté (VibeSphere, événements Luna). Compte démo vérifié : [identifiants]. »
4. **Compte de démo pré-vérifié** + éventuellement un lien vidéo de démonstration.

> Le changement de perception vient du **build + captures + preview**, la note ne fait que pointer les changements.

---

## 7. Évaluation réaliste

Soyons directs : le 4.3(b) sur une app à composante rencontre est l'un des rejets les plus durs, et **rien ne garantit** la levée même après ce plan. L'ordre de probabilité de succès :

1. **Repositionnement métadonnées + UX (Axes 1–3)** → meilleure chance, à faire en premier.
2. **Appel Board une fois le repositionnement fait** → l'appel a du poids *parce qu'il pointe des changements concrets*, pas parce qu'il ré-argumente.
3. **Plan B — PWA / web app** (suggéré par Apple lui-même) : votre backend web existe déjà sur sferaluna.com. Une PWA installable sur l'écran d'accueil contourne entièrement l'App Review, au prix des paiements (pas de Stripe natif → Stripe web, ok) et des push (Web Push iOS 16.4+, ok mais moins fluide). À garder comme filet de sécurité si la resoumission échoue.

---

## 8. Checklist priorisée

**Semaine 1 — Métadonnées (sans code)**
- [ ] Changer catégorie primaire → Lifestyle / Réseaux sociaux
- [ ] Réécrire sous-titre (sécurité/communauté avant rencontre)
- [ ] Réordonner captures : KYC → Circle of Six → communauté → découverte
- [ ] Réécrire description + mots-clés
- [ ] Produire une App Preview vidéo orientée sécurité/communauté

**Semaine 1–2 — UX / build**
- [ ] Rendre le KYC obligatoire et bloquant dès l'onboarding
- [ ] Reléguer le swipe : hub communauté/sécurité en accueil, ou passer la découverte en liste de profils vérifiés
- [ ] Onglet Circle of Six / Sécurité visible en navigation principale
- [ ] Purger tout asset/texte placeholder issu du template
- [ ] Trancher le support iPad (`supportsTablet`)

**Semaine 2 — Resoumission**
- [ ] Nouveau build + métadonnées à jour
- [ ] Note reviewer factuelle + compte démo pré-vérifié
- [ ] Si re-rejet : appel Board pointant les changements, puis bascule plan B PWA

---

*Prochaine étape suggérée : commencer par l'Axe 1 (métadonnées) — c'est le plus gros levier, sans toucher au code, et faisable aujourd'hui dans App Store Connect.*
