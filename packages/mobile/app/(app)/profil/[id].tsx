import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, Dimensions,
} from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
const GALLERY_CARD_W = SCREEN_W * 0.55;
const GALLERY_CARD_H = GALLERY_CARD_W * 1.25;
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from '../../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft, SealCheck, Heart, ChatCircleText, Flag,
  MapPin, Sparkle, MoonStars,
} from 'phosphor-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius } from '../../../lib/theme';
import { fetchPublicProfile, likeProfile, fetchMatches, recordProfileVisit } from '../../../lib/api';
import { ApiError } from '../../../lib/http';

const AVATAR_SIZE = 100;

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [reported, setReported] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['public-profile', id],
    queryFn: () => fetchPublicProfile(id!),
    enabled: !!id,
  });

  // Enregistre la visite dès que le profil est chargé (silencieux, pas de retry)
  useEffect(() => {
    if (id && data?.profile) {
      recordProfileVisit(id).catch(() => {});
    }
  }, [id, data?.profile]);

  const likeMutation = useMutation({
    mutationFn: () => likeProfile(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });

  // Vérifie si déjà matché pour afficher le bouton Message
  const matchesQuery = useQuery({
    queryKey: ['matches'],
    queryFn: fetchMatches,
  });
  const existingMatch = matchesQuery.data?.matches?.find(
    (m) => m.user?._id === id
  );

  const handleReport = () => {
    Alert.alert(
      "Signaler ce profil",
      "Voulez-vous signaler ce profil à l'équipe de modération ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Signaler",
          style: "destructive",
          onPress: () => setReported(true),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.loadState}>
            <ActivityIndicator color={Colors.accentPink} size="large" />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (isError || !data?.profile) {
    return (
      <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.loadState}>
            <Text style={styles.errorText}>
              {error instanceof ApiError ? error.message : "Profil introuvable"}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const profile = data.profile;
  const avatarUri = profile.image;
  const name = profile.pseudonyme;
  const age = profile.age;
  const city = profile.localisation;
  const tags = profile.interets ?? [];
  const intentions = profile.intentions ?? [];
  const bio = profile.bio;
  const orientation = profile.orientation;
  const verified = profile.identityVerified;
  const photos = (profile.photos ?? []).filter(Boolean);

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.reportBtn} onPress={handleReport} hitSlop={8} disabled={reported}>
            <Flag size={18} color={reported ? Colors.textMuted : Colors.accentPink} weight={reported ? 'regular' : 'duotone'} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar + halo */}
          <View style={styles.avatarSection}>
            <LinearGradient
              colors={[Colors.accentPurple, Colors.accentPink]}
              style={styles.avatarRing}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
              )}
            </LinearGradient>
            {verified && (
              <View style={styles.verifiedBadge}>
                <SealCheck size={18} color="#fff" weight="fill" />
              </View>
            )}
          </View>

          {/* Galerie photos supplémentaires */}
          {photos.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.galleryScrollOuter}
              contentContainerStyle={styles.galleryScroll}
            >
              {photos.map((photoUri, idx) => (
                <View key={idx} style={styles.galleryCard}>
                  <Image source={{ uri: photoUri }} style={styles.galleryImg} resizeMode="cover" />
                </View>
              ))}
            </ScrollView>
          )}

          {/* Identité */}
          <Text style={styles.name}>
            {name}{age ? `, ${age} ans` : ''}
          </Text>
          {city && (
            <View style={styles.cityRow}>
              <MapPin size={13} color={Colors.textMuted} weight="duotone" />
              <Text style={styles.cityText}>{city}</Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {existingMatch ? (
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => router.push(`/(app)/chat/${existingMatch.matchId}` as any)}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[Colors.accentPurple, Colors.accentPink]} style={styles.actionBtnGradient}>
                  <ChatCircleText size={17} color="#fff" weight="fill" />
                  <Text style={styles.actionBtnText}>Envoyer un message</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => likeMutation.mutate()}
                disabled={likeMutation.isPending || likeMutation.isSuccess}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={likeMutation.isSuccess ? ['#16a34a', '#15803d'] : [Colors.accentPurple, Colors.accentPink]}
                  style={styles.actionBtnGradient}
                >
                  <Heart size={17} color="#fff" weight="fill" />
                  <Text style={styles.actionBtnText}>
                    {likeMutation.isSuccess ? "Like envoyé !" : likeMutation.isPending ? "…" : "Liker ce profil"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Intentions */}
          {intentions.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Sparkle size={14} color={Colors.accentPink} weight="duotone" />
                <Text style={styles.cardTitle}>Je recherche</Text>
              </View>
              <View style={styles.tagRow}>
                {intentions.map((i) => (
                  <View key={i} style={styles.intentionChip}>
                    <Text style={styles.intentionChipText}>{i}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Bio */}
          {!!bio && (
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <MoonStars size={14} color={Colors.accentPink} weight="duotone" />
                <Text style={styles.cardTitle}>À propos</Text>
              </View>
              <Text style={styles.bioText}>{bio}</Text>
            </View>
          )}

          {/* Orientation */}
          {!!orientation && (
            <View style={styles.card}>
              <View style={styles.orientationRow}>
                <Text style={styles.orientationLabel}>Orientation</Text>
                <View style={styles.orientationChip}>
                  <Text style={styles.orientationChipText}>{orientation}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Centres d'intérêt */}
          {tags.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Heart size={14} color={Colors.accentPink} weight="duotone" />
                <Text style={styles.cardTitle}>Centres d'intérêt</Text>
              </View>
              <View style={styles.tagRow}>
                {tags.map((t) => (
                  <View key={t} style={styles.tag}>
                    <Text style={styles.tagText}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {reported && (
            <View style={styles.reportedNote}>
              <Flag size={13} color={Colors.textMuted} />
              <Text style={styles.reportedNoteText}>Signalement envoyé. Merci de contribuer à la sécurité de la communauté.</Text>
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.base, paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  reportBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  loadState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.textMuted, fontSize: 14 },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: 16, alignItems: 'center' },
  avatarSection: { marginTop: 8, position: 'relative' },
  avatarRing: {
    width: AVATAR_SIZE + 6, height: AVATAR_SIZE + 6, borderRadius: (AVATAR_SIZE + 6) / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  avatarPlaceholder: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.bgMid, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 36, fontWeight: '700', color: Colors.textPrimary },
  verifiedBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.accentPink, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.bgDeep,
  },
  name: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cityText: { fontSize: 13, color: Colors.textMuted },
  actions: { width: '100%' },
  actionBtnPrimary: { borderRadius: Radius.full, overflow: 'hidden' },
  actionBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  card: {
    width: '100%', backgroundColor: Colors.glassBg,
    borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.xl, padding: 16, gap: 10,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.7 },
  bioText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  orientationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orientationLabel: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.7 },
  orientationChip: {
    backgroundColor: 'rgba(124,58,237,0.2)', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  orientationChipText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1,
    borderColor: Colors.glassBorder, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  tagText: { fontSize: 13, color: Colors.textSecondary },
  intentionChip: {
    backgroundColor: 'rgba(219,39,119,0.12)', borderWidth: 1,
    borderColor: 'rgba(219,39,119,0.25)', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  intentionChipText: { fontSize: 13, color: Colors.accentPink, fontWeight: '600' },
  reportedNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.lg,
    padding: 12, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  reportedNoteText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
  // Galerie photos
  galleryScrollOuter: { flexGrow: 0, flexShrink: 0, width: SCREEN_W },
  galleryScroll: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 4,
    gap: 12,
    alignItems: 'center',
  },
  galleryCard: {
    width: GALLERY_CARD_W,
    height: GALLERY_CARD_H,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  galleryImg: { width: '100%', height: '100%' },
});
