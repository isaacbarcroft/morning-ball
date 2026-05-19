import { z } from 'zod';
import {
  PROFILE_DISPLAY_NAME_MAX,
  PROFILE_NICKNAME_MAX,
  PROFILE_BIO_MAX,
  PROFILE_JERSEY_MIN,
  PROFILE_JERSEY_MAX,
  PROFILE_HEIGHT_MIN_INCHES,
  PROFILE_HEIGHT_MAX_INCHES,
  PROFILE_SKILL_MIN,
  PROFILE_SKILL_MAX,
} from '@/lib/constants';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address');

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Code must be 6 digits');

export const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,12}$/, 'Invite code must be 4-12 letters or digits');

export const profileSetupSchema = z.object({
  displayName: z.string().trim().min(1, 'Required').max(PROFILE_DISPLAY_NAME_MAX),
  nickname: z.string().trim().max(PROFILE_NICKNAME_MAX).optional(),
  jerseyNumber: z
    .number()
    .int()
    .min(PROFILE_JERSEY_MIN)
    .max(PROFILE_JERSEY_MAX)
    .optional(),
  heightInches: z
    .number()
    .int()
    .min(PROFILE_HEIGHT_MIN_INCHES)
    .max(PROFILE_HEIGHT_MAX_INCHES)
    .optional(),
  skillRating: z
    .number()
    .int()
    .min(PROFILE_SKILL_MIN)
    .max(PROFILE_SKILL_MAX)
    .optional(),
  bio: z.string().trim().max(PROFILE_BIO_MAX).optional(),
});

export type ProfileSetupInput = z.infer<typeof profileSetupSchema>;
