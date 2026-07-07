import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../lib/theme';
import { registerForPushNotifications } from '../../lib/notifications';

export default function AppLayout() {
  // Ce layout ne monte QUE dans la zone authentifiée (après login / session
  // valide). C'est donc l'endroit sûr pour enregistrer le token push : la
  // session NextAuth existe, PUT /api/users/push-token n'échouera pas en 401.
  useEffect(() => {
    registerForPushNotifications().catch((err) =>
      console.warn('[Push] Erreur enregistrement:', err)
    );
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bgDeep },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="premium"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerShown: false,
        }}
      />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="confidentialite" options={{ headerShown: false }} />
      <Stack.Screen name="securite" options={{ headerShown: false }} />
    </Stack>
  );
}
