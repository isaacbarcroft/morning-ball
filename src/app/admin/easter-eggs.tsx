import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import { tokens } from '@/lib/theme';
import { supabase } from '@/services/supabase';
import { getControllers } from '@/controllers';
import { Avatar } from '@/views/primitives/avatar';
import type { ProfileRow, RsvpStatus, SessionRow } from '@/types/domain';

const STARTER_BADGES = [
  'king_of_court',
  'sharpshooter',
  'iron_man',
  'rebound_king',
  'clutch',
  'brick_layer',
  'tenured',
  'heat_check',
  'triple_double',
] as const;

export default function EasterEggs() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Force-RSVP state
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>('in');

  // Achievement state
  const [achProfile, setAchProfile] = useState<string | null>(null);
  const [badgeKey, setBadgeKey] = useState('king_of_court');
  const [achNotes, setAchNotes] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ data: profileData }, { data: sessionData }] = await Promise.all([
        supabase.from('profiles').select('*').order('display_name'),
        supabase.from('sessions').select('*').order('scheduled_for', { ascending: false }),
      ]);
      if (cancelled) return;
      if (Array.isArray(profileData)) setProfiles(profileData);
      if (Array.isArray(sessionData)) setSessions(sessionData);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const forceRsvp = async () => {
    if (!selectedSession || !selectedProfile) {
      setMessage('Pick a session and a player.');
      return;
    }
    setBusy(true);
    setMessage(null);
    const out = await getControllers().admin.forceRsvp({
      sessionId: selectedSession,
      profileId: selectedProfile,
      status: rsvpStatus,
    });
    setBusy(false);
    setMessage(out.ok ? `Forced ${rsvpStatus.toUpperCase()} ✓` : out.error);
  };

  const grant = async () => {
    if (!achProfile) {
      setMessage('Pick a player.');
      return;
    }
    setBusy(true);
    setMessage(null);
    const out = await getControllers().admin.grantAchievement({
      profileId: achProfile,
      badgeKey,
      notes: achNotes.trim() === '' ? undefined : achNotes.trim(),
    });
    setBusy(false);
    setMessage(out.ok ? `Granted ${badgeKey} ✓` : out.error);
    if (out.ok) {
      setAchNotes('');
      setAchProfile(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'Easter eggs' }} />

      <Section title="Force RSVP" hint="e.g. someone texted you that they're in">
        <Label>Session</Label>
        <View style={styles.chipRow}>
          {sessions.slice(0, 5).map((s) => (
            <Chip
              key={s.id}
              label={s.scheduled_for}
              selected={s.id === selectedSession}
              onPress={() => setSelectedSession(s.id)}
            />
          ))}
        </View>

        <Label>Player</Label>
        <View style={styles.chipRow}>
          {profiles.map((p) => (
            <ChipWithAvatar
              key={p.id}
              profile={p}
              selected={p.id === selectedProfile}
              onPress={() => setSelectedProfile(p.id)}
            />
          ))}
        </View>

        <Label>Status</Label>
        <View style={styles.chipRow}>
          {(['in', 'out'] as const).map((s) => (
            <Chip
              key={s}
              label={s.toUpperCase()}
              selected={s === rsvpStatus}
              onPress={() => setRsvpStatus(s)}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.actionBtn} onPress={forceRsvp} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={tokens.color.textPrimary} />
          ) : (
            <Text style={styles.actionLabel}>Force RSVP</Text>
          )}
        </TouchableOpacity>
      </Section>

      <Section title="Grant achievement" hint="Award a badge to a player.">
        <Label>Player</Label>
        <View style={styles.chipRow}>
          {profiles.map((p) => (
            <ChipWithAvatar
              key={p.id}
              profile={p}
              selected={p.id === achProfile}
              onPress={() => setAchProfile(p.id)}
            />
          ))}
        </View>

        <Label>Badge</Label>
        <View style={styles.chipRow}>
          {STARTER_BADGES.map((b) => (
            <Chip
              key={b}
              label={b}
              selected={b === badgeKey}
              onPress={() => setBadgeKey(b)}
            />
          ))}
        </View>

        <Label>Notes (optional)</Label>
        <TextInput
          value={achNotes}
          onChangeText={setAchNotes}
          placeholder='"For the buzzer-beater on 5/3"'
          placeholderTextColor={tokens.color.textMuted}
          style={styles.input}
        />

        <TouchableOpacity style={styles.actionBtn} onPress={grant} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={tokens.color.textPrimary} />
          ) : (
            <Text style={styles.actionLabel}>Grant badge</Text>
          )}
        </TouchableOpacity>
      </Section>

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </ScrollView>
  );
}

interface SectionProps {
  title: string;
  hint?: string;
  children: React.ReactNode;
}

function Section({ title, hint, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface ChipWithAvatarProps {
  profile: ProfileRow;
  selected: boolean;
  onPress: () => void;
}

function ChipWithAvatar({ profile, selected, onPress }: ChipWithAvatarProps) {
  return (
    <TouchableOpacity
      style={[styles.chipAvatar, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Avatar name={profile.display_name} url={profile.avatar_url} size={24} />
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
        {profile.nickname ?? profile.display_name.split(' ')[0]}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: tokens.color.bg, padding: tokens.spacing.lg, gap: tokens.spacing.lg },
  section: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.spacing.sm,
  },
  sectionTitle: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.lg,
    fontWeight: '700',
  },
  sectionHint: {
    color: tokens.color.textMuted,
    fontSize: tokens.font.size.sm,
    fontStyle: 'italic',
    marginBottom: tokens.spacing.sm,
  },
  label: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: tokens.spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
  },
  chip: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surfaceHigh,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  chipAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surfaceHigh,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  chipSelected: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
  chipLabel: { color: tokens.color.textSecondary, fontSize: tokens.font.size.xs, fontWeight: '600' },
  chipLabelSelected: { color: tokens.color.textPrimary },
  input: {
    backgroundColor: tokens.color.surfaceHigh,
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  actionBtn: {
    marginTop: tokens.spacing.sm,
    backgroundColor: tokens.color.accent,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
  },
  actionLabel: { color: tokens.color.textPrimary, fontSize: tokens.font.size.sm, fontWeight: '600' },
  message: {
    color: tokens.color.success,
    fontSize: tokens.font.size.sm,
    textAlign: 'center',
  },
});
