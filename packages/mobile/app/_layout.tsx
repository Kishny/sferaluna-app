import { useEffect, useRef } from "react";
import { Slot, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "../components/ErrorBoundary";
import {
  registerForPushNotifications,
  setupNotificationHandlers,
  navigateFromNotification,
  clearBadge,
} from "../lib/notifications";
// @ts-ignore
import * as Notifications from 'expo-notifications';

// ── Gestionnaire global d'erreurs JS fatales ──────────────────────────────
// Intercepte les erreurs JS non-catchées AVANT qu'expo-updates ne les reçoive
// et ne lance sa recovery pipeline (qui crashe au bout de 5s sur iOS 26 si
// aucun update n'est disponible). On log l'erreur et on laisse RN la gérer
// normalement — cela permet de voir le message d'erreur dans les logs EAS.
if (typeof ErrorUtils !== 'undefined') {
  const previousHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.error(
      `[SferaLuna] Erreur JS ${isFatal ? 'FATALE' : ''} interceptée :`,
      error?.message ?? String(error),
      '\nStack:', error?.stack ?? '(pas de stack)'
    );
    if (previousHandler) previousHandler(error, isFatal);
  });
}

/**
 * Configuration globale du cache TanStack Query.
 *
 * staleTime : 60 s — une donnée fraîche de moins d'une minute est servie
 * instantanément depuis le cache sans déclencher de requête réseau.
 * Résultat : la navigation entre onglets est immédiate.
 *
 * gcTime : 10 min — les données non affichées restent en mémoire 10 min
 * (utile pour revenir sur un écran après un appel ou un SMS).
 *
 * retry : 1 — en cas d'erreur réseau, on retente une seule fois au lieu de 3
 * (évite d'attendre 3 × le timeout sur connexion faible).
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 60 s
      gcTime: 10 * 60 * 1000,      // 10 min
      retry: 1,
      refetchOnWindowFocus: false,  // inutile sur mobile (pas de "fenêtre")
    },
  },
});

export default function RootLayout() {
  const router = useRouter();
  const routerReady = useRef(false);

  useEffect(() => {
    routerReady.current = true;

    // Demande de permission + enregistrement du token push
    // .catch() obligatoire : une rejection non-gérée est fatale sur RN 0.81
    registerForPushNotifications().catch((err) =>
      console.warn('[Push] Erreur enregistrement:', err)
    );

    // Handlers foreground / tap-to-open (background → premier plan)
    let cleanup: (() => void) | undefined;
    try {
      cleanup = setupNotificationHandlers({
        onNotificationResponse: (response) => {
          const data = response.notification.request.content.data as Record<string, unknown>;
          navigateFromNotification(data, router);
        },
      });
    } catch (err) {
      console.warn('[Notifs] Erreur setup handlers:', err);
    }

    // Cold launch : app tuée → tap sur une notification
    // getLastNotificationResponseAsync retourne la réponse qui a ouvert l'app
    Notifications.getLastNotificationResponseAsync()
      .then(
        (response: { notification: { request: { content: { data: Record<string, unknown> } } } } | null) => {
          if (response) {
            const data = response.notification.request.content.data as Record<string, unknown>;
            // Petit délai pour que la navigation soit prête
            setTimeout(() => navigateFromNotification(data, router), 300);
          }
        }
      )
      .catch((err: unknown) => console.warn('[Notifs] getLastNotificationResponseAsync:', err));

    // Vide le badge au lancement
    clearBadge().catch((err: unknown) => console.warn('[Badge] clearBadge:', err));

    return () => cleanup?.();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Slot />
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
