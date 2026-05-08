import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  otpCodeSchema,
  inviteCodeSchema,
  profileSetupSchema,
} from '@/lib/validation';

describe('emailSchema', () => {
  it('accepts a normal address', () => {
    expect(emailSchema.parse('player@example.com')).toBe('player@example.com');
  });

  it('trims and lowercases', () => {
    expect(emailSchema.parse('  Player@Example.COM  ')).toBe('player@example.com');
  });

  it('rejects bad addresses', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
    expect(emailSchema.safeParse('a@b').success).toBe(false);
  });
});

describe('otpCodeSchema', () => {
  it('accepts exactly 6 digits', () => {
    expect(otpCodeSchema.safeParse('123456').success).toBe(true);
  });

  it('rejects 5 digits', () => {
    expect(otpCodeSchema.safeParse('12345').success).toBe(false);
  });

  it('rejects letters', () => {
    expect(otpCodeSchema.safeParse('12345a').success).toBe(false);
  });
});

describe('inviteCodeSchema', () => {
  it('accepts and uppercases', () => {
    const out = inviteCodeSchema.parse('morning');
    expect(out).toBe('MORNING');
  });

  it('rejects too short', () => {
    expect(inviteCodeSchema.safeParse('ABC').success).toBe(false);
  });

  it('rejects punctuation', () => {
    expect(inviteCodeSchema.safeParse('CODE!!').success).toBe(false);
  });
});

describe('profileSetupSchema', () => {
  it('accepts a minimal profile', () => {
    const res = profileSetupSchema.parse({ displayName: 'Iz' });
    expect(res.displayName).toBe('Iz');
  });

  it('rejects empty display name', () => {
    expect(profileSetupSchema.safeParse({ displayName: '' }).success).toBe(false);
  });

  it('rejects out-of-range jersey number', () => {
    expect(
      profileSetupSchema.safeParse({ displayName: 'A', jerseyNumber: 100 }).success,
    ).toBe(false);
  });

  it('accepts optional player specs', () => {
    const res = profileSetupSchema.parse({
      displayName: 'A',
      heightInches: 77,
      skillRating: 4,
    });
    expect(res.heightInches).toBe(77);
    expect(res.skillRating).toBe(4);
  });

  it('rejects out-of-range player specs', () => {
    expect(
      profileSetupSchema.safeParse({ displayName: 'A', heightInches: 91 }).success,
    ).toBe(false);
    expect(
      profileSetupSchema.safeParse({ displayName: 'A', skillRating: 6 }).success,
    ).toBe(false);
  });

  it('rejects height below minimum', () => {
    expect(
      profileSetupSchema.safeParse({ displayName: 'A', heightInches: 47 }).success,
    ).toBe(false);
    expect(
      profileSetupSchema.safeParse({ displayName: 'A', heightInches: 0 }).success,
    ).toBe(false);
  });

  it('accepts height at exact boundaries', () => {
    expect(
      profileSetupSchema.safeParse({ displayName: 'A', heightInches: 48 }).success,
    ).toBe(true);
    expect(
      profileSetupSchema.safeParse({ displayName: 'A', heightInches: 90 }).success,
    ).toBe(true);
  });

  it('rejects skill rating below minimum', () => {
    expect(
      profileSetupSchema.safeParse({ displayName: 'A', skillRating: 0 }).success,
    ).toBe(false);
  });

  it('accepts skill rating at exact boundaries', () => {
    expect(
      profileSetupSchema.safeParse({ displayName: 'A', skillRating: 1 }).success,
    ).toBe(true);
    expect(
      profileSetupSchema.safeParse({ displayName: 'A', skillRating: 5 }).success,
    ).toBe(true);
  });

  it('rejects non-integer height', () => {
    expect(
      profileSetupSchema.safeParse({ displayName: 'A', heightInches: 70.5 }).success,
    ).toBe(false);
  });
});
