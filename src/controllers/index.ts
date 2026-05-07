import { supabase } from '@/services/supabase';
import { getRootStore } from '@/stores/root-store';
import { AuthController } from './auth-controller';
import { InviteController } from './invite-controller';
import { ProfileController } from './profile-controller';
import { SessionController } from './session-controller';
import { RsvpController } from './rsvp-controller';
import { TeamController } from './team-controller';
import { StatsController } from './stats-controller';
import { ChatController } from './chat-controller';
import { NotificationController } from './notification-controller';
import { LeaderboardController } from './leaderboard-controller';
import { AdminController } from './admin-controller';

let cached: ControllerBundle | null = null;

export interface ControllerBundle {
  auth: AuthController;
  invite: InviteController;
  profile: ProfileController;
  session: SessionController;
  rsvp: RsvpController;
  team: TeamController;
  stats: StatsController;
  chat: ChatController;
  notification: NotificationController;
  leaderboard: LeaderboardController;
  admin: AdminController;
}

export const getControllers = (): ControllerBundle => {
  if (cached !== null) return cached;
  const store = getRootStore();
  const auth = new AuthController({ supabase, store });
  const invite = new InviteController({ supabase, store, authController: auth });
  const profile = new ProfileController({ supabase, store });
  const session = new SessionController({ supabase, store });
  const rsvp = new RsvpController({ supabase, store });
  const team = new TeamController({ supabase, store });
  const stats = new StatsController({ supabase, store });
  const chat = new ChatController({ supabase, store });
  const notification = new NotificationController({ supabase, store });
  const leaderboard = new LeaderboardController({ supabase });
  const admin = new AdminController({ supabase, store });
  cached = { auth, invite, profile, session, rsvp, team, stats, chat, notification, leaderboard, admin };
  return cached;
};

export const resetControllersForTests = (): void => {
  cached = null;
};
