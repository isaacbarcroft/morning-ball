import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { observer } from 'mobx-react-lite';
import { tokens } from '@/lib/theme';
import { getControllers } from '@/controllers';
import { useStores } from '@/hooks/use-stores';

const optionalNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  return Number(trimmed);
};

const ProfileSetup = observer(() => {
  const router = useRouter();
  const { auth } = useStores();
  const existingName = auth.profile?.display_name ?? '';
  const firstSpace = existingName.indexOf(' ');
  const [firstName, setFirstName] = useState(
    firstSpace === -1 ? existingName : existingName.slice(0, firstSpace),
  );
  const [lastName, setLastName] = useState(
    firstSpace === -1 ? '' : existingName.slice(firstSpace + 1),
  );
  const [nickname, setNickname] = useState(auth.profile?.nickname ?? '');
  const [heightInches, setHeightInches] = useState(
    auth.profile?.height_inches == null ? '' : String(auth.profile.height_inches),
  );
  const [skillRating, setSkillRating] = useState(
    auth.profile?.skill_rating == null ? '' : String(auth.profile.skill_rating),
  );
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickAvatar = async () => {
    if (uploadingAvatar) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingAvatar(true);
    setError(null);
    const asset = result.assets[0];
    const extension = (asset.fileName?.split('.').pop() ?? 'jpg').toLowerCase();
    const contentType = asset.mimeType ?? `image/${extension === 'jpg' ? 'jpeg' : extension}`;
    const out = await getControllers().profile.uploadAvatar({
      uri: asset.uri,
      contentType,
      extension,
    });
    setUploadingAvatar(false);
    if (!out.ok) {
      setError(out.error);
    }
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst || !trimmedLast) {
      setError('First and last name are required');
      setSubmitting(false);
      return;
    }
    const displayName = `${trimmedFirst} ${trimmedLast}`;
    const out = await getControllers().profile.updateOwn({
      displayName,
      nickname: nickname.trim() === '' ? undefined : nickname,
      heightInches: optionalNumber(heightInches),
      skillRating: optionalNumber(skillRating),
    });
    setSubmitting(false);
    if (!out.ok) {
      setError(out.error);
      return;
    }
    router.replace('/');
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Profile' }} />
      <Text style={styles.heading}>Set up your profile</Text>
        <Text style={styles.subheading}>The crew will see this on RSVPs and box scores.</Text>

        <TouchableOpacity onPress={pickAvatar} style={styles.avatarRow} disabled={uploadingAvatar}>
          <View style={styles.avatarBubble}>
            {auth.profile?.avatar_url ? (
              <Image source={{ uri: auth.profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarPlaceholder}>+</Text>
            )}
          </View>
          <Text style={styles.avatarHint}>
            {uploadingAvatar ? 'Uploading…' : 'Tap to add a profile photo'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>First name</Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First"
          placeholderTextColor={tokens.color.textMuted}
          autoCapitalize="words"
          style={styles.input}
        />

        <Text style={styles.label}>Last name</Text>
        <TextInput
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last"
          placeholderTextColor={tokens.color.textMuted}
          autoCapitalize="words"
          style={styles.input}
        />

        <Text style={styles.label}>Nickname (optional)</Text>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          placeholder="Iz"
          placeholderTextColor={tokens.color.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Height in inches (optional)</Text>
        <TextInput
          value={heightInches}
          onChangeText={setHeightInches}
          placeholder="77"
          placeholderTextColor={tokens.color.textMuted}
          keyboardType="number-pad"
          maxLength={2}
          style={styles.input}
        />

        <Text style={styles.label}>Skill rating 1-5 (optional)</Text>
        <TextInput
          value={skillRating}
          onChangeText={setSkillRating}
          placeholder="3"
          placeholderTextColor={tokens.color.textMuted}
          keyboardType="number-pad"
          maxLength={1}
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
          <Text style={styles.buttonLabel}>Save and continue</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
});

export default ProfileSetup;

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: tokens.color.bg },
  container: { padding: tokens.spacing.xl },
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
  avatarRow: {
    alignItems: 'center',
    marginBottom: tokens.spacing.xl,
  },
  avatarBubble: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: tokens.color.surfaceElevated,
    borderWidth: 2,
    borderColor: tokens.color.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.sm,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    color: tokens.color.textMuted,
    fontSize: tokens.font.size.xxl,
    fontWeight: '300',
  },
  avatarHint: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.sm,
  },
  label: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.sm,
    marginBottom: tokens.spacing.xs,
  },
  input: {
    backgroundColor: tokens.color.surfaceElevated,
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.md,
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
