import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, Dimensions, ScrollView, Animated, PanResponder,
} from 'react-native';
import { Heart, X, MapPin } from 'phosphor-react-native';
import { LinearGradient } from './LinearGradient';
import { Colors, Spacing, Radius } from '../lib/theme';
import type { PublicProfile } from '../lib/api';
import { NP } from './NP';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const ROTATION_RANGE = 10;
const FALLBACK_IMAGE = 'https://i.pravatar.cc/400';

/** Une utilisatrice est considérée "active récemment" si son profil a bougé
 * dans les dernières 24h — un signal chaleureux qui invite à engager la conversation. */
function isRecentlyActive(updatedAt?: string) {
  if (!updatedAt) return false;
  const diffMs = Date.now() - new Date(updatedAt).getTime();
  return diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000;
}

function CardContent({ profile }: { profile: PublicProfile }) {
  const recentlyActive = isRecentlyActive(profile.updatedAt);
  const tags = [...(profile.intentions ?? []), ...(profile.interets ?? [])];

  return (
    <>
      <Image source={{ uri: profile.image || FALLBACK_IMAGE }} style={styles.image} />
      <LinearGradient colors={['transparent', 'rgba(26,11,46,0.96)']} style={styles.gradient}>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.pseudonyme}{profile.age ? `, ${profile.age}` : ''}
            </Text>
            {profile.identityVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Vérifié</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            {profile.localisation && (
              <View style={styles.metaItem}>
                <MapPin size={13} color="rgba(255,255,255,0.7)" weight="fill" />
                <Text style={styles.metaText}>{profile.localisation}</Text>
              </View>
            )}
            {recentlyActive && (
              <View style={styles.activeItem}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>Active récemment</Text>
              </View>
            )}
          </View>

          {tags.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsRow}>
              {tags.map((tag, i) => (
                <View key={`${tag}-${i}`} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </LinearGradient>
    </>
  );
}

export interface SwipeCardHandle {
  swipeLeft: () => void;
  swipeRight: () => void;
}

interface Props {
  profile: PublicProfile;
  cardWidth: number;
  cardHeight: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

/**
 * Carte de découverte avec geste de glissement physique (pan + spring).
 * Glisser à droite = j'aime, à gauche = je passe ; en dessous du seuil,
 * la carte revient avec un rebond élastique. `swipeLeft`/`swipeRight`
 * exposés via ref pour rejouer la même animation depuis les boutons d'action.
 */
export const SwipeCard = forwardRef<SwipeCardHandle, Props>(({
  profile, cardWidth, cardHeight, onSwipeLeft, onSwipeRight,
}, ref) => {
  // Animated.ValueXY + PanResponder plutôt que reanimated/gesture-handler :
  // ces deux libs s'appuient sur des fonctions hôtes JSI absentes de la
  // prévisualisation react-native-web (cf. erreur "Exception in HostFunction"
  // observée au simple import de react-native-reanimated). L'API Animated du
  // cœur de React Native, elle, est pleinement supportée par react-native-web.
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const flyOut = (direction: 'left' | 'right') => {
    const target = direction === 'right' ? SCREEN_WIDTH * 1.4 : -SCREEN_WIDTH * 1.4;
    const callback = direction === 'right' ? onSwipeRight : onSwipeLeft;
    Animated.timing(pan, {
      toValue: { x: target, y: -30 },
      duration: 260,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) callback();
    });
  };

  useImperativeHandle(ref, () => ({
    swipeLeft: () => flyOut('left'),
    swipeRight: () => flyOut('right'),
  }));

  const panResponder = useRef(
    PanResponder.create({
      // Ne revendiquer le responder qu'à partir d'un mouvement horizontal
      // réel (≥ 8 px). Retourner `true` dès `onStart` interceptait les taps
      // sur la tab bar quand la carte débordait visuellement dans cette zone.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          flyOut('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          flyOut('left');
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            friction: 6,
            tension: 80,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // friction/tension (API Animated core) — PAS damping/stiffness (reanimated)
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
          friction: 6,
          tension: 80,
        }).start();
      },
    }),
  ).current;

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [`-${ROTATION_RANGE}deg`, '0deg', `${ROTATION_RANGE}deg`],
    extrapolate: 'clamp',
  });
  const likeOpacity = pan.x.interpolate({
    inputRange: [16, SWIPE_THRESHOLD * 0.8],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const passOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD * 0.8, -16],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.card,
        { width: cardWidth, height: cardHeight },
        { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] },
      ]}
    >
      <CardContent profile={profile} />

      <Animated.View style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]} pointerEvents="none">
        <NP><Heart size={26} color="#10B981" weight="fill" />
        </NP><Text style={[styles.stampText, { color: '#10B981' }]}>J'aime</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.passStamp, { opacity: passOpacity }]} pointerEvents="none">
        <NP><X size={26} color="#EF4444" weight="bold" />
        </NP><Text style={[styles.stampText, { color: '#EF4444' }]}>Je passe</Text>
      </Animated.View>
    </Animated.View>
  );
});

SwipeCard.displayName = 'SwipeCard';

/** Carte statique affichée en arrière-plan pour donner de la profondeur à la
 * pile — suggère qu'il y a toujours une nouvelle rencontre qui attend. */
export function CardPreview({
  profile, cardWidth, cardHeight,
}: { profile: PublicProfile; cardWidth: number; cardHeight: number }) {
  return (
    <View style={[styles.card, styles.previewCard, { width: cardWidth, height: cardHeight }]}>
      <CardContent profile={profile} />
      <View style={styles.previewVeil} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.bgSurface,
    shadowColor: Colors.accentPurple,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  previewCard: {
    transform: [{ scale: 0.94 }, { translateY: 14 }],
  },
  previewVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,11,46,0.45)',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '62%',
    justifyContent: 'flex-end',
    padding: Spacing.xl,
  },
  info: { gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 23, fontWeight: '700', color: '#fff', flexShrink: 1 },
  verifiedBadge: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  verifiedText: { fontSize: 11, color: '#10B981', fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  activeItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  activeText: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  tagsRow: { marginTop: 2 },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 8,
  },
  tagText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  stamp: {
    position: 'absolute',
    top: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 2,
    backgroundColor: 'rgba(26,11,46,0.7)',
  },
  likeStamp: {
    right: 24,
    borderColor: '#10B981',
    transform: [{ rotate: '8deg' }],
  },
  passStamp: {
    left: 24,
    borderColor: '#EF4444',
    transform: [{ rotate: '-8deg' }],
  },
  stampText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },
});
