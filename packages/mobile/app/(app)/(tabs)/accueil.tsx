/**
 * Accueil — hub de la communauté.
 *
 * Premier écran de l'app : profil vérifié, sécurité (l'Hexade),
 * communauté (VibeSphere, VibeMentor, VibePlanner), événements Luna, puis
 * l'annuaire des membres et les affinités de la semaine.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  MoonStars, ShieldCheck, UsersThree, Lightbulb, CalendarBlank, Sparkle, CaretRight, SealCheck,
} from 'phosphor-react-native';
import { LinearGradient } from '../../../components/LinearGradient';
import { OrbitGlow } from '../../../components/OrbitGlow';
import { Colors, Spacing, Radius, Typography } from '../../../lib/theme';
import { fetchMyProfile, fetchCommunity, fetchEvents } from '../../../lib/api';

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

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function AccueilScreen() {
  const { data } = useQuery({ queryKey: ['profile', 'me'], queryFn: fetchMyProfile });
  const name =
    typeof data?.user.pseudonyme === 'string' && data.user.pseudonyme
      ? data.user.pseudonyme
      : null;

  // Aperçu de la vie de la communauté : les écrans dédiés restent la source.
  const { data: communityData } = useQuery({
    queryKey: ['accueil', 'community'],
    queryFn: () => fetchCommunity(),
    staleTime: 60_000,
  });
  const latestPosts = (communityData?.posts ?? []).slice(0, 2);

  const { data: eventsData } = useQuery({ queryKey: ['events'], queryFn: fetchEvents });
  const nextEvent = (eventsData?.events ?? [])
    .filter((e) => new Date(e.date).getTime() > Date.now())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

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
                <Text style={styles.safetyTitle}>L’Hexade*</Text>
                <Text style={styles.safetySubtitle}>
                  Vos six proches de confiance. Partagez vos plans et
                  prévenez-les que vous êtes bien rentrée.
                  {'\n'}* Du grec hexás, « groupe de six ».
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

          {/* Dernières publications de la communauté */}
          {latestPosts.length > 0 && (
            <>
              <View style={styles.sectionRow}>
                <Text style={[styles.sectionLabel, styles.sectionLabelInRow]}>En ce moment</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(app)/(tabs)/communaute')}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Voir toute la communauté"
                >
                  <Text style={styles.sectionLink}>Tout voir</Text>
                </TouchableOpacity>
              </View>
              {latestPosts.map((post) => (
                <TouchableOpacity
                  key={post._id}
                  style={styles.postPreview}
                  activeOpacity={0.8}
                  onPress={() => router.push('/(app)/(tabs)/communaute')}
                >
                  <Text style={styles.postPreviewMeta} numberOfLines={1}>
                    {post.authorName} · {post.comments.length} réponse{post.comments.length > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.postPreviewTitle} numberOfLines={1}>
                    {post.title || post.content}
                  </Text>
                  {post.title ? (
                    <Text style={styles.postPreviewText} numberOfLines={2}>{post.content}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </>
          )}

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
              <Text style={styles.itemTitle} numberOfLines={1}>
                {nextEvent ? nextEvent.title : 'Événements Luna'}
              </Text>
              <Text style={styles.itemSubtitle} numberOfLines={2}>
                {nextEvent
                  ? `${formatEventDate(nextEvent.date)} · ${nextEvent.location}`
                  : 'Sorties et ateliers organisés par la communauté'}
              </Text>
            </View>
            <CaretRight size={18} color={Colors.textMuted} weight="bold" />
          </TouchableOpacity>

          {/* Annuaire des membres. */}
          <Text style={styles.sectionLabel}>Les membres</Text>
          <TouchableOpacity
            style={styles.item}
            activeOpacity={0.8}
            onPress={() => router.push('/(app)/(tabs)/membres')}
          >
            <LinearGradient
              colors={[Colors.accentPurple, Colors.accentPink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.itemIcon}
            >
              <UsersThree size={22} color={Colors.textPrimary} weight="bold" />
            </LinearGradient>
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle}>Parcourir les membres</Text>
              <Text style={styles.itemSubtitle}>
                Des profils vérifiés à lire à votre rythme, avec qui vous connecter
              </Text>
            </View>
            <CaretRight size={18} color={Colors.textMuted} weight="bold" />
          </TouchableOpacity>

          {/* Lien secondaire vers la sélection hebdomadaire (Affinités). */}
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionLabelInRow: { flex: 1 },
  sectionLink: { fontSize: 13, fontWeight: '600', color: Colors.accentPink, marginBottom: Spacing.md },
  postPreview: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  postPreviewMeta: { fontSize: 12, color: Colors.textMuted, marginBottom: 3 },
  postPreviewTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  postPreviewText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 3 },
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
