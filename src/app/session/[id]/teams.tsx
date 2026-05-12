import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { tokens } from '@/lib/theme';
import { useStores } from '@/hooks/use-stores';
import { useRealtime } from '@/hooks/use-realtime';
import { getControllers } from '@/controllers';
import { Avatar } from '@/views/primitives/avatar';
import { TeamCard } from '@/views/teams/team-card';
import type { ProfileRow } from '@/types/domain';

type Assignment = 'unassigned' | 'A' | 'B';

const cycleAssignment = (current: Assignment): Assignment => {
  if (current === 'unassigned') return 'A';
  if (current === 'A') return 'B';
  return 'unassigned';
};

const Teams = observer(() => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, profiles, auth } = useStores();
  const [assignments, setAssignments] = useState<Map<string, Assignment>>(new Map());
  const [balancing, setBalancing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void getControllers()
      .session.get(id)
      .then((res) => {
        if (!res.ok) setError(`Couldn't load session: ${res.error}`);
      });
    void getControllers()
      .rsvp.listForSession(id)
      .then((res) => {
        if (!res.ok) setError(`Couldn't load RSVPs: ${res.error}`);
      });
    void getControllers()
      .team.listForSession(id)
      .then((res) => {
        if (!res.ok) setError(`Couldn't load teams: ${res.error}`);
      });
    void getControllers()
      .profile.listAll()
      .then((res) => {
        if (!res.ok) setError(`Couldn't load players: ${res.error}`);
      });
  }, [id]);

  const handleTeamsRealtime = useCallback(() => {
    if (id) {
      void getControllers().team.listForSession(id);
    }
  }, [id]);

  useRealtime({
    channel: `session-teams-${id ?? 'none'}`,
    table: 'teams',
    filter: id ? `session_id=eq.${id}` : undefined,
    onChange: handleTeamsRealtime,
  });

  const teams = id ? sessions.teamsBySession.get(id) ?? [] : [];
  const teamA = teams.find((t) => t.team_label === 'A') ?? teams[0];
  const teamB = teams.find((t) => t.team_label === 'B') ?? teams[1];
  const teamsPublished = teams.length === 2;

  // Load members of published teams.
  useEffect(() => {
    if (!teamsPublished || !teamA || !teamB) return;
    void getControllers().team.listMembers(teamA.id);
    void getControllers().team.listMembers(teamB.id);
  }, [teamsPublished, teamA, teamB]);

  const inProfileIds = useMemo(() => {
    const list = id ? sessions.rsvpsBySession.get(id) ?? [] : [];
    return new Set(list.filter((r) => r.status === 'in').map((r) => r.profile_id));
  }, [id, sessions.rsvpsBySession]);
  const inProfiles: ProfileRow[] = useMemo(
    () => profiles.all.filter((p) => inProfileIds.has(p.id)),
    [profiles.all, inProfileIds],
  );

  const cycleAssign = (profileId: string) => {
    setAssignments((prev) => {
      const next = new Map(prev);
      const current = next.get(profileId) ?? 'unassigned';
      next.set(profileId, cycleAssignment(current));
      return next;
    });
  };

  const balance = async () => {
    if (balancing) return;
    if (inProfiles.length < 2) {
      setError('Need at least two confirmed players to balance teams.');
      return;
    }
    setBalancing(true);
    setError(null);
    const out = await getControllers().team.balance(inProfiles);
    setBalancing(false);
    if (!out.ok) {
      setError(out.error);
      return;
    }
    setAssignments(() => {
      const next = new Map<string, Assignment>();
      for (const profileId of out.data.teamA) next.set(profileId, 'A');
      for (const profileId of out.data.teamB) next.set(profileId, 'B');
      return next;
    });
  };

  const myRsvpIn = inProfileIds.has(auth.profile?.id ?? '');

  const publish = async () => {
    if (!id || publishing) return;
    setPublishing(true);
    setError(null);
    const teamAIds = inProfiles
      .filter((p) => assignments.get(p.id) === 'A')
      .map((p) => p.id);
    const teamBIds = inProfiles
      .filter((p) => assignments.get(p.id) === 'B')
      .map((p) => p.id);
    if (teamAIds.length === 0 || teamBIds.length === 0) {
      setError('Each team needs at least one player.');
      setPublishing(false);
      return;
    }
    const colors = getControllers().team.defaultColors();
    const out = await getControllers().team.publish({
      sessionId: id,
      teamA: { label: 'A', color: colors.teamA, memberIds: teamAIds },
      teamB: { label: 'B', color: colors.teamB, memberIds: teamBIds },
    });
    setPublishing(false);
    if (!out.ok) setError(out.error);
  };

  if (!id) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Missing session id</Text>
      </View>
    );
  }

  if (teamsPublished && teamA && teamB) {
    const teamAMembers = (sessions.membersByTeam.get(teamA.id) ?? [])
      .map((m) => profiles.get(m.profile_id))
      .filter((p): p is ProfileRow => p !== undefined);
    const teamBMembers = (sessions.membersByTeam.get(teamB.id) ?? [])
      .map((m) => profiles.get(m.profile_id))
      .filter((p): p is ProfileRow => p !== undefined);
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Stack.Screen options={{ title: 'Teams' }} />
        <Text style={styles.heading}>Teams are set</Text>
        <TeamCard team={teamA} members={teamAMembers} />
        <TeamCard team={teamB} members={teamBMembers} />
      </ScrollView>
    );
  }

  if (!myRsvpIn) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Teams' }} />
        <Text style={styles.emptyTitle}>RSVP &quot;in&quot; to build teams</Text>
        <Text style={styles.emptyBody}>
          Only confirmed players can publish teams for this session.
        </Text>
      </View>
    );
  }

  if (inProfiles.length === 0) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Teams' }} />
        <Text style={styles.emptyTitle}>No one has RSVP&apos;d yet</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'Build teams' }} />
      <Text style={styles.heading}>Tap each player to cycle: unassigned → A → B</Text>

      <TouchableOpacity
        style={[styles.balanceButton, balancing && styles.balanceDisabled]}
        onPress={balance}
        disabled={balancing}
      >
        {balancing ? (
          <ActivityIndicator color={tokens.color.textPrimary} />
        ) : (
          <Text style={styles.balanceLabel}>Balance teams</Text>
        )}
      </TouchableOpacity>

      {(['A', 'B', 'unassigned'] as const).map((bucket) => {
        const bucketProfiles = inProfiles.filter(
          (p) => (assignments.get(p.id) ?? 'unassigned') === bucket,
        );
        return (
          <View key={bucket} style={styles.bucket}>
            <Text style={styles.bucketTitle}>
              {bucket === 'unassigned' ? 'Unassigned' : `Team ${bucket}`}
              <Text style={styles.bucketCount}> · {bucketProfiles.length}</Text>
            </Text>
            <View style={styles.chipRow}>
              {bucketProfiles.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => cycleAssign(p.id)}
                  style={[
                    styles.chip,
                    bucket === 'A' && { borderColor: tokens.color.teamA },
                    bucket === 'B' && { borderColor: tokens.color.teamB },
                  ]}
                >
                  <Avatar name={p.display_name} url={p.avatar_url} size={32} />
                  <Text style={styles.chipName}>
                    {p.nickname ?? p.display_name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
              {bucketProfiles.length === 0 ? (
                <Text style={styles.bucketEmpty}>—</Text>
              ) : null}
            </View>
          </View>
        );
      })}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.publishButton, publishing && styles.publishDisabled]}
        onPress={publish}
        disabled={publishing}
      >
        {publishing ? (
          <ActivityIndicator color={tokens.color.textPrimary} />
        ) : (
          <Text style={styles.publishLabel}>Publish teams</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
});

