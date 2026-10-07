import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from '../../../components/LinearGradient';
import { OrbitGlow } from '../../../components/OrbitGlow';
import { StatusBar } from 'expo-status-bar';
import {
  Heart, ChatCircleText, Plus, X, PaperPlaneTilt, MoonStars, UsersThree, Lightbulb, CalendarBlank, PushPin, Flag,
} from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, ACCENT_BARS } from '../../../lib/theme';
import {
  fetchCommunity, createCommunityPost, likeCommunityPost,
  commentCommunityPost, CommunityPost, CommunityCategory, COMMUNITY_CATEGORIES,
} from '../../../lib/api';
import { NP } from '../../../components/NP';
import { ApiError } from '../../../lib/http';
import { getSession } from '../../../lib/auth';
import { askReport } from '../../../lib/report';
import { hapticLight } from '../../../lib/haptics';

// ── Pressy ────────────────────────────────────
function Pressy({ children, onPress, style }: {
  children: React.ReactNode; onPress: () => void; style?: object;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => Animated.spring(scale, { toValue: 0.94, friction: 8, tension: 200, useNativeDriver: true }).start();
  const release = () => {
    Animated.spring(scale, { toValue: 1, friction: 6, tension: 200, useNativeDriver: true }).start();
    onPress();
  };
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity onPressIn={press} onPress={release} activeOpacity={1}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} j`;
}

// ── Post Card ─────────────────────────────────
function PostCard({ post, index, isMine, onLike, onComment }: {
  post: CommunityPost;
  index: number;
  /** Ma propre publication : pas de signalement, pas de lien vers mon profil public. */
  isMine: boolean;
  onLike: () => void;
  onComment: () => void;
}) {
  const [reported, setReported] = useState(false);
  // Le profil de l'autrice donne accès au blocage et au signalement du compte.
  const openAuthor = () => {
    if (isMine || !post.authorId) return;
    hapticLight();
    router.push(`/(app)/profil/${post.authorId}` as never);
  };
  const cat = COMMUNITY_CATEGORIES.find((c) => c.value === post.category);
  const accent = ACCENT_BARS[index % ACCENT_BARS.length];

  return (
    <View style={styles.card}>
      <LinearGradient colors={accent} style={styles.accentBar} />
      {/* Author row */}
      <View style={styles.authorRow}>
        <TouchableOpacity
          style={styles.authorLink}
          onPress={openAuthor}
          disabled={isMine || !post.authorId}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Voir le profil de ${post.authorName}`}
        >
          <View style={styles.authorAvatar}>
            <Text style={styles.authorInitial}>{post.authorName?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName}>{post.authorName}</Text>
            <Text style={styles.authorMeta}>{timeAgo(post.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        {cat && (
          <View style={styles.catBadge}>
            <Text style={styles.catBadgeText}>{cat.emoji} {cat.label}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      {post.isPinned && (
        <View style={styles.pinnedRow}>
          <PushPin size={12} color={Colors.accentPink} weight="fill" />
          <Text style={styles.pinnedText}>Épinglé par l'équipe</Text>
        </View>
      )}
      {post.title ? <Text style={styles.postTitle}>{post.title}</Text> : null}
      <Text style={styles.postContent}>{post.content}</Text>

      {/* Actions */}
      <View style={styles.postActions}>
        <Pressy onPress={onLike} style={styles.actionBtn}>
          <View style={styles.actionBtnInner}>
            <NP><Heart
              size={16}
              color={post.isLiked ? Colors.accentPink : Colors.textMuted}
              weight={post.isLiked ? 'fill' : 'regular'}
            />
            </NP><Text style={[styles.actionCount, post.isLiked && { color: Colors.accentPink }]}>
              {post.likesCount}
            </Text>
          </View>
        </Pressy>
        <Pressy onPress={onComment} style={styles.actionBtn}>
          <View style={styles.actionBtnInner}>
            <ChatCircleText size={16} color={Colors.textMuted} weight="regular" />
            <Text style={styles.actionCount}>{post.comments.length}</Text>
          </View>
        </Pressy>
        {!isMine && (
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => askReport({ targetType: 'community_post', targetId: post._id, onSent: () => setReported(true) })}
            disabled={reported}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Signaler cette publication"
          >
            <NP><Flag size={15} color={reported ? Colors.accentPink : Colors.textMuted} weight={reported ? 'fill' : 'regular'} /></NP>
            <Text style={[styles.reportText, reported && { color: Colors.accentPink }]}>{reported ? 'Signalée' : 'Signaler'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Comments (2 premiers) */}
      {post.comments.length > 0 && (
        <View style={styles.commentsSection}>
          {post.comments.slice(0, 2).map((c) => (
            <View key={c._id} style={styles.commentRow}>
              <Text style={styles.commentAuthor}>{c.authorName} </Text>
              <Text style={styles.commentContent}>{c.content}</Text>
            </View>
          ))}
          {post.comments.length > 2 && (
            <Text style={styles.moreComments}>
              Voir les {post.comments.length - 2} autres commentaires…
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// ── Create Post Modal ─────────────────────────
function CreatePostModal({ visible, onClose, onCreated }: {
  visible: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<CommunityCategory>('general');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () => createCommunityPost({ title: title.trim(), content: content.trim(), category }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community'] });
      setTitle('');
      setContent('');
      setCategory('general');
      onCreated();
      onClose();
    },
  });

  const cats = COMMUNITY_CATEGORIES.filter((c) => c.value !== 'all') as { value: CommunityCategory; label: string; emoji: string }[];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.modalBg}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouvelle publication</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <NP><X size={22} color={Colors.textPrimary} /></NP>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalLabel}>Catégorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {cats.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.catChip, category === c.value && styles.catChipActive]}
                  onPress={() => setCategory(c.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.catChipText, category === c.value && { color: Colors.accentPink }]}>
                    {c.emoji} {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Titre</Text>
            <TextInput
              style={styles.modalTitleInput}
              placeholder="De quoi voulez-vous parler ?"
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={150}
              autoFocus
              returnKeyType="next"
            />

            <Text style={styles.modalLabel}>Votre message</Text>
            <TextInput
              style={styles.modalTextarea}
              placeholder="Partagez votre pensée avec la communauté…"
              placeholderTextColor={Colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={2000}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{content.length}/2000</Text>
            {createMutation.isError && (
              <Text style={styles.formError} accessibilityRole="alert">
                {createMutation.error instanceof ApiError
                  ? createMutation.error.message
                  : 'Publication impossible pour le moment. Réessayez.'}
              </Text>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.sendBtn, (!title.trim() || !content.trim() || createMutation.isPending) && styles.sendBtnDisabled]}
              onPress={() => createMutation.mutate()}
              disabled={!title.trim() || !content.trim() || createMutation.isPending}
              activeOpacity={0.85}
            >
              <NP><PaperPlaneTilt size={16} color="#fff" weight="fill" />
              </NP><Text style={styles.sendBtnText}>
                {createMutation.isPending ? "Publication…" : "Publier"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Comment Modal ─────────────────────────────
function CommentModal({ post, visible, onClose }: {
  post: CommunityPost | null; visible: boolean; onClose: () => void;
}) {
  const [text, setText] = useState('');
  const queryClient = useQueryClient();

  const commentMutation = useMutation({
    mutationFn: () => commentCommunityPost(post!._id, text.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community'] });
      setText('');
      onClose();
    },
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.modalBg}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Commenter</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <NP><X size={22} color={Colors.textPrimary} /></NP>
            </TouchableOpacity>
          </View>
          {post && (
            <View style={styles.commentPreview}>
              <Text style={styles.commentPreviewAuthor}>{post.authorName}</Text>
              <Text style={styles.commentPreviewContent} numberOfLines={2}>{post.content}</Text>
            </View>
          )}
          <TextInput
            style={styles.commentInput}
            placeholder="Votre commentaire…"
            placeholderTextColor={Colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            textAlignVertical="top"
          />
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || commentMutation.isPending) && styles.sendBtnDisabled]}
              onPress={() => commentMutation.mutate()}
              disabled={!text.trim() || commentMutation.isPending}
              activeOpacity={0.85}
            >
              <NP><PaperPlaneTilt size={16} color="#fff" weight="fill" />
              </NP><Text style={styles.sendBtnText}>{commentMutation.isPending ? "…" : "Envoyer"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Espaces voisins ───────────────────────────
const SPACES = [
  { label: 'VibeSphere', route: '/(app)/vibesphere', icon: UsersThree, color: '#D9B8FF' },
  { label: 'VibeMentor', route: '/(app)/vibementor', icon: Lightbulb, color: '#FFD166' },
  { label: 'Événements', route: '/(app)/evenements', icon: CalendarBlank, color: '#FF8E8E' },
];

// ── Main Screen ───────────────────────────────
export default function CommunauteScreen() {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<CommunityCategory | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [commentTarget, setCommentTarget] = useState<CommunityPost | null>(null);
  const { data: session } = useQuery({ queryKey: ['session'], queryFn: getSession });
  const myId = session?.user?._id ?? session?.user?.id;

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } = useInfiniteQuery({
    queryKey: ['community', activeCategory],
    queryFn: ({ pageParam }) => fetchCommunity({
      category: activeCategory === 'all' ? undefined : activeCategory,
      before: pageParam as string | undefined,
      limit: 20,
    }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextBefore,
  });

  const likeMutation = useMutation({
    mutationFn: likeCommunityPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community'] }),
  });

  const posts = data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <OrbitGlow size={280} style={{ top: -60, right: -90 }} />
      <OrbitGlow size={320} style={{ bottom: -100, left: -110 }} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Communauté</Text>
            <Text style={styles.subtitle}>Partagez, échangez, entraidez-vous</Text>
          </View>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => setShowCreate(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Nouvelle publication"
          >
            <NP><Plus size={20} color="#fff" weight="bold" />
          </NP></TouchableOpacity>
        </View>

        {/* Les autres espaces de la communauté */}
        <View style={styles.spaces}>
          {SPACES.map((space) => (
            <TouchableOpacity
              key={space.route}
              style={styles.space}
              activeOpacity={0.85}
              onPress={() => router.push(space.route as never)}
              accessibilityRole="button"
              accessibilityLabel={space.label}
            >
              <NP><space.icon size={18} color={space.color} weight="bold" /></NP>
              <Text style={styles.spaceText} numberOfLines={1}>{space.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category filter */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={styles.filterScrollOuter}
          contentContainerStyle={styles.filterScroll}
        >
          {COMMUNITY_CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[styles.filterChip, activeCategory === c.value && styles.filterChipActive]}
              onPress={() => setActiveCategory(c.value as CommunityCategory | 'all')}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, activeCategory === c.value && { color: Colors.accentPink }]}>
                {c.emoji} {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={Colors.accentPink} size="large" />
          </View>
        ) : isError ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyText}>Impossible de charger les publications.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.centerState}>
            <MoonStars size={40} color={Colors.textMuted} weight="regular" />
            <Text style={styles.emptyTitle}>
              {activeCategory === 'all' ? 'Aucune publication pour l’instant' : 'Rien dans cette catégorie pour l’instant'}
            </Text>
            <Text style={styles.emptyText}>Lancez la première discussion.</Text>
            <TouchableOpacity style={styles.createFirstBtn} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
              <Text style={styles.createFirstBtnText}>Écrire une publication</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(p) => p._id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.accentPink} />
            }
            onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={Colors.accentPink} style={{ marginVertical: 16 }} /> : null}
            renderItem={({ item, index }) => (
              <PostCard
                post={item}
                index={index}
                isMine={!!myId && item.authorId === myId}
                onLike={() => likeMutation.mutate(item._id)}
                onComment={() => setCommentTarget(item)}
              />
            )}
          />
        )}

        <CreatePostModal
          visible={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={() => {}}
        />
        <CommentModal
          post={commentTarget}
          visible={!!commentTarget}
          onClose={() => setCommentTarget(null)}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, overflow: 'hidden' },
  safe: { flex: 1, backgroundColor: '#1a0b2e' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.base, paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.glassBg, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  newBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.accentPink, alignItems: 'center', justifyContent: 'center',
  },
  filterScrollOuter: { flexGrow: 0, flexShrink: 0 },
  filterScroll: { paddingHorizontal: Spacing.xl, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  filterChipActive: { borderColor: Colors.accentPink, backgroundColor: 'rgba(219,39,119,0.1)' },
  filterChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.full,
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  retryText: { color: Colors.textPrimary, fontWeight: '600' },
  createFirstBtn: {
    paddingHorizontal: 20, paddingVertical: 11, borderRadius: Radius.full,
    backgroundColor: Colors.accentPink,
  },
  createFirstBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: 12 },
  // Post card
  card: {
    backgroundColor: Colors.glassBg, borderWidth: 1, overflow: 'hidden',
    borderColor: Colors.glassBorder, borderRadius: Radius.xl, padding: 14, gap: 10,
  },
  accentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(124,58,237,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  authorInitial: { fontSize: 14, fontWeight: '700', color: '#fff' },
  authorName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  authorMeta: { fontSize: 12, color: Colors.textMuted },
  catBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  catBadgeText: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  pinnedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pinnedText: { fontSize: 11, fontWeight: '700', color: Colors.accentPink },
  postTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, lineHeight: 22 },
  postContent: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  spaces: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.xl, paddingTop: 4 },
  space: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
    minHeight: 58, paddingHorizontal: 6, paddingVertical: 8, borderRadius: Radius.md,
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  spaceText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  modalTitleInput: {
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.lg, paddingHorizontal: 14, minHeight: 48, color: Colors.textPrimary, fontSize: 15,
  },
  formError: { fontSize: 13, color: '#FECACA', lineHeight: 18 },
  postActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionBtn: {},
  authorLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  reportBtn: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32 },
  reportText: { fontSize: 12, color: Colors.textMuted },
  actionBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  commentsSection: { gap: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 8 },
  commentRow: { flexDirection: 'row', flexWrap: 'wrap' },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  commentContent: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  moreComments: { fontSize: 12, color: Colors.textMuted },
  // Modals
  modalBg: { flex: 1, backgroundColor: Colors.bgDeep },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.xl, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.glassBorder,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  modalContent: { padding: Spacing.xl, gap: 12 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  catScroll: { marginBottom: 4 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.full, marginRight: 8,
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  catChipActive: { borderColor: Colors.accentPink, backgroundColor: 'rgba(219,39,119,0.1)' },
  catChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  modalTextarea: {
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.lg, padding: 14, color: Colors.textPrimary, fontSize: 14,
    minHeight: 140, lineHeight: 21,
  },
  charCount: { fontSize: 11, color: Colors.textMuted, textAlign: 'right' },
  commentPreview: {
    margin: Spacing.xl, marginBottom: 0,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: Radius.lg, padding: 12,
    borderLeftWidth: 3, borderLeftColor: Colors.accentPink,
  },
  commentPreviewAuthor: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 3 },
  commentPreviewContent: { fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
  commentInput: {
    margin: Spacing.xl, marginTop: 12,
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.lg, padding: 14, color: Colors.textPrimary, fontSize: 14,
    minHeight: 100, lineHeight: 21,
  },
  modalFooter: {
    paddingHorizontal: Spacing.xl, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: Colors.glassBorder,
  },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accentPink, borderRadius: Radius.full, paddingVertical: 13,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Spacing alias
});

// Add missing Spacing.sm if needed
// This uses Colors.Spacing from theme — assumed to have .sm
