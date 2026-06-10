import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from '../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../lib/theme';
import { getSession } from '../lib/auth';
import { isBiometricUnlockEnabled, authenticateWithBiometrics } from '../lib/biometrics';

const { width, height } = Dimensions.get('window');

/**
 * Au lancement : on vérifie la VRAIE session NextAuth (cookie HTTP-only
 * persisté nativement par le moteur réseau — voir lib/http.ts) plutôt que
 * de toujours renvoyer vers l'onboarding. Tant que l'utilisatrice ne se
 * déconnecte pas explicitement (lib/auth.ts → signOut), elle reste connectée
 * d'un lancement à l'autre.
 *
 * Si la connexion biométrique est activée (voir lib/biometrics.ts), on
 * exige un déverrouillage Face ID / Touch ID avant d'entrer dans l'app —
 * mais uniquement lorsqu'une session valide existe déjà (la biométrie
 * complète l'authentification, elle ne la remplace pas).
 */
async function resolveDestination(): Promise<'/(app)/(tabs)/discover' | '/(auth)/onboarding' | '/(auth)/login'> {
  try {
    const session = await getSession();
    if (!session) return '/(auth)/onboarding';

    const biometricsRequired = await isBiometricUnlockEnabled();
    if (biometricsRequired) {
      const unlocked = await authenticateWithBiometrics(
        'Déverrouillez SferaLuna pour continuer'
      );
      if (!unlocked) return '/(auth)/login';
    }

    return '/(app)/(tabs)/discover';
  } catch {
    // Session invalide / expirée / pas de réseau → on repart de l'onboarding,
    // l'utilisatrice pourra se reconnecter normalement.
    return '/(auth)/onboarding';
  }
}

export default function SplashScreen() {
  useEffect(() => {
    let cancelled = false;

    const minDelay = new Promise((resolve) => setTimeout(resolve, 2200));

    Promise.all([resolveDestination(), minDelay]).then(([destination]) => {
      if (!cancelled) {
        router.replace(destination);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LinearGradient
      colors={[Colors.bgDeep, Colors.bgMid, Colors.bgSurface]}
      style={styles.container}
    >
      <StatusBar style="light" />

      {/* Stars decoration */}
      {[...Array(20)].map((_, i) => (
        <View
          key={i}
          style={[
            styles.star,
            {
              left: Math.random() * width,
              top: Math.random() * height * 0.6,
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              opacity: Math.random() * 0.8 + 0.2,
            },
          ]}
        />
      ))}

      <View style={styles.content}>
        {/* Moon icon */}
        <View style={styles.moonWrapper}>
          <Text style={styles.moon}>🌙</Text>
          <View style={styles.moonGlow} />
        </View>

        <Text style={styles.brand}>SferaLuna</Text>
        <Text style={styles.tagline}>L'amour sous les étoiles</Text>

        {/* Pulse dots */}
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.dot, i === 1 && styles.dotActive]}
            />
          ))}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 99,
  },
  content: {
    alignItems: 'center',
  },
  moonWrapper: {
    position: 'relative',
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moon: {
    fontSize: 72,
    zIndex: 2,
  },
  moonGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.accentPurple,
    opacity: 0.25,
  },
  brand: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 2,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textSecondary,
    letterSpacing: 1,
    fontStyle: 'italic',
    marginBottom: 48,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
  },
  dotActive: {
    backgroundColor: Colors.accentPink,
    width: 20,
    borderRadius: 3,
  },
});
