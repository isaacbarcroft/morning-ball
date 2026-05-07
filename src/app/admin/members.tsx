import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import { tokens } from '@/lib/theme';
import { supabase } from '@/services/supabase';
import { getControllers } from '@/controllers';
import { Avatar } from '@/views/primitives/avatar';
import { Pill } from '@/views/primitives/pill';
import type { ProfileRole, ProfileRow, ProfileStatus } from '@/types/domain';

type MemberAction = 'core' | 'admin' | 'guest' | 'suspend' | 'reactivate';

const statusTone = (status: ProfileStatus) => {
  if (status === 'active') return 'success' as const;
  if (status === 'shadow') return 'accent' as const;
  if (status === 'suspended') return 'danger' as const;
  return 'neutral' as const;
};

const roleTone = (role: ProfileRole) => {
  if (role === 'admin') return 'primary' as const;
  if (role === 'guest') return 'accent' as const;
  return 'neutral' as const;
};

export default function AdminMembers() {
  const [members, setMembers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Shadow create form
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (Array.isArray(data)) setMembers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applyAction = async (member: ProfileRow, action: MemberAction) => {
    setBusy(member.id);
    setError(null);
    let out: { ok: boolean; error?: string };
    if (action === 'suspend') {
      out = await getControllers().admin.setProfileStatus(member.id, 'suspended');
    } else if (action === 'reactivate') {
      out = await getControllers().admin.setProfileStatus(member.id, 'active');
    } else {
      out = await getControllers().admin.setProfileRole(member.id, action);
    }
    setBusy(null);
    if (!out.ok && out.error) {
      setError(out.error);
      return;
    }
    void refresh();
  };

  const createShadow = async () => {
    if (name.trim() === '') {
      setError('Name is required');
      return;
    }
    setBusy('new');
    setError(null);
    const out = await getControllers().admin.createShadow({
      displayName: name.trim(),
      nickname: nickname.trim() === '' ? undefined : nickname.trim(),
      claimableEmail: email.trim() === '' ? undefined : email.trim().toLowerCase(),
    });
    setBusy(null);
    if (!out.ok) {
      setError(out.error);
      return;
    }
    setName('');
    setNickname('');
    setEmail('');
    setShowCreate(false);
    void refresh();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Members' }} />

      <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
        <Text style={styles.createLabel}>+ Create shadow profile</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={tokens.color.primary} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: tokens.spacing.sm }} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Avatar name={item.display_name} url={item.avatar_url} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.display_name}</Text>
                <View style={styles.pillRow}>
                  <Pill label={item.role} tone={roleTone(item.role)} />
                  <Pill label={item.status} tone={statusTone(item.status)} />
                </View>
              </View>
              <View style={styles.actions}>
                {busy === item.id ? (
                  <ActivityIndicator color={tokens.color.primary} />
                ) : (
                  <ActionMenu member={item} onAction={(a) => void applyAction(item, a)} />
                )}
              </View>
            </View>
          )}
        />
      )}

      <Modal
        visible={showCreate}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreate(false)}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalCard}>
            <Text style={styles.modalTitle}>New shadow profile</Text>
            <Text style={styles.label}>Display name</Text>
            <TextInput value={name} onChangeText={setName} placeholder="John Smith" placeholderTextColor={tokens.color.textMuted} style={styles.input} />
            <Text style={styles.label}>Nickname (optional)</Text>
            <TextInput value={nickname} onChangeText={setNickname} placeholder="J-Smitty" placeholderTextColor={tokens.color.textMuted} style={styles.input} />
            <Text style={styles.label}>Claimable email (optional)</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="player@example.com"
              placeholderTextColor={tokens.color.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <Text style={styles.modalHint}>
              When that email signs up via OTP, this row auto-claims into a real profile.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelLabel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={createShadow}
                style={styles.createBtn}
                disabled={busy === 'new'}
              >
                {busy === 'new' ? (
                  <ActivityIndicator color={tokens.color.textPrimary} />
                ) : (
                  <Text style={styles.createLabel}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

interface ActionMenuProps {
  member: ProfileRow;
  onAction: (action: MemberAction) => void;
}

function ActionMenu({ member, onAction }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity style={styles.menuTrigger} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.menuTriggerLabel}>•••</Text>
      </TouchableOpacity>
      {open ? (
        <View style={styles.menu}>
          {member.role !== 'admin' ? (
            <TouchableOpacity style={styles.menuItem} onPress={() => { onAction('admin'); setOpen(false); }}>
              <Text style={styles.menuLabel}>Make admin</Text>
            </TouchableOpacity>
          ) : null}
          {member.role !== 'core' ? (
            <TouchableOpacity style={styles.menuItem} onPress={() => { onAction('core'); setOpen(false); }}>
              <Text style={styles.menuLabel}>Make core</Text>
            </TouchableOpacity>
          ) : null}
          {member.role !== 'guest' ? (
            <TouchableOpacity style={styles.menuItem} onPress={() => { onAction('guest'); setOpen(false); }}>
              <Text style={styles.menuLabel}>Make guest</Text>
            </TouchableOpacity>
          ) : null}
          {member.status === 'suspended' ? (
            <TouchableOpacity style={styles.menuItem} onPress={() => { onAction('reactivate'); setOpen(false); }}>
              <Text style={[styles.menuLabel, { color: tokens.color.success }]}>Reactivate</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.menuItem} onPress={() => { onAction('suspend'); setOpen(false); }}>
              <Text style={[styles.menuLabel, { color: tokens.color.danger }]}>Suspend</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.color.bg, padding: tokens.spacing.lg, gap: tokens.spacing.md },
  createBtn: {
    backgroundColor: tokens.color.primary,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
  },
  createLabel: { color: tokens.color.textPrimary, fontSize: tokens.font.size.sm, fontWeight: '600' },
  error: { color: tokens.color.danger, fontSize: tokens.font.size.sm },
  list: { gap: tokens.spacing.sm },
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
  name: { color: tokens.color.textPrimary, fontSize: tokens.font.size.md, fontWeight: '600' },
  pillRow: { flexDirection: 'row', gap: tokens.spacing.xs, marginTop: tokens.spacing.xs },
  actions: { position: 'relative' },
  menuTrigger: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: tokens.color.surfaceHigh,
  },
  menuTriggerLabel: { color: tokens.color.textPrimary, fontSize: tokens.font.size.lg, fontWeight: '700' },
  menu: {
    position: 'absolute',
    right: 0,
    top: 36,
    backgroundColor: tokens.color.surfaceElevated,
    borderRadius: tokens.radius.md,
    minWidth: 160,
    borderWidth: 1,
    borderColor: tokens.color.border,
    zIndex: 10,
  },
  menuItem: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  menuLabel: { color: tokens.color.textPrimary, fontSize: tokens.font.size.sm, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: tokens.color.bg,
    padding: tokens.spacing.xl,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    gap: tokens.spacing.sm,
  },
  modalTitle: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.xl,
    fontWeight: '700',
    marginBottom: tokens.spacing.md,
  },
  label: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: tokens.color.surfaceElevated,
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  modalHint: {
    color: tokens.color.textMuted,
    fontSize: tokens.font.size.xs,
    fontStyle: 'italic',
    marginTop: tokens.spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.md,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  modalCancelLabel: { color: tokens.color.textSecondary, fontSize: tokens.font.size.sm, fontWeight: '600' },
});
