import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/lib/theme';

interface RsvpCountsProps {
  inCount: number;
  outCount: number;
  noResponseCount: number;
}

export function RsvpCounts({ inCount, outCount, noResponseCount }: RsvpCountsProps) {
  return (
    <View style={styles.row}>
      <Cell value={inCount} label="In" tone="primary" />
      <Cell value={outCount} label="Out" tone="muted" />
      <Cell value={noResponseCount} label="No reply" tone="muted" />
    </View>
  );
}

interface CellProps {
  value: number;
  label: string;
  tone: 'primary' | 'muted';
}

function Cell({ value, label, tone }: CellProps) {
  return (
    <View style={styles.cell}>
      <Text style={[styles.value, tone === 'primary' && styles.valuePrimary]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
    backgroundColor: tokens.color.surfaceHigh,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  value: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.xl,
    fontWeight: '700',
  },
  valuePrimary: {
    color: tokens.color.primary,
  },
  label: {
    color: tokens.color.textMuted,
    fontSize: tokens.font.size.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
});
