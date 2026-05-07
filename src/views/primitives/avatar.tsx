import { Image, StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/lib/theme';
import { initials } from '@/lib/format';

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: number;
}

export function Avatar({ name, url, size = 36 }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  if (url) {
    return <Image source={{ uri: url }} style={[styles.image, dimension]} />;
  }
  return (
    <View style={[styles.fallback, dimension]}>
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: tokens.color.surfaceHigh },
  fallback: {
    backgroundColor: tokens.color.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  initials: {
    color: tokens.color.textPrimary,
    fontWeight: '600',
  },
});
