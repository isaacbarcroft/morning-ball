import { useEffect } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import { logger } from '@/services/logger';

interface UseRealtimeOptions<T extends Record<string, unknown>> {
  channel: string;
  table: string;
  schema?: string | undefined;
  filter?: string | undefined;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*' | undefined;
  onChange: (payload: RealtimePostgresChangesPayload<T>) => void;
}

export const useRealtime = <T extends Record<string, unknown>>(opts: UseRealtimeOptions<T>): void => {
  useEffect(() => {
    const channel = supabase.channel(opts.channel);
    channel.on(
      'postgres_changes' as never,
      {
        event: opts.event ?? '*',
        schema: opts.schema ?? 'public',
        table: opts.table,
        filter: opts.filter,
      } as never,
      ((payload: RealtimePostgresChangesPayload<T>) => {
        opts.onChange(payload);
      }) as never,
    );
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        logger.warn('realtime channel error', { channel: opts.channel });
      }
    });
    return () => {
      void supabase.removeChannel(channel);
    };
    // Each scalar field is destructured as a dep so callers can pass inline objects;
    // the lint rule wants the full `opts` reference but that triggers re-subscribe loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.channel, opts.table, opts.schema, opts.filter, opts.event, opts.onChange]);
};
