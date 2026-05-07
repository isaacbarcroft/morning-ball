import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { tokens } from '@/lib/theme';
import { getControllers } from '@/controllers';

export default function Verify() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (submitting) return;
    if (!email) {
      setError('Missing email — go back and try again.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await getControllers().auth.verifyOtp(email, code);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Verify' }} />
      <Text style={styles.heading}>Enter the code</Text>
      <Text style={styles.subheading}>We sent a 6-digit code to {email}.</Text>

      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        placeholderTextColor={tokens.color.textMuted}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
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
          <Text style={styles.buttonLabel}>Verify</Text>
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
    letterSpacing: 8,
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
