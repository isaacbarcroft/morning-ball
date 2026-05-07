import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/lib/theme';
import { Avatar } from '@/views/primitives/avatar';
import type { ProfileRow } from '@/types/domain';

interface RsvpListProps {
  title: string;
  profiles: readonly ProfileRow[];
  emptyLabel?: string;
}

export function RsvpList({ title, profiles, emptyLabel }: RsvpListProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{profiles.length}</Text>
      </View>
      {profiles.length === 0 ? (
        <Text style={styles.empty}>{emptyLabel ?? 'No one yet'}</Text>
      ) : (
        <View style={styles.row}>
          {profiles.map((p) => (
            <View key={p.id} style={styles.player}>
              <Avatar size={44} name={p.display_name} url={p.avatar_url} />
              <Text style={styles.name} numberOfLines={1}>
                {p.nickname ?? p.display_name.split(' ')[0]}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.md,
    fontWeight: '600',
  },
  count: {
    color: tokens.color.textMuted,
    fontSize: tokens.font.size.sm,
    fontWeight: '600',
  },
  empty: {
    color: tokens.color.textMuted,
    fontSize: tokens.font.size.sm,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.md,
  },
  player: {
    alignItems: 'center',
    width: 64,
  },
  name: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.xs,
    marginTop: tokens.spacing.xs,
    textAlign: 'center',
  },
});
