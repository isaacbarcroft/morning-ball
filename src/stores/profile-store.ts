import { makeAutoObservable } from 'mobx';
import type { ProfileRow } from '@/types/domain';

export class ProfileStore {
  byId: Map<string, ProfileRow> = new Map();

  constructor() {
    makeAutoObservable(this);
  }

  upsert(profile: ProfileRow): void {
    this.byId.set(profile.id, profile);
  }

  upsertMany(profiles: readonly ProfileRow[]): void {
    for (const p of profiles) {
      this.byId.set(p.id, p);
    }
  }

  get(id: string): ProfileRow | undefined {
    return this.byId.get(id);
  }

  clear(): void {
    this.byId.clear();
  }

  get all(): ProfileRow[] {
    return Array.from(this.byId.values());
  }
}
