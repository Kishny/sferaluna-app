import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  ActivityIndicator, TextInput, Modal, Animated, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { LinearGradient } from '../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Heart, SealCheck, X, PaperPlaneTilt, Sparkle } from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../lib/theme';
import {
  fetchVibesphere, createVibe, toggleVibelike,
  VIBE_MOODS, type VibePost, type VibeMood,
} from '../../lib/api';
import { ApiError } from '../../lib/http';
import { NP } from '../../components/NP';

const FALLBACK = 'https://i.pravatar.cc/200';

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} j`;
}

const MOOD_COLORS: Record<VibeMood, string> = {
  joyeuse:      '#10B981',
  sereine:      '#8E7AB5',
  mélancolique: '#6366F1',
  amoureuse:    '#DB2777',
  curieuse:     '#F59E0B',
  fière:        '#EF4444',
  mystérieuse:  '#7C3AED',
};

/** Retour tactile léger via Animated core RN (pas reanimated — voir SwipeCard). */
function Pressy({ children, onPress, style }: { children: React.ReactNode; onPress: () => void; style?: any }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pi = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, friction: 8, tension: 220 }).start();
  const po = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, friction: 6, tension: 200 }).start();
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} onPressIn={pi} onPressOut={po}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

function VibeCard({ post }: { post: VibePost }) {
  const queryClient = useQueryClient();
  const moodColor = MOOD_COLORS[post.mood] ?? Colors.accentPurple;

  const likeMutation = useMutation({
    mutationFn: () => toggleVibelike(post._id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vibesphere'] }),
  });

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={[styles.moodStrip, { backgroundColor: moodColor }]} />
        <Image
          source={{ uri: (post.userId as any)?.image || FALLBACK }}
          style={styles.postAvatar}
        />
        <View style={{ flex: 1 }}>
          <View style={styles.postAuthorRow}>
            <Text style={styles.postAuthor} numberOfLines={1}>
              {(post.userId as any)?.pseudonyme ?? '—'}
            </Text>
            {(post.userId as any)?.identityVerified && (
              <SealCheck size={13} color={Colors.success} weight="fill" />
            )}
          </View>
          <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
        </View>
        <View style={[styles.moodBadge, { backgroundColor: `${moodColor}22`, borderColor: `${moodColor}66` }]}>
          <Text style={styles.moodEmoji}>{post.emoji}</Text>
          <Text style={[styles.moodLabel, { color: moodColor }]}>{post.mood}</Text>
        </View>
      </View>

      <Text style={styles.postContent}>{post.content}</Text>

      <View style={styles.postFooter}>
        <Pressy onPress={() => likeMutation.mutate()}>
          <View style={styles.likeRow}>
            <NP><Heart
              size={18}
              color={post.likedByMe ? Colors.accentPink : Colors.textMuted}
              weight={post.likedByMe ? 'fill' : 'regular'}
            />
            </NP><Text style={[styles.likeCount, post.likedByMe && { color: Colors.accentPink }]}>
              {post.likesCount}
            </Text>
          </View>
        </Pressy>
      </View>
    </View>
  );
}

/** Modale de création de vibe */
function CreateVibeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<VibeMood | null>(null);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedMood) throw new Error('Choisissez une humeur.');
      const moodDef = VIBE_MOODS.find((m) => m.mood === selectedMood)!;
      return createVibe({ content: content.trim(), mood: selectedMood, emoji: moodDef.emoji });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vibesphere'] });
      setContent('');
      setSelectedMood(null);
      onClose();
    },
  });

  const canSubmit = content.trim().length > 0 && !!selectedMood && !createMutation.isPending;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <LinearGradient colors={[Colors.bgMid, Colors.bgDeep]} style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Partager une vibe</Text>
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <NP><X size={22} color={Colors.textMuted} /></NP>
              </TouchableOpacity>
            </View>

            {/* Sélecteur d'humeur */}
            <Text style={styles.modalLabel}>Mon humeur du moment</Text>
            <View style={styles.moodGrid}>
              {VIBE_MOODS.map((m) => (
                <TouchableOpacity
                  key={m.mood}
                  style={[
                    styles.moodOption,
                    selectedMood === m.mood && { borderColor: MOOD_COLORS[m.mood], backgroundColor: `${MOOD_COLORS[m.mood]}22` },
                  ]}
                  onPress={() => setSelectedMood(m.mood)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.moodOptionEmoji}>{m.emoji}</Text>
                  <Text style={[styles.moodOptionLabel, selectedMood === m.mood && { color: MOOD_COLORS[m.mood] }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Texte */}
            <Text style={styles.modalLabel}>Exprimez-vous</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Qu'est-ce qui vous traverse l'esprit ce soir ? (300 car. max)"
              placeholderTextColor={Colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{content.length}/300</Text>

            {createMutation.isError && (
              <Text style={styles.errorText}>
                {createMutation.error instanceof ApiError
                  ? createMutation.error.message
                  : 'Une erreur est survenue.'}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={() => createMutation.mutate()}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              <NP><PaperPlaneTilt size={17} color="#fff" weight="fill" />
              </NP><Text style={styles.submitBtnText}>
                {createMutation.isPending ? 'Publication…' : 'Publier ma vibe'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function VibesphereScreen() {
  const [showCreate, setShowCreate] = useState(false);

  const {
    data, isLoading, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['vibesphere'],
    queryFn: ({ pageParam }) => fetchVibesphere({ before: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.hasMore ? (last.pagination.nextBefore ?? undefined) : undefined,
  });

  const posts = data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <NP><ArrowLeft size={22} color={Colors.textPrimary} />
          </NP></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>VibeSphere</Text>
            <Text style={styles.subtitle}>L'espace pour partager vos humeurs du moment</Text>
          </View>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
            <LinearGradient colors={[Colors.accentPurple, Colors.accentPink]} style={styles.createBtnGradient}>
              <Sparkle size={16} color="#fff" weight="fill" />
              <Text style={styles.createBtnText}>Vibe</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.accentPink} size="large" />
            <Text style={styles.loadingText}>Chargement du feed…</Text>
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>🌙</Text>
            <Text style={styles.emptyTitle}>Connexion impossible</Text>
            <Text style={styles.emptyText}>
              {error instanceof ApiError ? error.message : 'Impossible de charger le feed.'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>{isRefetching ? 'Chargement…' : 'Réessayer'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(p) => p._id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()}
                tintColor={Colors.accentPink} colors={[Colors.accentPink]} />
            }
            onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={isFetchingNextPage ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator color={Colors.accentPink} size="small" />
              </View>
            ) : null}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyEmoji}>✨</Text>
                <Text style={styles.emptyTitle}>Aucune vibe pour l'instant</Text>
                <Text style={styles.emptyText}>Soyez la première à partager votre humeur du moment.</Text>
              </View>
            }
            renderItem={({ item }) => <VibeCard post={item} />}
          />
        )}

        <CreateVibeModal visible={showCreate} onClose={() => setShowCreate(false)} />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#1a0b2e' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  createBtn: {},
  createBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
  },
  createBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  list: { paddingHorizontal: Spacing.xl, paddingBottom: 32, gap: 12, flexGrow: 1 },

  postCard: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingLeft: 8 },
  moodStrip: { width: 4, height: '100%', borderRadius: 2, minHeight: 42 },
  postAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bgSurface },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postAuthor: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  postTime: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  moodEmoji: { fontSize: 12 },
  moodLabel: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  postContent: {
    fontSize: 14.5,
    color: Colors.textSecondary,
    lineHeight: 21,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  postFooter: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10,
  },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  likeCount: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },

  // Modale création
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: 40,
    gap: 14,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  modalLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glassBg,
  },
  moodOptionEmoji: { fontSize: 15 },
  moodOptionLabel: { fontSize: 12.5, color: Colors.textSecondary, fontWeight: '500', textTransform: 'capitalize' },
  modalInput: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.lg,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 14,
    minHeight: 100,
    lineHeight: 20,
  },
  charCount: { fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginTop: -8 },
  errorText: { fontSize: 12.5, color: Colors.error, textAlign: 'center' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accentPink,
    borderRadius: Radius.full,
    paddingVertical: 14,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  loadingText: { color: Colors.textMuted, marginTop: 14, fontSize: 14 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  emptyText: { fontSize: 13.5, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  retryBtn: {
    marginTop: 18, paddingHorizontal: 22, paddingVertical: 11,
    borderRadius: Radius.full, backgroundColor: Colors.glassBg,
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  retryText: { color: Colors.textPrimary, fontWeight: '600', fontSize: 13.5 },
});
