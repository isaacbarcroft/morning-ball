import { describe, it, expect } from 'vitest';
import { emptyStatLine, statLineEquals, type StatLine } from '@/lib/stat-line';

const full = (): StatLine => ({
  reb: 5,
  ast: 3,
  stl: 2,
  blk: 1,
  turnovers: 2,
  fgm: 8,
  fga: 16,
  threePm: 2,
  threePa: 5,
  ftm: 3,
  fta: 4,
});

describe('statLineEquals', () => {
  it('returns true for two identical lines', () => {
    expect(statLineEquals(full(), full())).toBe(true);
  });

  it('returns true for two empty lines', () => {
    expect(statLineEquals(emptyStatLine(), emptyStatLine())).toBe(true);
  });

  it('returns true comparing a line to itself', () => {
    const line = full();
    expect(statLineEquals(line, line)).toBe(true);
  });

  it('returns false when a single field differs', () => {
    const fields: (keyof StatLine)[] = [
      'reb', 'ast', 'stl', 'blk', 'turnovers',
      'fgm', 'fga', 'threePm', 'threePa', 'ftm', 'fta',
    ];
    for (const field of fields) {
      const a = full();
      const b = full();
      b[field] = b[field] + 1;
      expect(statLineEquals(a, b)).toBe(false);
    }
  });

  it('returns false when empty is compared to non-empty', () => {
    expect(statLineEquals(emptyStatLine(), full())).toBe(false);
    expect(statLineEquals(full(), emptyStatLine())).toBe(false);
  });

  it('treats zero-value line the same as emptyStatLine', () => {
    const explicit: StatLine = {
      reb: 0, ast: 0, stl: 0, blk: 0, turnovers: 0,
      fgm: 0, fga: 0, threePm: 0, threePa: 0, ftm: 0, fta: 0,
    };
    expect(statLineEquals(emptyStatLine(), explicit)).toBe(true);
  });
});
