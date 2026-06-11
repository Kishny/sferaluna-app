import React, { useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Animated, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from '../../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import {
  Heart, ChatCircle, Eye, CheckCircle, MoonStars, BellRinging, SealCheck,
} from 'phosphor-react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors, Spacing, Radius } from '../../../lib/theme';
import { fetchNotificationsSummary, markNotificationsSeen } from '../../../lib/api';
import { ApiError } from '../../../lib/http';
import { NP } from '../../../components/NP';

const MOON_THOUGHTS_CALM = [
  "Le calme aussi a du charme — profitez-en pour soigner votre profil.",
  'Aucune nouveauté pour le moment : le bon moment viendra à son heure.',
  "Une page blanche n'est jamais vide bien longtemps ici.",
  'Respirez — vos prochaines rencontres se préparent en silence.',
];

/** Formate une date ISO en repère lisible et chaleureux ("Depuis 14:32",
 * "Depuis hier", "Depuis lun."). Reflète `since` renvoyé par le backend —
 * la fenêtre sur laquelle portent les compteurs agrégés. */
function formatSince(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return `Depuis ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Depuis hier';
  return `Depuis ${date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`;
}

/** Petite enveloppe "retour tactile" via Animated du cœur RN (spring scale) —
 * voir la note dans SwipeCard.tsx : reanimated casse la prévisualisation web. */
function Pressy({
  children, onPress, style, disabled,
}: { children: React.ReactNode; onPress?: () => void; style?: any; disabled?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, friction: 8, tension: 220 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 200 }).start();
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Le backend (GET /api/notifications) renvoie un résumé agrégé — pas un fil
 * détaillé événement par événement (voir CLAUDE.md, section Notifications :
 * la lecture se base sur `user.lastSeenNotificationsAt`). On affiche donc des
 * cartes de synthèse soignées plutôt que des éléments de liste fictifs, et on
 * relie chacune vers l'écran correspondant (Messages / Découverte / Profil).
 */
export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['notifications', 'summary'],
    queryFn: fetchNotificationsSummary,
    // Rafraîchissement automatique toutes les 30 s pour garder les compteurs à jour
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const markSeenMutation = useMutation({
    mutationFn: markNotificationsSeen,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', 'summary'] }),
  });

  // Quand l'utilisatrice arrive sur cet écran, on rafraîchit les compteurs
  // et on marque automatiquement les notifications comme vues.
  useFocusEffect(
    useCallback(() => {
      refetch();
      // Marquer comme vu après un court délai (laisser le temps d'afficher)
      const t = setTimeout(() => {
        if (!markSeenMutation.isPending) markSeenMutation.mutate();
      }, 1500);
      return () => clearTimeout(t);
    }, [])
  );

  const cards = data
    ? [
        {
          id: 'messages',
          icon: <ChatCircle size={22} color="#fff" weight="fill" />,
          gradient: ['#7C3AED', '#8E7AB5'] as const,
          label: 'Messages non lus',
          hint: 'Vos conversations vous attendent',
          count: data.unreadMessages,
          onPress: () => router.push('/(app)/(tabs)/messages'),
        },
        {
          id: 'matches',
          icon: <NP><Heart size={22} color="#fff" weight="fill" /></NP>,
          gradient: [Colors.accentPurple, Colors.accentPink] as const,
          label: 'Nouveaux matchs',
          hint: 'Une affinité mutuelle vient de naître',
          count: data.newMatches,
          onPress: () => router.push('/(app)/(tabs)/messages'),
        },
        {
          id: 'visits',
          icon: <Eye size={22} color="#fff" weight="fill" />,
          gradient: ['#DB2777', '#F59E0B'] as const,
          label: 'Nouvelles visites de profil',
          hint: 'Quelqu’un s’intéresse à vous',
          count: data.newVisits,
          onPress: () => router.push('/(app)/(tabs)/profile'),
        },
      ]
    : [];

  const total = data?.total ?? 0;
  const sinceLabel = formatSince(data?.since);
  const moonThought = MOON_THOUGHTS_CALM[new Date().getDate() % MOON_THOUGHTS_CALM.length];

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleLeft}>
              <BellRinging size={20} color={Colors.accentPink} weight="duotone" />
              <Text style={styles.title}>Alertes</Text>
            </View>
            {total > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{total}</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            {total > 0
              ? `${total} nouveauté${total > 1 ? 's' : ''} ${total > 1 ? 'vous attendent' : 'vous attend'}${sinceLabel ? ` · ${sinceLabel.toLowerCase()}` : ''}`
              : 'Tout est sous contrôle — vous êtes à jour'}
          </Text>
          {total > 0 && (
            <Pressy onPress={() => markSeenMutation.mutate()} disabled={markSeenMutation.isPending} style={styles.markAllWrap}>
              <View style={styles.markAllRow}>
                <NP><CheckCircle size={15} color={Colors.accentPink} weight="bold" />
                </NP><Text style={styles.markAll}>
                  {markSeenMutation.isPending ? 'Mise à jour…' : 'Tout marquer comme lu'}
                </Text>
              </View>
            </Pressy>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={Colors.accentPink}
              colors={[Colors.accentPink]}
            />
          }
        >
          {isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={Colors.accentPink} size="large" />
              <Text style={[styles.emptyText, { marginTop: 16 }]}>Recherche de nouveautés…</Text>
            </View>
          ) : isError ? (
            <View style={styles.centerState}>
              <Text style={styles.emptyEmoji}>🌙</Text>
              <Text style={styles.emptyTitle}>Connexion impossible</Text>
              <Text style={styles.emptyText}>
                {error instanceof ApiError ? error.message : 'Impossible de charger vos notifications.'}
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                <Text style={styles.retryBtnText}>{isRefetching ? 'Nouvelle tentative…' : 'Réessayer'}</Text>
              </TouchableOpacity>
            </View>
          ) : total === 0 ? (
            <View style={styles.centerState}>
              <Text style={styles.emptyEmoji}>🌙</Text>
              <Text style={styles.emptyTitle}>Tout est calme par ici</Text>
              <Text style={styles.emptyText}>
                Vous serez prévenue dès qu'il se passe quelque chose de nouveau —
                messages, matchs ou visites de profil.
              </Text>
              <View style={styles.thoughtBanner}>
                <Text style={styles.thoughtEmoji}>🌙</Text>
                <Text style={styles.thoughtText}>{moonThought}</Text>
              </View>
            </View>
          ) : (
            cards.map((card) => {
              const hasNews = card.count > 0;
              return (
                <Pressy key={card.id} onPress={card.onPress}>
                  <View style={[styles.card, hasNews && styles.cardActive]}>
                    <LinearGradient colors={card.gradient} style={styles.iconWrapper}>
                      {card.icon}
                    </LinearGradient>
                    <View style={styles.cardContent}>
                      <View style={styles.cardLabelRow}>
                        <Text style={styles.cardLabel}>{card.label}</Text>
                        {hasNews && <View style={styles.freshDot} />}
                      </View>
                      <Text style={styles.cardHint} numberOfLines={1}>
                        {hasNews
                          ? `${card.count} nouveau${card.count > 1 ? 'x' : ''} · ${card.hint}`
                          : 'Rien de nouveau pour le moment'}
                      </Text>
                    </View>
                    {hasNews ? (
                      <View style={[styles.cardBadge, { backgroundColor: card.gradient[1] }]}>
                        <Text style={styles.cardBadgeText}>{card.count}</Text>
                      </View>
                    ) : (
                      <SealCheck size={18} color={Colors.textMuted} weight="duotone" />
                    )}
                  </View>
                </Pressy>
              );
            })
          )}

          {!isLoading && !isError && (
            <View style={styles.footnote}>
              <MoonStars size={13} color={Colors.textMuted} weight="duotone" />
              <Text style={styles.footnoteText}>
                Les alertes se basent sur votre dernière visite — glissez vers le bas pour actualiser.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.3 },
  countBadge: {
    backgroundColor: Colors.accentPink,
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
    minWidth: 26,
    alignItems: 'center',
  },
  countText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  subtitle: { fontSize: 12.5, color: Colors.textMuted, marginTop: 4, lineHeight: 17 },
  markAllWrap: { alignSelf: 'flex-start', marginTop: 12 },
  markAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(219,39,119,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(219,39,119,0.24)',
  },
  markAll: { color: Colors.accentPink, fontSize: 12.5, fontWeight: '600' },

  list: { paddingHorizontal: Spacing.xl, paddingBottom: 32, gap: 12, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardActive: {
    borderColor: 'rgba(219,39,119,0.3)',
    backgroundColor: 'rgba(219,39,119,0.07)',
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1, minWidth: 0 },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  freshDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accentPink },
  cardHint: { fontSize: 12.5, color: Colors.textMuted, marginTop: 3 },
  cardBadge: {
    borderRadius: Radius.full,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cardBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  footnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  footnoteText: { flex: 1, fontSize: 11.5, color: Colors.textMuted, lineHeight: 16 },

  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingTop: 64,
    paddingBottom: 24,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 18 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  thoughtBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.lg,
    width: '100%',
  },
  thoughtEmoji: { fontSize: 16 },
  thoughtText: { flex: 1, fontSize: 12.5, color: Colors.textSecondary, lineHeight: 17, fontStyle: 'italic' },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  retryBtnText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
});
