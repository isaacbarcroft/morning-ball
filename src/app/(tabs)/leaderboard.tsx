import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { tokens } from '@/lib/theme';
import { useStores } from '@/hooks/use-stores';
import { getControllers } from '@/controllers';
import { Avatar } from '@/views/primitives/avatar';
import type {
  LeaderboardEntry,
  LeaderboardStat,
  RecordEntry,
} from '@/controllers/leaderboard-controller';

type Range = 'all' | '30d';
type StatKey = LeaderboardStat | 'record';

interface BodyArgs {
  loading: boolean;
  stat: StatKey;
  sortedStats: LeaderboardEntry[];
  sortedRecords: RecordEntry[];
  statLabel: string;
  isPercent: boolean;
  profiles: { get(id: string): { display_name: string; avatar_url: string | null } | undefined };
  onSelect: (profileId: string) => void;
}

const winPct = (r: RecordEntry): number =>
  r.games_played > 0 ? Math.round((r.wins / r.games_played) * 100) : 0;

const renderBody = (args: BodyArgs) => {
  if (args.loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={tokens.color.primary} />
      </View>
    );
  }
  const isRecord = args.stat === 'record';
  const empty = isRecord ? args.sortedRecords.length === 0 : args.sortedStats.length === 0;
  if (empty) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No stats yet</Text>
        <Text style={styles.emptyBody}>
          Box scores from completed sessions will populate the leaderboard.
        </Text>
      </View>
    );
  }
  if (isRecord) {
    return (
      <FlatList
        data={args.sortedRecords}
        keyExtractor={(e) => e.profile_id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: tokens.spacing.sm }} />}
        renderItem={({ item, index }) => {
          const profile = args.profiles.get(item.profile_id);
          return (
            <TouchableOpacity style={styles.row} onPress={() => args.onSelect(item.profile_id)}>
              <Text style={styles.rank}>{index + 1}</Text>
              <Avatar
                name={profile?.display_name ?? '?'}
                url={profile?.avatar_url ?? null}
                size={36}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{profile?.display_name ?? '—'}</Text>
                <Text style={styles.gameCount}>{item.games_played} games</Text>
              </View>
              <View style={styles.statColumn}>
                <Text style={styles.statValue}>{item.wins}-{item.losses}</Text>
                <Text style={styles.statKey}>{winPct(item)}% WIN</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    );
  }
  return (
    <FlatList
      data={args.sortedStats}
      keyExtractor={(e) => e.profile_id}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: tokens.spacing.sm }} />}
      renderItem={({ item, index }) => {
        const profile = args.profiles.get(item.profile_id);
        const value = item[args.stat as LeaderboardStat];
        const display = args.isPercent ? `${value.toFixed(1)}%` : value.toFixed(1);
        return (
          <TouchableOpacity style={styles.row} onPress={() => args.onSelect(item.profile_id)}>
            <Text style={styles.rank}>{index + 1}</Text>
            <Avatar
              name={profile?.display_name ?? '?'}
              url={profile?.avatar_url ?? null}
              size={36}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{profile?.display_name ?? '—'}</Text>
              <Text style={styles.gameCount}>{item.games} games</Text>
            </View>
            <View style={styles.statColumn}>
              <Text style={styles.statValue}>{display}</Text>
              <Text style={styles.statKey}>{args.statLabel}</Text>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
};

const STATS: { key: StatKey; label: string; isPercent: boolean }[] = [
  { key: 'record', label: 'W/L', isPercent: false },
  { key: 'ppg', label: 'PPG', isPercent: false },
  { key: 'rpg', label: 'RPG', isPercent: false },
  { key: 'apg', label: 'APG', isPercent: false },
  { key: 'spg', label: 'SPG', isPercent: false },
  { key: 'bpg', label: 'BPG', isPercent: false },
  { key: 'fg_pct', label: 'FG%', isPercent: true },
  { key: 'three_pt_pct', label: '3P%', isPercent: true },
];

// MVP: only W/L is exposed in the UI. Flip to false to bring back PPG/RPG/etc.
const MVP_RECORDS_ONLY = true;

const Leaderboard = observer(() => {
  const router = useRouter();
  const { profiles } = useStores();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [stat, setStat] = useState<StatKey>('record');
  const [range, setRange] = useState<Range>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getControllers().profile.listAll().then((res) => {
      if (cancelled) return;
      if (!res.ok) setProfileLoadError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const controller = getControllers().leaderboard;
    const statsFetcher = range === 'all' ? controller.career() : controller.last30Days();
    void Promise.all([statsFetcher, controller.records()])
      .then(([statsRes, recordsRes]) => {
        if (cancelled) return;
        setLoading(false);
        if (!statsRes.ok || !recordsRes.ok) {
          setError(!statsRes.ok ? statsRes.error : recordsRes.error);
          return;
        }
        setEntries(statsRes.data);
        setRecords(recordsRes.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const sortedStats = useMemo(() => {
    if (stat === 'record') return entries;
    return [...entries].sort((a, b) => b[stat] - a[stat]);
  }, [entries, stat]);

  const sortedRecords = useMemo(() => {
    return [...records]
      .filter((r) => r.games_played > 0)
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  }, [records]);

  const statLabel = STATS.find((s) => s.key === stat)?.label ?? 'PPG';
  const isPercent = STATS.find((s) => s.key === stat)?.isPercent ?? false;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ title: 'Stats' }} />

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.rangeChip, range === 'all' && styles.rangeChipActive]}
          onPress={() => setRange('all')}
        >
          <Text style={[styles.chipLabel, range === 'all' && styles.chipLabelActive]}>All-time</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rangeChip, range === '30d' && styles.rangeChipActive]}
          onPress={() => setRange('30d')}
        >
          <Text style={[styles.chipLabel, range === '30d' && styles.chipLabelActive]}>Last 30d</Text>
        </TouchableOpacity>
      </View>

      {profileLoadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Could not load player names — {profileLoadError}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Could not load leaderboard — {error}</Text>
        </View>
      ) : null}

      {MVP_RECORDS_ONLY ? null : (
        <FlatList
          data={STATS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(s) => s.key}
          contentContainerStyle={styles.statRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.statChip, stat === item.key && styles.statChipActive]}
              onPress={() => setStat(item.key)}
            >
              <Text style={[styles.statChipLabel, stat === item.key && styles.statChipLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {renderBody({
        loading,
        stat,
        sortedStats,
        sortedRecords,
        statLabel,
        isPercent,
        profiles,
        onSelect: (profileId) =>
          router.push({ pathname: '/player/[id]', params: { id: profileId } }),
      })}
    </SafeAreaView>
  );
});

export default Leaderboard;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.color.bg },
  filterRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
  },
  rangeChip: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surfaceHigh,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  rangeChipActive: {
    backgroundColor: tokens.color.primary,
    borderColor: tokens.color.primary,
  },
  chipLabel: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.sm,
    fontWeight: '600',
  },
  chipLabelActive: { color: tokens.color.textPrimary },
  statRow: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  statChip: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  statChipActive: {
    backgroundColor: tokens.color.accent,
    borderColor: tokens.color.accent,
  },
  statChipLabel: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statChipLabelActive: { color: tokens.color.textPrimary },
  list: { padding: tokens.spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  rank: {
    color: tokens.color.textMuted,
    fontSize: tokens.font.size.md,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  name: { color: tokens.color.textPrimary, fontSize: tokens.font.size.md, fontWeight: '600' },
  gameCount: { color: tokens.color.textMuted, fontSize: tokens.font.size.xs, marginTop: 2 },
  statColumn: { alignItems: 'flex-end' },
  statValue: { color: tokens.color.accent, fontSize: tokens.font.size.lg, fontWeight: '700' },
  statKey: {
    color: tokens.color.textMuted,
    fontSize: tokens.font.size.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  errorBanner: {
    marginHorizontal: tokens.spacing.lg,
    marginTop: tokens.spacing.sm,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorBannerText: {
    color: tokens.color.danger,
    fontSize: tokens.font.size.xs,
    textAlign: 'center',
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.spacing.xl },
  emptyTitle: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.xl,
    fontWeight: '700',
    marginBottom: tokens.spacing.sm,
  },
  emptyBody: { color: tokens.color.textSecondary, fontSize: tokens.font.size.sm, textAlign: 'center' },
});
