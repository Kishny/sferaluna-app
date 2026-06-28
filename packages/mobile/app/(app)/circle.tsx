import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from '../../components/LinearGradient';
import { OrbitGlow } from '../../components/OrbitGlow';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, SealCheck, MapPin, Sparkle, Star } from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, ACCENT_BARS } from '../../lib/theme';
import { fetchCircle, likeProfile, type CircleProfile } from '../../lib/api';
import { ApiError } from '../../lib/http';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NP } from '../../components/NP';

const FALLBACK = 'https://i.pravatar.cc/200';

function formatWeekOf(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function CircleCard({ profile, index }: { profile: CircleProfile; index: number }) {
  const queryClient = useQueryClient();
  const likeMutation = useMutation({
    mutationFn: () => likeProfile(profile._id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['circle'] }),
  });

  const tags = [...(profile.intentions ?? []), ...(profile.interets ?? [])].slice(0, 3);
  const accent = ACCENT_BARS[index % ACCENT_BARS.length];

  return (
    <View style={styles.card}>
      <LinearGradient colors={accent} style={styles.accentBar} />
      <LinearGradient
        colors={[Colors.accentPurple, Colors.accentPink]}
        style={styles.cardHalo}
      >
        <View style={styles.cardAvatarWrap}>
          <Image
            source={{ uri: profile.image || FALLBACK }}
            style={styles.cardAvatar}
          />
        </View>
      </LinearGradient>

      {profile.identityVerified && (
        <View style={styles.verifiedBadge}>
          <SealCheck size={14} color={Colors.success} weight="fill" />
        </View>
      )}

      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>
          {profile.pseudonyme}{profile.age ? `, ${profile.age}` : ''}
        </Text>

        {profile.localisation && (
          <View style={styles.cardLocation}>
            <MapPin size={11} color={Colors.textMuted} weight="fill" />
            <Text style={styles.cardLocationText} numberOfLines={1}>{profile.localisation}</Text>
          </View>
        )}

        {/* Score de compatibilité */}
        <View style={styles.scoreRow}>
          <NP><Star size={12} color="#F59E0B" weight="fill" />
          </NP><Text style={styles.scoreText}>{profile.compatibilityScore} pts</Text>
        </View>

        {/* Hints de compatibilité */}
        {profile.compatibilityHints.length > 0 && (
          <Text style={styles.hints} numberOfLines={1}>
            {profile.compatibilityHints.slice(0, 2).join(' · ')}
          </Text>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsRow}>
            {tags.map((t, i) => (
              <View key={`${t}-${i}`} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity
          style={[styles.likeBtn, likeMutation.isSuccess && styles.likeBtnDone]}
          onPress={() => likeMutation.mutate()}
          disabled={likeMutation.isPending || likeMutation.isSuccess}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={likeMutation.isSuccess
              ? [Colors.success, '#059669']
              : [Colors.accentPurple, Colors.accentPink]}
            style={styles.likeBtnGradient}
          >
            <Text style={styles.likeBtnText}>
              {likeMutation.isSuccess ? '💕 Match !' : likeMutation.isPending ? '…' : "💜 J'aime"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CircleScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['circle'],
    queryFn: fetchCircle,
    staleTime: 60 * 60 * 1000, // 1h — le cercle change seulement chaque semaine
  });

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <OrbitGlow size={280} style={{ top: -60, right: -90 }} />
      <OrbitGlow size={320} style={{ bottom: -100, left: -110 }} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <NP><ArrowLeft size={22} color={Colors.textPrimary} />
          </NP></TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.titleRow}>
              <Sparkle size={18} color={Colors.accentPink} weight="fill" />
              <Text style={styles.title}>Circle of Six</Text>
            </View>
            <Text style={styles.subtitle}>
              {data?.weekOf
                ? `Semaine du ${formatWeekOf(data.weekOf)} · 6 affinités choisies pour vous`
                : '6 profils curatés chaque semaine selon vos affinités'}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.accentPink} size="large" />
            <Text style={styles.loadingText}>Calcul de vos affinités…</Text>
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>🌙</Text>
            <Text style={styles.emptyTitle}>Connexion impossible</Text>
            <Text style={styles.emptyText}>
              {error instanceof ApiError ? error.message : 'Impossible de charger le cercle.'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>{isRefetching ? 'Chargement…' : 'Réessayer'}</Text>
            </TouchableOpacity>
          </View>
        ) : !data?.profiles.length ? (
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>🌙</Text>
            <Text style={styles.emptyTitle}>Pas encore de cercle</Text>
            <Text style={styles.emptyText}>
              Complétez votre profil pour que l'algorithme puisse calculer vos meilleures affinités.
            </Text>
          </View>
        ) : (
          <FlatList
            data={data.profiles}
            keyExtractor={(p) => p._id}
            numColumns={2}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => <CircleCard profile={item} index={index} />}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const CARD_SIZE = 168;

const styles = StyleSheet.create({
  bg: { flex: 1, overflow: 'hidden' },
  safe: { flex: 1, backgroundColor: '#1a0b2e' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  headerCenter: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 4, lineHeight: 17 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  loadingText: { color: Colors.textMuted, marginTop: 14, fontSize: 14 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  emptyText: { fontSize: 13.5, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  retryBtn: {
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: Radius.full,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  retryText: { color: Colors.textPrimary, fontWeight: '600', fontSize: 13.5 },

  grid: { paddingHorizontal: Spacing.xl, paddingBottom: 32, paddingTop: 4 },
  row: { gap: 12, marginBottom: 12 },

  card: {
    width: CARD_SIZE,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 14,
  },
  accentBar: { width: '100%', height: 3 },
  cardHalo: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 6,
  },
  cardAvatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    backgroundColor: Colors.bgSurface,
  },
  cardAvatar: { width: '100%', height: '100%' },
  verifiedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { width: '100%', paddingHorizontal: 12, paddingTop: 8, gap: 4 },
  cardName: { fontSize: 13.5, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  cardLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' },
  cardLocationText: { fontSize: 11, color: Colors.textMuted },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', marginTop: 2 },
  scoreText: { fontSize: 11.5, fontWeight: '700', color: '#F59E0B' },
  hints: { fontSize: 10.5, color: Colors.textMuted, textAlign: 'center', fontStyle: 'italic' },
  tagsRow: { marginTop: 4 },
  tag: {
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderWidth: 1,
    borderColor: Colors.accentPurple,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
  },
  tagText: { fontSize: 10, color: Colors.textPrimary, fontWeight: '500' },
  likeBtn: { marginTop: 8 },
  likeBtnDone: { opacity: 0.85 },
  likeBtnGradient: {
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  likeBtnText: { fontSize: 12.5, fontWeight: '700', color: '#fff' },
});
