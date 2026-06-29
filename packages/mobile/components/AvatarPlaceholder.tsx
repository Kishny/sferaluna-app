/**
 * Avatar avec repli "initiales" — utilisé partout où une photo de profil
 * peut être absente (Découverte, Messages, Chat, VibeSphere, etc.).
 *
 * Important : ne JAMAIS utiliser un service de visages aléatoires (ex.
 * pravatar.cc) comme repli — ces services renvoient des visages au hasard,
 * y compris d'hommes, ce qui n'a aucun sens sur une appli de rencontres
 * pensée pour les femmes/WLW. Le repli "initiale + dégradé" est le seul
 * fallback à utiliser tant qu'aucune photo n'est uploadée.
 */
import React from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from './LinearGradient';
import { Colors } from '../lib/theme';

interface Props {
  uri?: string | null;
  name?: string | null;
  size: number;
}

export function AvatarPlaceholder({ uri, name, size }: Props) {
  const initial = name?.[0]?.toUpperCase() ?? '?';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <LinearGradient
      colors={[Colors.accentPurple, Colors.accentPink]}
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
