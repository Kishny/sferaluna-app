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
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — installed via bun install (expo-notifications ~0.30.25)
import * as Notifications from 'expo-notifications';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — installed via bun install (expo-device ~7.1.4)
import * as Device from 'expo-device';
import { http } from './http';

// ── Configuration du comportement des notifications ────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Obtenir le token push ──────────────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  // Les simulateurs ne supportent pas les push notifications réelles
  if (!Device.isDevice) {
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
  onNotification?: (notification: Notifications.Notification) => void;
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void;
}): () => void {
  // Notification reçue app ouverte (foreground)
  const foregroundSub = Notifications.addNotificationReceivedListener(
    (notification: Notifications.Notification) => {
      console.log('[Push] Reçue (foreground):', notification.request.content.title);
      options?.onNotification?.(notification);
    }
  );

  // Tap sur une notification (foreground ou background → premier plan)
  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response: Notifications.NotificationResponse) => {
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
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {
    // Non supporté sur certaines versions Android
  }
}

export async function clearBadge(): Promise<void> {
  await setBadgeCount(0);
}
