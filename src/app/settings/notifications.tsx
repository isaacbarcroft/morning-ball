import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { tokens } from '@/lib/theme';
import { getControllers } from '@/controllers';
import type { PrefField } from '@/controllers/notification-controller';
import type { NotificationPrefsRow } from '@/types/domain';

interface PrefDef {
  field: PrefField;
  label: string;
  description: string;
}

const PREFS: PrefDef[] = [
  {
    field: 'rsvp_reminder',
    label: 'RSVP reminder',
    description: 'Sun and Wed evening if you haven’t RSVP’d for tomorrow.',
  },
  {
    field: 'rsvp_summary',
    label: 'RSVP summary',
    description: 'Tonight’s in-count for tomorrow’s session.',
  },
  {
    field: 'teams_posted',
    label: 'Teams posted',
    description: 'Someone published the matchups.',
  },
  {
    field: 'new_comment',
    label: 'New comment',
    description: 'A new message in a session you’re in.',
  },
  {
    field: 'score_recorded',
    label: 'Final score',
    description: 'A winner has been picked for a game you played.',
  },
];

const NotificationsSettings = observer(() => {
  const [prefs, setPrefs] = useState<NotificationPrefsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const out = await getControllers().notification.getOwn();
      if (cancelled) return;
      setLoading(false);
      if (out.ok) setPrefs(out.data);
      else setError(out.error);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async (field: PrefField, next: boolean) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [field]: next });
    const out = await getControllers().notification.setPref(field, next);
    if (!out.ok) {
      setError(out.error);
      setPrefs((prev) => (prev ? { ...prev, [field]: !next } : prev));
    }
  };

  const renderBody = () => {
    if (loading) return <ActivityIndicator color={tokens.color.primary} />;
    if (!prefs) {
      return <Text style={styles.error}>{error ?? 'Could not load preferences.'}</Text>;
    }
    return PREFS.map((p) => (
      <View key={p.field} style={styles.row}>
        <View style={{ flex: 1, paddingRight: tokens.spacing.md }}>
          <Text style={styles.label}>{p.label}</Text>
          <Text style={styles.description}>{p.description}</Text>
        </View>
        <Switch
          value={prefs[p.field]}
          onValueChange={(v) => void toggle(p.field, v)}
          trackColor={{
            false: tokens.color.surfaceHigh,
            true: tokens.color.primary,
          }}
        />
      </View>
    ));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'Notifications' }} />
      {renderBody()}
    </ScrollView>
  );
});

export default NotificationsSettings;

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.color.bg,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  label: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.md,
    fontWeight: '600',
    marginBottom: tokens.spacing.xs,
  },
  description: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.sm,
  },
  error: { color: tokens.color.danger, fontSize: tokens.font.size.sm },
});
