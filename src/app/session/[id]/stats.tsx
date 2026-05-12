import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { tokens } from '@/lib/theme';
import { useStores } from '@/hooks/use-stores';
import { getControllers } from '@/controllers';
import { StatsRow, type StatLine, emptyStatLine } from '@/views/stats/stats-row';
import type { ProfileRow, StatsRow as StatsDbRow, TeamRow } from '@/types/domain';

const dbRowToLine = (row: StatsDbRow): StatLine => ({
  reb: row.reb,
  ast: row.ast,
  stl: row.stl,
  blk: row.blk,
  turnovers: row.turnovers,
  fgm: row.fgm,
  fga: row.fga,
  threePm: row.three_pm,
  threePa: row.three_pa,
  ftm: row.ftm,
  fta: row.fta,
});

const StatsScreen = observer(() => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, profiles, auth } = useStores();
  const [lines, setLines] = useState<Map<string, StatLine>>(new Map());
  const [savedLines, setSavedLines] = useState<Map<string, StatLine>>(new Map());
  const [savingProfile, setSavingProfile] = useState<string | null>(null);
  const [scoresDraft, setScoresDraft] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [savingScores, setSavingScores] = useState(false);

  useEffect(() => {
    if (!id) return;
    void getControllers()
      .session.get(id)
      .then((res) => {
        if (!res.ok) setError(`Couldn't load session: ${res.error}`);
      });
    void getControllers()
      .team.listForSession(id)
      .then((res) => {
        if (!res.ok) setError(`Couldn't load teams: ${res.error}`);
      });
    void getControllers()
      .stats.listForSession(id)
      .then((res) => {
        if (!res.ok) setError(`Couldn't load stats: ${res.error}`);
      });
    void getControllers()
      .profile.listAll()
      .then((res) => {
        if (!res.ok) setError(`Couldn't load players: ${res.error}`);
      });
  }, [id]);

  const teams = useMemo(
    () => (id ? sessions.teamsBySession.get(id) ?? [] : []),
    [id, sessions.teamsBySession],
  );

  useEffect(() => {
    for (const team of teams) {
      void getControllers().team.listMembers(team.id);
    }
  }, [teams]);

  // Build initial lines from existing DB rows
  useEffect(() => {
    if (!id) return;
    const dbRows = sessions.statsBySession.get(id) ?? [];
    if (dbRows.length === 0) return;
    setLines((prev) => {
      const next = new Map(prev);
      for (const r of dbRows) {
        if (!next.has(r.profile_id)) next.set(r.profile_id, dbRowToLine(r));
      }
      return next;
    });
    setSavedLines((prev) => {
      const next = new Map(prev);
      for (const r of dbRows) next.set(r.profile_id, dbRowToLine(r));
      return next;
    });
  }, [id, sessions.statsBySession]);

  // Hydrate score drafts from team rows
  useEffect(() => {
    setScoresDraft((prev) => {
      const next = new Map(prev);
      for (const t of teams) {
        if (!next.has(t.id) && t.final_score != null) next.set(t.id, String(t.final_score));
      }
      return next;
    });
  }, [teams]);

  const teamMembers = useMemo(() => {
    const result: Map<string, ProfileRow[]> = new Map();
    for (const team of teams) {
      const rows = sessions.membersByTeam.get(team.id) ?? [];
      const members = rows
        .map((m) => profiles.get(m.profile_id))
        .filter((p): p is ProfileRow => p !== undefined);
      result.set(team.id, members);
    }
    return result;
  }, [teams, sessions.membersByTeam, profiles]);

  const lineFor = (profileId: string): StatLine =>
    lines.get(profileId) ?? emptyStatLine();

  const isDirty = (profileId: string): boolean => {
    const current = lines.get(profileId);
    const saved = savedLines.get(profileId);
    if (!current) return false;
    if (!saved) return JSON.stringify(current) !== JSON.stringify(emptyStatLine());
    return JSON.stringify(current) !== JSON.stringify(saved);
  };

  const saveRow = useCallback(
    async (profileId: string, teamId: string) => {
      if (!id) return;
      const line = lines.get(profileId);
      if (!line) return;
      setSavingProfile(profileId);
      setError(null);
      const out = await getControllers().stats.upsert({
        sessionId: id,
        profileId,
        teamId,
        ...line,
      });
      setSavingProfile(null);
      if (!out.ok) {
        setError(out.error);
        return;
      }
      setSavedLines((prev) => new Map(prev).set(profileId, line));
    },
    [id, lines],
  );

  const updateLine = (profileId: string, next: StatLine) => {
    setLines((prev) => new Map(prev).set(profileId, next));
  };

  const setScore = (teamId: string, value: string) => {
    setScoresDraft((prev) => new Map(prev).set(teamId, value.replace(/\D/g, '').slice(0, 3)));
  };

  const saveScore = async (team: TeamRow) => {
    const raw = scoresDraft.get(team.id);
    if (raw === undefined || raw === '') return;
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0) {
      setError('Invalid score');
      return;
    }
    setSavingScores(true);
    setError(null);
    const out = await getControllers().team.setFinalScore({ teamId: team.id, finalScore: score });
    setSavingScores(false);
    if (!out.ok) setError(out.error);
  };

  const pickWinner = async (winningTeamId: string) => {
    if (!id) return;
    setSavingScores(true);
    setError(null);
    const out = await getControllers().team.pickWinner(id, winningTeamId);
    setSavingScores(false);
    if (!out.ok) {
      setError(out.error);
      return;
    }
    void getControllers().session.get(id);
    void getControllers().team.listForSession(id);
  };

  if (!id) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Missing session id</Text>
      </View>
    );
  }

  if (teams.length === 0) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Box score' }} />
        <Text style={styles.emptyTitle}>No teams yet</Text>
        <Text style={styles.emptyBody}>Publish teams before entering stats.</Text>
      </View>
    );
  }

  const session = sessions.byId.get(id);
  const sessionCompleted = session?.status === 'completed';
  const bothScoresIn = teams.every((t) => t.final_score != null);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'Box score' }} />

      {teams.map((team) => {
        const members = teamMembers.get(team.id) ?? [];
        const draftScore = scoresDraft.get(team.id) ?? '';
        return (
          <View key={team.id} style={[styles.teamSection, { borderColor: team.color }]}>
            <View style={styles.teamHeader}>
              <View style={[styles.swatch, { backgroundColor: team.color }]} />
              <Text style={styles.teamLabel}>Team {team.team_label}</Text>
              {team.is_winner ? <Text style={styles.crown}>👑</Text> : null}
              <View style={{ flex: 1 }} />
              <View style={styles.scoreInputWrap}>
                <Text style={styles.scoreInputHint}>Final</Text>
                <TextInput
                  value={draftScore}
                  onChangeText={(v) => setScore(team.id, v)}
                  onBlur={() => void saveScore(team)}
                  placeholder="0"
                  placeholderTextColor={tokens.color.textMuted}
                  keyboardType="number-pad"
                  maxLength={3}
                  style={styles.scoreInput}
                  editable={!sessionCompleted}
                />
              </View>
            </View>

            <View style={styles.players}>
              {members.length === 0 ? (
                <Text style={styles.emptyBody}>No team members</Text>
              ) : (
                members.map((p) => (
                  <StatsRow
                    key={p.id}
                    player={p}
                    line={lineFor(p.id)}
                    dirty={isDirty(p.id)}
                    saving={savingProfile === p.id}
                    onChange={(next) => updateLine(p.id, next)}
                    onSave={() => void saveRow(p.id, team.id)}
                  />
                ))
              )}
            </View>
          </View>
        );
      })}

      {!sessionCompleted && bothScoresIn && auth.profile ? (
        <View style={styles.winnerSection}>
          <Text style={styles.winnerLabel}>Pick the winner</Text>
          <View style={styles.winnerRow}>
            {teams.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.winnerBtn, { borderColor: t.color }]}
                onPress={() => void pickWinner(t.id)}
                disabled={savingScores}
              >
                <Text style={styles.winnerBtnLabel}>Team {t.team_label}</Text>
                <Text style={styles.winnerScore}>{t.final_score ?? '—'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {sessionCompleted ? (
        <View style={styles.finalBanner}>
          <Text style={styles.finalLabel}>FINAL · {teams.find((t) => t.is_winner)?.team_label ?? '?'} wins</Text>
        </View>
      ) : null}

      {savingScores ? <ActivityIndicator color={tokens.color.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
});

export default StatsScreen;

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
  },
  emptyBody: { color: tokens.color.textMuted, fontSize: tokens.font.size.sm, textAlign: 'center' },
  teamSection: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 2,
    padding: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  swatch: { width: 16, height: 16, borderRadius: 8 },
  teamLabel: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.lg,
    fontWeight: '700',
  },
  crown: { fontSize: tokens.font.size.lg },
  scoreInputWrap: { alignItems: 'flex-end', gap: 2 },
  scoreInputHint: {
    color: tokens.color.textMuted,
    fontSize: tokens.font.size.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreInput: {
    backgroundColor: tokens.color.surfaceHigh,
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.xl,
    fontWeight: '700',
    minWidth: 64,
    textAlign: 'center',
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  players: { gap: tokens.spacing.sm },
  winnerSection: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.spacing.md,
  },
  winnerLabel: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.md,
    fontWeight: '600',
  },
  winnerRow: { flexDirection: 'row', gap: tokens.spacing.md },
  winnerBtn: {
    flex: 1,
    paddingVertical: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    borderWidth: 2,
    backgroundColor: tokens.color.surfaceHigh,
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  winnerBtnLabel: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.lg,
    fontWeight: '700',
  },
  winnerScore: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.md,
  },
  finalBanner: {
    backgroundColor: tokens.color.success,
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
  },
  finalLabel: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.lg,
    fontWeight: '700',
    letterSpacing: 1,
  },
  error: { color: tokens.color.danger, fontSize: tokens.font.size.sm, textAlign: 'center' },
});
