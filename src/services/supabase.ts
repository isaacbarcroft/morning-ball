import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from './logger';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  logger.warn('Supabase env vars missing — auth/data calls will fail until .env is set', {
    hasUrl: Boolean(url),
    hasKey: Boolean(anonKey),
  });
}

export const supabase: SupabaseClient<Database> = createClient<Database>(url ?? '', anonKey ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type AppSupabase = SupabaseClient<Database>;
