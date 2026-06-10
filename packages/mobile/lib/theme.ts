export const Colors = {
  // Backgrounds
  bgDeep: '#1a0b2e',
  bgMid: '#2d1b69',
  bgSurface: '#3a2a82',

  // Accents
  accentPurple: '#7C3AED',
  accentPink: '#DB2777',
  gradient: ['#7C3AED', '#DB2777'] as const,

  // Light surfaces
  offWhite: '#faf9ff',
  lightTint: '#f0ecff',
  mutedPurple: '#8E7AB5',
  deepMuted: '#5B4B8A',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.35)',
  textDark: '#1a0b2e',

  // Glass
  glassBg: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.15)',
  border: 'rgba(255,255,255,0.12)',

  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 8,
  md: 16,
  lg: 20,
  xl: 28,
  full: 999,
};

export const Typography = {
  displayLg: { fontSize: 32, fontWeight: '700' as const, color: Colors.textPrimary },
  displayMd: { fontSize: 28, fontWeight: '700' as const, color: Colors.textPrimary },
  h1: { fontSize: 24, fontWeight: '700' as const, color: Colors.textPrimary },
  h2: { fontSize: 20, fontWeight: '600' as const, color: Colors.textPrimary },
  h3: { fontSize: 18, fontWeight: '600' as const, color: Colors.textPrimary },
  bodyLg: { fontSize: 16, fontWeight: '400' as const, color: Colors.textPrimary },
  body: { fontSize: 14, fontWeight: '400' as const, color: Colors.textSecondary },
  caption: { fontSize: 12, fontWeight: '400' as const, color: Colors.textMuted },
};
