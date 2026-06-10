/**
 * Cross-platform LinearGradient wrapper.
 * - Native (iOS/Android): utilise expo-linear-gradient (module Expo SDK,
 *   embarqué nativement dans Expo Go — contrairement à
 *   react-native-linear-gradient qui exige un dev client / build natif et
 *   provoquait l'erreur "View config not found for component `BVLinearGradient`").
 * - Web: renders a View with a CSS gradient background
 */
import React from 'react';
import { Platform, View, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

interface Props {
  colors: readonly string[] | string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle | ViewStyle[] | any;
  children?: React.ReactNode;
}

function angleFromStartEnd(
  start: { x: number; y: number },
  end: { x: number; y: number }
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const rad = Math.atan2(dy, dx);
  return Math.round((rad * 180) / Math.PI) + 90;
}

export function LinearGradient({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 0, y: 1 },
  style,
  children,
}: Props) {
  if (Platform.OS === 'web') {
    const angle = angleFromStartEnd(start, end);
    const stops = colors.join(', ');
    const flatStyle = StyleSheet.flatten(style) ?? {};
    return (
      <View
        style={[
          flatStyle,
          // @ts-ignore — web-only CSS property
          { backgroundImage: `linear-gradient(${angle}deg, ${stops})` },
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <ExpoLinearGradient
      colors={colors as [string, string, ...string[]]}
      start={start}
      end={end}
      style={style}
    >
      {children}
    </ExpoLinearGradient>
  );
}
