import { describe, expect, it } from 'vitest';
import { balanceTeams, type TeamBalancePlayer } from '@/lib/team-balance';

const player = (
  profileId: string,
  heightInches: number | null,
  skillRating: number | null,
  wins = 0,
  losses = 0,
): TeamBalancePlayer => ({
  profileId,
  heightInches,
  skillRating,
  wins,
  losses,
  gamesPlayed: wins + losses,
});

describe('balanceTeams', () => {
  it('splits even player counts evenly', () => {
    const teams = balanceTeams([
      player('a', 72, 4),
      player('b', 70, 3),
      player('c', 68, 3),
      player('d', 74, 4),
    ]);

    expect(teams.teamA).toHaveLength(2);
    expect(teams.teamB).toHaveLength(2);
  });

  it('keeps odd player counts within one player', () => {
    const teams = balanceTeams([
      player('a', 72, 4),
      player('b', 70, 3),
      player('c', 68, 3),
      player('d', 74, 4),
      player('e', 71, 2),
    ]);

    expect(Math.abs(teams.teamA.length - teams.teamB.length)).toBe(1);
  });

  it('does not stack the tallest players on one team', () => {
    const teams = balanceTeams([
      player('tall-1', 77, 3),
      player('tall-2', 77, 3),
      player('short-1', 70, 3),
      player('short-2', 70, 3),
    ]);

    const teamATallCount = teams.teamA.filter((profileId) => profileId.startsWith('tall')).length;
    const teamBTallCount = teams.teamB.filter((profileId) => profileId.startsWith('tall')).length;

    expect(teamATallCount).toBe(1);
    expect(teamBTallCount).toBe(1);
  });

  it('distributes top rated players', () => {
    const teams = balanceTeams([
      player('elite-1', 72, 5, 8, 2),
      player('elite-2', 73, 5, 8, 2),
      player('role-1', 70, 3, 4, 6),
      player('role-2', 70, 3, 4, 6),
    ]);

    const teamAEliteCount = teams.teamA.filter((profileId) =>
      profileId.startsWith('elite'),
    ).length;
    const teamBEliteCount = teams.teamB.filter((profileId) =>
      profileId.startsWith('elite'),
    ).length;

    expect(teamAEliteCount).toBe(1);
    expect(teamBEliteCount).toBe(1);
  });

  it('assigns players with missing specs', () => {
    const teams = balanceTeams([
      player('a', null, null),
      player('b', 71, 3),
      player('c', null, 4),
      player('d', 69, null),
    ]);

    expect([...teams.teamA, ...teams.teamB].sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});
