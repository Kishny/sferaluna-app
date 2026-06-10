/**
 * Temps réel — pont vers Pusher (canaux privés) du backend SferaLuna existant
 * (/Users/jeyko.dev/Projects/sferaluna — réutilisé tel quel, ne pas recréer).
 *
 * Canaux utilisés par le backend (voir src/lib/pusher.ts et
 * src/app/api/pusher/auth/route.ts) :
 *   - private-match-{matchId}  → événement "new-message"
 *   - private-user-{userId}    → événement "new-match"
 *
 * L'autorisation des canaux privés passe par POST /api/pusher/auth, protégée
 * par la session NextAuth (cookie `next-auth.session-token` envoyé
 * automatiquement via `credentials: 'include'`, comme dans lib/http.ts).
 *
 * Configuration requise côté app : EXPO_PUBLIC_PUSHER_KEY et
 * EXPO_PUBLIC_PUSHER_CLUSTER (valeurs publiques NEXT_PUBLIC_PUSHER_KEY /
 * NEXT_PUBLIC_PUSHER_CLUSTER du backend — voir CLAUDE.md). Tant qu'elles ne
 * sont pas définies, le chat reste utilisable sans mise à jour temps réel
 * (l'envoi/la lecture des messages continue de fonctionner via l'API REST).
 */
import Pusher from 'pusher-js';
import type { ChannelAuthorizationCallback } from 'pusher-js';
import Constants from 'expo-constants';
import { API_BASE_URL } from './http';

const PUSHER_KEY: string =
  (Constants.expoConfig?.extra?.pusherKey as string | undefined) ??
  process.env.EXPO_PUBLIC_PUSHER_KEY ??
  '';

const PUSHER_CLUSTER: string =
  (Constants.expoConfig?.extra?.pusherCluster as string | undefined) ??
  process.env.EXPO_PUBLIC_PUSHER_CLUSTER ??
  'eu';

let sharedClient: Pusher | null | undefined;

/**
 * Instance Pusher partagée, authentifiée via le cookie de session NextAuth.
 * Renvoie `null` si EXPO_PUBLIC_PUSHER_KEY n'est pas configurée.
 */
export function getPusherClient(): Pusher | null {
  if (sharedClient !== undefined) return sharedClient;

  if (!PUSHER_KEY) {
    sharedClient = null;
    return sharedClient;
  }

  sharedClient = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    channelAuthorization: {
      customHandler: (
        { socketId, channelName }: { socketId: string; channelName: string },
        callback: ChannelAuthorizationCallback
      ) => {
        fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/pusher/auth`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: new URLSearchParams({ socket_id: socketId, channel_name: channelName }).toString(),
        })
          .then(async (res) => {
            const data = await res.json().catch(() => null);
            if (!res.ok || !data) {
              callback(new Error("Échec de l'autorisation du canal temps réel."), null);
              return;
            }
            callback(null, data);
          })
          .catch((err) => callback(err instanceof Error ? err : new Error(String(err)), null));
      },
    },
  });

  return sharedClient;
}

/** Canal privé de messagerie d'un match — événement "new-message". */
export function matchChannelName(matchId: string): string {
  return `private-match-${matchId}`;
}

/** Canal privé utilisateur — événement "new-match" notamment. */
export function userChannelName(userId: string): string {
  return `private-user-${userId}`;
}
