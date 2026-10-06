import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '../../lib/theme';
import { registerForPushNotifications } from '../../lib/notifications';
import { VerificationOverlay } from '../../components/VerificationGate';
import { ProfileSetupOverlay } from '../../components/ProfileSetup';

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
    <View style={{ flex: 1, backgroundColor: Colors.bgDeep }}>
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

      {/* Gate « vérification d'identité obligatoire » : superposé au navigateur,
          il couvre l'app tant que identityVerified !== true (voir
          components/VerificationGate.tsx). */}
      <VerificationOverlay />
      {/* Création du profil à la première connexion, affichée avant la
          vérification d'identité (voir components/ProfileSetup.tsx). */}
      <ProfileSetupOverlay />
    </View>
  );
}
