import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import { tokens } from '@/lib/theme';
import { getControllers } from '@/controllers';
import type { InviteCodeRow } from '@/types/domain';

type InviteType = 'core' | 'guest';

export default function AdminInvites() {
  const [codes, setCodes] = useState<InviteCodeRow[]>([]);
  const [type, setType] = useState<InviteType>('core');
  const [maxUses, setMaxUses] = useState('1');
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const out = await getControllers().admin.listInvites();
    if (out.ok) setCodes(out.data);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const create = async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    const out = await getControllers().admin.createInvite({
      type,
      maxUses: Math.max(1, parseInt(maxUses, 10) || 1),
      note: note.trim() === '' ? undefined : note.trim(),
    });
    setCreating(false);
    if (!out.ok) {
      setError(out.error);
      return;
    }
    setNote('');
    void refresh();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Invites' }} />

      <View style={styles.form}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
          {(['core', 'guest'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeChip, type === t && styles.typeChipActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeChipLabel, type === t && styles.typeChipLabelActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Max uses</Text>
        <TextInput
          value={maxUses}
          onChangeText={(v) => setMaxUses(v.replace(/\D/g, ''))}
          placeholder="1"
          placeholderTextColor={tokens.color.textMuted}
          keyboardType="number-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="for John from work"
          placeholderTextColor={tokens.color.textMuted}
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.createBtn, creating && styles.createDisabled]}
          onPress={create}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color={tokens.color.textPrimary} />
          ) : (
            <Text style={styles.createLabel}>Generate code</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={tokens.color.primary} />
      ) : (
        <FlatList
          data={codes}
          keyExtractor={(c) => c.code}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: tokens.spacing.sm }} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.code}>{item.code}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowMeta}>
                  {item.type} · {item.uses}/{item.max_uses} uses
                  {item.note ? ` · ${item.note}` : ''}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.color.bg, padding: tokens.spacing.lg, gap: tokens.spacing.lg },
  form: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.spacing.sm,
  },
  label: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeRow: { flexDirection: 'row', gap: tokens.spacing.sm },
  typeChip: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surfaceHigh,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  typeChipActive: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
  typeChipLabel: { color: tokens.color.textSecondary, fontSize: tokens.font.size.sm, fontWeight: '600', textTransform: 'capitalize' },
  typeChipLabelActive: { color: tokens.color.textPrimary },
  input: {
    backgroundColor: tokens.color.surfaceHigh,
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  createBtn: {
    backgroundColor: tokens.color.primary,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    marginTop: tokens.spacing.sm,
  },
  createDisabled: { opacity: 0.6 },
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
  code: {
    color: tokens.color.accent,
    fontSize: tokens.font.size.lg,
    fontWeight: '700',
    letterSpacing: 1,
    minWidth: 80,
  },
  rowMeta: { color: tokens.color.textSecondary, fontSize: tokens.font.size.sm },
});
