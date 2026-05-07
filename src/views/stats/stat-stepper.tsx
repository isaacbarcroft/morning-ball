import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { tokens } from '@/lib/theme';

interface StatStepperProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  compact?: boolean;
}

export function StatStepper({ label, value, onChange, min = 0, max = 99, compact = false }: StatStepperProps) {
  const increment = () => {
    if (value < max) onChange(value + 1);
  };
  const decrement = () => {
    if (value > min) onChange(value - 1);
  };
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.btn} onPress={decrement} hitSlop={8}>
          <Text style={styles.btnLabel}>−</Text>
        </TouchableOpacity>
        <Text style={styles.value}>{value}</Text>
        <TouchableOpacity style={styles.btn} onPress={increment} hitSlop={8}>
          <Text style={styles.btnLabel}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: tokens.spacing.sm,
  },
  rowCompact: {
    paddingVertical: tokens.spacing.xs,
  },
  label: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.sm,
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.color.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  btnLabel: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.lg,
    fontWeight: '600',
  },
  value: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.md,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
});
