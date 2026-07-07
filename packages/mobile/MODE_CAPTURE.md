# Mode capture — Données de démo pour les captures App Store

Contenu **100 % fictif** servi à la place du backend pour remplir les écrans lors des captures d'écran de la fiche App Store. Aucune donnée réelle, aucun appel réseau.

## Activer / désactiver

```bash
# Lancer la preview web avec les données de démo (port 4300)
cd packages/mobile
EXPO_PUBLIC_DEMO_MODE=1 bun run web

# Comportement normal (API réelle) : lancer sans la variable
bun run web
```

Sur simulateur iOS :

```bash
EXPO_PUBLIC_DEMO_MODE=1 bun run ios
```

> ⚠️ **Ne jamais** produire un build EAS de production avec `EXPO_PUBLIC_DEMO_MODE=1`.
> Ce flag est réservé aux sessions de capture.

## Ce qui est rempli

| Écran | Contenu de démo |
|---|---|
| Découverte | 5 profils vérifiés (photos, intérêts, intentions) |
| Mon profil | Margaux, 34, Toulouse — profil 100 %, identité vérifiée, Mode Fantôme actif |
| Messages | 3 matches avec dernier message |
| Chat | Conversation crédible (mentionne identité vérifiée + rencontre en confiance) |
| Alertes | 7 notifications (2 messages, 3 matches, 2 visites) |
| VibeSphere | 4 humeurs postées (joyeuse, sereine, amoureuse, curieuse) |
| VibeMentor | 3 questions — dont une **Sécurité** résolue citant le Circle of Six |
| Événements Luna | 3 événements (apéro, atelier photo, cercle sécurité) |
| Circle of Six | 6 profils avec scores de compatibilité |
| Visiteurs | 4 visiteuses récentes |
| VibePlanner | 2 plans de sortie (café accepté, expo en attente) |

## Ordre de captures recommandé (stratégie anti-4.3)

Mettre les **différenciateurs en premier**, pas le swipe :

1. **VibeMentor — question Sécurité** (Circle of Six visible) → « ta sécurité d'abord »
2. **Profil vérifié** (badge identité vérifiée) → authenticité
3. **Événements Luna** (communauté réelle) → au-delà du dating
4. **VibeSphere** (feed vivant)
5. **Découverte** (swipe) — plus loin dans la séquence
6. **Chat** (conversation en confiance)

Ajoute une légende courte sur chaque capture : « Identité vérifiée », « Ton cercle de sécurité », « Une vraie communauté ».

## Fichiers

- `lib/demoData.ts` — le contenu fictif (typé aux interfaces de `lib/api.ts`)
- `lib/demoMode.ts` — le routeur (mappe chaque route GET vers sa donnée)
- `lib/http.ts` — intercepteur : court-circuite `fetch` quand le flag est actif

Pour modifier un texte/profil, éditer `lib/demoData.ts` uniquement.
