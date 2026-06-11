import { useEffect, useRef } from "react";
import { Slot, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { OneDollarStatsProvider } from "../lib/analytics";
import {
  registerForPushNotifications,
  setupNotificationHandlers,
  navigateFromNotification,
  clearBadge,
} from "../lib/notifications";
// @ts-ignore
import * as Notifications from 'expo-notifications';
import appJson from "../app.json";

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

const applicationId = appJson.expo.extra.applicationId ?? "";
const hostname = applicationId ? `${applicationId}-mobile` : "localhost";

export default function RootLayout() {
  const router = useRouter();
  const routerReady = useRef(false);

  useEffect(() => {
    routerReady.current = true;

    // Demande de permission + enregistrement du token push
    registerForPushNotifications();

    // Handlers foreground / tap-to-open (background → premier plan)
    const cleanup = setupNotificationHandlers({
      onNotificationResponse: (response) => {
        const data = response.notification.request.content.data as Record<string, unknown>;
        navigateFromNotification(data, router);
      },
    });

    // Cold launch : app tuée → tap sur une notification
    // getLastNotificationResponseAsync retourne la réponse qui a ouvert l'app
    Notifications.getLastNotificationResponseAsync().then(
      (response: { notification: { request: { content: { data: Record<string, unknown> } } } } | null) => {
        if (response) {
          const data = response.notification.request.content.data as Record<string, unknown>;
          // Petit délai pour que la navigation soit prête
          setTimeout(() => navigateFromNotification(data, router), 300);
        }
      }
    );

    // Vide le badge au lancement
    clearBadge();

    return cleanup;
  }, []);

  return (
    <ErrorBoundary>
      {/* Runable analytics provider — do not remove, required for analytics tracking */}
      <OneDollarStatsProvider
        config={{
          hostname,
          collectorUrl: "https://r.lilstts.com/events",
          devmode: true,
        }}
      >
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <Slot />
          </QueryClientProvider>
        </SafeAreaProvider>
      </OneDollarStatsProvider>
    </ErrorBoundary>
  );
}
