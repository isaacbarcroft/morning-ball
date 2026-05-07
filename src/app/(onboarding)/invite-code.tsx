import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { tokens } from '@/lib/theme';
import { getControllers } from '@/controllers';

export default function InviteCode() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await getControllers().invite.redeem(code);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace('/(onboarding)/profile-setup');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Invite code' }} />
      <Text style={styles.heading}>You&apos;re almost in</Text>
      <Text style={styles.subheading}>Enter the invite code you received from the crew.</Text>

      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        placeholder="MORNING"
        placeholderTextColor={tokens.color.textMuted}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={12}
        style={styles.input}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={submit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={tokens.color.textPrimary} />
        ) : (
          <Text style={styles.buttonLabel}>Redeem</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.color.bg,
    padding: tokens.spacing.xl,
    justifyContent: 'center',
  },
  heading: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.xl,
    fontWeight: '700',
    marginBottom: tokens.spacing.sm,
  },
  subheading: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.md,
    marginBottom: tokens.spacing.xl,
  },
  input: {
    backgroundColor: tokens.color.surfaceElevated,
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.xl,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: tokens.spacing.lg,
  },
  error: {
    color: tokens.color.danger,
    fontSize: tokens.font.size.sm,
    marginBottom: tokens.spacing.md,
  },
  button: {
    backgroundColor: tokens.color.primary,
    paddingVertical: tokens.spacing.lg,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonLabel: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.md,
    fontWeight: '600',
  },
});
