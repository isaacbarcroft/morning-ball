import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/lib/theme';
import { Card } from '@/views/primitives/card';
import { Pill } from '@/views/primitives/pill';
import { formatGameDate, formatGameTime } from '@/lib/format';
import { sessionPillTone, sessionPillLabel } from '@/lib/session-status';
import type { SessionRow } from '@/types/domain';

interface SessionCardProps {
  session: SessionRow;
  children?: React.ReactNode;
}

export function SessionCard({ session, children }: SessionCardProps) {
  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dateLine}>{formatGameDate(session.scheduled_for)}</Text>
          <Text style={styles.timeLine}>
            {formatGameTime(session.scheduled_time)}
            {session.location ? ` · ${session.location}` : ''}
          </Text>
          {session.title ? <Text style={styles.title}>{session.title}</Text> : null}
        </View>
        <Pill tone={sessionPillTone(session.status)} label={sessionPillLabel(session.status)} />
      </View>
      {session.notes ? <Text style={styles.notes}>{session.notes}</Text> : null}
      {children ? <View style={styles.body}>{children}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: tokens.spacing.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.spacing.md },
  dateLine: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.xl,
    fontWeight: '700',
  },
  timeLine: {
    color: tokens.color.accent,
    fontSize: tokens.font.size.md,
    fontWeight: '600',
    marginTop: 2,
  },
  title: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.sm,
    marginTop: tokens.spacing.xs,
  },
  notes: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.sm,
    fontStyle: 'italic',
    backgroundColor: tokens.color.surfaceHigh,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
  },
  body: { gap: tokens.spacing.md },
});
