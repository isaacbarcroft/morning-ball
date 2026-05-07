export const tokens = {
  color: {
    bg: '#0A0A0B',
    surface: '#1A1A1D',
    surfaceElevated: '#222226',
    surfaceHigh: '#2A2A30',
    border: '#33333A',
    textPrimary: '#FFFFFF',
    textSecondary: '#9999A3',
    textMuted: '#666670',
    primary: '#A855F7',
    primaryDim: '#7E3FBF',
    accent: '#FF6B1A',
    success: '#10B981',
    danger: '#EF4444',
    teamA: '#A855F7',
    teamB: '#FF6B1A',
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  font: {
    family: { default: 'System', mono: 'SpaceMono' },
    size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, xxl: 40 },
    weight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
} as const;

export type Tokens = typeof tokens;
