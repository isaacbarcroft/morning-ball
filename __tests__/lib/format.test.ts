import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatGameDate,
  formatGameDateLong,
  formatGameTime,
  formatHeight,
  formatPercent,
  formatStat,
  formatTimestampInTz,
  initials,
} from '@/lib/format';

// Pin system time to noon UTC 2026-05-08 (Friday) for all date-relative tests.
// Using noon UTC makes the calendar day unambiguous across UTC-offset environments
// following the same convention used in leaderboard-controller.test.ts.
const PINNED_NOW = new Date('2026-05-08T12:00:00Z');

describe('formatGameDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(PINNED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Today" for the current date', () => {
    expect(formatGameDate('2026-05-08')).toBe('Today');
  });

  it('returns "Tomorrow" for the next date', () => {
    expect(formatGameDate('2026-05-09')).toBe('Tomorrow');
  });

  it('formats future dates beyond tomorrow as abbreviated weekday and month', () => {
    expect(formatGameDate('2026-05-15')).toBe('Fri, May 15');
  });

  it('formats past dates as abbreviated weekday and month', () => {
    expect(formatGameDate('2026-04-01')).toBe('Wed, Apr 1');
  });
});

describe('formatGameDateLong', () => {
  it('formats a date as full weekday and full month', () => {
    expect(formatGameDateLong('2026-05-08')).toBe('Friday, May 8');
  });

  it('formats a January date correctly', () => {
    expect(formatGameDateLong('2026-01-01')).toBe('Thursday, January 1');
  });
});

describe('formatGameTime', () => {
  it('formats a morning time with AM', () => {
    expect(formatGameTime('07:00:00')).toBe('7:00 AM');
  });

  it('formats noon as 12:00 PM', () => {
    expect(formatGameTime('12:00:00')).toBe('12:00 PM');
  });

  it('formats an afternoon time with PM', () => {
    expect(formatGameTime('18:30:00')).toBe('6:30 PM');
  });

  it('formats midnight as 12:00 AM', () => {
    expect(formatGameTime('00:00:00')).toBe('12:00 AM');
  });

  it('includes minutes when non-zero', () => {
    expect(formatGameTime('06:15:00')).toBe('6:15 AM');
  });
});

describe('formatTimestampInTz', () => {
  it('formats an ISO timestamp using the app timezone with the default format', () => {
    // 2026-05-08T12:00:00Z = 8:00 AM EDT (America/New_York, UTC-4 in May)
    const result = formatTimestampInTz('2026-05-08T12:00:00Z');
    expect(result).toBe('Fri, May 8 · 8:00 AM');
  });

  it('accepts a custom format string', () => {
    const result = formatTimestampInTz('2026-05-08T12:00:00Z', 'yyyy-MM-dd');
    expect(result).toBe('2026-05-08');
  });

  it('applies the timezone offset, not local/UTC wall time', () => {
    // 23:00 UTC = 19:00 EDT (same day); would be 00:00 UTC+1, so next day in that tz.
    // In New York it stays May 8.
    const result = formatTimestampInTz('2026-05-08T23:00:00Z', 'yyyy-MM-dd HH:mm');
    expect(result).toBe('2026-05-08 19:00');
  });
});

describe('formatPercent', () => {
  it('returns an em dash for null', () => {
    expect(formatPercent(null)).toBe('—');
  });

  it('returns an em dash for undefined', () => {
    expect(formatPercent(undefined)).toBe('—');
  });

  it('formats to one decimal place with a % suffix', () => {
    expect(formatPercent(42.567)).toBe('42.6%');
    expect(formatPercent(100)).toBe('100.0%');
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('rounds correctly at the half-point', () => {
    expect(formatPercent(42.45)).toBe('42.5%');
  });
});

describe('formatStat', () => {
  it('returns an em dash for null', () => {
    expect(formatStat(null)).toBe('—');
  });

  it('returns an em dash for undefined', () => {
    expect(formatStat(undefined)).toBe('—');
  });

  it('formats to one decimal place', () => {
    expect(formatStat(12.3456)).toBe('12.3');
    expect(formatStat(0)).toBe('0.0');
    expect(formatStat(7)).toBe('7.0');
  });
});

describe('formatHeight', () => {
  it('returns an em dash for null', () => {
    expect(formatHeight(null)).toBe('—');
  });

  it('returns an em dash for undefined', () => {
    expect(formatHeight(undefined)).toBe('—');
  });

  it('converts whole-foot heights correctly', () => {
    expect(formatHeight(60)).toBe("5'0\"");
    expect(formatHeight(72)).toBe("6'0\"");
  });

  it('converts heights with remaining inches correctly', () => {
    expect(formatHeight(73)).toBe("6'1\"");
    expect(formatHeight(71)).toBe("5'11\"");
  });

  it('handles the minimum valid height (48 in = 4\'0")', () => {
    expect(formatHeight(48)).toBe("4'0\"");
  });
});

describe('initials', () => {
  it('returns first and last initials for a two-part name', () => {
    expect(initials('John Doe')).toBe('JD');
  });

  it('returns a single initial for a one-word name', () => {
    expect(initials('Madonna')).toBe('M');
  });

  it('uses first and last parts for names with more than two words', () => {
    expect(initials('Mary Jane Watson')).toBe('MW');
  });

  it('returns "?" for an empty string', () => {
    expect(initials('')).toBe('?');
  });

  it('returns "?" for a whitespace-only string', () => {
    expect(initials('   ')).toBe('?');
  });

  it('uppercases the result regardless of input case', () => {
    expect(initials('john doe')).toBe('JD');
  });

  it('handles extra internal whitespace between parts', () => {
    expect(initials('Alice   Smith')).toBe('AS');
  });
});
