import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from '../../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import {
  PencilSimple, Camera, Check, MapPin, X, Crown, Sparkle, Heart, Star, Quotes,
  Compass, ChatCircleText, ShieldCheck, SealCheck, CalendarBlank, CaretRight, LockKey,
  MoonStars, Lightning, Users, BookOpen, Question, GraduationCap, Envelope,
} from 'phosphor-react-native';
import { router, useFocusEffect } from 'expo-router';
import { GradientButton } from '../../../components/GradientButton';
import { GlassCard } from '../../../components/GlassCard';
import { GlassInput } from '../../../components/GlassInput';
import { Colors, Spacing, Radius } from '../../../lib/theme';
import { fetchMyProfile, updateMyProfile, uploadAvatar, uploadPhoto, deletePhoto, fetchVisitors, ProfileVisitor } from '../../../lib/api';
import { getPlanLabel } from '../../../lib/auth';
import { ApiError } from '../../../lib/http';
import { NP } from '../../../components/NP';

const SUGGESTED_TAGS = ['Littérature', 'Voyages', 'Cuisine', 'Cinéma', 'Musique', 'Sport', 'Art', 'Nature', 'Yoga', 'Méditation'];

const AVATAR_SIZE = 112;
const AVATAR_RING = 4;

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** "Membre depuis juin 2025" — formatage FR à partir d'un createdAt ISO, silencieux si absent/invalide. */
function formatMemberSince(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
  return `Membre depuis ${formatted}`;
}

function VisitorsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['visitors'],
    queryFn: fetchVisitors,
    staleTime: 5 * 60 * 1000,
  });
  const visitors: ProfileVisitor[] = data?.visitors ?? [];

  return (
    <View style={styles.visitorsSection}>
      <View style={styles.visitorsTitleRow}>
        <NP><Crown size={15} color={Colors.accentPink} weight="duotone" />
        </NP><Text style={styles.visitorsTitle}>Qui a visité mon profil</Text>
      </View>
      {isLoading ? (
        <Text style={styles.visitorsEmpty}>Chargement…</Text>
      ) : visitors.length === 0 ? (
        <Text style={styles.visitorsEmpty}>Aucune visite récente.</Text>
      ) : (
        <View style={styles.visitorsRow}>
          {visitors.slice(0, 6).map((v) => (
            <TouchableOpacity
              key={v.visitorId}
              style={styles.visitorAvatar}
              onPress={() => router.push(`/(app)/profil/${v.visitorId}` as any)}
              activeOpacity={0.8}
            >
              {v.image ? (
                <Image source={{ uri: v.image }} style={styles.visitorAvatarImg} />
              ) : (
                <View style={styles.visitorAvatarPlaceholder}>
                  <Text style={styles.visitorAvatarInitial}>{v.pseudonyme?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          {visitors.length > 6 && (
            <View style={styles.visitorMore}>
              <Text style={styles.visitorMoreText}>+{visitors.length - 6}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoGalleryError, setPhotoGalleryError] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: fetchMyProfile,
  });

  // Rafraîchit uniquement si les données ont plus de 60 s (ou sont absentes).
  // L'ancienne version appelait refetch() inconditionnellement à chaque focus,
  // déclenchant un appel réseau systématique qui saturait le thread JS et
  // rendait la navigation entre onglets lente. Le staleTime global (60 s) du
  // QueryClient gère déjà ce cas — on garde le useFocusEffect uniquement pour
  // forcer un rafraîchissement après un paiement Stripe (où les données sont
  // effectivement périmées car le webhook a mis à jour isPremium côté serveur).
  useFocusEffect(
    useCallback(() => {
      if (!data) { refetch(); return; }
      // dataUpdatedAt est fourni par TanStack Query via le queryClient
      const age = queryClient.getQueryState(['profile', 'me'])?.dataUpdatedAt ?? 0;
      if (Date.now() - age > 60_000) refetch();
    }, [data, refetch, queryClient])
  );

  const user = data?.user;
  const completion = data?.metadata?.profileCompletion?.percentage ?? 0;
  const isPremium = data?.premium?.isPremium ?? false;
  const plan = data?.premium?.plan;
  const planLabel = getPlanLabel(plan);
  // Le badge et le lien "Passer Premium" doivent être strictement complémentaires
  // (jamais affichés ensemble) : on se base donc uniquement sur `isPremium`,
  // seule valeur garantie cohérente côté serveur (jamais pilotée côté client).
  const showPlanBadge = isPremium;

  // Synchronise les champs locaux d'édition dès que le profil distant arrive
  // ou est rafraîchi (et qu"on n'est pas en train d"éditer pour ne rien écraser).
  useEffect(() => {
    if (!user || editing) return;
    setBio(asString(user.bio));
    setCity(asString(user.localisation));
    setTags(asStringArray(user.interets));
  }, [user, editing]);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const saveMutation = useMutation({
    mutationFn: () => updateMyProfile({ bio: bio.trim(), localisation: city.trim(), interets: tags }),
    onSuccess: () => {
      setSaveError(null);
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    },
    onError: (e) => {
      setSaveError(e instanceof ApiError ? e.message : "Impossible d'enregistrer vos modifications.");
    },
  });

  const avatarMutation = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Autorisez l'accès à vos photos pour changer votre avatar.");
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return null;
      const asset = result.assets[0];
      const name = asset.fileName ?? `avatar-${Date.now()}.jpg`;
      const type = asset.mimeType ?? 'image/jpeg';
      return uploadAvatar({ uri: asset.uri, name, type });
    },
    onSuccess: (res) => {
      if (!res) return;
      setPhotoError(null);
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    },
    onError: (e) => {
      setPhotoError(e instanceof Error ? e.message : "Échec de l'envoi de la photo.");
    },
  });

  const handleEditPress = () => {
    if (editing) {
      setSaveError(null);
      saveMutation.mutate();
    } else {
      setEditing(true);
    }
  };

  const handleCancel = () => {
    if (!user) return;
    setBio(asString(user.bio));
    setCity(asString(user.localisation));
    setTags(asStringArray(user.interets));
    setSaveError(null);
    setEditing(false);
  };

  const handleAddPhoto = async (slotIndex: number) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoGalleryError("Autorisez l'accès à vos photos pour ajouter une image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
    const type = asset.mimeType ?? 'image/jpeg';
    setUploadingSlot(slotIndex);
    setPhotoGalleryError(null);
    try {
      await uploadPhoto({ uri: asset.uri, name, type });
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    } catch (e) {
      setPhotoGalleryError(e instanceof Error ? e.message : "Échec de l'upload.");
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    setPhotoGalleryError(null);
    try {
      await deletePhoto(photoUrl);
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    } catch (e) {
      setPhotoGalleryError(e instanceof Error ? e.message : "Impossible de supprimer la photo.");
    }
  };

  if (isLoading) {
    return (
      <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <View style={styles.centerState}>
            <ActivityIndicator color={Colors.accentPink} size="large" />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (isError || !user) {
    return (
      <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>Connexion impossible</Text>
            <Text style={styles.emptyText}>
              {error instanceof ApiError ? error.message : 'Impossible de charger votre profil.'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryBtnText}>{isRefetching ? 'Nouvelle tentative…' : 'Réessayer'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const pseudonyme = asString(user.pseudonyme) || 'Vous';
  const age = typeof user.age === 'number' ? user.age : undefined;
  const avatarUri = asString(user.image);
  const intentions = asStringArray(user.intentions);
  const orientation = asString(user.orientation);
  const secretQuestion = asString(user.question);
  const secretAnswer = asString(user.reponse);
  const identityVerified = Boolean(user.identityVerified);
  const memberSince = formatMemberSince(user.createdAt);
  const myPhotos: string[] = Array.isArray((user as any).photos)
    ? (user as any).photos.filter((p: unknown): p is string => typeof p === 'string')
    : [];
  const MAX_PHOTOS = 3;

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
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
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Mon profil</Text>
              <Text style={styles.subtitle}>Votre image, votre histoire, votre espace.</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {editing && (
                <TouchableOpacity style={styles.editBtn} onPress={handleCancel}>
                  <NP><X size={20} color={Colors.textSecondary} /></NP>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.editBtn, editing && styles.editBtnActive]}
                onPress={handleEditPress}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : editing ? (
                  <NP><Check size={20} color="#fff" />
                </NP>) : (
                  <PencilSimple size={20} color={Colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {!!saveError && (
            <Text style={[styles.errorText, { marginHorizontal: Spacing.xl }]}>{saveError}</Text>
          )}

          {/* ───────── Hero : portrait premium ───────── */}
          <View style={styles.hero}>
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={[Colors.accentPurple, Colors.accentPink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarRing}
              >
                <Image
                  source={{ uri: avatarUri || 'https://i.pravatar.cc/200' }}
                  style={styles.avatar}
                />
              </LinearGradient>

              {identityVerified && (
                <View style={styles.verifiedSeal}>
                  <SealCheck size={16} color="#fff" weight="fill" />
                </View>
              )}

              {editing && (
                <TouchableOpacity
                  style={styles.cameraBtn}
                  onPress={() => avatarMutation.mutate()}
                  disabled={avatarMutation.isPending}
                >
                  {avatarMutation.isPending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <NP><Camera size={18} color="#fff" /></NP>}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.nameRow}>
              <Text style={styles.name}>{pseudonyme}{age ? `, ${age}` : ''}</Text>
              {showPlanBadge && (
                <View style={styles.planBadge}>
                  <NP><Crown size={12} color="#F59E0B" weight="fill" />
                  </NP><Text style={styles.planBadgeText}>{planLabel}</Text>
                </View>
              )}
            </View>

            <View style={styles.locationRow}>
              <MapPin size={14} color={Colors.textMuted} />
              <Text style={styles.locationText}>{city || 'Localisation non renseignée'}</Text>
            </View>

            {memberSince && (
              <View style={styles.memberSinceRow}>
                <CalendarBlank size={13} color={Colors.textMuted} />
                <Text style={styles.memberSinceText}>{memberSince}</Text>
              </View>
            )}

            {!!photoError && <Text style={styles.errorText}>{photoError}</Text>}
          </View>

          <View style={styles.content}>
            {/* ───────── Bandeau statut : complétion + premium ───────── */}
            {isPremium ? (
              <LinearGradient
                colors={['rgba(124,58,237,0.22)', 'rgba(219,39,119,0.18)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statusBanner}
              >
                <View style={styles.statusBannerIcon}>
                  <Sparkle size={20} color="#F59E0B" weight="fill" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusBannerTitle}>Profil {planLabel}</Text>
                  <Text style={styles.statusBannerText}>
                    Vous profitez d'une visibilité et d'avantages exclusifs sur SferaLuna.
                  </Text>
                </View>
              </LinearGradient>
            ) : (
              <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(app)/premium')}>
                <LinearGradient
                  colors={[Colors.accentPurple, Colors.accentPink]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statusBanner}
                >
                  <View style={styles.statusBannerIcon}>
                    <Sparkle size={20} color="#fff" weight="fill" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusBannerTitle}>Profil complété à {completion}%</Text>
                    <Text style={styles.statusBannerTextLight}>
                      Passez Premium pour gagner en visibilité et débloquer toutes les fonctionnalités.
                    </Text>
                  </View>
                  <NP><CaretRight size={18} color="#fff" />
                </NP></LinearGradient>
              </TouchableOpacity>
            )}

            {!isPremium && (
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={[Colors.accentPurple, Colors.accentPink]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${completion}%` }]}
                />
              </View>
            )}

            {/* ───────── Mes photos ───────── */}
            {(editing || myPhotos.length > 0) && (
              <GlassCard style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <NP><Camera size={16} color={Colors.accentPink} weight="duotone" />
                  </NP></View>
                  <Text style={styles.sectionTitle}>Mes photos</Text>
                  <Text style={styles.photoCount}>{myPhotos.length}/{MAX_PHOTOS}</Text>
                </View>

                {!!photoGalleryError && (
                  <Text style={styles.errorText}>{photoGalleryError}</Text>
                )}

                <View style={styles.photosGrid}>
                  {Array.from({ length: MAX_PHOTOS }).map((_, idx) => {
                    const photoUrl = myPhotos[idx];
                    const isUploading = uploadingSlot === idx;
                    if (photoUrl) {
                      return (
                        <View key={idx} style={styles.photoSlot}>
                          <Image source={{ uri: photoUrl }} style={styles.photoSlotImg} resizeMode="cover" />
                          {editing && (
                            <TouchableOpacity
                              style={styles.photoDeleteBtn}
                              onPress={() => handleDeletePhoto(photoUrl)}
                              hitSlop={4}
                            >
                              <NP><X size={13} color="#fff" />
                            </NP></TouchableOpacity>
                          )}
                        </View>
                      );
                    }
                    if (editing) {
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={styles.photoSlotEmpty}
                          onPress={() => handleAddPhoto(idx)}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <ActivityIndicator size="small" color={Colors.accentPink} />
                          ) : (
                            <>
                              <Text style={styles.photoSlotPlus}>+</Text>
                              <Text style={styles.photoSlotHint}>Ajouter</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      );
                    }
                    return null;
                  })}
                </View>
              </GlassCard>
            )}

            {/* À propos */}
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Sparkle size={16} color={Colors.accentPink} weight="duotone" />
                </View>
                <Text style={styles.sectionTitle}>À propos de moi</Text>
              </View>
              {editing ? (
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  style={styles.bioInput}
                  placeholderTextColor={Colors.textMuted}
                  placeholder="Parlez de vous..."
                />
              ) : (
                <Text style={styles.bioText}>
                  {bio || 'Aucune bio pour le moment — partagez ce qui vous rend unique.'}
                </Text>
              )}
            </GlassCard>

            {/* Intentions (lecture seule — définies lors de l'inscription) */}
            {intentions.length > 0 && (
              <GlassCard style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <NP><Heart size={16} color={Colors.accentPink} weight="duotone" />
                  </NP></View>
                  <Text style={styles.sectionTitle}>Je recherche</Text>
                </View>
                <View style={styles.tagsGrid}>
                  {intentions.map((tag) => (
                    <View key={tag} style={[styles.tag, styles.tagActive]}>
                      <Text style={[styles.tagText, styles.tagTextActive]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </GlassCard>
            )}

            {/* Orientation (lecture seule) — une seule valeur : présentation
                compacte en ligne plutôt qu'une grande carte de section. */}
            {!!orientation && (
              <GlassCard style={styles.orientationCard} padding={12}>
                <View style={styles.orientationRow}>
                  <View style={styles.orientationIcon}>
                    <Compass size={14} color={Colors.accentPink} weight="duotone" />
                  </View>
                  <Text style={styles.orientationLabel}>Orientation</Text>
                  <View style={styles.orientationChip}>
                    <Text style={styles.orientationChipText}>{orientation}</Text>
                  </View>
                </View>
              </GlassCard>
            )}

            {/* Centres d'intérêt */}
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <NP><Star size={16} color={Colors.accentPink} weight="duotone" />
                </NP></View>
                <Text style={styles.sectionTitle}>Mes centres d'intérêt</Text>
              </View>
              <View style={styles.tagsGrid}>
                {(editing ? SUGGESTED_TAGS : tags).length === 0 && !editing ? (
                  <Text style={styles.bioText}>Aucun centre d'intérêt renseigné.</Text>
                ) : (
                  (editing ? Array.from(new Set([...SUGGESTED_TAGS, ...tags])) : tags).map((tag) => {
                    const active = tags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => editing && toggleTag(tag)}
                        style={[styles.tag, active && styles.tagActive]}
                        disabled={!editing}
                      >
                        <Text style={[styles.tagText, active && styles.tagTextActive]}>
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </GlassCard>

            {/* Réponse secrète (lecture seule — utilisée pour briser la glace) */}
            {!!secretQuestion && !!secretAnswer && (
              <GlassCard style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <ChatCircleText size={16} color={Colors.accentPink} weight="duotone" />
                  </View>
                  <Text style={styles.sectionTitle}>Ma réponse secrète</Text>
                </View>
                <View style={styles.secretBlock}>
                  <Quotes size={16} color={Colors.textMuted} weight="fill" />
                  <Text style={styles.secretQuestion}>{secretQuestion}</Text>
                </View>
                <Text style={styles.secretAnswer}>{secretAnswer}</Text>
              </GlassCard>
            )}

            {editing && (
              <GlassInput
                label="Ville"
                value={city}
                onChangeText={setCity}
                icon={<MapPin size={20} color={Colors.textMuted} />}
              />
            )}

            {editing && (
              <GradientButton
                label={saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
                onPress={() => { setSaveError(null); saveMutation.mutate(); }}
                disabled={saveMutation.isPending}
                style={styles.saveBtn}
              />
            )}

            {/* Visiteurs de profil — Premium uniquement */}
            {!editing && isPremium && (
              <VisitorsSection />
            )}

            {/* Espace SferaLuna — hub fonctionnalités */}
            {!editing && (
              <View style={styles.hubSection}>
                <View style={styles.hubHeaderRow}>
                  <MoonStars size={16} color={Colors.accentPink} weight="duotone" />
                  <Text style={styles.hubTitle}>Espace SferaLuna</Text>
                </View>
                <View style={styles.hubGrid}>
                  {[
                    { icon: <Lightning size={14} color="#a855f7" weight="duotone" />, label: 'VibeSphere', route: '/(app)/vibesphere', bg: 'rgba(168,85,247,0.13)' },
                    { icon: <BookOpen size={14} color="#ec4899" weight="duotone" />, label: 'VibeMentor', route: '/(app)/vibementor', bg: 'rgba(236,72,153,0.13)' },
                    { icon: <CalendarBlank size={14} color="#818cf8" weight="duotone" />, label: 'VibePlanner', route: '/(app)/vibeplanner', bg: 'rgba(129,140,248,0.13)' },
                    { icon: <NP><Star size={14} color="#f59e0b" weight="duotone" /></NP>, label: 'Circle of Six', route: '/(app)/circle', bg: 'rgba(245,158,11,0.13)' },
                    { icon: <CalendarBlank size={14} color="#f472b6" weight="duotone" />, label: 'Événements', route: '/(app)/evenements', bg: 'rgba(244,114,182,0.13)' },
                    { icon: <ChatCircleText size={14} color="#4ade80" weight="duotone" />, label: 'Communauté', route: '/(app)/communaute', bg: 'rgba(74,222,128,0.13)' },
                    { icon: <Question size={14} color="#34d399" weight="duotone" />, label: 'FAQ', route: '/(app)/faq', bg: 'rgba(52,211,153,0.13)' },
                    { icon: <GraduationCap size={14} color="#60a5fa" weight="duotone" />, label: 'Guide', route: '/(app)/guide', bg: 'rgba(96,165,250,0.13)' },
                    { icon: <Users size={14} color="#c084fc" weight="duotone" />, label: 'Équipe', route: '/(app)/equipe', bg: 'rgba(192,132,252,0.13)' },
                    { icon: <Envelope size={14} color="#fb923c" weight="duotone" />, label: 'Contact', route: '/(app)/contact', bg: 'rgba(251,146,60,0.13)' },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.label}
                      style={styles.hubCell}
                      onPress={() => router.push(item.route as any)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.hubIcon, { backgroundColor: item.bg }]}>{item.icon}</View>
                      <Text style={styles.hubCellLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Raccourcis sécurité & confidentialité */}
            {!editing && (
              <GlassCard padding={0} style={styles.section}>
                <TouchableOpacity
                  style={styles.linkRow}
                  activeOpacity={0.7}
                  onPress={() => router.push('/(app)/securite')}
                >
                  <View style={styles.itemLeft}>
                    <View style={styles.sectionIcon}>
                      <ShieldCheck size={16} color={Colors.accentPink} weight="duotone" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.linkLabel}>Sécurité du compte</Text>
                      <Text style={styles.linkDescription}>
                        {identityVerified ? 'Identité vérifiée' : 'Vérifiez votre identité, gérez votre accès'}
                      </Text>
                    </View>
                  </View>
                  <NP><CaretRight size={16} color={Colors.textMuted} />
                </NP></TouchableOpacity>

                <View style={styles.linkDivider} />

                <TouchableOpacity
                  style={styles.linkRow}
                  activeOpacity={0.7}
                  onPress={() => router.push('/(app)/(tabs)/settings')}
                >
                  <View style={styles.itemLeft}>
                    <View style={styles.sectionIcon}>
                      <LockKey size={16} color={Colors.accentPink} weight="duotone" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.linkLabel}>Confidentialité & visibilité</Text>
                      <Text style={styles.linkDescription}>Mode Fantôme, notifications, réglages…</Text>
                    </View>
                  </View>
                  <NP><CaretRight size={16} color={Colors.textMuted} />
                </NP></TouchableOpacity>
              </GlassCard>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.md,
  },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 12.5, color: Colors.textMuted, marginTop: 3 },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnActive: {
    backgroundColor: Colors.accentPurple,
    borderColor: Colors.accentPurple,
  },
  hero: { alignItems: 'center', paddingVertical: Spacing.lg },
  avatarWrapper: { position: 'relative', marginBottom: 14 },
  avatarRing: {
    width: AVATAR_SIZE + AVATAR_RING * 2,
    height: AVATAR_SIZE + AVATAR_RING * 2,
    borderRadius: (AVATAR_SIZE + AVATAR_RING * 2) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accentPink,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: Colors.bgDeep,
  },
  verifiedSeal: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.bgDeep,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentPink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.bgDeep,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { fontSize: 23, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.2 },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  planBadgeText: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 13, color: Colors.textMuted },
  memberSinceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  memberSinceText: { fontSize: 11.5, color: Colors.textMuted },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: 16 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  statusBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBannerTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  statusBannerText: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2, lineHeight: 17 },
  statusBannerTextLight: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2, lineHeight: 17 },
  progressBar: {
    height: 5,
    backgroundColor: Colors.glassBg,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: -8,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  section: {},
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(219, 39, 119, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  orientationCard: {},
  hubSection: { gap: 8 },
  hubHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hubTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  hubGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  hubCell: {
    width: '31%',
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.lg, paddingVertical: 8, paddingHorizontal: 6, gap: 4, alignItems: 'center',
  },
  hubIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  hubCellLabel: { fontSize: 10.5, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  hubCellSub: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
  visitorsSection: { gap: 10 },
  visitorsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  visitorsTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  visitorsEmpty: { fontSize: 13, color: Colors.textMuted },
  visitorsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  visitorAvatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  visitorAvatarImg: { width: 48, height: 48, borderRadius: 24 },
  visitorAvatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(124,58,237,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  visitorAvatarInitial: { fontSize: 18, fontWeight: '700', color: '#fff' },
  visitorMore: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  visitorMoreText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  orientationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orientationIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: 'rgba(219, 39, 119, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orientationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
  },
  orientationChip: {
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderWidth: 1,
    borderColor: Colors.accentPurple,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  orientationChipText: { fontSize: 12.5, color: Colors.textPrimary, fontWeight: '500' },
  bioText: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  bioInput: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  tagActive: {
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderColor: Colors.accentPurple,
  },
  tagText: { fontSize: 13, color: Colors.textSecondary },
  tagTextActive: { color: Colors.textPrimary, fontWeight: '500' },
  secretBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  secretQuestion: { flex: 1, fontSize: 13, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 19 },
  secretAnswer: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  saveBtn: { marginTop: 8 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  linkDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.glassBorder, marginHorizontal: 16 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  linkLabel: { fontSize: 14.5, fontWeight: '600', color: Colors.textPrimary },
  linkDescription: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  errorText: { fontSize: 12, color: '#F87171', marginTop: 6, textAlign: 'center' },
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
  // Section photos
  photoCount: { fontSize: 12, color: Colors.textMuted, marginLeft: 'auto' },
  photosGrid: { flexDirection: 'row', gap: 10 },
  photoSlot: {
    flex: 1,
    aspectRatio: 4 / 5,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  photoSlotImg: { width: '100%', height: '100%' },
  photoDeleteBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSlotEmpty: {
    flex: 1,
    aspectRatio: 4 / 5,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoSlotPlus: { fontSize: 24, color: Colors.textMuted, lineHeight: 26 },
  photoSlotHint: { fontSize: 11, color: Colors.textMuted },
});
