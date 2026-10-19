// Parses a GAA scoreline out of free-form tweet text.
// Reuses the same pattern proven in the production app: goals-points separated by
// either a hyphen ("1-14") or a colon ("1:14" — some handles, e.g. Carrigaline, use this),
// scoped so it doesn't collide with a kickoff time or elapsed-minute mention in the same tweet.
//
// Example matches:
//   "FT: Mayfield 1-14 Glen Rovers 0-9"        -> two scores found
//   "Carrigaline 2:11 Douglas 1:09 at full time" -> two scores found (colon variant)

export type ParsedScoreline = {
  team: string;
  goals: number;
  points: number;
};

const SCORE_PATTERN = /([A-Za-z][A-Za-z.'\s]{1,30}?)\s+(\d{1,2})[-:](\d{1,2})\b/g;

export function parseScorelines(tweetText: string): ParsedScoreline[] {
  const results: ParsedScoreline[] = [];
  let match: RegExpExecArray | null;

  SCORE_PATTERN.lastIndex = 0;
  while ((match = SCORE_PATTERN.exec(tweetText)) !== null) {
    const [, rawTeam, goalsStr, pointsStr] = match;
    const goals = parseInt(goalsStr, 10);
    const points = parseInt(pointsStr, 10);

    // Guard against false positives: a kickoff/elapsed-time mention like "15:00" or "60:00"
    // parses structurally the same as a scoreline, so reject anything that looks like a clock
    // (points >= 60, which is impossible in GAA scoring) or has no team name captured.
    const team = rawTeam.trim();
    if (!team || points >= 60) continue;

    results.push({ team, goals, points });
  }

  return results;
}

// Tries to match two parsed scorelines in one tweet against a known fixture by club name
// (case/whitespace-insensitive substring match, same tolerance the real ingestion uses).
export function matchesFixture(
  scorelines: ParsedScoreline[],
  homeClub: string,
  awayClub: string
): { home?: ParsedScoreline; away?: ParsedScoreline } {
  const norm = (s: string) => s.toLowerCase().trim();
  const home = scorelines.find((s) => norm(homeClub).includes(norm(s.team)) || norm(s.team).includes(norm(homeClub)));
  const away = scorelines.find((s) => norm(awayClub).includes(norm(s.team)) || norm(s.team).includes(norm(awayClub)));
  return { home, away };
}
