/**
 * Motif décoratif "orbite" (cercles concentriques + points cardinaux),
 * écho visuel du nom "Sfera" — repris du site web (OrbitGlow en SVG).
 *
 * Ici reconstruit en Views pures (bordures circulaires) car
 * react-native-svg n'est pas installé et la sandbox ne peut pas
 * ajouter de nouvelles dépendances (registry npm bloqué — voir CLAUDE.md).
 *
 * Usage : positionner en absolu, deux instances par écran (haut-droite /
 * bas-gauche), via une `size` et un `style` d'offset.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface Props {
  /** Taille du carré contenant le motif (~ viewBox 200x200 du site web). */
  size?: number;
  /** 'light' = traits blancs (fonds sombres) — 'default' = traits violets (fonds clairs). */
  variant?: 'light' | 'default';
  /** Offset de positionnement absolu, ex: { top: -40, right: -60 }. */
  style?: { top?: number; right?: number; bottom?: number; left?: number };
}

export function OrbitGlow({ size = 280, variant = 'light', style }: Props) {
  const stroke = variant === 'light' ? '#FFFFFF' : '#8E7AB5';
  const dot = variant === 'light' ? '#FFFFFF' : '#5B4B8A';

  // Rayons proportionnels au viewBox 200x200 du site (r=90/62/34, centre 100,100)
  const rOuter = size * 0.9;
  const rMid = size * 0.62;
  const rInner = size * 0.34;
  const dotSize = size * 0.03;
  const half = size / 2;

  return (
    <View
      pointerEvents="none"
      style={[styles.container, { width: size, height: size }, style]}
    >
      <View
        style={[
          styles.ring,
          {
            width: rOuter,
            height: rOuter,
            borderRadius: rOuter / 2,
            borderColor: stroke,
            top: half - rOuter / 2,
            left: half - rOuter / 2,
          },
        ]}
      />
      <View
        style={[
          styles.ring,
          styles.ringDashed,
          {
            width: rMid,
            height: rMid,
            borderRadius: rMid / 2,
            borderColor: stroke,
            top: half - rMid / 2,
            left: half - rMid / 2,
          },
        ]}
      />
      <View
        style={[
          styles.ring,
          {
            width: rInner,
            height: rInner,
            borderRadius: rInner / 2,
            borderColor: stroke,
            top: half - rInner / 2,
            left: half - rInner / 2,
          },
        ]}
      />
      {/* Points cardinaux */}
      <View style={[styles.dot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: dot, top: 0, left: half - dotSize / 2 }]} />
      <View style={[styles.dot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: dot, top: size - dotSize, left: half - dotSize / 2 }]} />
      <View style={[styles.dot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: dot, left: 0, top: half - dotSize / 2 }]} />
      <View style={[styles.dot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: dot, left: size - dotSize, top: half - dotSize / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    opacity: 0.14,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  ringDashed: {
    borderStyle: 'dashed',
  },
  dot: {
    position: 'absolute',
  },
});
