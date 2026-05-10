import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/lib/theme';
import { sortTeamsForRecap } from '@/lib/team-display';
import type { TeamRow } from '@/types/domain';

interface TeamScoreRowProps {
  teams: readonly TeamRow[];
}

export function TeamScoreRow({ teams }: TeamScoreRowProps) {
  if (teams.length === 0) {
    return <Text style={styles.empty}>No score recorded</Text>;
  }
  const sorted = sortTeamsForRecap(teams);
  return (
    <View style={styles.wrap}>
      {sorted.map((team) => (
        <View key={team.id} style={styles.row}>
          <View style={[styles.swatch, { backgroundColor: team.color }]} />
          <Text style={styles.label}>{team.team_label}</Text>
          {team.is_winner ? <Text style={styles.crown}>👑</Text> : null}
          <Text style={[styles.score, team.is_winner ? styles.scoreWin : null]}>
            {team.final_score ?? '—'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  label: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.md,
    fontWeight: '600',
    flex: 1,
  },
  crown: {
    fontSize: tokens.font.size.md,
  },
  score: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.lg,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  scoreWin: {
    color: tokens.color.textPrimary,
  },
  empty: {
    color: tokens.color.textMuted,
    fontSize: tokens.font.size.sm,
    fontStyle: 'italic',
  },
});
