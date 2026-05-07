import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export type RealtimeTableSpec = {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
};

/**
 * Subscribes to Supabase postgres_changes for one or more public tables and
 * debounces callbacks so bursts of WAL events collapse into one refetch/UI update.
 */
export function useDebouncedRealtime({
  channelName,
  specs,
  onEvent,
  enabled = true,
  debounceMs = 380,
}: {
  channelName: string;
  specs: readonly RealtimeTableSpec[];
  onEvent: () => void;
  enabled?: boolean;
  debounceMs?: number;
}) {
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const specsKey = [...specs]
    .map((s) => `${s.table}:${s.filter ?? ''}:${s.event ?? '*'}`)
    .sort()
    .join('|');

  useEffect(() => {
    if (!enabled || specs.length === 0) return undefined;

    let timer: ReturnType<typeof window.setTimeout> | null = null;
    function schedule() {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        onEventRef.current();
      }, debounceMs);
    }

    let ch = supabase.channel(channelName);
    for (const s of specs) {
      const evt = (s.event ?? '*') as 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      const cfg = s.filter
        ? { event: evt, schema: 'public' as const, table: s.table, filter: s.filter }
        : { event: evt, schema: 'public' as const, table: s.table };
      ch = ch.on('postgres_changes', cfg, schedule);
    }
    void ch.subscribe();

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      void supabase.removeChannel(ch);
    };
  }, [channelName, debounceMs, enabled, specs, specsKey]);
}
