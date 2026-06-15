import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LinearGradient } from '../../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import {
  Heart, X, Star, SlidersHorizontal, MoonStars,
} from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../../lib/theme';
import {
  fetchProfiles, fetchMyProfile, likeProfile, recordProfileVisit,
} from '../../../lib/api';
import type { DiscoverFilters, PublicProfile, LikeResult } from '../../../lib/api';
import { ApiError } from '../../../lib/http';
import { FilterModal } from '../../../components/FilterModal';
import { MatchModal } from '../../../components/MatchModal';
import { SwipeCard, CardPreview, type SwipeCardHandle } from '../../../components/SwipeCard';
import { hapticMedium, hapticLight, hapticSuccess, hapticSwipeRelease } from '../../../lib/haptics';
import { NP } from '../../../components/NP';

const EMPTY_FILTERS: DiscoverFilters = {};

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

/** Salutation contextuelle — la première chose que l'on voit en ouvrant
 * l'app doit donner l'impression qu'elle nous attendait, pas qu'on dérange. */
function getGreeting(): { label: string; moment: string } {
  const hour = new Date().getHours();
  if (hour < 5) return { label: 'Douce nuit', moment: 'cette nuit' };
  if (hour < 12) return { label: 'Bonjour', moment: "aujourd'hui" };
  if (hour < 18) return { label: 'Bel après-midi', moment: 'cet après-midi' };
  return { label: 'Bonsoir', moment: 'ce soir' };
}

// Petites pensées lunaires affichées au fil des jours — une touche d'âme qui
// distingue SferaLuna d'une simple grille de profils à consommer.
const MOON_THOUGHTS = [
  'Chaque profil est une histoire qui ne demande qu\'à commencer.',
  'La pleine lune porte chance aux rencontres sincères.',
  'Prenez le temps de lire avant de swiper — l\'authenticité se remarque.',
  'Une conversation vraie vaut mille likes.',
  'Ce soir, soyez simplement vous-même : c\'est ce qu\'on cherche ici.',
  'Les plus belles histoires commencent souvent par un simple bonjour.',
];

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = height * 0.56;

