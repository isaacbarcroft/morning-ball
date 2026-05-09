import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/lib/theme';
import { useStores } from '@/hooks/use-stores';
import { useRealtime } from '@/hooks/use-realtime';
import { getControllers } from '@/controllers';
import { Avatar } from '@/views/primitives/avatar';
import type { MessageRow } from '@/types/domain';

const Chat = observer(() => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { chat, profiles, auth } = useStores();
  const insets = useSafeAreaInsets();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<MessageRow>>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      const tIdRes = await getControllers().chat.getThreadIdForSession(id);
      if (cancelled || !tIdRes.ok) return;
      setThreadId(tIdRes.data);
      void getControllers().chat.listMessages(tIdRes.data);
    })();
    void getControllers().profile.listAll();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleRealtime = useCallback(() => {
    if (threadId) void getControllers().chat.listMessages(threadId);
  }, [threadId]);

  useRealtime({
    channel: `session-chat-${threadId ?? 'none'}`,
    table: 'messages',
    filter: threadId ? `thread_id=eq.${threadId}` : undefined,
    onChange: handleRealtime,
  });

  const send = async () => {
    if (!threadId || sending) return;
    const trimmed = body.trim();
    if (trimmed.length === 0) return;
    setSending(true);
    setError(null);
    const out = await getControllers().chat.post(threadId, trimmed);
    setSending(false);
    if (!out.ok) {
      setError(out.error);
      return;
    }
    setBody('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (!id) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Missing session id</Text>
      </View>
    );
  }

  if (!threadId) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Chat' }} />
        <ActivityIndicator color={tokens.color.primary} />
      </View>
    );
  }

  const messages = chat.get(threadId);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <Stack.Screen options={{ title: 'Chat' }} />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={[styles.list, messages.length === 0 && styles.listEmpty]}
        ItemSeparatorComponent={() => <View style={{ height: tokens.spacing.sm }} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyMessages}>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyMuted}>Start the conversation.</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const profile = profiles.get(item.profile_id);
          const isOwn = auth.profile?.id === item.profile_id;
          return (
            <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
              {!isOwn ? (
                <Avatar name={profile?.display_name ?? '?'} url={profile?.avatar_url ?? null} size={32} />
              ) : null}
              <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                {!isOwn ? (
                  <Text style={styles.author}>
                    {profile?.nickname ?? profile?.display_name ?? '?'}
                  </Text>
                ) : null}
                <Text style={isOwn ? styles.bodyOwn : styles.bodyOther}>{item.body}</Text>
              </View>
            </View>
          );
        }}
      />
      <View style={[styles.composer, { paddingBottom: tokens.spacing.md + insets.bottom }]}>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Add a comment"
          placeholderTextColor={tokens.color.textMuted}
          style={styles.input}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={sending}>
          {sending ? (
            <ActivityIndicator color={tokens.color.textPrimary} />
          ) : (
            <Text style={styles.sendLabel}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </KeyboardAvoidingView>
  );
});

export default Chat;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.color.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.color.bg },
  emptyTitle: { color: tokens.color.textPrimary, fontSize: tokens.font.size.lg, fontWeight: '600' },
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xxl,
    gap: tokens.spacing.xs,
  },
  emptyMuted: { color: tokens.color.textMuted, fontSize: tokens.font.size.sm, textAlign: 'center' },
  list: { padding: tokens.spacing.lg, gap: tokens.spacing.sm, flexGrow: 1 },
  listEmpty: { justifyContent: 'center' },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: tokens.spacing.sm,
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
  },
  bubbleOwn: {
    backgroundColor: tokens.color.primary,
    borderBottomRightRadius: tokens.radius.sm,
  },
  bubbleOther: {
    backgroundColor: tokens.color.surfaceElevated,
    borderBottomLeftRadius: tokens.radius.sm,
  },
  author: {
    color: tokens.color.accent,
    fontSize: tokens.font.size.xs,
    fontWeight: '700',
    marginBottom: tokens.spacing.xs,
  },
  bodyOwn: { color: tokens.color.textPrimary, fontSize: tokens.font.size.sm },
  bodyOther: { color: tokens.color.textPrimary, fontSize: tokens.font.size.sm },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.color.border,
    backgroundColor: tokens.color.bg,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    backgroundColor: tokens.color.surfaceElevated,
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  sendBtn: {
    backgroundColor: tokens.color.primary,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.pill,
    minWidth: 80,
    alignItems: 'center',
  },
  sendLabel: { color: tokens.color.textPrimary, fontSize: tokens.font.size.sm, fontWeight: '600' },
  error: {
    color: tokens.color.danger,
    fontSize: tokens.font.size.sm,
    textAlign: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
  },
});
