import { Redirect, Stack } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { tokens } from '@/lib/theme';
import { useStores } from '@/hooks/use-stores';

const AdminLayout = observer(() => {
  const { auth } = useStores();
  if (!auth.isAdmin) return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tokens.color.bg },
        headerTintColor: tokens.color.textPrimary,
        contentStyle: { backgroundColor: tokens.color.bg },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    />
  );
});

export default AdminLayout;
