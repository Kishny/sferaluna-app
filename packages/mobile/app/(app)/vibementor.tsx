import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  ActivityIndicator, TextInput, Modal, RefreshControl,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from '../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft, Heart, ChatCircle, CheckCircle, X, PaperPlaneTilt, MoonStars,
} from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../lib/theme';
import {
  fetchVibementor, createMentorQuestion, likeMentorQuestion, answerMentorQuestion,
  MENTOR_CATEGORIES, type MentorPost, type MentorCategory,
} from '../../lib/api';
import { ApiError } from '../../lib/http';
import { NP } from '../../components/NP';

const FALLBACK = 'https://i.pravatar.cc/200';

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} j`;
}

const CATEGORY_COLORS: Record<string, string> = {
  'premier-contact': Colors.accentPink,
  profil:            Colors.mutedPurple,
  rencontre:         '#F59E0B',
  relation:          '#EC4899',
  securite:          Colors.success,
  autre:             Colors.accentPurple,
};

function MentorCard({
  post, onAnswer,
}: { post: MentorPost; onAnswer: (post: MentorPost) => void }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const catColor = CATEGORY_COLORS[post.category] ?? Colors.accentPurple;

  const likeMutation = useMutation({
    mutationFn: () => likeMentorQuestion(post._id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vibementor'] }),
  });

  const topAnswers = post.answers.slice(0, expanded ? undefined : 2);

  return (
    <View style={styles.card}>
      {/* Auteur + catégorie */}
      <View style={styles.cardHeader}>
        <Image source={{ uri: (post.userId as any)?.image || FALLBACK }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName} numberOfLines={1}>{(post.userId as any)?.pseudonyme ?? '—'}</Text>
          <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
        </View>
        {post.isSolved && (
          <View style={styles.solvedBadge}>
            <NP><CheckCircle size={13} color={Colors.success} weight="fill" />
            </NP><Text style={styles.solvedText}>Résolu</Text>
          </View>
        )}
        <View style={[styles.catBadge, { backgroundColor: `${catColor}22`, borderColor: `${catColor}55` }]}>
          <Text style={[styles.catText, { color: catColor }]}>
            {MENTOR_CATEGORIES.find((c) => c.value === post.category)?.label ?? post.category}
          </Text>
        </View>
      </View>

      {/* Question */}
      <Text style={styles.question}>{post.question}</Text>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => likeMutation.mutate()} activeOpacity={0.8}>
          <NP><Heart
            size={16}
            color={post.likedByMe ? Colors.accentPink : Colors.textMuted}
            weight={post.likedByMe ? 'fill' : 'regular'}
          />
          </NP><Text style={[styles.actionCount, post.likedByMe && { color: Colors.accentPink }]}>
            {post.likesCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onAnswer(post)} activeOpacity={0.8}>
          <ChatCircle size={16} color={Colors.textMuted} weight="regular" />
          <Text style={styles.actionCount}>{post.answersCount}</Text>
        </TouchableOpacity>
      </View>

      {/* Réponses */}
      {post.answers.length > 0 && (
        <View style={styles.answersSection}>
          {topAnswers.map((ans) => (
            <View key={ans._id} style={[styles.answerRow, ans.isAccepted && styles.answerAccepted]}>
              <Image source={{ uri: (ans.userId as any)?.image || FALLBACK }} style={styles.answerAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.answerAuthor}>{(ans.userId as any)?.pseudonyme ?? '—'}</Text>
                <Text style={styles.answerContent}>{ans.content}</Text>
              </View>
              {ans.isAccepted && (
                <NP><CheckCircle size={14} color={Colors.success} weight="fill" />
              </NP>)}
            </View>
          ))}
          {post.answers.length > 2 && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.moreBtn} activeOpacity={0.8}>
              <Text style={styles.moreBtnText}>
                {expanded ? 'Réduire' : `Voir ${post.answers.length - 2} réponse${post.answers.length - 2 > 1 ? 's' : ''} de plus`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

/** Modale pour répondre à une question */
function AnswerModal({
  post, onClose,
}: { post: MentorPost | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');

  const answerMutation = useMutation({
    mutationFn: () => answerMentorQuestion(post!._id, content.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vibementor'] });
      setContent('');
      onClose();
    },
  });

  if (!post) return null;
  const canSubmit = content.trim().length > 2 && !answerMutation.isPending;

  return (
    <Modal visible={!!post} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <LinearGradient colors={[Colors.bgMid, Colors.bgDeep]} style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Répondre</Text>
              <TouchableOpacity onPress={onClose} hitSlop={8}><NP><X size={22} color={Colors.textMuted} /></NP></TouchableOpacity>
            </View>
            <View style={styles.questionPreview}>
              <Text style={styles.questionPreviewText} numberOfLines={3}>{post.question}</Text>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Votre réponse (1000 car. max)…"
              placeholderTextColor={Colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              autoFocus
            />
            {answerMutation.isError && (
              <Text style={styles.errorText}>
                {answerMutation.error instanceof ApiError ? answerMutation.error.message : 'Une erreur est survenue.'}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={() => answerMutation.mutate()}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              <NP><PaperPlaneTilt size={17} color="#fff" weight="fill" />
              </NP><Text style={styles.submitBtnText}>{answerMutation.isPending ? 'Envoi…' : 'Envoyer ma réponse'}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Modale pour poser une question */
function AskModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<MentorCategory>('autre');

  const askMutation = useMutation({
    mutationFn: () => createMentorQuestion({ question: question.trim(), category }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vibementor'] });
      setQuestion('');
      onClose();
    },
  });

  const canSubmit = question.trim().length > 5 && !askMutation.isPending;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <LinearGradient colors={[Colors.bgMid, Colors.bgDeep]} style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Poser une question</Text>
              <TouchableOpacity onPress={onClose} hitSlop={8}><NP><X size={22} color={Colors.textMuted} /></NP></TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Catégorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {MENTOR_CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                  <TouchableOpacity
                    key={c.value}
                    style={[
                      styles.catOption,
                      category === c.value && { borderColor: CATEGORY_COLORS[c.value] ?? Colors.accentPurple, backgroundColor: `${CATEGORY_COLORS[c.value] ?? Colors.accentPurple}22` },
                    ]}
                    onPress={() => setCategory(c.value as MentorCategory)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.catOptionEmoji}>{c.emoji}</Text>
                    <Text style={[styles.catOptionLabel, category === c.value && { color: CATEGORY_COLORS[c.value] ?? Colors.accentPurple }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={styles.modalLabel}>Votre question</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Posez votre question à la communauté… (500 car. max)"
              placeholderTextColor={Colors.textMuted}
              value={question}
              onChangeText={setQuestion}
              multiline
              maxLength={500}
              textAlignVertical="top"
              autoFocus
            />
            {askMutation.isError && (
              <Text style={styles.errorText}>
                {askMutation.error instanceof ApiError ? askMutation.error.message : 'Une erreur est survenue.'}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={() => askMutation.mutate()}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              <NP><PaperPlaneTilt size={17} color="#fff" weight="fill" />
              </NP><Text style={styles.submitBtnText}>{askMutation.isPending ? 'Publication…' : 'Poser ma question'}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function VibeMentorScreen() {
  const [activeCategory, setActiveCategory] = useState<MentorCategory | 'all'>('all');
  const [answerTarget, setAnswerTarget] = useState<MentorPost | null>(null);
  const [showAsk, setShowAsk] = useState(false);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['vibementor', activeCategory],
    queryFn: () => fetchVibementor({ category: activeCategory }),
  });

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
            <Text style={styles.title}>VibeMentor</Text>
            <Text style={styles.subtitle}>Posez vos questions, partagez vos expériences</Text>
          </View>
          <TouchableOpacity style={styles.askBtn} onPress={() => setShowAsk(true)} activeOpacity={0.8}>
            <LinearGradient colors={[Colors.accentPurple, Colors.accentPink]} style={styles.askBtnGradient}>
              <MoonStars size={15} color="#fff" weight="fill" />
              <Text style={styles.askBtnText}>Question</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Filtres catégories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
          style={{ flexGrow: 0 }}
        >
          {MENTOR_CATEGORIES.map((c) => {
            const active = activeCategory === c.value;
            const col = c.value !== 'all' ? (CATEGORY_COLORS[c.value] ?? Colors.accentPurple) : Colors.accentPink;
            return (
              <TouchableOpacity
                key={c.value}
                style={[styles.catChip, active && { backgroundColor: `${col}22`, borderColor: col }]}
                onPress={() => setActiveCategory(c.value as MentorCategory | 'all')}
                activeOpacity={0.8}
              >
                <Text style={styles.catChipEmoji}>{c.emoji}</Text>
                <Text style={[styles.catChipLabel, active && { color: col }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.accentPink} size="large" />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>🌙</Text>
            <Text style={styles.emptyTitle}>Connexion impossible</Text>
            <Text style={styles.emptyText}>
              {error instanceof ApiError ? error.message : 'Impossible de charger les questions.'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>{isRefetching ? 'Chargement…' : 'Réessayer'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={data?.posts ?? []}
            keyExtractor={(p) => p._id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()}
                tintColor={Colors.accentPink} colors={[Colors.accentPink]} />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyTitle}>Aucune question ici</Text>
                <Text style={styles.emptyText}>Soyez la première à poser une question dans cette catégorie.</Text>
              </View>
            }
            renderItem={({ item }) => <MentorCard post={item} onAnswer={setAnswerTarget} />}
          />
        )}

        <AskModal visible={showAsk} onClose={() => setShowAsk(false)} />
        <AnswerModal post={answerTarget} onClose={() => setAnswerTarget(null)} />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#1a0b2e' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.base, paddingBottom: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.glassBg, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  askBtn: {},
  askBtnGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full,
  },
  askBtnText: { fontSize: 12.5, fontWeight: '700', color: '#fff' },

  categories: {
    paddingHorizontal: Spacing.xl, paddingBottom: 12, gap: 8, paddingTop: 4,
  },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.glassBorder, backgroundColor: Colors.glassBg,
  },
  catChipEmoji: { fontSize: 13 },
  catChipLabel: { fontSize: 12.5, color: Colors.textSecondary, fontWeight: '500' },

  list: { paddingHorizontal: Spacing.xl, paddingBottom: 32, gap: 12, flexGrow: 1 },
  card: {
    backgroundColor: Colors.glassBg, borderWidth: 1,
    borderColor: Colors.glassBorder, borderRadius: Radius.lg, overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.bgSurface },
  authorName: { fontSize: 13.5, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  postTime: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  solvedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full,
    backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
  },
  solvedText: { fontSize: 10.5, color: Colors.success, fontWeight: '700' },
  catBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1,
  },
  catText: { fontSize: 10.5, fontWeight: '700' },
  question: {
    fontSize: 14.5, color: Colors.textSecondary, lineHeight: 21,
    paddingHorizontal: 14, paddingBottom: 12,
  },
  actions: {
    flexDirection: 'row', gap: 16, paddingHorizontal: 14, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  answersSection: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', padding: 12, gap: 10 },
  answerRow: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    padding: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  answerAccepted: { backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  answerAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.bgSurface },
  answerAuthor: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, marginBottom: 3 },
  answerContent: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  moreBtn: { alignSelf: 'center', paddingVertical: 4 },
  moreBtnText: { fontSize: 12.5, color: Colors.accentPurple, fontWeight: '600' },

  // Modales
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: 40, gap: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  modalLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
  questionPreview: {
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.md, padding: 12,
  },
  questionPreviewText: { fontSize: 13.5, color: Colors.textSecondary, lineHeight: 19, fontStyle: 'italic' },
  catOption: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.glassBorder, backgroundColor: Colors.glassBg,
  },
  catOptionEmoji: { fontSize: 15 },
  catOptionLabel: { fontSize: 12.5, color: Colors.textSecondary, fontWeight: '500' },
  modalInput: {
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.lg, padding: 14, color: Colors.textPrimary, fontSize: 14, minHeight: 100, lineHeight: 20,
  },
  errorText: { fontSize: 12.5, color: Colors.error, textAlign: 'center' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accentPink, borderRadius: Radius.full, paddingVertical: 14,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  emptyText: { fontSize: 13.5, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  retryBtn: {
    marginTop: 18, paddingHorizontal: 22, paddingVertical: 11,
    borderRadius: Radius.full, backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  retryText: { color: Colors.textPrimary, fontWeight: '600', fontSize: 13.5 },
});
