import type { TeamRow } from '@/types/domain';

export const sortTeamsForRecap = (teams: readonly TeamRow[]): TeamRow[] =>
  [...teams].sort((a, b) => {
    if (a.is_winner !== b.is_winner) return a.is_winner ? -1 : 1;
    return a.team_label.localeCompare(b.team_label);
  });
