import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Image, Easing } from 'react-native';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from '../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../lib/theme';
import { getSession } from '../lib/auth';
import { isBiometricUnlockEnabled, authenticateWithBiometrics } from '../lib/biometrics';

const { width, height } = Dimensions.get('window');

// Garde le splash natif (assets/splash-logo.png, voir app.json) affiché tant
// qu'on n'a pas explicitement décidé de le masquer — évite le flash blanc /
// le "saut" visuel entre le splash natif et ce composant React.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Au lancement, deux vérifications en cascade :
 *
 * 1. Biométrie (locale, instantanée) — si la connexion biométrique est
 *    activée (voir lib/biometrics.ts), on exige un déverrouillage Face ID /
 *    Touch ID en tout premier, avant même de contacter le backend. C'est
 *    un verrou local qui complète l'authentification serveur, il ne la
 *    remplace pas — mais il doit s'afficher dès l'ouverture de l'app, sans
 *    dépendre de la latence réseau.
 * 2. Session NextAuth (cookie HTTP-only persisté nativement — voir
 *    lib/http.ts) — vérifiée ensuite pour savoir si l'utilisatrice reste
 *    connectée d'un lancement à l'autre. Tant qu'elle ne se déconnecte pas
 *    explicitement (lib/auth.ts → signOut), elle n'a pas à se reconnecter.
 */
type Destination = '/(app)/(tabs)/discover' | '/(auth)/onboarding' | '/(auth)/login';

/**
 * Résout la destination ET expose, via le callback `onBiometricPrompt`, le
 * moment exact où le verrou Face ID / Touch ID s'affiche — utilisé par le
 * composant pour adapter le texte affiché ("Vérification biométrique…") et
 * garantir que ce prompt apparaît bien PENDANT l'écran de chargement, avant
 * toute navigation, sur iOS comme sur Android.
 */
async function resolveDestination(
  onBiometricPrompt: () => void
): Promise<Destination> {
  // La lecture de la préférence biométrique est 100 % locale (SecureStore),
  // donc quasi instantanée — on la teste AVANT tout appel réseau pour
  // garantir que le verrou Face ID / Touch ID se déclenche dès l'ouverture
  // de l'appli, sur iOS comme sur Android, même sur une connexion lente ou
  // hors-ligne. Si la vérification réseau de la session passait en premier,
  // le prompt biométrique pourrait apparaître bien après le splash visuel
  // en cas de réseau lent — ce qui n'est pas le comportement souhaité.
  const biometricsRequired = await isBiometricUnlockEnabled();
  if (biometricsRequired) {
    onBiometricPrompt();
    const unlocked = await authenticateWithBiometrics(
      'Déverrouillez SferaLuna pour continuer'
    );
    if (!unlocked) return '/(auth)/login';
  }

  try {
    const session = await getSession();
    if (!session) return '/(auth)/onboarding';
    return '/(app)/(tabs)/discover';
  } catch {
    // Session invalide / expirée / pas de réseau → on repart de l'onboarding,
    // l'utilisatrice pourra se reconnecter normalement.
    return '/(auth)/onboarding';
  }
}

export default function AppSplashScreen() {
  const [statusLabel, setStatusLabel] = useState("L'amour sous les étoiles");

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Le composant rend exactement le même logo / fond que le splash natif
    // (assets/splash-logo.png) : on peut donc le masquer dès ce premier
    // rendu sans aucun flash ni saut visuel, puis enchaîner sur l'animation.
    SplashScreen.hideAsync().catch(() => {});

    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    let cancelled = false;
    const minDelay = new Promise((resolve) => setTimeout(resolve, 1800));

    Promise.all([
      resolveDestination(() => {
        if (!cancelled) setStatusLabel('Vérification biométrique…');
      }),
      minDelay,
    ]).then(([destination]) => {
      if (!cancelled) {
        router.replace(destination);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const glowOpacity = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.4] });
  const glowScale = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

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

      <Animated.View
        style={[styles.content, { opacity: fade, transform: [{ scale }] }]}
      >
        {/* Logo SferaLuna */}
        <View style={styles.logoWrapper}>
          <Animated.View
            style={[
              styles.logoGlow,
              { opacity: glowOpacity, transform: [{ scale: glowScale }] },
            ]}
          />
          <Image
            source={require('../assets/splash-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.tagline}>{statusLabel}</Text>

        {/* Pulse dots */}
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.dot, i === 1 && styles.dotActive]}
            />
          ))}
        </View>
      </Animated.View>
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
  logoWrapper: {
    position: 'relative',
    width: 220,
    height: 220,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 220,
    height: 220,
    zIndex: 2,
  },
  logoGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.accentPurple,
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
