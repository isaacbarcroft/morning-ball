import { useEffect } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { tokens } from '@/lib/theme';
import { useStores } from '@/hooks/use-stores';
import { getControllers } from '@/controllers';
import { SessionCard } from '@/views/sessions/session-card';

const Sessions = observer(() => {
  const { sessions } = useStores();
  const router = useRouter();

  useEffect(() => {
    void getControllers().session.list();
  }, []);

  const ordered = [...sessions.upcoming, ...sessions.completed];

  if (ordered.length === 0) {
    return (
      <SafeAreaView style={styles.empty} edges={['top']}>
        <Stack.Screen options={{ title: 'Sessions' }} />
        <Text style={styles.emptyTitle}>No sessions yet</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ title: 'Sessions' }} />
      <FlatList
        data={ordered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: tokens.spacing.md }} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/session/[id]', params: { id: item.id } })}
          >
            <SessionCard session={item} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
});

export default Sessions;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.color.bg },
  list: { padding: tokens.spacing.lg },
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
  },
});
