import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/lib/theme';

interface PillProps {
  label: string;
  tone?: 'neutral' | 'primary' | 'accent' | 'success' | 'danger';
}

const toneStyleFor = (tone: PillProps['tone']) => {
  if (tone === 'primary') return styles.primary;
  if (tone === 'accent') return styles.accent;
  if (tone === 'success') return styles.success;
  if (tone === 'danger') return styles.danger;
  return styles.neutral;
};

export function Pill({ label, tone = 'neutral' }: PillProps) {
  return (
    <View style={[styles.base, toneStyleFor(tone)]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    alignSelf: 'flex-start',
  },
  label: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  neutral: { backgroundColor: tokens.color.surfaceHigh },
  primary: { backgroundColor: tokens.color.primaryDim },
  accent: { backgroundColor: tokens.color.accent },
  success: { backgroundColor: tokens.color.success },
  danger: { backgroundColor: tokens.color.danger },
});
