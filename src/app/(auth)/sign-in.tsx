import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { tokens } from '@/lib/theme';
import { getControllers } from '@/controllers';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    console.log('[diag] Send code button onPress fired');
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await getControllers().auth.signInWithOtp(email);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push({ pathname: '/(auth)/verify', params: { email: result.data.email } });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Sign in' }} />
      <Text style={styles.heading}>Morning Ball</Text>
      <Text style={styles.subheading}>Enter your email to get a sign-in code.</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={tokens.color.textMuted}
        keyboardType="email-address"
        autoComplete="email"
        autoCorrect={false}
        autoCapitalize="none"
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
          <Text style={styles.buttonLabel}>Send code</Text>
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
    fontSize: tokens.font.size.xxl,
    fontWeight: '700',
    marginBottom: tokens.spacing.sm,
  },
  subheading: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.md,
    marginBottom: tokens.spacing.xl,
  },
  label: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.sm,
    marginBottom: tokens.spacing.xs,
  },
  input: {
    backgroundColor: tokens.color.surfaceElevated,
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.lg,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
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
