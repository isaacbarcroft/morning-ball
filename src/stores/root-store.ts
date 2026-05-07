import { AuthStore } from './auth-store';
import { ProfileStore } from './profile-store';
import { SessionStore } from './session-store';
import { ChatStore } from './chat-store';

export class RootStore {
  auth: AuthStore;
  profiles: ProfileStore;
  sessions: SessionStore;
  chat: ChatStore;

  constructor() {
    this.auth = new AuthStore();
    this.profiles = new ProfileStore();
    this.sessions = new SessionStore();
    this.chat = new ChatStore();
  }

  reset(): void {
    this.auth.reset();
    this.profiles.clear();
    this.sessions.clear();
    this.chat.clear();
  }
}

let instance: RootStore | null = null;

export const getRootStore = (): RootStore => {
  if (instance === null) {
    instance = new RootStore();
  }
  return instance;
};

export const resetRootStoreForTests = (): void => {
  instance = null;
};