function ActionButton({
  children, style, onPress, disabled,
}: {
  children: React.ReactNode;
  style: any;
  onPress: () => void;
  disabled?: boolean;
}) {
  // Animated.Value du cœur React Native (et non reanimated — voir la note
  // dans SwipeCard.tsx) : pleinement compatible avec la prévisualisation web.
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.86, useNativeDriver: true, friction: 7, tension: 220 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 200 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={style}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.9}
        onPressIn={pressIn}
        onPressOut={pressOut}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DiscoverScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filters, setFilters] = useState<DiscoverFilters>(EMPTY_FILTERS);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [matchInfo, setMatchInfo] = useState<{ matchId: string; profile: PublicProfile } | null>(null);
  const cardRef = useRef<SwipeCardHandle>(null);

  const greeting = getGreeting();
  const moonThought = MOON_THOUGHTS[new Date().getDate() % MOON_THOUGHTS.length];

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['discover', 'profiles', filters],
    queryFn: () => fetchProfiles({ limit: 20, ...filters }),
  });

  const { data: myProfileData } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: fetchMyProfile,
  });
  const myImage = asString((myProfileData?.user as Record<string, unknown> | undefined)?.image);

  const activeFilterCount = countActiveFilters(filters);
  const userIsPremium = data?.filters?.userIsPremium ?? false;

  const handleApplyFilters = (next: DiscoverFilters) => {
    setFilters(next);
    setCurrentIndex(0);
    setFilterModalVisible(false);
  };

  const profiles = data?.profiles ?? [];
  const profile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];

  // Une visite est enregistrée automatiquement dès qu'un profil est affiché
  // (POST /api/visitors) — c'est le backend qui gère la règle "qui peut voir
  // qui a visité son profil" selon le plan.
  useEffect(() => {
    if (profile?._id) {
      recordProfileVisit(profile._id).catch(() => {});
    }
  }, [profile?._id]);

  const likeMutation = useMutation({
    mutationFn: (targetUserId: string) => likeProfile(targetUserId),
  });

  const advance = () => setCurrentIndex((i) => i + 1);

  // Appelé une fois la carte envolée vers la droite (geste ou bouton) :
  // on déclenche le like et, en cas de match mutuel, on célèbre l'instant
  // plutôt que de se contenter d'avancer silencieusement.
  const performLike = () => {
    if (!profile || likeMutation.isPending) return;
    const liked = profile;
    hapticSwipeRelease(true);
    likeMutation.mutate(liked._id, {
      onSuccess: (result: { success: true } & LikeResult) => {
        if (result.matched && result.matchId) {
          hapticSuccess();
          setMatchInfo({ matchId: result.matchId, profile: liked });
        }
      },
    });
    advance();
  };

  const performPass = () => {
    if (!profile) return;
    hapticSwipeRelease(false);
    advance();
  };

  const handlePassPress = () => { if (profile) { hapticLight(); cardRef.current?.swipeLeft(); } };
  const handleLikePress = () => { if (profile && !likeMutation.isPending) { hapticMedium(); cardRef.current?.swipeRight(); } };
  // Pas d'endpoint "super like" dédié côté backend pour l'instant : on
  // déclenche un like classique pour conserver le comportement attendu.
  const handleSuperLikePress = () => { if (profile && !likeMutation.isPending) { hapticMedium(); cardRef.current?.swipeRight(); } };

  const closeMatchModal = () => setMatchInfo(null);
  const goToMatchChat = () => {
    if (!matchInfo) return;
    const { matchId } = matchInfo;
    setMatchInfo(null);
    router.push(`/(app)/chat/${matchId}`);
  };

  if (isLoading) {
    return (
      <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <View style={styles.emptyState}>
            <ActivityIndicator color={Colors.accentPink} size="large" />
            <Text style={[styles.emptyText, { marginTop: 16 }]}>
              Recherche de profils compatibles…
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (isError) {
    return (
      <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌙</Text>
            <Text style={styles.emptyTitle}>Connexion impossible</Text>
            <Text style={styles.emptyText}>
              {error instanceof ApiError
                ? error.message
                : 'Impossible de charger les profils pour le moment.'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryBtnText}>{isRefetching ? 'Nouvelle tentative…' : 'Réessayer'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!profile) {
    return (
      <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌙</Text>
            <Text style={styles.emptyTitle}>
              {activeFilterCount > 0 ? 'Aucun profil ne correspond' : 'Revenez bientôt'}
            </Text>
            <Text style={styles.emptyText}>
              {activeFilterCount > 0
                ? 'Aucun profil ne correspond à vos filtres actuels.\nEssayez de les élargir pour voir plus de monde.'
                : 'Vous avez vu tous les profils disponibles.\nDe nouvelles étoiles apparaissent chaque jour — gardez l\'œil ouvert.'}
            </Text>
            {activeFilterCount > 0 ? (
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => { setFilters(EMPTY_FILTERS); setCurrentIndex(0); }}
              >
                <Text style={styles.retryBtnText}>Réinitialiser les filtres</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.retryBtn} onPress={() => { setCurrentIndex(0); refetch(); }}>
                <Text style={styles.retryBtnText}>Actualiser</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
        <FilterModal
          visible={filterModalVisible}
          onClose={() => setFilterModalVisible(false)}
          onApply={handleApplyFilters}
          initialFilters={filters}
          isPremium={userIsPremium}
        />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* En-tête chaleureux et personnalisé */}
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <View style={styles.greetingRow}>
              <MoonStars size={18} color={Colors.accentPink} weight="duotone" />
              <Text style={styles.headerTitle}>{greeting.label}</Text>
            </View>
            <Text style={styles.headerSub}>
              {Math.max(profiles.length - currentIndex, 0)} profil{profiles.length - currentIndex > 1 ? 's' : ''} vous attend{profiles.length - currentIndex > 1 ? 'ent' : ''} {greeting.moment}
            </Text>
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterModalVisible(true)}>
            <NP><SlidersHorizontal size={22} color={Colors.textSecondary} />
            </NP>{activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Pensée lunaire du jour — une touche d'âme et d'identité */}
        <View style={styles.thoughtBanner}>
          <Text style={styles.thoughtEmoji}>🌙</Text>
          <Text style={styles.thoughtText} numberOfLines={2}>{moonThought}</Text>
        </View>

        {/* Pile de cartes */}
        <View style={styles.cardWrapper}>
          {nextProfile && (
            <CardPreview profile={nextProfile} cardWidth={CARD_WIDTH} cardHeight={CARD_HEIGHT} />
          )}
          <SwipeCard
            key={profile._id}
            ref={cardRef}
            profile={profile}
            cardWidth={CARD_WIDTH}
            cardHeight={CARD_HEIGHT}
            onSwipeLeft={performPass}
            onSwipeRight={performLike}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <ActionButton style={[styles.actionBtn, styles.passBtn]} onPress={handlePassPress}>
            <NP><X size={28} color="#EF4444" weight="bold" />
          </NP></ActionButton>

          <ActionButton style={[styles.actionBtn, styles.superBtn]} onPress={handleSuperLikePress}>
            <NP><Star size={24} color="#F59E0B" weight="fill" />
          </NP></ActionButton>

          <ActionButton style={[styles.actionBtn, styles.likeBtn]} onPress={handleLikePress}>
            <NP><Heart size={28} color={Colors.accentPink} weight="fill" />
          </NP></ActionButton>
        </View>

        {/* Progress */}
        <View style={styles.progress}>
          {profiles.map((_, i) => (
            <View
              key={i}
              style={[styles.progressDot, i === currentIndex && styles.progressDotActive]}
            />
          ))}
        </View>
      </SafeAreaView>

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
        isPremium={userIsPremium}
      />

      <MatchModal
        visible={!!matchInfo}
        myImage={myImage}
        matchImage={matchInfo?.profile.image}
        matchName={matchInfo?.profile.pseudonyme}
        onSendMessage={goToMatchChat}
        onContinue={closeMatchModal}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#1a0b2e' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  headerTextBlock: { flex: 1, paddingRight: Spacing.md },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 21, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.3 },
  headerSub: { fontSize: 12.5, color: Colors.textMuted, marginTop: 3, lineHeight: 17 },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  thoughtBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.lg,
  },
  thoughtEmoji: { fontSize: 16 },
  thoughtText: { flex: 1, fontSize: 12.5, color: Colors.textSecondary, lineHeight: 17, fontStyle: 'italic' },
  cardWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 20,
  },
  actionBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  passBtn: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.3)',
    shadowColor: '#EF4444',
  },
  superBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(245,158,11,0.3)',
    shadowColor: '#F59E0B',
  },
  likeBtn: {
    backgroundColor: 'rgba(219,39,119,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(219,39,119,0.3)',
    shadowColor: Colors.accentPink,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 12,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.glassBorder,
  },
  progressDotActive: {
    backgroundColor: Colors.accentPink,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 64, marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
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
