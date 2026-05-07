import type { Database } from './database';

type Tables = Database['public']['Tables'];

export type ProfileRow = Tables['profiles']['Row'];
export type ProfileInsert = Tables['profiles']['Insert'];
export type ProfileUpdate = Tables['profiles']['Update'];

export type SessionRow = Tables['sessions']['Row'];
export type RsvpRow = Tables['rsvps']['Row'];
export type TeamRow = Tables['teams']['Row'];
export type TeamMemberRow = Tables['team_members']['Row'];
export type StatsRow = Tables['player_session_stats']['Row'];
export type ThreadRow = Tables['threads']['Row'];
export type MessageRow = Tables['messages']['Row'];
export type InviteCodeRow = Tables['invite_codes']['Row'];
export type NotificationPrefsRow = Tables['notification_preferences']['Row'];
export type AchievementRow = Tables['achievements']['Row'];

export type ProfileRole = ProfileRow['role'];
export type ProfileStatus = ProfileRow['status'];
export type SessionStatus = SessionRow['status'];
export type RsvpStatus = RsvpRow['status'];

export interface ControllerOk<T> {
  ok: true;
  data: T;
}

export interface ControllerErr {
  ok: false;
  error: string;
  code?: string;
}

export type ControllerResult<T> = ControllerOk<T> | ControllerErr;

export const ok = <T>(data: T): ControllerOk<T> => ({ ok: true, data });
export const fail = (error: string, code?: string): ControllerErr => {
  if (code === undefined) {
    return { ok: false, error };
  }
  return { ok: false, error, code };
};
