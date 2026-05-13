import { getControllers } from '@/controllers';
import { useRealtime } from '@/hooks/use-realtime';
import { useStores } from '@/hooks/use-stores';
import { tokens } from '@/lib/theme';
import type { RsvpStatus } from '@/types/domain';
import { RsvpCounts } from '@/views/rsvp/rsvp-counts';
import { RsvpToggle } from '@/views/rsvp/rsvp-toggle';
import { SessionCard } from '@/views/sessions/session-card';
import { TeamScoreRow } from '@/views/teams/team-score-row';
import { Stack, useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Home = observer(() => {
  const { sessions, profiles, auth } = useStores();
  const router = useRouter();
  const [pending, setPending] = useState<RsvpStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = pending !== null;

  useEffect(() => {
    void getControllers().session.list();
    void getControllers().profile.listAll();
  }, []);

  const next = sessions.next;
  const sessionId = next?.id;
  const lastGame = sessions.completed[0];
  const lastGameId = lastGame?.id;

  useEffect(() => {
    if (!sessionId) return;
    void getControllers().rsvp.listForSession(sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (!lastGameId) return;
    void getControllers().team.listForSession(lastGameId);
  }, [lastGameId]);

  const onRsvpChange = useCallback(
    async (status: RsvpStatus) => {
      if (!sessionId) return;
      setPending(status);
      setError(null);
      const out = await getControllers().rsvp.setOwn({ sessionId, status });
      setPending(null);
      if (!out.ok) setError(out.error);
    },
    [sessionId],
  );

  const handleRealtime = useCallback(() => {
    if (sessionId) void getControllers().rsvp.listForSession(sessionId);
  }, [sessionId]);

  useRealtime({
    channel: `home-rsvps-${sessionId ?? 'none'}`,
    table: 'rsvps',
    filter: sessionId ? `session_id=eq.${sessionId}` : undefined,
    onChange: handleRealtime,
  });

  if (!next && !lastGame) {
    return (
      <SafeAreaView style={styles.empty} edges={['top']}>
        <Stack.Screen options={{ title: 'Morning Ball' }} />
        <Text style={styles.emptyTitle}>No upcoming ball</Text>
        <Text style={styles.emptyBody}>
          Sessions are auto-scheduled every Monday and Thursday at 6am.
        </Text>
      </SafeAreaView>
    );
  }

  const rsvps = next ? sessions.rsvpsBySession.get(next.id) ?? [] : [];
  const myRsvp = rsvps.find((r) => r.profile_id === auth.profile?.id);
  const inCount = rsvps.filter((r) => r.status === 'in').length;
  const outCount = rsvps.filter((r) => r.status === 'out').length;
  const totalActiveProfiles = profiles.all.filter(
    (p) => p.status === 'active' && p.role !== 'guest',
  ).length;
  const noResponse = Math.max(0, totalActiveProfiles - inCount - outCount);
  const lastGameTeams = lastGameId ? sessions.teamsBySession.get(lastGameId) ?? [] : [];

  return (
    <SafeAreaView style={styles.scrollWrap} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Stack.Screen options={{ title: 'Morning Ball' }} />

        {next ? (
          <>
            <Text style={styles.heading}>Next run</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/session/[id]', params: { id: next.id } })}
            >
              <SessionCard session={next}>
                <RsvpCounts inCount={inCount} outCount={outCount} noResponseCount={noResponse} />
                <RsvpToggle
                  current={(myRsvp?.status as RsvpStatus | undefined) ?? null}
                  onChange={onRsvpChange}
                  pending={pending}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
              </SessionCard>
            </TouchableOpacity>
          </>
        ) : null}

        {lastGame ? (
          <>
            <Text style={styles.heading}>Last game</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                router.push({ pathname: '/session/[id]', params: { id: lastGame.id } })
              }
            >
              <SessionCard session={lastGame}>
                <TeamScoreRow teams={lastGameTeams} />
              </SessionCard>
            </TouchableOpacity>
          </>
        ) : null}

        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={tokens.color.primary} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
});

export default Home;

const styles = StyleSheet.create({
  scrollWrap: { flex: 1, backgroundColor: tokens.color.bg },
  container: {
    backgroundColor: tokens.color.bg,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.lg,
  },
  heading: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  empty: {
    flex: 1,
    backgroundColor: tokens.color.bg,
    padding: tokens.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.xl,
    fontWeight: '700',
    marginBottom: tokens.spacing.sm,
  },
  emptyBody: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.md,
    textAlign: 'center',
  },
  busy: { paddingVertical: tokens.spacing.lg, alignItems: 'center' },
  error: { color: tokens.color.danger, fontSize: tokens.font.size.sm },
});
