console.log('[diag] _layout module begin');
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { runInAction } from 'mobx';
import { tokens } from '@/lib/theme';
import { supabase } from '@/services/supabase';
import { getControllers } from '@/controllers';
import { getRootStore } from '@/stores/root-store';

console.log('[diag] _layout imports done');

export default function RootLayout() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    console.log('[diag] _layout useEffect start');
    SplashScreen.hideAsync().catch((err) => console.log('[diag] hideAsync err', err));
    let cancelled = false;
    const controllers = getControllers();
    const store = getRootStore();

    const subscription = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      if (session === null) {
        runInAction(() => store.reset());
        return;
      }
      await controllers.auth.loadProfileForSession(session);
    });

    controllers.auth
      .hydrate()
      .then(() => console.log('[diag] hydrate resolved'))
      .catch((err) => console.log('[diag] hydrate err', err))
      .finally(() => {
        console.log('[diag] hydrate finally');
        if (!cancelled) setHydrated(true);
      });

    return () => {
      cancelled = true;
      subscription.data.subscription.unsubscribe();
    };
  }, []);

  if (!hydrated) {
    return <GestureHandlerRootView style={{ flex: 1, backgroundColor: tokens.color.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: tokens.color.bg }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: tokens.color.bg },
          headerTintColor: tokens.color.textPrimary,
          contentStyle: { backgroundColor: tokens.color.bg },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="session/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
