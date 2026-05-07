import { z } from 'zod';

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
  displayName: z.string().trim().min(1, 'Required').max(40),
  nickname: z.string().trim().max(40).optional(),
  jerseyNumber: z
    .number()
    .int()
    .min(0)
    .max(99)
    .optional(),
  bio: z.string().trim().max(200).optional(),
});

export type ProfileSetupInput = z.infer<typeof profileSetupSchema>;
