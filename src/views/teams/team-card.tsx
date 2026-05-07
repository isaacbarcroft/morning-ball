import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/lib/theme';
import { Avatar } from '@/views/primitives/avatar';
import type { ProfileRow, TeamRow } from '@/types/domain';

interface TeamCardProps {
  team: TeamRow;
  members: readonly ProfileRow[];
}

export function TeamCard({ team, members }: TeamCardProps) {
  return (
    <View style={[styles.card, { borderColor: team.color }]}>
      <View style={styles.headerRow}>
        <View style={[styles.swatch, { backgroundColor: team.color }]} />
        <Text style={styles.label}>{team.team_label}</Text>
        {team.is_winner ? <Text style={styles.crown}>👑</Text> : null}
        {team.final_score != null ? (
          <Text style={styles.score}>{team.final_score}</Text>
        ) : null}
      </View>
      {members.length === 0 ? (
        <Text style={styles.empty}>No members</Text>
      ) : (
        <View style={styles.memberRow}>
          {members.map((m) => (
            <View key={m.id} style={styles.member}>
              <Avatar name={m.display_name} url={m.avatar_url} size={40} />
              <Text style={styles.memberName} numberOfLines={1}>
                {m.nickname ?? m.display_name.split(' ')[0]}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 2,
    gap: tokens.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  label: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.lg,
    fontWeight: '700',
    flex: 1,
  },
  crown: {
    fontSize: tokens.font.size.lg,
  },
  score: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.xl,
    fontWeight: '700',
  },
  empty: {
    color: tokens.color.textMuted,
    fontSize: tokens.font.size.sm,
    fontStyle: 'italic',
  },
  memberRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.md,
  },
  member: {
    alignItems: 'center',
    width: 60,
  },
  memberName: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.xs,
    marginTop: tokens.spacing.xs,
    textAlign: 'center',
  },
});
