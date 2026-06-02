export const APP_TIMEZONE = 'America/New_York' as const;
export const SESSION_DEFAULT_TIME = '06:00' as const;
export const GAME_DAYS = [1, 4] as const;
export const INVITE_CODE_LENGTH = 6 as const;

export const CHAT_MESSAGE_MAX_CHARS = 2000 as const;
export const CHAT_PUSH_PREVIEW_CHARS = 120 as const;

export const PROFILE_DISPLAY_NAME_MAX = 40 as const;
export const PROFILE_NICKNAME_MAX = 40 as const;
export const PROFILE_BIO_MAX = 200 as const;
export const PROFILE_JERSEY_MIN = 0 as const;
export const PROFILE_JERSEY_MAX = 99 as const;
export const PROFILE_HEIGHT_MIN_INCHES = 48 as const;
export const PROFILE_HEIGHT_MAX_INCHES = 90 as const;
export const PROFILE_SKILL_MIN = 1 as const;
export const PROFILE_SKILL_MAX = 5 as const;

export const AVATAR_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AvatarMimeType = (typeof AVATAR_ALLOWED_MIME_TYPES)[number];
