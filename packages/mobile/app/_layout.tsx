import { useEffect } from "react";
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { OneDollarStatsProvider } from "../lib/analytics";
import { registerForPushNotifications, setupNotificationHandlers, clearBadge } from "../lib/notifications";
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
  useEffect(() => {
    // Demande de permission + enregistrement du token push
    registerForPushNotifications();

    // Handlers foreground / tap-to-open
    const cleanup = setupNotificationHandlers();

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
