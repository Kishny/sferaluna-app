/**
 * lib/haptics.ts — Retours haptiques SferaLuna
 *
 * Wrappé dans try/catch : fonctionne sans expo-haptics (preview web,
 * build avant bun install). Dès que le package est présent, les haptics
 * s'activent automatiquement.
 *
 * Dosage :
 *  light   → tap, navigation, sélection
 *  medium  → like, envoi message, toggle
 *  heavy   → action irréversible
 *  success → match, paiement réussi
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

export function hapticLight(): void {
  try {
    const h = getHaptics();
    h?.impactAsync(h.ImpactFeedbackStyle.Light);
  } catch { /* web / non disponible */ }
}

export function hapticMedium(): void {
  try {
    const h = getHaptics();
    h?.impactAsync(h.ImpactFeedbackStyle.Medium);
  } catch { /* web / non disponible */ }
}

export function hapticHeavy(): void {
  try {
    const h = getHaptics();
    h?.impactAsync(h.ImpactFeedbackStyle.Heavy);
  } catch { /* web / non disponible */ }
}

export function hapticSuccess(): void {
  try {
    const h = getHaptics();
    h?.notificationAsync(h.NotificationFeedbackType.Success);
  } catch { /* web / non disponible */ }
}

export function hapticWarning(): void {
  try {
    const h = getHaptics();
    h?.notificationAsync(h.NotificationFeedbackType.Warning);
  } catch { /* web / non disponible */ }
}

export function hapticError(): void {
  try {
    const h = getHaptics();
    h?.notificationAsync(h.NotificationFeedbackType.Error);
  } catch { /* web / non disponible */ }
}

/** Like → Medium, Pass → Light */
export function hapticSwipeRelease(liked: boolean): void {
  if (liked) hapticMedium(); else hapticLight();
}
