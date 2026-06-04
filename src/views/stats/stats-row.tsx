import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { tokens } from '@/lib/theme';
import { computePts, emptyStatLine } from '@/lib/stat-line';
import { Avatar } from '@/views/primitives/avatar';
import { StatStepper } from './stat-stepper';
import type { ProfileRow } from '@/types/domain';
import type { StatLine } from '@/lib/stat-line';

export type { StatLine };
export { emptyStatLine };

interface StatsRowProps {
  player: ProfileRow;
  line: StatLine;
  dirty: boolean;
  saving: boolean;
  onChange: (next: StatLine) => void;
  onSave: () => void;
}

export function StatsRow({ player, line, dirty, saving, onChange, onSave }: StatsRowProps) {
  const [open, setOpen] = useState(false);
  const pts = computePts(line);
  const set = (patch: Partial<StatLine>) => onChange({ ...line, ...patch });

  return (
    <View style={[styles.row, dirty && styles.rowDirty]}>
      <TouchableOpacity onPress={() => setOpen((v) => !v)} style={styles.header}>
        <Avatar name={player.display_name} url={player.avatar_url} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{player.display_name}</Text>
          <Text style={styles.summary}>
            {pts} pts · {line.reb} reb · {line.ast} ast
          </Text>
        </View>
        <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
      </TouchableOpacity>

      {open ? (
        <View style={styles.body}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Shooting</Text>
            <View style={styles.shootingGrid}>
              <View style={styles.shootingPair}>
                <Text style={styles.shootingHeader}>FG</Text>
                <StatStepper compact label="Made" value={line.fgm} onChange={(v) => set({ fgm: v })} />
                <StatStepper compact label="Attempts" value={line.fga} onChange={(v) => set({ fga: v })} />
              </View>
              <View style={styles.shootingPair}>
                <Text style={styles.shootingHeader}>3P</Text>
                <StatStepper compact label="Made" value={line.threePm} onChange={(v) => set({ threePm: v })} />
                <StatStepper compact label="Attempts" value={line.threePa} onChange={(v) => set({ threePa: v })} />
              </View>
              <View style={styles.shootingPair}>
                <Text style={styles.shootingHeader}>FT</Text>
                <StatStepper compact label="Made" value={line.ftm} onChange={(v) => set({ ftm: v })} />
                <StatStepper compact label="Attempts" value={line.fta} onChange={(v) => set({ fta: v })} />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Other</Text>
            <StatStepper label="Rebounds" value={line.reb} onChange={(v) => set({ reb: v })} />
            <StatStepper label="Assists" value={line.ast} onChange={(v) => set({ ast: v })} />
            <StatStepper label="Steals" value={line.stl} onChange={(v) => set({ stl: v })} />
            <StatStepper label="Blocks" value={line.blk} onChange={(v) => set({ blk: v })} />
            <StatStepper label="Turnovers" value={line.turnovers} onChange={(v) => set({ turnovers: v })} />
          </View>

          {dirty ? (
            <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={tokens.color.textPrimary} />
              ) : (
                <Text style={styles.saveLabel}>Save row</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    overflow: 'hidden',
  },
  rowDirty: {
    borderColor: tokens.color.accent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    padding: tokens.spacing.md,
  },
  name: { color: tokens.color.textPrimary, fontSize: tokens.font.size.md, fontWeight: '600' },
  summary: { color: tokens.color.textMuted, fontSize: tokens.font.size.xs, marginTop: 2 },
  chevron: { color: tokens.color.textMuted, fontSize: tokens.font.size.lg },
  body: {
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  section: {
    backgroundColor: tokens.color.surfaceHigh,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  sectionLabel: {
    color: tokens.color.textMuted,
    fontSize: tokens.font.size.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: tokens.spacing.sm,
  },
  shootingGrid: { gap: tokens.spacing.md },
  shootingPair: { gap: tokens.spacing.xs },
  shootingHeader: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.sm,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: tokens.color.primary,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
  },
  saveLabel: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.sm,
    fontWeight: '600',
  },
});
