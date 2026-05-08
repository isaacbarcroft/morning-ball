import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { tokens } from '@/lib/theme';
import { useStores } from '@/hooks/use-stores';
import { getControllers } from '@/controllers';
import { formatHeight } from '@/lib/format';
import { Avatar } from '@/views/primitives/avatar';
import { Pill } from '@/views/primitives/pill';

const Profile = observer(() => {
  const router = useRouter();
  const { auth } = useStores();
  const profile = auth.profile;

  const signOut = async () => {
    await getControllers().auth.signOut();
  };

  const viewFullProfile = () => {
    if (!profile) return;
    router.push({ pathname: '/player/[id]', params: { id: profile.id } });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ title: 'Profile' }} />
      <Avatar
        size={96}
        name={profile?.display_name ?? '?'}
        url={profile?.avatar_url ?? null}
      />
      <Text style={styles.name}>{profile?.display_name ?? '—'}</Text>
      {profile?.nickname ? <Text style={styles.nickname}>&ldquo;{profile.nickname}&rdquo;</Text> : null}
      <View style={styles.row}>
        {profile?.role ? <Pill label={profile.role} tone="primary" /> : null}
        {profile?.jersey_number != null ? (
          <Pill label={`#${profile.jersey_number}`} tone="accent" />
        ) : null}
        {profile?.height_inches != null ? (
          <Pill label={formatHeight(profile.height_inches)} tone="accent" />
        ) : null}
        {profile?.skill_rating != null ? (
          <Pill label={`${profile.skill_rating}/5`} tone="primary" />
        ) : null}
      </View>

      <TouchableOpacity onPress={viewFullProfile} style={styles.linkButton}>
        <Text style={styles.linkLabel}>View full stats</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/(onboarding)/profile-setup')}
        style={styles.secondaryLink}
      >
        <Text style={styles.secondaryLinkLabel}>Edit profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/settings/notifications')}
        style={styles.secondaryLink}
      >
        <Text style={styles.secondaryLinkLabel}>Notifications</Text>
      </TouchableOpacity>

      {auth.isAdmin ? (
        <TouchableOpacity onPress={() => router.push('/admin')} style={styles.secondaryLink}>
          <Text style={styles.secondaryLinkLabel}>Admin</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity onPress={signOut} style={styles.signOut}>
        <Text style={styles.signOutLabel}>Sign out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
});

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.color.bg,
    alignItems: 'center',
    padding: tokens.spacing.xl,
    paddingTop: tokens.spacing.xxl,
    gap: tokens.spacing.md,
  },
  name: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.xl,
    fontWeight: '700',
  },
  nickname: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.md,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
  },
  linkButton: {
    marginTop: tokens.spacing.lg,
    backgroundColor: tokens.color.primary,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.xl,
    borderRadius: tokens.radius.pill,
  },
  linkLabel: {
    color: tokens.color.textPrimary,
    fontSize: tokens.font.size.sm,
    fontWeight: '600',
  },
  secondaryLink: {
    marginTop: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.xl,
    borderRadius: tokens.radius.pill,
  },
  secondaryLinkLabel: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.sm,
    fontWeight: '600',
  },
  signOut: {
    marginTop: tokens.spacing.xl,
    borderWidth: 1,
    borderColor: tokens.color.border,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.xl,
    borderRadius: tokens.radius.pill,
  },
  signOutLabel: {
    color: tokens.color.textSecondary,
    fontSize: tokens.font.size.sm,
    fontWeight: '600',
  },
});
