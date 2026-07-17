/**
 * Accueil — hub communauté & sécurité.
 *
 * C'est désormais le PREMIER écran de l'app (à la place du swipe de découverte,
 * relégué à une carte secondaire, cf. (tabs)/_layout.tsx où `discover` est en
 * href:null). Deux objectifs :
 *
 * 1. Différenciation 4.3(b) : ce que voit le reviewer en ouvrant l'app, ce
 *    n'est plus un deck de profils « façon app de rencontre générique », mais un
 *    espace communauté + sécurité (Circle of Six, VibeSphere, VibeMentor,
 *    VibePlanner, Événements Luna).
 * 2. Découvrabilité : ces écrans existaient mais n'étaient liés depuis nulle
 *    part dans la navigation. Ils sont ici mis en avant.
 *
 * La découverte de profils vérifiés reste accessible (carte en bas), mais n'est
 * plus la vitrine de l'app.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  MoonStars, ShieldCheck, UsersThree, Lightbulb, CalendarBlank,
  Sparkle, Heart, CaretRight, SealCheck,
} from 'phosphor-react-native';
import { LinearGradient } from '../../../components/LinearGradient';
import { OrbitGlow } from '../../../components/OrbitGlow';
import { Colors, Spacing, Radius, Typography } from '../../../lib/theme';
import { fetchMyProfile } from '../../../lib/api';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Douce nuit';
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bel après-midi';
  return 'Bonsoir';
}

type HubItem = {
  icon: React.ComponentType<any>;
  title: string;
  subtitle: string;
  route: string;
  accent: readonly [string, string];
};

const COMMUNITY_ITEMS: HubItem[] = [
  {
    icon: UsersThree,
    title: 'VibeSphere',
    subtitle: 'Le fil de la communauté, au fil des humeurs',
    route: '/(app)/vibesphere',
    accent: ['#8E7AB5', '#D9B8FF'],
  },
  {
    icon: Lightbulb,
    title: 'VibeMentor',
    subtitle: "Questions, conseils et entraide entre membres",
    route: '/(app)/vibementor',
    accent: ['#FFD166', '#FF9A3C'],
  },
  {
    icon: CalendarBlank,
    title: 'VibePlanner',
    subtitle: 'Organisez vos sorties à plusieurs',
    route: '/(app)/vibeplanner',
    accent: ['#4ECDC4', '#44A08D'],
  },
];

export default function AccueilScreen() {
  const { data } = useQuery({ queryKey: ['profile', 'me'], queryFn: fetchMyProfile });
  const name =
    typeof data?.user.pseudonyme === 'string' && data.user.pseudonyme
      ? data.user.pseudonyme
      : null;

  // Halo pulsé derrière la carte « Découvrir & matcher » : attire l'œil sur le
  // point d'entrée des rencontres sans en faire la vitrine de l'app. Opacity +
  // useNativeDriver → compatible react-native-web, pas de reanimated.
  const glow = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.85, duration: 1300, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.4, duration: 1300, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  // Battement de cœur « lub-dub » sur l'icône de la carte rencontres, puis
  // pause. Transform scale + useNativeDriver → fluide et compatible web.
  const beat = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(beat, { toValue: 1.18, duration: 140, useNativeDriver: true }),
        Animated.timing(beat, { toValue: 1, duration: 130, useNativeDriver: true }),
        Animated.timing(beat, { toValue: 1.12, duration: 120, useNativeDriver: true }),
        Animated.timing(beat, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.delay(850),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [beat]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[Colors.bgDeep, Colors.bgMid]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <OrbitGlow size={220} variant="light" style={{ top: -60, right: -70 }} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* En-tête */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <MoonStars size={26} color={Colors.accentPink} weight="fill" />
              <View style={styles.verifiedPill}>
                <SealCheck size={14} color={Colors.success} weight="fill" />
                <Text style={styles.verifiedText}>Profil vérifié</Text>
              </View>
            </View>
            <Text style={styles.greeting}>
              {getGreeting()}
              {name ? `, ${name}` : ''}
            </Text>
            <Text style={styles.subGreeting}>
              Bienvenue dans votre espace sûr et bienveillant.
            </Text>
          </View>

          {/* Sécurité — mise en avant */}
          <Text style={styles.sectionLabel}>Votre sécurité</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(app)/circle')}
          >
            <LinearGradient
              colors={[Colors.accentPurple, Colors.accentPink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.safetyCard}
            >
              <View style={styles.safetyIcon}>
                <ShieldCheck size={28} color={Colors.textPrimary} weight="fill" />
              </View>
              <View style={styles.safetyBody}>
                <Text style={styles.safetyTitle}>Circle of Six</Text>
                <Text style={styles.safetySubtitle}>
                  Votre réseau de sécurité personnel. Partagez vos plans avec
                  des contacts de confiance.
                </Text>
              </View>
              <CaretRight size={20} color={Colors.textPrimary} weight="bold" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Communauté — grille compacte 3 colonnes (gagne de la hauteur vs
              la liste : une rangée au lieu de trois). */}
          <Text style={styles.sectionLabel}>Votre communauté</Text>
          <View style={styles.grid}>
            {COMMUNITY_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.route}
                style={styles.gridItem}
                activeOpacity={0.85}
                onPress={() => router.push(item.route as never)}
              >
                <LinearGradient
                  colors={item.accent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gridIcon}
                >
                  <item.icon size={24} color={Colors.textPrimary} weight="bold" />
                </LinearGradient>
                <Text style={styles.gridTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Événements */}
          <Text style={styles.sectionLabel}>À ne pas manquer</Text>
          <TouchableOpacity
            style={styles.item}
            activeOpacity={0.8}
            onPress={() => router.push('/(app)/evenements')}
          >
            <LinearGradient
              colors={['#FF6B6B', '#FF8E8E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.itemIcon}
            >
              <Sparkle size={22} color={Colors.textPrimary} weight="bold" />
            </LinearGradient>
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle}>Événements Luna</Text>
              <Text style={styles.itemSubtitle}>
                Rencontres et sorties organisées par la communauté
              </Text>
            </View>
            <CaretRight size={18} color={Colors.textMuted} weight="bold" />
          </TouchableOpacity>

          {/* Découverte — CTA rencontres, mis en avant (halo pulsé + dégradé)
              pour que les membres identifient clairement où « matcher ». */}
          <Text style={styles.sectionLabel}>Faire des rencontres</Text>
          <View style={styles.discoverWrap}>
            <Animated.View
              style={[styles.discoverGlow, { opacity: glow }]}
              pointerEvents="none"
            />
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push('/(app)/(tabs)/discover')}
            >
              <LinearGradient
                colors={['#F43F5E', '#DB2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.discoverCard}
              >
                <View style={styles.discoverIcon}>
                  <Animated.View style={{ transform: [{ scale: beat }] }}>
                    <Heart size={28} color={Colors.textPrimary} weight="fill" />
                  </Animated.View>
                </View>
                <View style={styles.safetyBody}>
                  <Text style={styles.safetyTitle}>Découvrir &amp; matcher</Text>
                  <Text style={styles.safetySubtitle}>
                    Likez les profils vérifiés qui vous plaisent — c'est ici que
                    les rencontres commencent.
                  </Text>
                </View>
                <CaretRight size={22} color={Colors.textPrimary} weight="bold" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Lien secondaire vers la sélection hebdo (ancien « Circle of Six »
              matching, renommé Affinités). Discret, pour ne pas surcharger. */}
          <TouchableOpacity
            style={styles.affinitesLink}
            activeOpacity={0.7}
            onPress={() => router.push('/(app)/affinites')}
          >
            <Sparkle size={16} color={Colors.mutedPurple} weight="fill" />
            <Text style={styles.affinitesText}>Voir mes affinités de la semaine</Text>
            <CaretRight size={14} color={Colors.textMuted} weight="bold" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgDeep },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  header: { paddingTop: Spacing.base, marginBottom: Spacing.lg },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  verifiedText: { fontSize: 12, fontWeight: '600', color: Colors.success },
  greeting: { ...Typography.displayMd },
  subGreeting: { ...Typography.body, marginTop: Spacing.xs },
  sectionLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  safetyIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyBody: { flex: 1, gap: 3 },
  safetyTitle: { ...Typography.h3, fontWeight: '700' },
  safetySubtitle: { fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.85)' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '31.5%',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xs,
  },
  gridIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1, gap: 2 },
  itemTitle: { ...Typography.h3, fontSize: 16 },
  itemSubtitle: { fontSize: 13, lineHeight: 17, color: Colors.textSecondary },
  discoverWrap: {
    position: 'relative',
  },
  discoverGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: Radius.lg + 5,
    backgroundColor: '#F43F5E',
  },
  discoverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    // Lueur rose (iOS) — renforce l'effet « à ne pas manquer ».
    shadowColor: '#F43F5E',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  discoverIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  affinitesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
    marginTop: Spacing.md,
  },
  affinitesText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
