import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { tokens } from '@/lib/theme';
import { useStores } from '@/hooks/use-stores';
import { getControllers } from '@/controllers';
import { Avatar } from '@/views/primitives/avatar';
import type { RecordEntry } from '@/controllers/leaderboard-controller';

const winPct = (r: RecordEntry): number =>
  r.games_played > 0 ? Math.round((r.wins / r.games_played) * 100) : 0;

interface BodyArgs {
  loading: boolean;
  sortedRecords: RecordEntry[];
  profiles: { get(id: string): { display_name: string; avatar_url: string | null } | undefined };
  onSelect: (profileId: string) => void;
}

const renderBody = (args: BodyArgs) => {
  if (args.loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={tokens.color.primary} />
      </View>
    );
  }
  if (args.sortedRecords.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No stats yet</Text>
        <Text style={styles.emptyBody}>
          Box scores from completed sessions will populate the leaderboard.
        </Text>
      </View>
    );
  }
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
};

const Leaderboard = observer(() => {
  const router = useRouter();
  const { profiles } = useStores();
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [loading, setLoading] = useState(true);
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
    void getControllers().leaderboard.records().then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setRecords(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedRecords = useMemo(() => {
    return [...records]
      .filter((r) => r.games_played > 0)
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  }, [records]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ title: 'Stats' }} />

      {profileLoadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Could not load player names — {profileLoadError}</Text>
        </View>
      ) : null}

      {renderBody({
        loading,
        sortedRecords,
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
