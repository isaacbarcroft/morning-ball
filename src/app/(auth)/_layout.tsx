import { Stack } from 'expo-router';
import { tokens } from '@/lib/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tokens.color.bg },
        headerTintColor: tokens.color.textPrimary,
        contentStyle: { backgroundColor: tokens.color.bg },
        headerShadowVisible: false,
      }}
    />
  );
}
