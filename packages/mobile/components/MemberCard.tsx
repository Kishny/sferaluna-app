import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MapPin, SealCheck, UserPlus, Check } from 'phosphor-react-native';
import { LinearGradient } from './LinearGradient';
import { Colors, Radius } from '../lib/theme';
import type { PublicProfile } from '../lib/api';
import { NP } from './NP';

interface Props {
  profile: PublicProfile;
  width: number;
  /** Invitation déjà envoyée pendant cette session. */
  invited: boolean;
  /** Invitation en cours d'envoi. */
  pending: boolean;
  onOpen: () => void;
  onInvite: () => void;
}

/**
 * Carte d'une membre dans l'annuaire : photo, prénom, ville, centres
 * d'intérêt, et un bouton « Se connecter ». Toucher la carte ouvre le profil.
 * Aucun geste de glissement : on parcourt la communauté, on lit, on choisit.
 */
export function MemberCard({ profile, width, invited, pending, onOpen, onInvite }: Props) {
  const tags = (profile.interets ?? []).slice(0, 2);

  return (
    <View style={[styles.card, { width }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Voir le profil de ${profile.pseudonyme}`}
      >
        <View style={[styles.photoWrap, { height: width * 1.15 }]}>
          {profile.image ? (
            <Image source={{ uri: profile.image }} style={styles.photo} />
          ) : (
            <LinearGradient colors={[Colors.accentPurple, Colors.accentPink]} style={styles.photoFallback}>
              <Text style={styles.initial}>{profile.pseudonyme?.[0]?.toUpperCase() ?? '?'}</Text>
            </LinearGradient>
          )}
          {profile.identityVerified && (
            <View style={styles.verified}>
              <SealCheck size={13} color="#fff" weight="fill" />
              <Text style={styles.verifiedText}>Vérifiée</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {profile.pseudonyme}{profile.age ? `, ${profile.age}` : ''}
          </Text>
          {profile.localisation ? (
            <View style={styles.cityRow}>
              <MapPin size={12} color={Colors.textSecondary} weight="fill" />
              <Text style={styles.city} numberOfLines={1}>{profile.localisation}</Text>
            </View>
          ) : null}
          {tags.length > 0 && (
            <View style={styles.tags}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText} numberOfLines={1}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.inviteBtn, invited && styles.inviteBtnDone]}
        onPress={onInvite}
        disabled={invited || pending}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={invited ? `Invitation envoyée à ${profile.pseudonyme}` : `Se connecter avec ${profile.pseudonyme}`}
      >
        {pending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <NP>
              {invited
                ? <Check size={15} color={Colors.textSecondary} weight="bold" />
                : <UserPlus size={15} color="#fff" weight="bold" />}
            </NP>
            <Text style={[styles.inviteText, invited && styles.inviteTextDone]}>
              {invited ? 'Invitation envoyée' : 'Se connecter'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  photoWrap: { width: '100%', backgroundColor: Colors.bgMid },
  photo: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 44, fontWeight: '700', color: '#fff' },
  verified: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(14,116,144,0.92)',
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  body: { paddingHorizontal: 12, paddingTop: 10, height: 88 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  city: { flex: 1, fontSize: 12, color: Colors.textSecondary },
  tags: { flexDirection: 'row', gap: 5, marginTop: 8, overflow: 'hidden' },
  tag: {
    flexShrink: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tagText: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    margin: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentPurple,
  },
  inviteBtnDone: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  inviteText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  inviteTextDone: { color: Colors.textSecondary, fontWeight: '600' },
});
