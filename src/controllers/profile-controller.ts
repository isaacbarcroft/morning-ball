import { runInAction } from 'mobx';
import * as FileSystem from 'expo-file-system/legacy';
import type { AppSupabase } from '@/services/supabase';
import { logger } from '@/services/logger';
import type { RootStore } from '@/stores/root-store';
import { fail, ok, type ControllerResult, type ProfileRow } from '@/types/domain';
import { profileSetupSchema, type ProfileSetupInput } from '@/lib/validation';

interface ProfileControllerDeps {
  supabase: AppSupabase;
  store: RootStore;
}

interface AvatarUploadInput {
  uri: string;
  contentType: string;
  extension: string;
}

export class ProfileController {
  private supabase: AppSupabase;
  private store: RootStore;

  constructor(deps: ProfileControllerDeps) {
    this.supabase = deps.supabase;
    this.store = deps.store;
  }

  async listAll(): Promise<ControllerResult<ProfileRow[]>> {
    const { data, error } = await this.supabase.from('profiles').select('*');
    if (error) {
      logger.warn('profiles listAll failed', { error: error.message });
      return fail(error.message);
    }
    runInAction(() => this.store.profiles.upsertMany(data ?? []));
    return ok(data ?? []);
  }

  async updateOwn(input: ProfileSetupInput): Promise<ControllerResult<true>> {
    const parsed = profileSetupSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid profile data');
    }
    const profile = this.store.auth.profile;
    if (!profile) return fail('No profile loaded');

    const update = {
      display_name: parsed.data.displayName,
      nickname: parsed.data.nickname ?? null,
      jersey_number: parsed.data.jerseyNumber ?? null,
      height_inches: parsed.data.heightInches ?? null,
      skill_rating: parsed.data.skillRating ?? null,
      bio: parsed.data.bio ?? null,
    };

    const { data, error } = await this.supabase
      .from('profiles')
      .update(update)
      .eq('id', profile.id)
      .select()
      .single();
    if (error || !data) {
      logger.warn('profile update failed', { error: error?.message });
      return fail(error?.message ?? 'Update failed');
    }
    runInAction(() => {
      this.store.auth.setProfile(data);
      this.store.profiles.upsert(data);
    });
    return ok(true);
  }

  async uploadAvatar(input: AvatarUploadInput): Promise<ControllerResult<{ url: string }>> {
    const session = this.store.auth.session;
    const profile = this.store.auth.profile;
    if (!session || !profile) return fail('Not authenticated');

    const filename = `avatar-${Date.now()}.${input.extension}`;
    const path = `${session.user.id}/${filename}`;

    const base64 = await FileSystem.readAsStringAsync(input.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const { error: uploadError } = await this.supabase.storage
      .from('avatars')
      .upload(path, bytes, { contentType: input.contentType, upsert: true });
    if (uploadError) {
      logger.warn('avatar upload failed', { error: uploadError.message });
      return fail(uploadError.message, 'upload_failed');
    }

    const { data } = this.supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = data.publicUrl;

    const { error: updateError } = await this.supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', profile.id);
    if (updateError) {
      logger.warn('profile avatar_url save failed', { error: updateError.message });
      return fail(updateError.message);
    }

    runInAction(() => {
      const next = { ...profile, avatar_url: publicUrl };
      this.store.auth.setProfile(next);
      this.store.profiles.upsert(next);
    });

    return ok({ url: publicUrl });
  }
}
