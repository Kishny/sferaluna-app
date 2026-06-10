/**
 * Connexion biométrique (Face ID / Touch ID / empreinte) — superpose un
 * verrou local au-dessus de la session NextAuth déjà persistée (cookie
 * HTTP-only, voir lib/http.ts et app/index.tsx).
 *
 * La biométrie ne remplace JAMAIS l'authentification serveur : elle ne fait
 * que conditionner l'accès à une session déjà valide. La préférence
 * "activée/désactivée" est stockée localement via expo-secure-store
 * (Keychain iOS / Keystore Android), jamais envoyée au backend.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_PREFERENCE_KEY = 'sferaluna_biometric_unlock_enabled';

/**
 * `true` si l'appareil dispose d'un capteur biométrique ET qu'au moins un
 * profil (visage / empreinte) y est enregistré. On masque le réglage côté
 * UI si l'une de ces deux conditions n'est pas remplie — inutile de proposer
 * une option qui échouerait systématiquement.
 */
export async function isBiometricHardwareAvailable(): Promise<boolean> {
  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

/**
 * Libellé FR adapté au type de capteur détecté (Face ID vs Touch ID /
 * empreinte) — purement cosmétique, pour un libellé de réglage plus parlant.
 */
export async function getBiometricLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Touch ID / empreinte';
    }
    return 'Biométrie';
  } catch {
    return 'Biométrie';
  }
}

/** Lit la préférence locale "verrou biométrique activé". */
export async function isBiometricUnlockEnabled(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(BIOMETRIC_PREFERENCE_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/** Active ou désactive le verrou biométrique au lancement de l'app. */
export async function setBiometricUnlockEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_PREFERENCE_KEY, 'true');
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIC_PREFERENCE_KEY);
  }
}

/**
 * Déclenche le prompt natif Face ID / Touch ID. Renvoie `true` uniquement
 * en cas de succès — tout échec (annulation, échec de reconnaissance,
 * fallback code refusé...) renvoie `false` sans lever d'exception, pour que
 * l'appelant puisse simplement rediriger vers l'écran de connexion classique.
 */
export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Annuler',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
