import { describe, it, expect } from 'vitest';
import { sortTeamsForRecap } from '@/lib/team-display';
import type { TeamRow } from '@/types/domain';

const team = (overrides: Partial<TeamRow> & Pick<TeamRow, 'id' | 'team_label'>): TeamRow => ({
  session_id: 'sess-1',
  color: '#000000',
  final_score: null,
  is_winner: false,
  created_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('sortTeamsForRecap', () => {
  it('puts the winner first', () => {
    const result = sortTeamsForRecap([
      team({ id: 'b', team_label: 'B', is_winner: false, final_score: 48 }),
      team({ id: 'a', team_label: 'A', is_winner: true, final_score: 52 }),
    ]);
    expect(result.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('falls back to label sort when neither is winner', () => {
    const result = sortTeamsForRecap([
      team({ id: 'b', team_label: 'B', is_winner: false }),
      team({ id: 'a', team_label: 'A', is_winner: false }),
    ]);
    expect(result.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('does not mutate input', () => {
    const input: TeamRow[] = [
      team({ id: 'b', team_label: 'B', is_winner: false }),
      team({ id: 'a', team_label: 'A', is_winner: true }),
    ];
    const before = input.map((t) => t.id);
    sortTeamsForRecap(input);
    expect(input.map((t) => t.id)).toEqual(before);
  });
});
