/**
 * Push Notifications — SferaLuna Mobile
 *
 * Gère :
 *   - La demande de permission iOS/Android
 *   - L'obtention du token Expo Push Notifications
 *   - L'enregistrement du token sur le backend SferaLuna
 *   - Les handlers d'arrivée de notifications (app ouverte + background)
 *
 * Usage dans _layout.tsx (app root) :
 *   import { registerForPushNotifications, setupNotificationHandlers } from '../lib/notifications';
 *   useEffect(() => { registerForPushNotifications(); setupNotificationHandlers(); }, []);
 *
 * Prérequis EAS :
 *   - FCM (Android) : google-services.json dans /android/app/ (ajouté par eas build)
 *   - APNs (iOS)    : certificat push dans le compte Apple Developer (géré par EAS)
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { http } from './http';
import { getSession } from './auth';

// ── Disponibilité des notifications natives ────────────────────────────────
// expo-notifications N'EST PLUS supporté dans Expo Go (retiré depuis SDK 53) :
// son simple import y déclenche `new NativeEventEmitter(null)` → crash fatal.
// On ne charge donc la lib QUE dans un dev build / build standalone, et jamais
// sur le web. Le chargement est paresseux (require) pour qu'aucune évaluation
// de module natif n'ait lieu tant qu'on n'est pas dans un environnement sûr.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';
export const PUSH_SUPPORTED = Platform.OS !== 'web' && !IS_EXPO_GO;

let _notifs: any = null;
let _handlerConfigured = false;

/** Charge expo-notifications à la demande, ou null si l'environnement ne le permet pas. */
function notifs(): any | null {
  if (!PUSH_SUPPORTED) return null;
  if (_notifs) return _notifs;
  try {
    // require paresseux : évite toute évaluation du module natif en Expo Go / web.
    _notifs = require('expo-notifications');
  } catch (err) {
    console.warn('[Notifs] expo-notifications indisponible:', err);
    return null;
  }
  // Configure le comportement d'affichage une seule fois, à la première utilisation.
  if (!_handlerConfigured) {
    try {
      _notifs.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      _handlerConfigured = true;
    } catch (err) {
      console.warn('[Notifs] setNotificationHandler failed:', err);
    }
  }
  return _notifs;
}

// ── Obtenir le token push ──────────────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  const Notifications = notifs();
  if (!Notifications) {
    console.log('[Push] Environnement sans support push (Expo Go / web) — désactivé.');
    return null;
  }

  // Session requise : sans cookie NextAuth valide, PUT /api/users/push-token
  // renverrait 401. On diffère donc l'enregistrement tant que l'utilisatrice
  // n'est pas connectée (rappelé depuis (app)/_layout, monté après login).
  const session = await getSession().catch(() => null);
  if (!session) {
    console.log('[Push] Pas de session active — enregistrement du token différé.');
    return null;
  }

  // Les simulateurs ne supportent pas les push notifications réelles
  let Device: any = null;
  try {
    Device = require('expo-device');
  } catch {
    /* expo-device indisponible — on continue sans le garde simulateur */
  }
  if (Device && !Device.isDevice) {
    console.log('[Push] Simulateur détecté — push notifications désactivées.');
    return null;
  }

  // Vérification / demande de permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permission refusée.');
    return null;
  }

  // Canal Android (obligatoire pour Android 8+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'SferaLuna',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ec4899',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Nouveaux messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200],
      lightColor: '#a855f7',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('matches', {
      name: 'Nouveaux matches',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 150, 300],
      lightColor: '#ec4899',
      sound: 'default',
    });
  }

  // Récupération du token Expo Push
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  });

  const pushToken = tokenData.data;
  console.log('[Push] Token:', pushToken);

  // Enregistrement sur le backend (silencieux en cas d'échec)
  try {
    await savePushTokenToBackend(pushToken);
  } catch (err) {
    console.warn('[Push] Échec enregistrement token:', err);
  }

  return pushToken;
}

/** Envoie le token push au backend pour l'associer au compte. */
async function savePushTokenToBackend(token: string): Promise<void> {
  await http.put('/api/users/push-token', { pushToken: token });
}

// ── Handlers de notification ───────────────────────────────────────────────

/**
 * À appeler une fois au démarrage de l'app (app/_layout.tsx).
 * Retourne une fonction de nettoyage.
 */
export function setupNotificationHandlers(options?: {
  onNotification?: (notification: any) => void;
  onNotificationResponse?: (response: any) => void;
}): () => void {
  const Notifications = notifs();
  if (!Notifications) return () => {};

  // Notification reçue app ouverte (foreground)
  const foregroundSub = Notifications.addNotificationReceivedListener(
    (notification: any) => {
      console.log('[Push] Reçue (foreground):', notification.request.content.title);
      options?.onNotification?.(notification);
    }
  );

  // Tap sur une notification (foreground ou background → premier plan)
  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response: any) => {
      console.log('[Push] Tap:', response.notification.request.content.data);
      options?.onNotificationResponse?.(response);
    }
  );

  return () => {
    foregroundSub.remove();
    responseSub.remove();
  };
}

/**
 * Réponse de notification ayant ouvert l'app (cold launch).
 * Garde l'appelant (_layout) libre de toute dépendance à expo-notifications.
 */
export async function getLastNotificationResponse(): Promise<any | null> {
  const Notifications = notifs();
  if (!Notifications) return null;
  try {
    return await Notifications.getLastNotificationResponseAsync();
  } catch (err) {
    console.warn('[Notifs] getLastNotificationResponse:', err);
    return null;
  }
}

/**
 * Navigue vers le bon écran selon le payload de notification.
 * Le router est passé en paramètre pour éviter toute dépendance circulaire
 * et pour garantir qu'il est monté avant l'appel.
 *
 * Payload attendu côté backend :
 *   { type: 'new_message', matchId: '...' }
 *   { type: 'new_match' }
 *   { type: 'profile_visit' }
 *   { type: 'notification' }  ← fallback générique
 */
export function navigateFromNotification(
  data: Record<string, unknown>,
  router: { push: (href: any) => void }
) {
  const type = data?.type as string | undefined;

  if (type === 'new_message' && data.matchId) {
    router.push(`/(app)/chat/${data.matchId}` as any);
  } else if (type === 'new_match' && data.matchId) {
    // Cas de la relance "aucun message depuis 24h" (matchId fourni) :
    // direction la conversation plutôt que la liste, c'est plus actionnable.
    router.push(`/(app)/chat/${data.matchId}` as any);
  } else if (type === 'new_match') {
    router.push('/(app)/(tabs)/messages' as any);
  } else if (type === 'profile_visit') {
    router.push('/(app)/(tabs)/profile' as any);
  } else {
    router.push('/(app)/(tabs)/notifications' as any);
  }
}

// ── Gestion du badge ───────────────────────────────────────────────────────

export async function setBadgeCount(count: number): Promise<void> {
  const Notifications = notifs();
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {
    // Non supporté sur certaines versions Android
  }
}

export async function clearBadge(): Promise<void> {
  await setBadgeCount(0);
}
