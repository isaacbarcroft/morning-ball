import { describe, expect, it } from 'vitest';
import { emptyStatLine, statLinesEqual } from '@/lib/stat-line';

describe('emptyStatLine', () => {
  it('returns an object with all fields set to zero', () => {
    const line = emptyStatLine();
    expect(Object.values(line).every((v) => v === 0)).toBe(true);
  });

  it('returns a fresh object on each call', () => {
    const a = emptyStatLine();
    const b = emptyStatLine();
    expect(a).not.toBe(b);
  });
});

describe('statLinesEqual', () => {
  it('returns true for two empty lines', () => {
    expect(statLinesEqual(emptyStatLine(), emptyStatLine())).toBe(true);
  });

  it('returns true for identical non-zero lines', () => {
    const line = { reb: 5, ast: 3, stl: 2, blk: 1, turnovers: 2, fgm: 8, fga: 14, threePm: 3, threePa: 7, ftm: 4, fta: 5 };
    expect(statLinesEqual(line, { ...line })).toBe(true);
  });

  it('returns false when a single field differs', () => {
    const a = emptyStatLine();
    const b = { ...emptyStatLine(), reb: 1 };
    expect(statLinesEqual(a, b)).toBe(false);
  });

  it('detects a difference in each field', () => {
    const fields = ['reb', 'ast', 'stl', 'blk', 'turnovers', 'fgm', 'fga', 'threePm', 'threePa', 'ftm', 'fta'] as const;
    for (const field of fields) {
      const a = emptyStatLine();
      const b = { ...emptyStatLine(), [field]: 1 };
      expect(statLinesEqual(a, b)).toBe(false);
    }
  });

  it('is symmetric', () => {
    const a = { ...emptyStatLine(), reb: 4, ast: 2 };
    const b = { ...emptyStatLine(), reb: 4, ast: 3 };
    expect(statLinesEqual(a, b)).toBe(statLinesEqual(b, a));
  });
});
