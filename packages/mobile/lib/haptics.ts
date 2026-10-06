/**
 * lib/haptics.ts — Retours haptiques SferaLuna
 *
 * Wrappé dans try/catch : fonctionne sans expo-haptics (preview web,
 * build avant bun install). Dès que le package est présent, les haptics
 * s'activent automatiquement.
 *
 * Dosage :
 *  light   → tap, navigation, sélection
 *  medium  → invitation, envoi message, toggle
 *  heavy   → action irréversible
 *  success → nouvelle connexion, paiement réussi
 *  warning → alerte
 *  error   → échec
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getHaptics(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-haptics');
  } catch {
    return null;
  }
}

/**
 * Lance un retour haptique sans jamais faire échouer l'appelant : sur le web,
 * expo-haptics renvoie une promesse rejetée, qu'un simple try/catch ne voit pas.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function run(fn: (h: any) => unknown): void {
  try {
    const h = getHaptics();
    if (!h) return;
    const result = fn(h) as { catch?: (onRejected: () => void) => unknown } | undefined;
    result?.catch?.(() => {});
  } catch { /* web / non disponible */ }
}

export function hapticLight(): void {
  run((h) => h.impactAsync(h.ImpactFeedbackStyle.Light));
}

export function hapticMedium(): void {
  run((h) => h.impactAsync(h.ImpactFeedbackStyle.Medium));
}

export function hapticHeavy(): void {
  run((h) => h.impactAsync(h.ImpactFeedbackStyle.Heavy));
}

export function hapticSuccess(): void {
  run((h) => h.notificationAsync(h.NotificationFeedbackType.Success));
}

export function hapticWarning(): void {
  run((h) => h.notificationAsync(h.NotificationFeedbackType.Warning));
}

export function hapticError(): void {
  run((h) => h.notificationAsync(h.NotificationFeedbackType.Error));
}
