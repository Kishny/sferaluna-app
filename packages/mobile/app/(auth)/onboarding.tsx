import React, { useState, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, Dimensions, FlatList,
  TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from '../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientButton } from '../../components/GradientButton';
import { Colors, Spacing } from '../../lib/theme';

const { width, height } = Dimensions.get('window');

const SFERALUNA_LOGO = require('../../assets/branding/logo-icon.png');

type Slide = {
  id: string;
  title: string;
  subtitle: string;
  emoji?: string;
  logo?: boolean;
};

const slides: Slide[] = [
  {
    id: '1',
    logo: true,
    title: 'Bienvenue sur SferaLuna',
    subtitle: 'L\'application de rencontre conçue pour les femmes qui cherchent une relation authentique et profonde.',
  },
  {
    id: '2',
    emoji: '✨',
    title: 'Des connexions sincères',
    subtitle: 'Rencontrez des personnes qui partagent vos valeurs. Qualité plutôt que quantité — pour des liens qui durent.',
  },
  {
    id: '3',
    emoji: '💫',
    title: 'Votre sécurité avant tout',
    subtitle: 'Profils vérifiés, espace bienveillant, modération active. Vous méritez un endroit où vous sentir en sécurité.',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.push('/(auth)/register');
    }
  };

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Skip */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.skipText}>Se connecter</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={slides}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <View style={styles.emojiWrapper}>
                {item.logo ? (
                  <Image source={SFERALUNA_LOGO} style={styles.logo} resizeMode="contain" />
                ) : (
                  <Text style={styles.emoji}>{item.emoji}</Text>
                )}
                <View style={styles.glow} />
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          )}
        />

        {/* Indicators */}
        <View style={styles.indicators}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.indicator,
                i === currentIndex && styles.indicatorActive,
              ]}
            />
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <GradientButton
            label={currentIndex === slides.length - 1 ? 'Commencer' : 'Suivant'}
            onPress={handleNext}
          />
          {currentIndex === slides.length - 1 && (
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={styles.loginLink}
            >
              <Text style={styles.loginText}>
                Déjà un compte ?{' '}
                <Text style={styles.loginHighlight}>Se connecter</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#1a0b2e' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emojiWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  emoji: {
    fontSize: 88,
    zIndex: 2,
  },
  logo: {
    width: 180,
    height: 180,
    zIndex: 2,
    borderRadius: 90,
  },
  glow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.accentPurple,
    opacity: 0.18,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
  },
  indicatorActive: {
    backgroundColor: Colors.accentPink,
    width: 24,
    borderRadius: 4,
  },
  actions: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: 16,
  },
  loginLink: { alignItems: 'center', paddingVertical: 4 },
  loginText: { color: Colors.textSecondary, fontSize: 14 },
  loginHighlight: { color: Colors.accentPink, fontWeight: '600' },
});
