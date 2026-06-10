import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, ActivityIndicator, Animated, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from '../../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import {
  MagnifyingGlass, MoonStars, ChatCircleDots, Sparkle, SealCheck, CaretRight, X,
} from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../../lib/theme';
import { fetchMatches, type MatchSummary } from '../../../lib/api';
import { ApiError } from '../../../lib/http';
import { NP } from '../../../components/NP';

const FALLBACK_AVATAR = 'https://i.pravatar.cc/200';

/** Formate une date ISO en repère relatif court (14:32, Hier, Lun., …). */
function formatRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '') + '.';
}

function timeValue(match: MatchSummary): number {
  const iso = match.lastMessageAt ?? match.createdAt;
  return iso ? new Date(iso).getTime() : 0;
}

/** Petite enveloppe qui ajoute un retour tactile (scale spring) à n'importe
 * quel élément pressable — via l'API Animated du cœur RN, compatible web
 * (voir la note dans SwipeCard.tsx : reanimated casse la prévisualisation). */
function Pressy({
  children, onPress, style,
}: { children: React.ReactNode; onPress: () => void; style?: any }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, friction: 8, tension: 220 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 200 }).start();
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

/** Avatar cerclé d'un halo dégradé (signature visuelle "lunaire" de la marque)
 * + badge de vérification d'identité — renforce le sentiment de sécurité. */
