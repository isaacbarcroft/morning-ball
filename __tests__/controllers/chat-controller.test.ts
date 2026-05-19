import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runInAction } from 'mobx';
import { ChatController } from '@/controllers/chat-controller';
import { RootStore } from '@/stores/root-store';
import type { AppSupabase } from '@/services/supabase';
import type { ProfileRow } from '@/types/domain';
import { CHAT_MESSAGE_MAX_CHARS } from '@/lib/constants';

vi.mock('@/services/push-events', () => ({
  firePushEvent: vi.fn().mockResolvedValue(undefined),
}));

interface MockSupabase {
  from: ReturnType<typeof vi.fn>;
}

const buildMessagesMock = (result: { data: unknown; error: unknown }) => ({
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue(result),
});

const buildThreadsMock = (sessionId: string | null = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({
    data: sessionId ? { session_id: sessionId } : null,
    error: null,
  }),
});

const buildSupabaseMock = (
  messageResult: { data: unknown; error: unknown } = { data: null, error: null },
  threadSessionId: string | null = null,
): MockSupabase => ({
  from: vi.fn().mockImplementation((table: string) =>
    table === 'messages'
      ? buildMessagesMock(messageResult)
      : buildThreadsMock(threadSessionId),
  ),
});

const fakeProfile = {
  id: 'profile-1',
  display_name: 'Test Player',
} as ProfileRow;

describe('ChatController.post', () => {
  let supabase: MockSupabase;
  let store: RootStore;
  let controller: ChatController;

  beforeEach(() => {
    supabase = buildSupabaseMock();
    store = new RootStore();
    runInAction(() => store.auth.setProfile(fakeProfile));
    controller = new ChatController({ supabase: supabase as unknown as AppSupabase, store });
  });

  it('rejects an empty message', async () => {
    const res = await controller.post('thread-1', '   ');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/empty/i);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it(`rejects a message exceeding ${CHAT_MESSAGE_MAX_CHARS} characters`, async () => {
    const longMessage = 'a'.repeat(CHAT_MESSAGE_MAX_CHARS + 1);
    const res = await controller.post('thread-1', longMessage);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(new RegExp(String(CHAT_MESSAGE_MAX_CHARS)));
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it(`accepts a message at exactly ${CHAT_MESSAGE_MAX_CHARS} characters`, async () => {
    const maxMessage = 'a'.repeat(CHAT_MESSAGE_MAX_CHARS);
    const fakeMessageRow = { id: 'msg-1', body: maxMessage, thread_id: 'thread-1' };
    supabase = buildSupabaseMock({ data: fakeMessageRow, error: null });
    controller = new ChatController({ supabase: supabase as unknown as AppSupabase, store });

    const res = await controller.post('thread-1', maxMessage);
    expect(res.ok).toBe(true);
  });

  it('fails without a signed-in profile', async () => {
    runInAction(() => store.auth.setProfile(null));
    const res = await controller.post('thread-1', 'hello');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/profile/i);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('surfaces a supabase insert error', async () => {
    supabase = buildSupabaseMock({ data: null, error: { message: 'db is angry' } });
    controller = new ChatController({ supabase: supabase as unknown as AppSupabase, store });

    const res = await controller.post('thread-1', 'hello');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('db is angry');
  });

  it('appends the new message to the store on success', async () => {
    const fakeMessageRow = {
      id: 'msg-1',
      body: 'hello',
      thread_id: 'thread-1',
      profile_id: 'profile-1',
    };
    supabase = buildSupabaseMock({ data: fakeMessageRow, error: null });
    controller = new ChatController({ supabase: supabase as unknown as AppSupabase, store });

    await controller.post('thread-1', 'hello');
    expect(store.chat.get('thread-1')).toHaveLength(1);
    expect(store.chat.get('thread-1')[0]?.id).toBe('msg-1');
  });
});
