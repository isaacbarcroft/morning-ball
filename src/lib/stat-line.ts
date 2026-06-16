export interface StatLine {
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnovers: number;
  fgm: number;
  fga: number;
  threePm: number;
  threePa: number;
  ftm: number;
  fta: number;
}

export const emptyStatLine = (): StatLine => ({
  reb: 0,
  ast: 0,
  stl: 0,
  blk: 0,
  turnovers: 0,
  fgm: 0,
  fga: 0,
  threePm: 0,
  threePa: 0,
  ftm: 0,
  fta: 0,
});

export const statLineEquals = (a: StatLine, b: StatLine): boolean =>
  a.reb === b.reb &&
  a.ast === b.ast &&
  a.stl === b.stl &&
  a.blk === b.blk &&
  a.turnovers === b.turnovers &&
  a.fgm === b.fgm &&
  a.fga === b.fga &&
  a.threePm === b.threePm &&
  a.threePa === b.threePa &&
  a.ftm === b.ftm &&
  a.fta === b.fta;
