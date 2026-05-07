import { Redirect } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { ActivityIndicator, View } from 'react-native';
import { tokens } from '@/lib/theme';
import { useStores } from '@/hooks/use-stores';

const RouteResolver = observer(() => {
  const { auth } = useStores();

  if (auth.phase === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: tokens.color.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={tokens.color.primary} />
      </View>
    );
  }

  if (auth.phase === 'unauthenticated') {
    return <Redirect href="/(auth)/sign-in" />;
  }
  if (auth.phase === 'pending_profile') {
    return <Redirect href="/(onboarding)/invite-code" />;
  }
  if (auth.phase === 'pending_invite') {
    return <Redirect href="/(onboarding)/invite-code" />;
  }
  return <Redirect href="/(tabs)" />;
});

export default RouteResolver;
