import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { tokens } from '@/lib/theme';
import { useStores } from '@/hooks/use-stores';
import { supabase } from '@/services/supabase';
import { Avatar } from '@/views/primitives/avatar';
import { Pill } from '@/views/primitives/pill';
import { formatPercent, formatStat } from '@/lib/format';
import type { AchievementRow, ProfileRow } from '@/types/domain';

interface CareerStats {
  games: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  topg: number;
  fg_pct: number;
  three_pt_pct: number;
  ft_pct: number;
}

interface Record {
  wins: number;
  losses: number;
  games_played: number;
}

const PlayerProfile = observer(() => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profiles } = useStores();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [career, setCareer] = useState<CareerStats | null>(null);
  const [record, setRecord] = useState<Record | null>(null);
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const [{ data: profileData }, { data: careerData }, { data: recordData }, { data: achievementsData }] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
          supabase.from('profile_career_stats').select('*').eq('profile_id', id).maybeSingle(),
          supabase.from('profile_records').select('*').eq('profile_id', id).maybeSingle(),
          supabase.from('achievements').select('*').eq('profile_id', id),
        ]);
      if (cancelled) return;
      if (profileData) {
        setProfile(profileData);
        profiles.upsert(profileData);
      }
      setCareer((careerData as CareerStats | null) ?? null);
      setRecord((recordData as Record | null) ?? null);
      setAchievements((achievementsData as AchievementRow[] | null) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, profiles]);

  if (!id) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Missing player id</Text>
      </View>
    );
  }

  if (loading || !profile) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Player' }} />
        <ActivityIndicator color={tokens.color.primary} />
      </View>
    );
  }

  const wins = record?.wins ?? 0;
  const losses = record?.losses ?? 0;
  const games = record?.games_played ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: profile.display_name }} />

      <View style={styles.heroBlock}>
        <Avatar name={profile.display_name} url={profile.avatar_url} size={96} />
        <Text style={styles.name}>{profile.display_name}</Text>
        {profile.nickname ? (
          <Text style={styles.nickname}>&ldquo;{profile.nickname}&rdquo;</Text>
        ) : null}
        <View style={styles.pillRow}>
          <Pill label={profile.role} tone="primary" />
          {profile.jersey_number != null ? (
            <Pill label={`#${profile.jersey_number}`} tone="accent" />
          ) : null}
        </View>
      </View>

      <View style={styles.recordCard}>
        <View style={styles.recordCol}>
          <Text style={styles.recordValue}>{wins}</Text>
          <Text style={styles.recordLabel}>Wins</Text>
        </View>
        <View style={styles.recordSeparator} />
        <View style={styles.recordCol}>
          <Text style={styles.recordValue}>{losses}</Text>
          <Text style={styles.recordLabel}>Losses</Text>
        </View>
        <View style={styles.recordSeparator} />
        <View style={styles.recordCol}>
          <Text style={styles.recordValue}>{games}</Text>
          <Text style={styles.recordLabel}>Games</Text>
        </View>
      </View>

      {career ? (
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Career averages</Text>
          <View style={styles.statsGrid}>
            <StatTile label="PPG" value={formatStat(career.ppg)} />
            <StatTile label="RPG" value={formatStat(career.rpg)} />
            <StatTile label="APG" value={formatStat(career.apg)} />
            <StatTile label="SPG" value={formatStat(career.spg)} />
            <StatTile label="BPG" value={formatStat(career.bpg)} />
            <StatTile label="TOPG" value={formatStat(career.topg)} />
            <StatTile label="FG%" value={formatPercent(career.fg_pct)} />
            <StatTile label="3P%" value={formatPercent(career.three_pt_pct)} />
            <StatTile label="FT%" value={formatPercent(career.ft_pct)} />
          </View>
        </View>
      ) : (
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Career averages</Text>
          <Text style={styles.muted}>No completed games yet.</Text>
        </View>
      )}

      <View style={styles.statsCard}>
        <Text style={styles.cardTitle}>Achievements</Text>
        {achievements.length === 0 ? (
          <Text style={styles.muted}>No badges yet.</Text>
        ) : (
          <View style={styles.badgeRow}>
            {achievements.map((a) => (
              <View key={a.id} style={styles.badge}>
                <Text style={styles.badgeKey}>{a.badge_key}</Text>
                {a.notes ? <Text style={styles.badgeNote}>{a.notes}</Text> : null}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
});

interface StatTileProps {
  label: string;
  value: string;
}

function StatTile({ label, value }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

export default PlayerProfile;

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
  emptyTitle: { color: tokens.color.textPrimary, fontSize: tokens.font.size.lg },
  heroBlock: {
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  name: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.xl,
    fontWeight: '700',
  },
  nickname: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.md,
    fontStyle: 'italic',
  },
  pillRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  recordCard: {
    flexDirection: 'row',
    backgroundColor: tokens.color.surfaceElevated,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  recordCol: { flex: 1, alignItems: 'center' },
  recordSeparator: { width: 1, backgroundColor: tokens.color.border, marginVertical: tokens.spacing.sm },
  recordValue: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.xxl,
    fontWeight: '700',
  },
  recordLabel: {
    color: tokens.color.textMuted,
    fontSize: tokens.font.size.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.spacing.md,
  },
  cardTitle: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.md,
    fontWeight: '600',
  },
  muted: { color: tokens.color.textMuted, fontSize: tokens.font.size.sm },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  tile: {
    width: '31%',
    backgroundColor: tokens.color.surfaceHigh,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    alignItems: 'center',
  },
  tileValue: {
    color: tokens.color.accent,
    fontSize: tokens.font.size.lg,
    fontWeight: '700',
  },
  tileLabel: {
    color: tokens.color.textMuted,
    fontSize: tokens.font.size.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  badge: {
    backgroundColor: tokens.color.surfaceHigh,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.primary,
  },
  badgeKey: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.sm,
    fontWeight: '600',
  },
  badgeNote: {
    color: tokens.color.textMuted,
    fontSize: tokens.font.size.xs,
    marginTop: 2,
  },
});
