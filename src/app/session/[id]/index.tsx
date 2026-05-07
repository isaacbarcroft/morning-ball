import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/lib/theme';
import { useStores } from '@/hooks/use-stores';
import { useRealtime } from '@/hooks/use-realtime';
import { getControllers } from '@/controllers';
import { supabase } from '@/services/supabase';
import { Pill } from '@/views/primitives/pill';
import { RsvpToggle } from '@/views/rsvp/rsvp-toggle';
import { RsvpList } from '@/views/rsvp/rsvp-list';
import { formatGameDateLong, formatGameTime } from '@/lib/format';
import type { ProfileRow, RsvpStatus, SessionStatus } from '@/types/domain';

const sessionPillTone = (status: SessionStatus) => {
  if (status === 'completed') return 'success' as const;
  if (status === 'in_progress') return 'accent' as const;
  if (status === 'cancelled') return 'danger' as const;
  return 'primary' as const;
};

const sessionPillLabel = (status: SessionStatus): string => {
  if (status === 'completed') return 'Final';
  if (status === 'in_progress') return 'Live';
  if (status === 'cancelled') return 'Cancelled';
  return 'Upcoming';
};

const SessionDetail = observer(() => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, profiles, auth } = useStores();
  const [pending, setPending] = useState<RsvpStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void getControllers().session.get(id);
    void getControllers().rsvp.listForSession(id);
    void (async () => {
      const { data } = await supabase.from('profiles').select('*');
      if (Array.isArray(data)) profiles.upsertMany(data);
    })();
  }, [id, profiles]);

  const handleRealtime = useCallback(() => {
    if (id) void getControllers().rsvp.listForSession(id);
  }, [id]);

  useRealtime({
    channel: `session-rsvps-${id ?? 'none'}`,
    table: 'rsvps',
    filter: id ? `session_id=eq.${id}` : undefined,
    onChange: handleRealtime,
  });

  const onRsvpChange = useCallback(
    async (status: RsvpStatus) => {
      if (!id) return;
      setPending(status);
      setError(null);
      const out = await getControllers().rsvp.setOwn({ sessionId: id, status });
      setPending(null);
      if (!out.ok) setError(out.error);
    },
    [id],
  );

  if (!id) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Missing session id</Text>
      </View>
    );
  }

  const session = sessions.byId.get(id);
  if (!session) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Session' }} />
        <ActivityIndicator color={tokens.color.primary} />
      </View>
    );
  }

  const rsvps = sessions.rsvpsBySession.get(id) ?? [];
  const myRsvp = rsvps.find((r) => r.profile_id === auth.profile?.id);
  const inProfileIds = new Set(rsvps.filter((r) => r.status === 'in').map((r) => r.profile_id));
  const outProfileIds = new Set(rsvps.filter((r) => r.status === 'out').map((r) => r.profile_id));

  const allActive = profiles.all.filter(
    (p) => p.status === 'active' && p.role !== 'guest',
  );
  const inProfiles: ProfileRow[] = allActive.filter((p) => inProfileIds.has(p.id));
  const outProfiles: ProfileRow[] = allActive.filter((p) => outProfileIds.has(p.id));
  const noResponseProfiles: ProfileRow[] = allActive.filter(
    (p) => !inProfileIds.has(p.id) && !outProfileIds.has(p.id),
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{
          title: formatGameDateLong(session.scheduled_for),
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={28} color={tokens.color.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.timeLine}>
            {formatGameTime(session.scheduled_time)}
            {session.location ? ` · ${session.location}` : ''}
          </Text>
          {session.title ? <Text style={styles.subTitle}>{session.title}</Text> : null}
        </View>
        <Pill tone={sessionPillTone(session.status)} label={sessionPillLabel(session.status)} />
      </View>

      {session.notes ? (
        <View style={styles.notes}>
          <Text style={styles.notesLabel}>Note from admin</Text>
          <Text style={styles.notesBody}>{session.notes}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Text style={styles.sectionLabel}>Your RSVP</Text>
        <RsvpToggle
          current={(myRsvp?.status as RsvpStatus | undefined) ?? null}
          onChange={onRsvpChange}
          pending={pending}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <RsvpList title="In" profiles={inProfiles} emptyLabel="No commitments yet" />
      <RsvpList title="Out" profiles={outProfiles} emptyLabel="No one's out (yet)" />
      <RsvpList
        title="No response"
        profiles={noResponseProfiles}
        emptyLabel="Everyone's accounted for"
      />

      <View style={styles.linkRow}>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() =>
            router.push({ pathname: '/session/[id]/teams', params: { id: session.id } })
          }
        >
          <Text style={styles.linkLabel}>Teams</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() =>
            router.push({ pathname: '/session/[id]/stats', params: { id: session.id } })
          }
        >
          <Text style={styles.linkLabel}>Stats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() =>
            router.push({ pathname: '/session/[id]/chat', params: { id: session.id } })
          }
        >
          <Text style={styles.linkLabel}>Chat</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
});

export default SessionDetail;

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.color.bg,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.lg,
  },
  empty: {
    flex: 1,
    backgroundColor: tokens.color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xl,
  },
  emptyTitle: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.lg,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: tokens.spacing.xs,
    paddingVertical: tokens.spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.md,
  },
  timeLine: {
    color: tokens.color.accent,
    fontSize: tokens.font.size.xl,
    fontWeight: '700',
  },
  subTitle: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.sm,
    marginTop: tokens.spacing.xs,
  },
  notes: {
    backgroundColor: tokens.color.surfaceHigh,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: tokens.color.accent,
  },
  notesLabel: {
    color: tokens.color.accent,
    fontSize: tokens.font.size.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: tokens.spacing.xs,
  },
  notesBody: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.sm,
  },
  actions: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.spacing.md,
  },
  sectionLabel: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  error: { color: tokens.color.danger, fontSize: tokens.font.size.sm },
  linkRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  linkButton: {
    flex: 1,
    backgroundColor: tokens.color.surfaceElevated,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  linkLabel: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.sm,
    fontWeight: '600',
  },
});