function HaloAvatar({
  uri, size, verified, ringWidth = 2.5,
}: { uri?: string; size: number; verified?: boolean; ringWidth?: number }) {
  const innerSize = size - ringWidth * 2;
  return (
    <View style={{ width: size, height: size }}>
      <LinearGradient
        colors={[Colors.accentPurple, Colors.accentPink]}
        style={[styles.halo, { width: size, height: size, borderRadius: size / 2, padding: ringWidth }]}
      >
        <View style={[styles.haloInner, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}>
          <Image
            source={{ uri: uri || FALLBACK_AVATAR }}
            style={{ width: innerSize, height: innerSize, borderRadius: innerSize / 2 }}
          />
        </View>
      </LinearGradient>
      {verified && (
        <View style={styles.verifiedBadge}>
          <SealCheck size={14} color={Colors.success} weight="fill" />
        </View>
      )}
    </View>
  );
}

const MOON_THOUGHTS_EMPTY = [
  "Vos prochaines conversations n'attendent qu'un premier mot.",
  "Une rencontre commence souvent par un simple « bonjour ».",
  'Chaque match est une porte entrouverte — entrez avec douceur.',
  "Aucune urgence : les belles histoires prennent leur temps.",
];

export default function MessagesScreen() {
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['messages', 'matches'],
    queryFn: fetchMatches,
  });

  const matches = data?.matches ?? [];
  const visibleMatches = matches.filter((m): m is MatchSummary & { user: NonNullable<MatchSummary['user']> } => !!m.user);

  // "Nouveaux matchs" = matchs sans aucun message échangé pour l'instant.
  const newMatches = visibleMatches.filter((m) => !m.lastMessageAt);

  const searchActive = search.trim().length > 0;
  const filtered = visibleMatches.filter((m) =>
    m.user.pseudonyme.toLowerCase().includes(search.trim().toLowerCase())
  );

  // Conversations les plus vivantes en premier (dernier message, sinon date du match).
  const sortedConversations = [...filtered].sort((a, b) => timeValue(b) - timeValue(a));

  const moonThought = MOON_THOUGHTS_EMPTY[new Date().getDate() % MOON_THOUGHTS_EMPTY.length];

  if (isLoading) {
    return (
      <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <View style={styles.centerState}>
            <ActivityIndicator color={Colors.accentPink} size="large" />
            <Text style={[styles.emptyText, { marginTop: 16 }]}>Ouverture de vos conversations…</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (isError) {
    return (
      <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <View style={styles.centerState}>
            <Text style={styles.emptyEmoji}>🌙</Text>
            <Text style={styles.emptyTitle}>Connexion impossible</Text>
            <Text style={styles.emptyText}>
              {error instanceof ApiError ? error.message : 'Impossible de charger vos conversations.'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryBtnText}>{isRefetching ? 'Nouvelle tentative…' : 'Réessayer'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const hasAnyConversation = visibleMatches.length > 0;

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <MoonStars size={20} color={Colors.accentPink} weight="duotone" />
            <Text style={styles.title}>Messages</Text>
          </View>
          <Text style={styles.subtitle}>
            {newMatches.length > 0
              ? `${newMatches.length} nouvelle${newMatches.length > 1 ? 's' : ''} rencontre${newMatches.length > 1 ? 's' : ''} ${newMatches.length > 1 ? 'attendent' : 'attend'} un premier mot`
              : hasAnyConversation
                ? 'Vos histoires continuent ici, à votre rythme'
                : 'Vos futures conversations apparaîtront ici'}
          </Text>

          <View style={styles.searchRow}>
            <NP><MagnifyingGlass size={18} color={Colors.textMuted} style={styles.searchIcon} />
            </NP><TextInput
              style={styles.searchInput}
              placeholder="Rechercher une conversation…"
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {searchActive && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8} style={styles.clearSearchBtn}>
                <NP><X size={14} color={Colors.textMuted} />
              </NP></TouchableOpacity>
            )}
          </View>
        </View>

        {/* Nouveaux matchs */}
        {!searchActive && newMatches.length > 0 && (
          <View style={styles.matchesSection}>
            <View style={styles.sectionHeaderRow}>
              <Sparkle size={14} color={Colors.accentPink} weight="fill" />
              <Text style={styles.sectionTitle}>Nouveaux matchs</Text>
            </View>
            <FlatList
              horizontal
              data={newMatches}
              keyExtractor={(item) => `match-${item.matchId}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.matchesList}
              renderItem={({ item }) => (
                <Pressy style={styles.matchItem} onPress={() => router.push(`/(app)/chat/${item.matchId}`)}>
                  <View style={{ alignItems: 'center' }}>
                    <HaloAvatar uri={item.user.image} size={66} verified={item.user.identityVerified} />
                    <Text style={styles.matchName} numberOfLines={1}>{item.user.pseudonyme}</Text>
                    <View style={styles.newPill}>
                      <Text style={styles.newPillText}>Dites bonjour</Text>
                    </View>
                  </View>
                </Pressy>
              )}
            />
          </View>
        )}

        {/* Conversations */}
        {(!searchActive ? sortedConversations.length > 0 || hasAnyConversation : true) && (
          <View style={styles.sectionHeaderRow2}>
            <NP><ChatCircleDots size={14} color={Colors.textSecondary} weight="fill" />
            </NP><Text style={styles.sectionTitle}>{searchActive ? 'Résultats' : 'Conversations'}</Text>
          </View>
        )}

        <FlatList
          data={sortedConversations}
          keyExtractor={(item) => item.matchId}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={Colors.accentPink}
              colors={[Colors.accentPink]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.emptyEmoji}>{searchActive ? '🔍' : '🌙'}</Text>
              <Text style={styles.emptyTitle}>
                {searchActive ? 'Aucun résultat' : 'Pas encore de conversation'}
              </Text>
              <Text style={styles.emptyText}>
                {searchActive
                  ? `Aucune conversation ne correspond à « ${search.trim()} ».`
                  : 'Likez des profils dans Découverte pour créer vos premiers matchs — ils apparaîtront ici, prêts à devenir de belles histoires.'}
              </Text>
              {!searchActive && (
                <View style={styles.thoughtBanner}>
                  <Text style={styles.thoughtEmoji}>🌙</Text>
                  <Text style={styles.thoughtText}>{moonThought}</Text>
                </View>
              )}
              {!searchActive && (
                <TouchableOpacity style={styles.discoverBtn} onPress={() => router.push('/(app)/(tabs)/discover')}>
                  <Sparkle size={16} color="#fff" weight="fill" />
                  <Text style={styles.discoverBtnText}>Découvrir des profils</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const hasMessages = !!item.lastMessageAt;
            return (
              <Pressy style={styles.convItem} onPress={() => router.push(`/(app)/chat/${item.matchId}`)}>
                <View style={styles.convRow}>
                  <HaloAvatar uri={item.user.image} size={56} verified={item.user.identityVerified} ringWidth={2} />
                  <View style={styles.convContent}>
                    <View style={styles.convTop}>
                      <Text style={styles.convName} numberOfLines={1}>{item.user.pseudonyme}</Text>
                      {hasMessages && (
                        <Text style={styles.convTime}>{formatRelativeTime(item.lastMessageAt)}</Text>
                      )}
                    </View>
                    <View style={styles.convBottom}>
                      <Text
                        style={[styles.convLast, !hasMessages && styles.convLastFresh]}
                        numberOfLines={1}
                      >
                        {hasMessages ? 'Reprenez la conversation…' : 'Dites bonjour pour démarrer la conversation 🌙'}
                      </Text>
                    </View>
                  </View>
                  <NP><CaretRight size={16} color={Colors.textMuted} />
                </NP></View>
              </Pressy>
            );
          }}
        />
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.3 },
  subtitle: { fontSize: 12.5, color: Colors.textMuted, marginTop: 4, marginBottom: 16, lineHeight: 17 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
  clearSearchBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  matchesSection: { paddingLeft: Spacing.xl, marginBottom: 8 },
  matchesList: { paddingRight: Spacing.xl, paddingBottom: 4, gap: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionHeaderRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.xl,
    marginTop: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  matchItem: { alignItems: 'center', width: 84 },
  matchName: { fontSize: 12.5, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
  newPill: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(219,39,119,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(219,39,119,0.3)',
  },
  newPillText: { fontSize: 9.5, fontWeight: '700', color: Colors.accentPink, letterSpacing: 0.3 },

  // Halo avatar (ring dégradé + badge vérifié)
  halo: { alignItems: 'center', justifyContent: 'center' },
  haloInner: {
    backgroundColor: Colors.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.bgDeep,
    borderWidth: 2,
    borderColor: Colors.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },

  list: { paddingHorizontal: Spacing.xl, paddingBottom: 24, flexGrow: 1 },
  convItem: {
    borderRadius: Radius.lg,
    marginBottom: 8,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  convContent: { flex: 1, minWidth: 0 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 },
  convName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  convTime: { fontSize: 11.5, color: Colors.textMuted, flexShrink: 0 },
  convBottom: { flexDirection: 'row', alignItems: 'center' },
  convLast: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  convLastFresh: { color: Colors.accentPink, fontStyle: 'italic' },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingTop: 48,
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
  discoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentPink,
  },
  discoverBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
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
