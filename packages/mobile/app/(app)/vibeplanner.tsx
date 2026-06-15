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
import { ArrowLeft, CheckCircle, X, PaperPlaneTilt, CalendarBlank, Sparkle } from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../lib/theme';
import {
  fetchVibeplanner, updateVibePlanStatus, fetchMatches,
  VIBEPLAN_CATEGORIES, type VibePlan, type VibePlanStatus,
} from '../../lib/api';
import { ApiError } from '../../lib/http';
import { NP } from '../../components/NP';

const FALLBACK = 'https://i.pravatar.cc/200';

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

const STATUS_LABEL: Record<VibePlanStatus, string> = {
  pending:  'En attente',
  accepted: 'Accepté',
  rejected: 'Refusé',
};
const STATUS_COLOR: Record<VibePlanStatus, string> = {
  pending:  Colors.warning,
  accepted: Colors.success,
  rejected: Colors.error,
};

function PlanCard({ plan }: { plan: VibePlan }) {
  const queryClient = useQueryClient();
  const catDef = VIBEPLAN_CATEGORIES.find((c) => c.value === plan.category);

  const acceptMutation = useMutation({
    mutationFn: () => updateVibePlanStatus(plan._id, 'accepted'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vibeplanner'] }),
  });
  const rejectMutation = useMutation({
    mutationFn: () => updateVibePlanStatus(plan._id, 'rejected'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vibeplanner'] }),
  });

  const color = STATUS_COLOR[plan.status];

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.catCircle, { backgroundColor: `${Colors.accentPurple}22` }]}>
          <Text style={styles.catEmoji}>{catDef?.emoji ?? plan.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.planTitle} numberOfLines={1}>{plan.title}</Text>
          <View style={styles.proposedRow}>
            <Image
              source={{ uri: (plan.proposedById as any)?.image || FALLBACK }}
              style={styles.proposerAvatar}
            />
            <Text style={styles.proposerName} numberOfLines={1}>
              {(plan.proposedById as any)?.pseudonyme ?? '—'}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
          <Text style={[styles.statusText, { color }]}>{STATUS_LABEL[plan.status]}</Text>
        </View>
      </View>

      <Text style={styles.planDescription} numberOfLines={3}>{plan.description}</Text>

      {plan.scheduledAt && (
        <View style={styles.dateRow}>
          <CalendarBlank size={13} color={Colors.textMuted} weight="fill" />
          <Text style={styles.dateText}>{formatDate(plan.scheduledAt)}</Text>
        </View>
      )}

      {/* Actions — seulement si en attente */}
      {plan.status === 'pending' && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
            activeOpacity={0.8}
          >
            <NP><CheckCircle size={15} color="#fff" weight="fill" />
            </NP><Text style={styles.actionBtnText}>
              {acceptMutation.isPending ? '…' : 'Accepter'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending}
            activeOpacity={0.8}
          >
            <NP><X size={15} color={Colors.error} />
            </NP><Text style={[styles.actionBtnText, { color: Colors.error }]}>
              {rejectMutation.isPending ? '…' : 'Refuser'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/** Modale pour proposer un plan — nécessite de choisir un match */
function NewPlanModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [matchId, setMatchId] = useState('');
  const [catValue, setCatValue] = useState('cafe');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { data: matchesData } = useQuery({
    queryKey: ['messages', 'matches'],
    queryFn: () => import('../../lib/api').then((m) => m.fetchMatches()),
    enabled: visible,
  });
  const matches = (matchesData?.matches ?? []).filter((m) => m.user && m.isActive);

  const catDef = VIBEPLAN_CATEGORIES.find((c) => c.value === catValue)!;

  const createMutation = useMutation({
    mutationFn: () => {
      if (!matchId) throw new Error('Choisissez un match.');
      return import('../../lib/api').then((m) =>
        m.createVibePlan({
          matchId,
          title: title.trim(),
          description: description.trim(),
          category: catValue,
          emoji: catDef.emoji,
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vibeplanner'] });
      setMatchId(''); setTitle(''); setDescription('');
      onClose();
    },
  });

  const canSubmit = !!matchId && title.trim().length > 1 && description.trim().length > 1 && !createMutation.isPending;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <LinearGradient colors={[Colors.bgMid, Colors.bgDeep]} style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau plan</Text>
              <TouchableOpacity onPress={onClose} hitSlop={8}><NP><X size={22} color={Colors.textMuted} /></NP></TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Avec qui ?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {matches.length === 0 ? (
                  <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Aucun match pour l'instant.</Text>
                ) : matches.map((m) => (
                  <TouchableOpacity
                    key={m.matchId}
                    style={[styles.matchChip, matchId === m.matchId && styles.matchChipActive]}
                    onPress={() => setMatchId(m.matchId)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: m.user?.image || FALLBACK }} style={styles.matchChipAvatar} />
                    <Text style={[styles.matchChipName, matchId === m.matchId && { color: Colors.accentPink }]}>
                      {m.user?.pseudonyme}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.modalLabel}>Type d'activité</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {VIBEPLAN_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.value}
                    style={[styles.catOption, catValue === c.value && { borderColor: Colors.accentPurple, backgroundColor: 'rgba(124,58,237,0.2)' }]}
                    onPress={() => setCatValue(c.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.catEmoji}>{c.emoji}</Text>
                    <Text style={[styles.catOptionLabel, catValue === c.value && { color: Colors.accentPurple }]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TextInput
              style={styles.modalInputSingle}
              placeholder="Titre (ex. : Café Marais samedi)"
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Description — précisez l'idée, l'horaire, le lieu…"
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />

            {createMutation.isError && (
              <Text style={styles.errorText}>
                {createMutation.error instanceof ApiError ? createMutation.error.message : 'Erreur lors de la création.'}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={() => createMutation.mutate()}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              <NP><PaperPlaneTilt size={17} color="#fff" weight="fill" />
              </NP><Text style={styles.submitBtnText}>{createMutation.isPending ? 'Envoi…' : 'Proposer le plan'}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function VibePlannerScreen() {
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['vibeplanner'],
    queryFn: () => fetchVibeplanner(),
  });

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <NP><ArrowLeft size={22} color={Colors.textPrimary} />
          </NP></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>VibePlanner</Text>
            <Text style={styles.subtitle}>Proposez et organisez vos rendez-vous</Text>
          </View>
          <TouchableOpacity style={styles.newBtn} onPress={() => setShowNew(true)} activeOpacity={0.8}>
            <LinearGradient colors={[Colors.accentPurple, Colors.accentPink]} style={styles.newBtnGradient}>
              <Sparkle size={15} color="#fff" weight="fill" />
              <Text style={styles.newBtnText}>Nouveau</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.accentPink} size="large" />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>🌙</Text>
            <Text style={styles.emptyTitle}>Connexion impossible</Text>
            <Text style={styles.emptyText}>
              {error instanceof ApiError ? error.message : 'Impossible de charger vos plans.'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>{isRefetching ? 'Chargement…' : 'Réessayer'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={data?.plans ?? []}
            keyExtractor={(p) => p._id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()}
                tintColor={Colors.accentPink} colors={[Colors.accentPink]} />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyEmoji}>✨</Text>
                <Text style={styles.emptyTitle}>Aucun plan pour l'instant</Text>
                <Text style={styles.emptyText}>
                  Proposez une activité à l'une de vos rencontres — café, balade, appel vidéo…
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => setShowNew(true)} activeOpacity={0.8}>
                  <Text style={styles.retryText}>Proposer un plan</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => <PlanCard plan={item} />}
          />
        )}

        <NewPlanModal visible={showNew} onClose={() => setShowNew(false)} />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#1a0b2e' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.base, paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.glassBg, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  newBtn: {},
  newBtnGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full,
  },
  newBtnText: { fontSize: 12.5, fontWeight: '700', color: '#fff' },

  list: { paddingHorizontal: Spacing.xl, paddingBottom: 32, gap: 12, flexGrow: 1 },
  card: {
    backgroundColor: Colors.glassBg, borderWidth: 1,
    borderColor: Colors.glassBorder, borderRadius: Radius.lg, padding: 14, gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: 20 },
  planTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  proposedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  proposerAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.bgSurface },
  proposerName: { fontSize: 12, color: Colors.textMuted },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  statusText: { fontSize: 11.5, fontWeight: '700' },
  planDescription: { fontSize: 13.5, color: Colors.textSecondary, lineHeight: 19 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 12.5, color: Colors.textMuted },
  cardActions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: Radius.full, borderWidth: 1,
  },
  acceptBtn: { backgroundColor: `${Colors.success}22`, borderColor: `${Colors.success}55` },
  rejectBtn: { backgroundColor: `${Colors.error}11`, borderColor: `${Colors.error}33` },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: Colors.success },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: 40, gap: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  modalLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
  matchChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.glassBorder, backgroundColor: Colors.glassBg,
  },
  matchChipActive: { borderColor: Colors.accentPink, backgroundColor: 'rgba(219,39,119,0.12)' },
  matchChipAvatar: { width: 24, height: 24, borderRadius: 12 },
  matchChipName: { fontSize: 12.5, color: Colors.textSecondary, fontWeight: '600' },
  catOption: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.glassBorder, backgroundColor: Colors.glassBg,
  },
  catOptionLabel: { fontSize: 12.5, color: Colors.textSecondary, fontWeight: '500' },
  modalInputSingle: {
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.lg, padding: 14, color: Colors.textPrimary, fontSize: 14,
  },
  modalInput: {
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.lg, padding: 14, color: Colors.textPrimary, fontSize: 14, minHeight: 90, lineHeight: 20,
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
