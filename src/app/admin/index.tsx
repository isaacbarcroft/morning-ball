import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { tokens } from '@/lib/theme';
import { getControllers } from '@/controllers';

interface Stats {
  memberCount: number;
  upcomingCount: number;
  completedCount: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const out = await getControllers().admin.dashboardStats();
      if (!cancelled && out.ok) setStats(out.data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'Admin' }} />

      <View style={styles.statsRow}>
        <Tile label="Members" value={stats?.memberCount ?? '—'} />
        <Tile label="Upcoming" value={stats?.upcomingCount ?? '—'} />
        <Tile label="Completed" value={stats?.completedCount ?? '—'} />
      </View>
      {stats === null ? <ActivityIndicator color={tokens.color.primary} /> : null}

      <NavRow
        label="Invite codes"
        description="Generate codes to share with the crew."
        onPress={() => router.push('/admin/invites')}
      />
      <NavRow
        label="Members"
        description="Promote, suspend, edit, or create shadow profiles."
        onPress={() => router.push('/admin/members')}
      />
      <NavRow
        label="Easter eggs"
        description="Force RSVPs, grant achievements, and other commissioner tools."
        onPress={() => router.push('/admin/easter-eggs')}
      />
    </ScrollView>
  );
}

interface TileProps {
  label: string;
  value: number | string;
}

function Tile({ label, value }: TileProps) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

interface NavRowProps {
  label: string;
  description: string;
  onPress: () => void;
}

function NavRow({ label, description, onPress }: NavRowProps) {
  return (
    <TouchableOpacity style={styles.navRow} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.navLabel}>{label}</Text>
        <Text style={styles.navDescription}>{description}</Text>
      </View>
      <Text style={styles.navChevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.color.bg,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  tile: {
    flex: 1,
    backgroundColor: tokens.color.surfaceElevated,
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  tileValue: {
    color: tokens.color.accent,
    fontSize: tokens.font.size.xl,
    fontWeight: '700',
  },
  tileLabel: {
    color: tokens.color.textMuted,
    fontSize: tokens.font.size.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  navLabel: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.md,
    fontWeight: '600',
  },
  navDescription: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.sm,
    marginTop: 2,
  },
  navChevron: { color: tokens.color.textMuted, fontSize: tokens.font.size.xl },
});