export default Teams;

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
    fontSize: tokens.font.size.xl,
    fontWeight: '700',
    marginBottom: tokens.spacing.sm,
    textAlign: 'center',
  },
  emptyBody: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.sm,
    textAlign: 'center',
  },
  heading: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.sm,
  },
  balanceButton: {
    backgroundColor: tokens.color.accent,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
  },
  balanceDisabled: { opacity: 0.6 },
  balanceLabel: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.sm,
    fontWeight: '700',
  },
  bucket: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.spacing.md,
  },
  bucketTitle: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.md,
    fontWeight: '600',
  },
  bucketCount: {
    color: tokens.color.textMuted,
    fontWeight: '400',
  },
  bucketEmpty: {
    color: tokens.color.textMuted,
    fontSize: tokens.font.size.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.color.surfaceHigh,
    borderRadius: tokens.radius.pill,
    borderWidth: 2,
    borderColor: tokens.color.border,
  },
  chipName: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.sm,
    fontWeight: '600',
  },
  publishButton: {
    backgroundColor: tokens.color.primary,
    paddingVertical: tokens.spacing.lg,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
  },
  publishDisabled: { opacity: 0.6 },
  publishLabel: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.md,
    fontWeight: '600',
  },
  error: {
    color: tokens.color.danger,
    fontSize: tokens.font.size.sm,
    textAlign: 'center',
  },
});
