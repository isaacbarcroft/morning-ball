import { makeAutoObservable } from 'mobx';
import type { MessageRow } from '@/types/domain';

export class ChatStore {
  messagesByThread: Map<string, MessageRow[]> = new Map();

  constructor() {
    makeAutoObservable(this);
  }

  setMessages(threadId: string, messages: readonly MessageRow[]): void {
    const sorted = [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at));
    this.messagesByThread.set(threadId, sorted);
  }

  appendMessage(threadId: string, message: MessageRow): void {
    const list = this.messagesByThread.get(threadId) ?? [];
    if (list.some((m) => m.id === message.id)) return;
    this.messagesByThread.set(threadId, [...list, message]);
  }

  removeMessage(threadId: string, messageId: string): void {
    const list = this.messagesByThread.get(threadId);
    if (!list) return;
    this.messagesByThread.set(
      threadId,
      list.filter((m) => m.id !== messageId),
    );
  }

  get(threadId: string): MessageRow[] {
    return this.messagesByThread.get(threadId) ?? [];
  }

  clear(): void {
    this.messagesByThread.clear();
  }
}
