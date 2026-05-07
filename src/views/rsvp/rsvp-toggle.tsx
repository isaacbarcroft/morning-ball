import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { tokens } from '@/lib/theme';
import type { RsvpStatus } from '@/types/domain';

interface RsvpToggleProps {
  current: RsvpStatus | null;
  onChange: (next: RsvpStatus) => void;
  pending?: RsvpStatus | null;
}

export function RsvpToggle({ current, onChange, pending = null }: RsvpToggleProps) {
  const busy = pending !== null;
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.button, current === 'in' && styles.activeIn]}
        onPress={() => onChange('in')}
        disabled={busy}
      >
        {pending === 'in' ? (
          <ActivityIndicator color={tokens.color.textPrimary} />
        ) : (
          <Text style={[styles.label, current === 'in' && styles.labelActive]}>I&apos;m in</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, current === 'out' && styles.activeOut]}
        onPress={() => onChange('out')}
        disabled={busy}
      >
        {pending === 'out' ? (
          <ActivityIndicator color={tokens.color.textPrimary} />
        ) : (
          <Text style={[styles.label, current === 'out' && styles.labelActive]}>I&apos;m out</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  button: {
    flex: 1,
    backgroundColor: tokens.color.surfaceHigh,
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  activeIn: {
    backgroundColor: tokens.color.primary,
    borderColor: tokens.color.primary,
  },
  activeOut: {
    backgroundColor: tokens.color.danger,
    borderColor: tokens.color.danger,
  },
  label: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.md,
    fontWeight: '600',
  },
  labelActive: {
    color: tokens.color.textPrimary,
  },
});
