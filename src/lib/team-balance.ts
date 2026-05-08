export interface TeamBalancePlayer {
  profileId: string;
  heightInches: number | null;
  skillRating: number | null;
  wins: number;
  losses: number;
  gamesPlayed: number;
}

export interface BalancedTeams {
  teamA: string[];
  teamB: string[];
}

interface BalanceMetrics {
  skill: number;
  height: number;
  knownHeights: number;
}

const DEFAULT_HEIGHT_INCHES = 70;
const DEFAULT_SKILL_RATING = 3;
const EXHAUSTIVE_LIMIT = 18;

const knownHeight = (player: TeamBalancePlayer): number => {
  if (player.heightInches === null) return DEFAULT_HEIGHT_INCHES;
  return player.heightInches;
};

const skillScore = (player: TeamBalancePlayer): number => {
  const rating = player.skillRating ?? DEFAULT_SKILL_RATING;
  const games = Math.max(player.gamesPlayed, player.wins + player.losses);
  if (games === 0) return rating * 10;
  const winPct = player.wins / games;
  return rating * 10 + winPct * 5;
};

const metricsFor = (players: readonly TeamBalancePlayer[]): BalanceMetrics => {
  return players.reduce<BalanceMetrics>(
    (acc, player) => ({
      skill: acc.skill + skillScore(player),
      height: acc.height + knownHeight(player),
      knownHeights: acc.knownHeights + (player.heightInches === null ? 0 : 1),
    }),
    { skill: 0, height: 0, knownHeights: 0 },
  );
};

const objective = (
  teamA: readonly TeamBalancePlayer[],
  teamB: readonly TeamBalancePlayer[],
): number => {
  const a = metricsFor(teamA);
  const b = metricsFor(teamB);
  const skillDiff = Math.abs(a.skill - b.skill);
  const heightDiff = Math.abs(a.height - b.height);
  const knownHeightDiff = Math.abs(a.knownHeights - b.knownHeights);
  return skillDiff * 100 + heightDiff * 8 + knownHeightDiff * 3;
};

const maskToTeams = (
  players: readonly TeamBalancePlayer[],
  mask: number,
): { teamA: TeamBalancePlayer[]; teamB: TeamBalancePlayer[] } => {
  const teamA: TeamBalancePlayer[] = [];
  const teamB: TeamBalancePlayer[] = [];
  players.forEach((player, index) => {
    if ((mask & (1 << index)) !== 0) {
      teamA.push(player);
      return;
    }
    teamB.push(player);
  });
  return { teamA, teamB };
};

const countBits = (value: number): number => {
  let count = 0;
  let next = value;
  while (next > 0) {
    count += next & 1;
    next >>= 1;
  }
  return count;
};

const exhaustiveBalance = (players: readonly TeamBalancePlayer[]): BalancedTeams => {
  const targetSize = Math.ceil(players.length / 2);
  const maxMask = 1 << players.length;
  let bestMask = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < maxMask; mask += 1) {
    if (countBits(mask) !== targetSize) continue;
    const teams = maskToTeams(players, mask);
    const score = objective(teams.teamA, teams.teamB);
    if (score >= bestScore) continue;
    bestMask = mask;
    bestScore = score;
  }

  const teams = maskToTeams(players, bestMask);
  return {
    teamA: teams.teamA.map((player) => player.profileId),
    teamB: teams.teamB.map((player) => player.profileId),
  };
};

const greedyBalance = (players: readonly TeamBalancePlayer[]): BalancedTeams => {
  const sorted = [...players].sort((a, b) => {
    const scoreDiff = skillScore(b) - skillScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    return knownHeight(b) - knownHeight(a);
  });
  const targetSize = Math.ceil(players.length / 2);
  const teamA: TeamBalancePlayer[] = [];
  const teamB: TeamBalancePlayer[] = [];

  for (const player of sorted) {
    if (teamA.length >= targetSize) {
      teamB.push(player);
      continue;
    }
    if (teamB.length >= players.length - targetSize) {
      teamA.push(player);
      continue;
    }

    const scoreIfA = objective([...teamA, player], teamB);
    const scoreIfB = objective(teamA, [...teamB, player]);
    if (scoreIfA <= scoreIfB) {
      teamA.push(player);
      continue;
    }
    teamB.push(player);
  }

  return {
    teamA: teamA.map((player) => player.profileId),
    teamB: teamB.map((player) => player.profileId),
  };
};

export const balanceTeams = (players: readonly TeamBalancePlayer[]): BalancedTeams => {
  if (players.length <= 1) {
    return { teamA: players.map((player) => player.profileId), teamB: [] };
  }
  if (players.length <= EXHAUSTIVE_LIMIT) return exhaustiveBalance(players);
  return greedyBalance(players);
};
