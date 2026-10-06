import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList,
  RefreshControl, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery, useMutation } from '@tanstack/react-query';
import { LinearGradient } from '../../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, SlidersHorizontal, UsersThree } from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../../lib/theme';
import { fetchProfiles, fetchMyProfile, likeProfile } from '../../../lib/api';
import type { DiscoverFilters, PublicProfile, LikeResult } from '../../../lib/api';
import { ApiError } from '../../../lib/http';
import { FilterModal } from '../../../components/FilterModal';
import { ConnectionModal } from '../../../components/ConnectionModal';
import { MemberCard } from '../../../components/MemberCard';
import { hapticMedium, hapticLight, hapticSuccess } from '../../../lib/haptics';
import { NP } from '../../../components/NP';

/**
 * Annuaire des membres.
 *
 * Une grille que l'on parcourt à son rythme : chaque carte ouvre le profil
 * complet, et « Se connecter » envoie une invitation. Quand l'invitation est
 * réciproque, les deux membres sont connectées et peuvent s'écrire.
 *
 * Remplace l'ancienne pile de cartes à glisser : même API (/api/profiles,
 * /api/likes), mais on choisit en lisant un profil, pas d'un geste.
 */

const EMPTY_FILTERS: DiscoverFilters = {};
const PAGE_SIZE = 20;
const GUTTER = 12;

