import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionStore } from '@/stores/session-store';
import type { SessionRow } from '@/types/domain';

const makeSession = (overrides: Partial<SessionRow> & Pick<SessionRow, 'id' | 'scheduled_for'>): SessionRow => ({
  created_at: '2026-01-01T00:00:00Z',
  created_by: null,
  location: null,
  notes: null,
  scheduled_time: '06:00',
  status: 'upcoming',
  title: null,
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('SessionStore.upcoming / next', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Saturday May 9, 2026 at 11:00 ET (15:00 UTC). today (in ET) = '2026-05-09'.
    vi.setSystemTime(new Date('2026-05-09T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('excludes past upcoming sessions', () => {
    const store = new SessionStore();
    store.upsertSessions([
      makeSession({ id: 'past', scheduled_for: '2026-05-07', status: 'upcoming' }),
      makeSession({ id: 'future', scheduled_for: '2026-05-11', status: 'upcoming' }),
    ]);
    expect(store.upcoming.map((s) => s.id)).toEqual(['future']);
    expect(store.next?.id).toBe('future');
  });

  it('excludes past in_progress sessions (stale data)', () => {
    const store = new SessionStore();
    store.upsertSessions([
      makeSession({ id: 'stale', scheduled_for: '2026-05-04', status: 'in_progress' }),
      makeSession({ id: 'future', scheduled_for: '2026-05-14', status: 'upcoming' }),
    ]);
    expect(store.upcoming.map((s) => s.id)).toEqual(['future']);
  });

  it("includes today's upcoming session", () => {
    const store = new SessionStore();
    store.upsertSessions([
      makeSession({ id: 'today', scheduled_for: '2026-05-09', status: 'upcoming' }),
      makeSession({ id: 'next-week', scheduled_for: '2026-05-11', status: 'upcoming' }),
    ]);
    expect(store.upcoming.map((s) => s.id)).toEqual(['today', 'next-week']);
    expect(store.next?.id).toBe('today');
  });

  it('sorts future sessions ascending by scheduled_for', () => {
    const store = new SessionStore();
    store.upsertSessions([
      makeSession({ id: 'far', scheduled_for: '2026-05-21', status: 'upcoming' }),
      makeSession({ id: 'near', scheduled_for: '2026-05-11', status: 'upcoming' }),
      makeSession({ id: 'mid', scheduled_for: '2026-05-14', status: 'upcoming' }),
    ]);
    expect(store.upcoming.map((s) => s.id)).toEqual(['near', 'mid', 'far']);
    expect(store.next?.id).toBe('near');
  });

  it('excludes completed and cancelled sessions regardless of date', () => {
    const store = new SessionStore();
    store.upsertSessions([
      makeSession({ id: 'done', scheduled_for: '2026-05-14', status: 'completed' }),
      makeSession({ id: 'cancelled', scheduled_for: '2026-05-18', status: 'cancelled' }),
      makeSession({ id: 'upcoming', scheduled_for: '2026-05-21', status: 'upcoming' }),
    ]);
    expect(store.upcoming.map((s) => s.id)).toEqual(['upcoming']);
  });

  it('returns undefined for next when there are no upcoming sessions', () => {
    const store = new SessionStore();
    expect(store.next).toBeUndefined();

    store.upsertSessions([
      makeSession({ id: 'past', scheduled_for: '2026-05-01', status: 'upcoming' }),
      makeSession({ id: 'done', scheduled_for: '2026-05-14', status: 'completed' }),
    ]);
    expect(store.next).toBeUndefined();
  });
});

describe('SessionStore.completed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns completed sessions sorted desc, regardless of date', () => {
    const store = new SessionStore();
    store.upsertSessions([
      makeSession({ id: 'old', scheduled_for: '2026-04-06', status: 'completed' }),
      makeSession({ id: 'recent', scheduled_for: '2026-04-20', status: 'completed' }),
      makeSession({ id: 'upcoming', scheduled_for: '2026-05-11', status: 'upcoming' }),
    ]);
    expect(store.completed.map((s) => s.id)).toEqual(['recent', 'old']);
  });
});