function countActiveFilters(filters: DiscoverFilters): number {
  let count = 0;
  if (filters.ageMin || filters.ageMax) count += 1;
  if (filters.intentions?.length) count += 1;
  if (filters.localisation) count += 1;
  if (filters.orientation) count += 1;
  if (filters.actifRecemment) count += 1;
  return count;
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export default function MembresScreen() {
  const { width } = useWindowDimensions();
  const [filters, setFilters] = useState<DiscoverFilters>(EMPTY_FILTERS);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [connection, setConnection] = useState<{ matchId: string; profile: PublicProfile } | null>(null);

  // Deux colonnes sur téléphone, davantage sur un écran large.
  const columns = Math.max(2, Math.min(4, Math.floor(width / 190)));
  const cardWidth = (width - Spacing.lg * 2 - GUTTER * (columns - 1)) / columns;

  const {
    data, isLoading, isError, error, refetch, isRefetching,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['membres', filters],
    queryFn: ({ pageParam }) => fetchProfiles({ page: pageParam, limit: PAGE_SIZE, ...filters }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination?.hasMore ? last.pagination.page + 1 : undefined),
  });

  const { data: myProfileData } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: fetchMyProfile,
  });
  const myImage = asString((myProfileData?.user as Record<string, unknown> | undefined)?.image);

  const profiles = useMemo(() => {
    const seen = new Set<string>();
    return (data?.pages ?? [])
      .flatMap((page) => page.profiles ?? [])
      .filter((p) => (seen.has(p._id) ? false : (seen.add(p._id), true)));
  }, [data]);

  const total = data?.pages?.[0]?.pagination?.total ?? profiles.length;
  const userIsPremium = data?.pages?.[0]?.filters?.userIsPremium ?? false;
  const activeFilterCount = countActiveFilters(filters);

  const inviteMutation = useMutation({
    mutationFn: (targetUserId: string) => likeProfile(targetUserId),
  });

  const invite = useCallback((profile: PublicProfile) => {
    if (pendingId) return;
    hapticMedium();
    setInviteError('');
    setPendingId(profile._id);
    inviteMutation.mutate(profile._id, {
      onSuccess: (result: { success: true } & LikeResult) => {
        setInvited((prev) => new Set(prev).add(profile._id));
        if (result.matched && result.matchId) {
          hapticSuccess();
          setConnection({ matchId: result.matchId, profile });
        }
      },
      onError: (err) => {
        setInviteError(err instanceof ApiError ? err.message : 'Invitation non envoyée. Réessayez dans un instant.');
      },
      onSettled: () => setPendingId(null),
    });
  }, [pendingId, inviteMutation]);

  const openProfile = (profile: PublicProfile) => {
    hapticLight();
    router.push(`/(app)/profil/${profile._id}`);
  };

  const handleApplyFilters = (next: DiscoverFilters) => {
    setFilters(next);
    setFilterModalVisible(false);
  };

  const goToConversation = () => {
    if (!connection) return;
    const { matchId } = connection;
    setConnection(null);
    router.push(`/(app)/chat/${matchId}`);
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.roundBtn}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/accueil'))}
        accessibilityRole="button"
        accessibilityLabel="Retour"
      >
        <NP><ArrowLeft size={20} color={Colors.textPrimary} /></NP>
      </TouchableOpacity>
      <View style={styles.headerTextBlock}>
        <Text style={styles.headerTitle}>Membres</Text>
        <Text style={styles.headerSub}>
          {isLoading
            ? 'Chargement de la communauté…'
            : `${total} membre${total > 1 ? 's' : ''} de la communauté${activeFilterCount > 0 ? ' pour ces filtres' : ''}`}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.roundBtn}
        onPress={() => setFilterModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Filtrer les membres"
      >
        <NP><SlidersHorizontal size={20} color={Colors.textSecondary} /></NP>
        {activeFilterCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  let body: React.ReactNode;

  if (isLoading) {
    body = (
      <View style={styles.emptyState}>
        <ActivityIndicator color={Colors.accentPink} size="large" />
      </View>
    );
  } else if (isError) {
    body = (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Connexion impossible</Text>
        <Text style={styles.emptyText}>
          {error instanceof ApiError ? error.message : 'Impossible de charger les membres pour le moment.'}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryBtnText}>{isRefetching ? 'Nouvelle tentative…' : 'Réessayer'}</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (profiles.length === 0) {
    body = (
      <View style={styles.emptyState}>
        <UsersThree size={56} color={Colors.mutedPurple} weight="light" />
        <Text style={[styles.emptyTitle, { marginTop: 20 }]}>
          {activeFilterCount > 0 ? 'Aucune membre ne correspond' : 'Personne à afficher pour l’instant'}
        </Text>
        <Text style={styles.emptyText}>
          {activeFilterCount > 0
            ? 'Élargissez vos filtres pour voir plus de membres.'
            : 'De nouvelles membres rejoignent la communauté régulièrement. En attendant, VibeSphere et les événements Luna vous attendent.'}
        </Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => (activeFilterCount > 0 ? setFilters(EMPTY_FILTERS) : refetch())}
        >
          <Text style={styles.retryBtnText}>
            {activeFilterCount > 0 ? 'Réinitialiser les filtres' : 'Actualiser'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    body = (
      <FlatList
        key={columns}
        data={profiles}
        keyExtractor={(item) => item._id}
        numColumns={columns}
        columnWrapperStyle={{ gap: GUTTER }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching && !isFetchingNextPage} onRefresh={() => refetch()} tintColor={Colors.accentPink} />
        }
        onEndReachedThreshold={0.6}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        ListHeaderComponent={
          inviteError ? (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Text style={styles.errorBannerText}>{inviteError}</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator color={Colors.accentPink} style={{ marginVertical: 20 }} /> : null
        }
        renderItem={({ item }) => (
          <MemberCard
            profile={item}
            width={cardWidth}
            invited={invited.has(item._id)}
            pending={pendingId === item._id}
            onOpen={() => openProfile(item)}
            onInvite={() => invite(item)}
          />
        )}
      />
    );
  }

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {header}
        {body}
      </SafeAreaView>

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
        isPremium={userIsPremium}
      />

      <ConnectionModal
        visible={!!connection}
        myImage={myImage}
        memberImage={connection?.profile.image}
        memberName={connection?.profile.pseudonyme}
        onSendMessage={goToConversation}
        onContinue={() => setConnection(null)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#1a0b2e' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.md,
  },
  headerTextBlock: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.3 },
  headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: Colors.accentPink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.bgDeep,
  },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: GUTTER,
  },
  errorBanner: {
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  errorBannerText: { fontSize: 13, color: '#FECACA', lineHeight: 18 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10, textAlign: 'center' },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  retryBtnText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
});
