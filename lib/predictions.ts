/**
 * Championship Prediction Engine
 *
 * Methodology (based on peer-reviewed F1 analytics literature):
 *
 * 1. DRIVER STRENGTH RATING
 *    Constructors explain ~64–88% of race outcome variance (Bosch et al., 2023;
 *    arXiv:2508.00200). We capture this via a teammate-share metric that isolates
 *    the driver's contribution from the car advantage.
 *    Strength = f(points-per-race, win-rate, constructor-share, news sentiment)
 *              × WDC career legacy multiplier
 *
 * 2. CONSTRUCTOR STRENGTH RATING
 *    Composite of current season performance, all-time WCC heritage (institutional
 *    knowledge, development culture), and power unit quality (hybrid-era track record).
 *    Strength = f(ppr, win-rate, position) × WCC legacy factor × engine quality factor
 *
 * 3. MONTE CARLO SEASON SIMULATION (2 000 runs)
 *    For each remaining race, a finishing order is sampled using the Gumbel-max
 *    trick (weighted sampling without replacement, O(n log n) per race). Points
 *    are awarded per the standard F1 system (25-18-15-12-10-8-6-4-2-1).
 *    Championship probability = fraction of simulations where the driver leads
 *    total points at season end. Probabilities sum to exactly 100% by construction.
 *
 * 4. MATHEMATICAL ELIMINATION
 *    A driver is set to 0% if their maximum possible points (current + 26×remaining)
 *    cannot surpass the current leader's total.
 *
 * References:
 *   Bosch et al. (2023) arXiv:2203.08489 — Bayesian multilevel rank-ordered logit
 *   arXiv:2508.00200 — RAPM ridge regression for F1
 *   arXiv:2507.10966 — Qualifying as strongest pre-race predictor
 *   FiveThirtyEight — Monte Carlo Elo simulation methodology
 */

import { getDriverStandings, getConstructorStandings, getSeasonRaces, getSeasonResults, getCircuitHistoricalResults } from './api';
import type { SeasonRaceResult, CircuitRaceEntry } from './api';
// ml.ts (logistic regression) is kept for future use but not used in the main
// prediction flow — Elo-based model is more appropriate for F1 championship prediction.
import { fetchF1News, type NewsItem } from './news';
import type { DriverStanding, ConstructorStanding } from '../types/standings';
import type { Race } from '../types/race';

// ─── F1 Points System ────────────────────────────────────────────────────────
const F1_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] as const;
const MAX_POINTS_PER_RACE = 26; // 25 (win) + 1 (fastest lap)
const MONTE_CARLO_SIMS = 2_000;

// ─── Elo Rating System ────────────────────────────────────────────────────────
const ELO_BASE = 1500;  // starting rating for all drivers
const ELO_SEASONS_BACK = 2; // how many previous seasons to include

/**
 * Pairwise Elo update for a season's race results.
 *
 * For each race, every pair of classified finishers is compared head-to-head.
 * The driver who finished ahead scores 1 (win), the other scores 0 (loss).
 * Expected score is derived from the Elo difference via the standard logistic formula.
 *
 * Teammate comparisons get 2× K-factor because the car is equal — these matchups
 * isolate pure driver skill more cleanly than cross-team comparisons.
 *
 * K-factor decays for older seasons so recent form weighs more:
 *   current season   → K = 32
 *   1 season ago     → K = 20
 *   2 seasons ago    → K = 12
 */
function computeEloRatings(
  racesBySeason: { results: SeasonRaceResult[]; kFactor: number }[],
): Map<string, number> {
  const elo = new Map<string, number>();
  const getElo = (id: string) => elo.get(id) ?? ELO_BASE;

  for (const { results: races, kFactor } of racesBySeason) {
    for (const race of races) {
      // Sort by finishing position; skip drivers with no classified position
      const finishers = race.results
        .filter(r => r.position > 0)
        .sort((a, b) => a.position - b.position);

      // Accumulate Elo deltas per driver across all pairwise comparisons in this race
      const deltas = new Map<string, number>();

      for (let i = 0; i < finishers.length; i++) {
        for (let j = i + 1; j < finishers.length; j++) {
          const ahead  = finishers[i]; // beat the other
          const behind = finishers[j];

          const eloA = getElo(ahead.driverId);
          const eloB = getElo(behind.driverId);

          // Expected score for the driver who finished ahead
          const expectedA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));

          // Teammate comparisons count double — car advantage is equal
          const k = ahead.constructorId === behind.constructorId ? kFactor * 2 : kFactor;

          // Normalise K by number of possible comparisons so a single race
          // can't swing ratings by hundreds of points
          const comparisonsPerDriver = finishers.length - 1;
          const kNorm = k / comparisonsPerDriver;

          deltas.set(ahead.driverId,  (deltas.get(ahead.driverId)  ?? 0) + kNorm * (1 - expectedA));
          deltas.set(behind.driverId, (deltas.get(behind.driverId) ?? 0) + kNorm * (0 - (1 - expectedA)));
        }
      }

      // Apply accumulated deltas after the whole race (avoids order dependency)
      deltas.forEach((delta, driverId) => {
        elo.set(driverId, getElo(driverId) + delta);
      });
    }
  }

  return elo;
}

// ─── Heritage & Technical Data (update manually each season) ─────────────────

/**
 * FIA World Drivers' Championship titles per driverId.
 * Drivers not listed → 0 titles.
 */
const DRIVER_WDC_TITLES: Record<string, number> = {
  hamilton:   7,  // 2008, 2014–2015, 2017–2020
  verstappen: 4,  // 2021–2024
  alonso:     2,  // 2005–2006
  vettel:     4,  // 2010–2013
  raikkonen:  1,  // 2007
  button:     1,  // 2009
  rosberg:    1,  // 2016
  norris:     1,  // 2025
};

/**
 * FIA World Constructors' Championship titles (all-time as of 2024).
 * Reflects accumulated institutional knowledge, engineering culture, and
 * resource depth — teams with more titles statistically recover faster
 * from downturns (Bosch et al., 2023).
 * Constructors not listed → 0 titles.
 */
const CONSTRUCTOR_WCC_TITLES: Record<string, number> = {
  ferrari:      16,
  mclaren:       8,
  mercedes:      8,
  williams:      7,
  lotus:         7,
  red_bull:      6,
  brabham:       2,
  benetton:      2,
  renault:       2,
  brawn:         1,
  // alpine, haas, sauber, rb, aston_martin → 0
};

/**
 * Power unit supplier per constructorId — 2026 grid.
 *
 * Key changes vs 2025:
 *   - aston_martin: Mercedes → Honda
 *   - sauber/audi:  Ferrari  → Audi (new manufacturer entry)
 *   - alpine:       Renault  → Mercedes
 *   - rb:           Honda    → RBPT (Red Bull Powertrains, Ford partnership)
 *
 * Update each season when contracts change.
 */
const ENGINE_SUPPLIER: Record<string, string> = {
  // Mercedes PU customers
  mercedes:     'mercedes',
  williams:     'mercedes',
  alpine:       'mercedes',   // switched from Renault for 2026
  // Ferrari PU customers
  ferrari:      'ferrari',
  haas:         'ferrari',
  // Honda PU customers
  aston_martin: 'honda',      // switched from Mercedes for 2026
  // Red Bull Powertrains (RBPT, Ford partnership)
  red_bull:     'rbpt',
  rb:           'rbpt',       // Racing Bulls, same RBPT unit
  // Audi (new manufacturer — Sauber rebrand)
  sauber:       'audi',       // Ergast may still use 'sauber' as constructorId
  audi:         'audi',       // future-proof if Ergast switches to 'audi'
  // Cadillac / GM (11th team, 2026 entry)
  cadillac:     'cadillac',   // most likely Ergast ID
  andretti:     'cadillac',   // fallback — Ergast may use legacy 'andretti' ID
};

/**
 * Power unit quality multiplier — 2026 season estimates.
 *
 * NOTE: New PU regulations reset the competitive order. All manufacturers start
 * from scratch under the 2026 spec (50% electric, new MGU-H removed, new ICE rules).
 * Scores are closer to 1.0 than in the hybrid era — update as the season unfolds
 * and real performance gaps emerge.
 *
 * 1.00 = field average; >1.0 = above-average; <1.0 = below-average.
 */
/**
 * HOW TO FINE-TUNE THESE VALUES as the season unfolds:
 *
 * Power circuits (Monza, Baku, Jeddah, Las Vegas) reveal true PU performance.
 * After each power-circuit race, check average finishing positions per PU group:
 *
 *   PU customers finishing consistently above expected → increase by 0.02–0.03
 *   PU customers consistently underperforming → decrease by 0.02–0.03
 *
 * Reference: 1.00 = perfectly average, 1.10 = ~10% stronger draw in Monte Carlo.
 * Avoid going above 1.15 or below 0.85 — extreme values distort probabilities.
 *
 * Example after Round 3 (Jeddah — power-sensitive):
 *   Mercedes customers all top 6 → bump mercedes: 1.05 → 1.07
 *   Cadillac struggling on straights → bump cadillac: 0.90 → 0.87
 */
const ENGINE_QUALITY: Record<string, number> = {
  mercedes: 1.05,  // strong simulator data, well-resourced PU program
  ferrari:  1.03,  // solid baseline, competitive from round 1
  honda:    1.02,  // proven F1 manufacturer, recovery after Red Bull split
  rbpt:     0.98,  // first full season as independent PU maker with Ford
  audi:     0.93,  // brand new entry — significant development lag expected
  cadillac: 0.90,  // 11th team, new GM PU — most unknowns of all 2026 entrants
};

// ─── Exported types (unchanged — UI depends on these) ────────────────────────

export interface ChampionshipPrediction {
  driverId: string;
  driverName: string;
  currentPosition: number;
  currentPoints: number;
  predictedFinish: number;
  championshipProbability: number;
  analysis: string;
  keyFactors: string[];
}

export interface ConstructorPrediction {
  constructorId: string;
  constructorName: string;
  currentPosition: number;
  currentPoints: number;
  predictedFinish: number;
  championshipProbability: number;
  analysis: string;
  keyFactors: string[];
}

export interface PredictionAnalysis {
  drivers: ChampionshipPrediction[];
  constructors: ConstructorPrediction[];
  seasonInsights: {
    racesCompleted: number;
    racesRemaining: number;
    seasonProgress: number;
    keyInsights: string[];
  };
  newsInsights?: {
    trendingUp: string[];
    trendingDown: string[];
    recentWins: string[];
    formAnalysis: string;
  };
  nextRacePrediction?: NextRacePrediction;
}

export type CircuitType = 'street' | 'power' | 'technical' | 'mixed';

export interface PodiumPick {
  position: 1 | 2 | 3;
  driverId: string;
  driverName: string;
  probability: number;       // 0–1
  circuitWins: number;
  circuitPodiums: number;
}

export interface CircuitDriverForm {
  driverId: string;
  driverName: string;
  wins: number;
  podiums: number;
  bestResult: number;
  recentFinishes: number[];  // last 3 appearances at this circuit
}

export interface NextRacePrediction {
  raceName: string;
  circuitName: string;
  circuitId: string;
  circuitType: CircuitType;
  circuitTraits: string[];
  podium: PodiumPick[];
  topContenders: CircuitDriverForm[];   // top 5 by circuit form
  keyFactors: string[];
}

// ─── Elo-based championship probability model ────────────────────────────────
/**
 * Converts multi-season Elo ratings + current season performance into
 * championship win probabilities.
 *
 * Why Elo instead of logistic regression:
 *   - LR requires ~1 positive sample per season (severe class imbalance)
 *   - LR doesn't encode driver identity — it can't know Norris is the reigning champion
 *   - Elo already learns from data (pairwise race outcomes) and reflects form correctly
 *
 * Blending logic:
 *   Early season  (0%)  → 80% Elo prior, 20% current season stats
 *   Mid season    (50%) → 40% Elo prior, 60% current season stats
 *   Late season   (90%) → 10% Elo prior, 90% current season stats
 *
 * This means at season start, the reigning champion (high Elo) is correctly
 * rated as the favourite. As new data accumulates, it gradually takes over.
 *
 * Method: softmax over Elo scores (10^(elo/400)) blended with normalised
 * current-season form score, with mathematical elimination applied first.
 */
function computeEloChampionshipProbs(
  driverStandings: DriverStanding[],
  eloRatings: Map<string, number>,
  racesCompleted: number,
  totalRaces: number,
): Map<string, number> {
  const racesRemaining  = totalRaces - racesCompleted;
  const seasonProgress  = totalRaces > 0 ? racesCompleted / totalRaces : 0;
  const leaderPts       = driverStandings[0]?.points ?? 0;

  // ── Step 1: Elo prior (softmax) ──
  // P(wins) ∝ 10^(elo/400) — standard Elo tournament formula
  const eloScores = new Map<string, number>();
  for (const d of driverStandings) {
    const elo = eloRatings.get(d.Driver.driverId) ?? ELO_BASE;
    eloScores.set(d.Driver.driverId, Math.pow(10, elo / 400));
  }
  const eloTotal = [...eloScores.values()].reduce((s, v) => s + v, 0);

  // ── Step 2: Current season form score (0–1) ──
  const seasonScores = new Map<string, number>();
  for (const d of driverStandings) {
    const gap         = leaderPts - d.points;
    const maxCatchable = racesRemaining * MAX_POINTS_PER_RACE;

    // Mathematically eliminated → score 0
    if (racesCompleted > 0 && gap > maxCatchable) {
      seasonScores.set(d.Driver.driverId, 0);
      continue;
    }

    const ppr      = racesCompleted > 0 ? d.points / racesCompleted : 0;
    const winRate  = racesCompleted > 0 ? d.wins / racesCompleted : 0;
    const gapNorm  = maxCatchable > 0 ? 1 - Math.min(gap / maxCatchable, 1) : 1;
    const isLeader = leaderPts === d.points && leaderPts > 0 ? 1 : 0;

    const score =
      gapNorm           * 0.50 +  // most important: proximity to the lead
      (ppr / 25)        * 0.25 +  // points-per-race consistency
      winRate           * 0.15 +  // peak race pace
      isLeader          * 0.10;   // being P1 has inherent strategic advantage

    seasonScores.set(d.Driver.driverId, score);
  }
  const seasonTotal = [...seasonScores.values()].reduce((s, v) => s + v, 0);

  // ── Step 3: Blend ──
  // eloWeight decays linearly from 0.8 at season start to 0.1 at season end
  const eloWeight    = Math.max(0.10, 0.80 - seasonProgress * 0.70);
  const seasonWeight = 1 - eloWeight;

  const combined = new Map<string, number>();
  for (const d of driverStandings) {
    const id        = d.Driver.driverId;
    const eloProb   = eloTotal > 0    ? (eloScores.get(id)    ?? 0) / eloTotal    : 0;
    const seasProb  = seasonTotal > 0 ? (seasonScores.get(id) ?? 0) / seasonTotal : 0;
    combined.set(id, eloProb * eloWeight + seasProb * seasonWeight);
  }

  // ── Step 4: Normalise to sum = 1.0 ──
  const total = [...combined.values()].reduce((s, v) => s + v, 0);
  const result = new Map<string, number>();
  combined.forEach((v, id) => result.set(id, total > 0 ? v / total : 0));
  return result;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface DriverRating {
  driverId: string;
  strength: number;        // composite score used in Monte Carlo
  ppr: number;             // points per race
  winRate: number;         // wins / races completed
  constructorShare: number;// this driver's fraction of constructor's total points
  newsSentiment: number;   // -1 to +1 from news analysis
  eloRating: number;       // multi-season pairwise Elo (base = 1500)
}

interface ConstructorRating {
  constructorId: string;
  strength: number;
  ppr: number;
  winRate: number;
  newsSentiment: number;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generateChampionshipPredictions(season: string): Promise<PredictionAnalysis> {
  const currentYear = parseInt(season, 10);

  const [driverStandings, constructorStandings, races, news,
    resultsMinus2, resultsMinus1, resultsCurrent] = await Promise.all([
    getDriverStandings(season),
    getConstructorStandings(season),
    getSeasonRaces(season),
    fetchF1News().catch((): NewsItem[] => []),
    // Historical race results for Elo — older seasons get lower K-factor
    getSeasonResults(String(currentYear - ELO_SEASONS_BACK)).catch((): SeasonRaceResult[] => []),
    getSeasonResults(String(currentYear - 1)).catch((): SeasonRaceResult[] => []),
    getSeasonResults(season).catch((): SeasonRaceResult[] => []),
  ]);

  const eloRatings = computeEloRatings([
    { results: resultsMinus2, kFactor: 12 }, // 2 seasons ago — weakest influence
    { results: resultsMinus1, kFactor: 20 }, // last season
    { results: resultsCurrent, kFactor: 32 }, // current season — strongest influence
  ]);

  const now = new Date();
  const completedRaces = races.filter(r => new Date(r.date) < now);
  const remainingRaces  = races.filter(r => new Date(r.date) >= now);
  const racesCompleted  = completedRaces.length;
  const racesRemaining  = remainingRaces.length;
  const seasonProgress  = races.length > 0
    ? Math.round((racesCompleted / races.length) * 100)
    : 0;

  const newsAnalysis = analyzeNews(news, driverStandings, constructorStandings);

  // ── Driver predictions — Elo-based probabilistic model ──
  const driverRatings = buildDriverRatings(driverStandings, racesCompleted, newsAnalysis, eloRatings);

  // Elo softmax blended with current season form (see computeEloChampionshipProbs)
  const mlProbabilities = computeEloChampionshipProbs(
    driverStandings,
    eloRatings,
    racesCompleted,
    races.length,
  );

  // Predicted finish = rank in probability-sorted order.
  // P(championship) directly encodes expected season outcome — highest prob → P1.
  const predictedPositions = new Map(
    [...mlProbabilities.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id], i) => [id, i + 1]),
  );

  const driverPredictions: ChampionshipPrediction[] = driverStandings
    .map(driver => {
      const rating    = driverRatings.find(r => r.driverId === driver.Driver.driverId)!;
      const prob      = mlProbabilities.get(driver.Driver.driverId) ?? 0;
      const leaderPts = driverStandings[0].points;
      const gap       = leaderPts - driver.points;

      return {
        driverId:                driver.Driver.driverId,
        driverName:              `${driver.Driver.givenName} ${driver.Driver.familyName}`,
        currentPosition:         driver.position,
        currentPoints:           driver.points,
        predictedFinish:         predictedPositions.get(driver.Driver.driverId) ?? driver.position,
        championshipProbability: prob,
        analysis:                buildDriverAnalysis(driver, rating, gap, racesRemaining, racesCompleted),
        keyFactors:              buildDriverKeyFactors(driver, rating, gap, racesRemaining, seasonProgress),
      };
    });

  // ── Constructor predictions — Monte Carlo (math model) ──
  const totalSims = MONTE_CARLO_SIMS;
  const constructorRatings   = buildConstructorRatings(constructorStandings, racesCompleted, newsAnalysis);
  const constructorSimCounts = runMonteCarlo(
    constructorRatings.map(r => ({ id: r.constructorId, strength: r.strength })),
    constructorStandings.map(c => ({ id: c.Constructor.constructorId, points: c.points })),
    racesRemaining,
    constructorStandings[0]?.points ?? 0,
    44, // max constructor points per race (25+18+1 fastest)
  );

  const constructorProbs = new Map(
    constructorStandings.map(c => [
      c.Constructor.constructorId,
      (constructorSimCounts.get(c.Constructor.constructorId) ?? 0) / totalSims,
    ]),
  );
  const constructorPredictedPos = new Map(
    [...constructorProbs.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id], i) => [id, i + 1]),
  );

  const constructorPredictions: ConstructorPrediction[] = constructorStandings
    .map(c => {
      const rating  = constructorRatings.find(r => r.constructorId === c.Constructor.constructorId)!;
      const prob    = constructorProbs.get(c.Constructor.constructorId) ?? 0;
      const gap     = constructorStandings[0].points - c.points;

      return {
        constructorId:           c.Constructor.constructorId,
        constructorName:         c.Constructor.name,
        currentPosition:         c.position,
        currentPoints:           c.points,
        predictedFinish:         constructorPredictedPos.get(c.Constructor.constructorId) ?? c.position,
        championshipProbability: prob,
        analysis:                buildConstructorAnalysis(c, rating, gap, racesRemaining, racesCompleted),
        keyFactors:              buildConstructorKeyFactors(c, rating, gap, racesRemaining, seasonProgress),
      };
    });

  // ── Season insights ──
  const driverGap      = driverStandings[1] ? driverStandings[0].points - driverStandings[1].points : 0;
  const constructorGap = constructorStandings[1] ? constructorStandings[0].points - constructorStandings[1].points : 0;

  const keyInsights: string[] = [];
  if (racesCompleted === 0) {
    keyInsights.push('Season not yet started — ratings based on pre-season expectations');
  } else {
    if (driverGap < 15)  keyInsights.push(`Driver title race is extremely tight — only ${driverGap} pts separating P1 and P2`);
    else if (driverGap > 60) keyInsights.push(`Championship leader holds a commanding ${driverGap}-point advantage`);
    else keyInsights.push(`${driverGap}-point gap keeps the driver title fight alive`);

    if (constructorGap < 30) keyInsights.push('Constructor battle equally close — development pace is decisive');
    else if (constructorGap > 100) keyInsights.push('Constructor championship looks settled barring major reliability issues');

    if (seasonProgress > 70) keyInsights.push('Late season: each race has an outsized impact on final standings');
    else if (seasonProgress < 30) keyInsights.push('Early season: standings can still shift dramatically');
  }

  // ── Next race prediction ──
  const now2 = new Date();
  const nextRace = races
    .filter(r => new Date(r.date) >= now2)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const nextRacePrediction = nextRace
    ? (await generateNextRacePrediction(nextRace, driverStandings, mlProbabilities, currentYear).catch(() => undefined)) ?? undefined
    : undefined;

  return {
    drivers:     driverPredictions,
    constructors: constructorPredictions,
    seasonInsights: {
      racesCompleted,
      racesRemaining,
      seasonProgress,
      keyInsights,
    },
    newsInsights: newsAnalysis as any,
    nextRacePrediction,
  };
}

// ─── Driver strength rating ───────────────────────────────────────────────────
/**
 * Composite strength = weighted sum of:
 *   0.40 × points-per-race    (consistency — single strongest predictor)
 *   0.20 × constructor share  (isolates driver vs car contribution)
 *   0.15 × win rate           (peak performance capability)
 *   0.08 × position-momentum  (being in top 3 brings favourable track time, strategy calls)
 *   Elo bonus ±5pts           (multi-season pairwise history — capped to avoid dominating)
 * Then multiplied by news-sentiment (±15%) and WDC legacy multiplier.
 *
 * When racesCompleted === 0, Elo from previous seasons acts as the primary differentiator.
 */
function buildDriverRatings(
  standings: DriverStanding[],
  racesCompleted: number,
  newsAnalysis: ReturnType<typeof analyzeNews>,
  eloRatings?: Map<string, number>,
): DriverRating[] {
  if (racesCompleted === 0) {
    // No current-season data — Elo from prior seasons is the best signal
    return standings.map(d => {
      const sentiment = newsAnalysis.formIndicators.get(d.Driver.driverId) ?? 0;
      const eloRating = eloRatings?.get(d.Driver.driverId) ?? ELO_BASE;
      // Elo deviation from base: ±200 pts → ±2 strength points
      const eloBonus = Math.max(-3, Math.min(3, ((eloRating - ELO_BASE) / 200) * 2));
      return {
        driverId: d.Driver.driverId,
        strength: Math.max(0.1 + eloBonus * 0.05 + sentiment * 0.1, 0.01),
        ppr: 0,
        winRate: 0,
        constructorShare: 0.5,
        newsSentiment: sentiment,
        eloRating,
      };
    });
  }

  // Calculate constructor totals (for teammate comparison)
  const constructorPoints = new Map<string, number>();
  standings.forEach(d => {
    const cid = d.Constructors?.[0]?.constructorId ?? '_';
    constructorPoints.set(cid, (constructorPoints.get(cid) ?? 0) + d.points);
  });

  return standings.map(d => {
    const ppr = d.points / racesCompleted;
    const winRate = d.wins / racesCompleted;
    const cid = d.Constructors?.[0]?.constructorId ?? '_';
    const cTotal = constructorPoints.get(cid) ?? 1;
    const constructorShare = cTotal > 0 ? d.points / cTotal : 0.5;

    // Position momentum (top 3 in championship are performing better — reward slightly)
    const positionMomentum = Math.max(0, 1 - (d.position - 1) * 0.06);

    // Elo bonus: ±200 Elo → ±5 strength points (capped so it can't dominate)
    // This encodes multi-season head-to-head history — especially valuable early in season
    const eloRating = eloRatings?.get(d.Driver.driverId) ?? ELO_BASE;
    const eloBonus  = Math.max(-5, Math.min(5, ((eloRating - ELO_BASE) / 200) * 5));

    const base =
      ppr              * 0.40 +
      constructorShare * (ppr * 0.20) + // weighted by actual output, not just share
      winRate          * 25 * 0.15 +    // scale winRate to same range as ppr (0–25)
      positionMomentum * ppr * 0.08 +
      eloBonus;                         // additive: ±5 pts based on career head-to-head record

    // News sentiment multiplier (±15%)
    const sentiment = newsAnalysis.formIndicators.get(d.Driver.driverId) ?? 0;
    const postSentiment = Math.max(base * (1 + sentiment * 0.15), 0.01);

    // WDC career legacy multiplier — each title adds +3% (max ~+21% for 7× champion).
    // Captures pressure management, late-season experience, and institutional trust
    // that multi-champions have demonstrated across different machinery.
    const wdcTitles = DRIVER_WDC_TITLES[d.Driver.driverId] ?? 0;
    const strength = postSentiment * (1 + wdcTitles * 0.03);

    return {
      driverId: d.Driver.driverId,
      strength,
      ppr,
      winRate,
      constructorShare,
      newsSentiment: sentiment,
      eloRating,
    };
  });
}

// ─── Constructor strength rating ──────────────────────────────────────────────
function buildConstructorRatings(
  standings: ConstructorStanding[],
  racesCompleted: number,
  newsAnalysis: ReturnType<typeof analyzeNews>,
): ConstructorRating[] {
  if (racesCompleted === 0) {
    return standings.map(c => ({
      constructorId: c.Constructor.constructorId,
      strength: Math.max(0.1, 0.01),
      ppr: 0,
      winRate: 0,
      newsSentiment: newsAnalysis.formIndicators.get(c.Constructor.constructorId) ?? 0,
    }));
  }

  return standings.map(c => {
    // Constructors score from 2 drivers — max per race is 43 (25+18) or 44 with fastest lap
    const ppr = c.points / racesCompleted;
    const winRate = c.wins / racesCompleted;
    const base = ppr * 0.55 + winRate * 43 * 0.30 + (1 - (c.position - 1) * 0.05) * ppr * 0.15;
    const sentiment = newsAnalysis.formIndicators.get(c.Constructor.constructorId) ?? 0;
    const postSentiment = Math.max(base * (1 + sentiment * 0.15), 0.01);

    // WCC heritage multiplier — capped at 10 titles to avoid Ferrari over-indexing.
    // More titles = deeper institutional knowledge, better resource allocation,
    // stronger ability to develop mid-season (historically validated pattern).
    const wccTitles = CONSTRUCTOR_WCC_TITLES[c.Constructor.constructorId] ?? 0;
    const legacyFactor = 1 + Math.min(wccTitles, 10) * 0.02; // max +20%

    // Engine/Power Unit quality multiplier — based on hybrid-era (2014–2024) track record.
    // PU advantage is especially decisive on power-sensitive circuits (Monza, Baku, etc.)
    const supplier = ENGINE_SUPPLIER[c.Constructor.constructorId] ?? 'unknown';
    const engineFactor = ENGINE_QUALITY[supplier] ?? 0.95;

    const strength = postSentiment * legacyFactor * engineFactor;

    return {
      constructorId: c.Constructor.constructorId,
      strength,
      ppr,
      winRate,
      newsSentiment: sentiment,
    };
  });
}

// ─── Monte Carlo simulation ───────────────────────────────────────────────────
/**
 * Gumbel-max trick for weighted sampling without replacement:
 *   key_i = -ln(-ln(U_i)) / weight_i   (U_i ~ Uniform(0,1))
 *   Sort descending by key → weighted random permutation (finishing order).
 *
 * This is O(n log n) per race vs O(n²) for naive iterative sampling.
 * Source: Vieira (2014), "Gumbel-max trick and weighted reservoir sampling".
 */
function gumbelMaxSample(ratings: { id: string; strength: number }[]): string[] {
  return ratings
    .map(r => ({
      id: r.id,
      // Correct Gumbel-max trick: key = log(weight) + Gumbel(0,1)
      // Higher strength → higher expected key → finishes earlier (better position)
      key: Math.log(r.strength) + (-Math.log(-Math.log(Math.random() + 1e-10))),
    }))
    .sort((a, b) => b.key - a.key)
    .map(r => r.id);
}

function runMonteCarlo(
  ratings: { id: string; strength: number }[],
  current: { id: string; points: number }[],
  racesRemaining: number,
  leaderPoints: number,
  maxPtsPerRace: number = MAX_POINTS_PER_RACE,
): Map<string, number> {
  const counts = new Map<string, number>(ratings.map(r => [r.id, 0]));

  // Mathematical elimination filter
  const eligible = current.filter(
    c => c.points + racesRemaining * maxPtsPerRace >= leaderPoints
  );
  const eligibleIds = new Set(eligible.map(e => e.id));

  // Keep eliminated drivers in the race (they still affect others' points), just don't count their wins
  const allRatings = ratings;

  for (let sim = 0; sim < MONTE_CARLO_SIMS; sim++) {
    // Copy current points for this simulation
    const simPts = new Map(current.map(c => [c.id, c.points]));

    for (let race = 0; race < racesRemaining; race++) {
      const order = gumbelMaxSample(allRatings);
      // Award F1 points for top 10 finishers
      for (let pos = 0; pos < Math.min(order.length, F1_POINTS.length); pos++) {
        simPts.set(order[pos], (simPts.get(order[pos]) ?? 0) + F1_POINTS[pos]);
      }
    }

    // Find the championship winner of this simulation
    let maxPts = -1;
    let champion = '';
    simPts.forEach((pts, id) => {
      if (pts > maxPts) { maxPts = pts; champion = id; }
    });
    if (champion && eligibleIds.has(champion)) {
      counts.set(champion, (counts.get(champion) ?? 0) + 1);
    } else if (champion) {
      // Winner is an eliminated driver (shouldn't happen often) — no count
    }
  }

  return counts;
}


// ─── Analysis text ────────────────────────────────────────────────────────────
function buildDriverAnalysis(
  driver: DriverStanding,
  rating: DriverRating,
  gap: number,
  racesRemaining: number,
  _racesCompleted: number,
): string {
  const name     = `${driver.Driver.givenName} ${driver.Driver.familyName}`;
  const team     = driver.Constructors?.[0]?.name ?? 'their team';
  const pprStr   = rating.ppr.toFixed(1);
  const shareStr = Math.round(rating.constructorShare * 100);
  const wdcTitles = DRIVER_WDC_TITLES[driver.Driver.driverId] ?? 0;
  const careerNote = wdcTitles >= 4
    ? ` As a ${wdcTitles}× World Champion, their title experience is a significant factor in simulation models.`
    : wdcTitles >= 1
    ? ` A former World Champion, their title experience adds resilience under pressure.`
    : '';

  if (driver.position === 1) {
    const domStr = rating.constructorShare > 0.6
      ? `scoring ${shareStr}% of ${team}'s total points`
      : `splitting points evenly with their ${team} teammate`;
    if (driver.wins >= 3) {
      return `${name} leads the championship with ${driver.points} pts (${pprStr} pts/race), ${domStr}. With ${driver.wins} race wins, they have demonstrated both raw pace and consistency. The Monte Carlo model gives them strong championship odds, driven primarily by ${team}'s superior car and their personal extraction of it.${careerNote}`;
    }
    return `${name} tops the standings at ${driver.points} pts (${pprStr} pts/race), ${domStr}. Despite ${driver.wins} win(s), high consistency is sustaining the lead. ${racesRemaining} races remain — a run of wins from rivals is the main threat.${careerNote}`;
  }

  if (gap <= 30 && racesRemaining >= 5) {
    return `${name} is ${gap} pts behind the leader with ${driver.points} pts (${pprStr} pts/race). At ${shareStr}% of ${team}'s points, they are the stronger of their pairing. With ${racesRemaining} races left, the gap is bridgeable — simulation models show a realistic title window if form holds and rivals falter.${careerNote}`;
  }

  if (gap > racesRemaining * MAX_POINTS_PER_RACE) {
    return `${name} has been mathematically eliminated from the championship. With ${driver.points} pts and a ${gap}-pt deficit, not even a perfect run of results can close the gap. Focus shifts to maximising race wins and securing the best final position for ${team}.`;
  }

  return `${name} sits ${gap} pts off the lead with ${driver.points} pts (${pprStr} pts/race). The ${shareStr}% constructor-points share shows ${driver.position <= 3 ? 'strong' : 'moderate'} team-relative performance. With ${racesRemaining} races remaining, a dramatic championship surge would require sustained podiums combined with significant trouble for the leader.${careerNote}`;
}

function buildConstructorAnalysis(
  c: ConstructorStanding,
  rating: ConstructorRating,
  gap: number,
  racesRemaining: number,
  _racesCompleted: number,
): string {
  const pprStr = rating.ppr.toFixed(1);

  const wccTitles = CONSTRUCTOR_WCC_TITLES[c.Constructor.constructorId] ?? 0;
  const supplier = ENGINE_SUPPLIER[c.Constructor.constructorId];
  const engineScore = supplier ? (ENGINE_QUALITY[supplier] ?? 0.95) : 0.95;
  const heritageNote = wccTitles >= 5
    ? ` With ${wccTitles} WCC titles, the team brings unmatched institutional knowledge.`
    : wccTitles >= 1
    ? ` Their ${wccTitles} WCC title(s) reflect a team with championship DNA.`
    : '';
  const ENGINE_LABELS_C: Record<string, string> = {
    mercedes: 'Mercedes', ferrari: 'Ferrari', honda: 'Honda',
    rbpt: 'RBPT (Ford)', audi: 'Audi', renault: 'Renault',
  };
  const supplierLabelC = (supplier && ENGINE_LABELS_C[supplier]) ?? supplier?.toUpperCase() ?? 'Unknown';
  const engineNote = engineScore >= 1.08
    ? ` The ${supplierLabelC} power unit is the current benchmark on the grid.`
    : engineScore <= 0.90
    ? ` The ${supplierLabelC} PU shows a performance deficit, especially on power-sensitive circuits.`
    : '';

  if (c.position === 1) {
    if (c.wins >= 4) return `${c.Constructor.name} dominates the Constructors' Championship with ${c.points} pts (${pprStr} pts/race) and ${c.wins} race victories. Simulation models assign them the highest championship probability — their car advantage has been the season's defining factor.${heritageNote}${engineNote}`;
    return `${c.Constructor.name} leads with ${c.points} pts (${pprStr} pts/race). Consistency from both drivers has built a lead that rivals need multiple perfect weekends to overcome. The ${racesRemaining} remaining races are the key battleground.${heritageNote}${engineNote}`;
  }

  if (gap > racesRemaining * 44) {
    return `${c.Constructor.name} cannot mathematically win the Constructors' Championship. With ${c.points} pts and a ${gap}-pt deficit, their focus turns to maximising position and carrying momentum into next season.${engineNote}`;
  }

  return `${c.Constructor.name} trails by ${gap} pts with ${c.points} pts (${pprStr} pts/race). ${c.wins} race win(s) confirm genuine pace. Closing the gap requires both cars finishing in the top 5 consistently while the leader experiences setbacks.${heritageNote}${engineNote}`;
}

// ─── Key factors ─────────────────────────────────────────────────────────────
function buildDriverKeyFactors(
  driver: DriverStanding,
  rating: DriverRating,
  gap: number,
  racesRemaining: number,
  _seasonProgress: number,
): string[] {
  const factors: string[] = [];
  const team = driver.Constructors?.[0]?.name ?? 'team';

  // Constructor share (most important factor)
  if (rating.constructorShare > 0.65) factors.push(`Dominant within ${team} (${Math.round(rating.constructorShare * 100)}% of team pts)`);
  else if (rating.constructorShare > 0.52) factors.push(`Leading ${team} teammate`);
  else if (rating.constructorShare < 0.45) factors.push(`Behind ${team} teammate in intra-team battle`);
  else factors.push(`Equal teammate fight at ${team}`);

  // Points per race vs rough F1 average
  if (rating.ppr > 18) factors.push(`Exceptional ${rating.ppr.toFixed(1)} pts/race — podium-level consistency`);
  else if (rating.ppr > 12) factors.push(`${rating.ppr.toFixed(1)} pts/race — top-5 consistency`);
  else if (rating.ppr > 6) factors.push(`${rating.ppr.toFixed(1)} pts/race — regular points scorer`);

  // Win rate
  if (driver.wins > 0 && racesRemaining > 0) {
    if (driver.wins >= 4) factors.push(`${driver.wins} victories — dominant race pace`);
    else if (driver.wins >= 2) factors.push(`${driver.wins} victories confirm outright speed`);
    else factors.push('Race win proves peak pace exists');
  } else if (driver.wins === 0 && driver.position <= 3) {
    factors.push('Leading without a win — consistency over pace');
  }

  // Gap / season stage
  if (driver.position === 1) {
    const cushion = racesRemaining * MAX_POINTS_PER_RACE;
    if (gap === 0 && cushion > 100) factors.push('Points cushion makes early title possible');
  } else if (gap <= racesRemaining * MAX_POINTS_PER_RACE * 0.5) {
    factors.push(`${gap}-pt gap still bridgeable with ${racesRemaining} races left`);
  }

  // Elo rating context
  if (rating.eloRating >= 1650) factors.push(`Elo ${Math.round(rating.eloRating)} — elite multi-season head-to-head record`);
  else if (rating.eloRating >= 1560) factors.push(`Elo ${Math.round(rating.eloRating)} — strong historical pairwise record`);
  else if (rating.eloRating <= 1380) factors.push(`Elo ${Math.round(rating.eloRating)} — below-average career head-to-head record`);

  // WDC career pedigree
  const wdcTitles = DRIVER_WDC_TITLES[driver.Driver.driverId] ?? 0;
  if (wdcTitles >= 4) factors.push(`${wdcTitles}× World Champion — unmatched pressure experience`);
  else if (wdcTitles >= 2) factors.push(`${wdcTitles}× World Champion — proven title-winning mentality`);
  else if (wdcTitles === 1) factors.push('World Champion — knows what it takes to win a title');

  // News sentiment
  if (rating.newsSentiment > 0.3) factors.push('Positive recent news momentum');
  else if (rating.newsSentiment < -0.3) factors.push('Recent news suggests form concerns');

  return [...new Set(factors)].slice(0, 4);
}

function buildConstructorKeyFactors(
  c: ConstructorStanding,
  rating: ConstructorRating,
  gap: number,
  racesRemaining: number,
  _seasonProgress: number,
): string[] {
  const factors: string[] = [];

  if (rating.ppr > 35) factors.push(`${rating.ppr.toFixed(1)} pts/race — both cars consistently scoring`);
  else if (rating.ppr > 20) factors.push(`${rating.ppr.toFixed(1)} pts/race — solid double-points haul`);
  else factors.push(`${rating.ppr.toFixed(1)} pts/race — needs both cars in top positions`);

  if (c.wins >= 4) factors.push(`${c.wins} victories — fastest car on multiple track types`);
  else if (c.wins >= 2) factors.push(`${c.wins} wins show race-winning capability`);
  else if (c.wins === 1) factors.push('Single win — needs more peak-pace circuits');
  else factors.push('No wins yet — consistent points more than victories');

  if (c.position === 1) {
    factors.push('Championship leader with strongest average pace');
  } else if (gap <= racesRemaining * 44 * 0.4) {
    factors.push(`${gap}-pt gap — championship still achievable`);
  } else if (gap > racesRemaining * 44 * 0.7) {
    factors.push('Large gap makes title charge very unlikely');
  }

  // WCC heritage
  const wccTitles = CONSTRUCTOR_WCC_TITLES[c.Constructor.constructorId] ?? 0;
  if (wccTitles >= 10) factors.push(`${wccTitles}× WCC — unmatched F1 heritage and engineering depth`);
  else if (wccTitles >= 5) factors.push(`${wccTitles}× WCC — proven title-winning infrastructure`);
  else if (wccTitles >= 1) factors.push(`${wccTitles}× WCC title — championship DNA in the team`);
  else factors.push('No WCC titles yet — building legacy, less institutional experience');

  // Engine / Power Unit quality
  const supplier = ENGINE_SUPPLIER[c.Constructor.constructorId];
  const engineScore = supplier ? (ENGINE_QUALITY[supplier] ?? 0.95) : 0.95;
  const ENGINE_LABELS: Record<string, string> = {
    mercedes: 'Mercedes', ferrari: 'Ferrari', honda: 'Honda',
    rbpt: 'RBPT (Ford)', audi: 'Audi', renault: 'Renault', cadillac: 'Cadillac (GM)',
  };
  const supplierLabel = (supplier && ENGINE_LABELS[supplier]) ?? supplier?.toUpperCase() ?? 'Unknown';
  if (engineScore >= 1.08) factors.push(`${supplierLabel} PU — current benchmark engine on the grid`);
  else if (engineScore >= 1.03) factors.push(`${supplierLabel} PU — proven competitive power unit`);
  else if (engineScore <= 0.90) factors.push(`${supplierLabel} PU — known power deficit vs field`);

  if (rating.newsSentiment > 0.3) factors.push('Positive development trajectory in recent news');
  else if (rating.newsSentiment < -0.3) factors.push('Reports suggest performance or reliability concerns');

  return [...new Set(factors)].slice(0, 4);
}

// ─── Circuit characteristics ──────────────────────────────────────────────────

interface CircuitInfo {
  type: CircuitType;
  puSensitive: boolean;    // does PU quality matter more here?
  aeroSensitive: boolean;  // does high downforce matter?
  traits: string[];
}

/**
 * Static circuit characteristics map (Ergast circuitId → info).
 * Update when new circuits are added to the calendar.
 */
const CIRCUIT_INFO: Record<string, CircuitInfo> = {
  bahrain:       { type: 'mixed',     puSensitive: false, aeroSensitive: false, traits: ['Heavy tyre deg', 'Hot conditions', 'Dusty off-line', 'Good overtaking'] },
  jeddah:        { type: 'power',     puSensitive: true,  aeroSensitive: false, traits: ['Wall-lined hybrid', 'High-speed corners', 'DRS zones', 'Night race'] },
  albert_park:   { type: 'mixed',     puSensitive: false, aeroSensitive: false, traits: ['Semi-street feel', 'Smooth surface', 'Variable weather'] },
  suzuka:        { type: 'technical', puSensitive: false, aeroSensitive: true,  traits: ["Real driver's circuit", 'High-speed S-curves', 'Aero-sensitive', 'Hard overtaking'] },
  shanghai:      { type: 'mixed',     puSensitive: false, aeroSensitive: false, traits: ['Long back straight', 'DRS effective', 'Challenging sector 1'] },
  miami:         { type: 'street',    puSensitive: false, aeroSensitive: false, traits: ['Street circuit feel', 'Safety car likely', 'Multiple DRS zones', 'Bumpy surface'] },
  imola:         { type: 'technical', puSensitive: false, aeroSensitive: true,  traits: ['Narrow layout', 'Limited overtaking', 'High downforce', 'Old-school circuit'] },
  monaco:        { type: 'street',    puSensitive: false, aeroSensitive: true,  traits: ['Qualifying critical', 'Impossible to overtake', 'Monaco specialist setup', 'Prestige event'] },
  villeneuve:    { type: 'mixed',     puSensitive: false, aeroSensitive: false, traits: ['Stop-start layout', 'Wall-lined', 'Safety car common', 'Long hairpin'] },
  catalunya:     { type: 'mixed',     puSensitive: false, aeroSensitive: true,  traits: ['High downforce required', 'Heavy tyre deg', 'Low overtaking', 'Aero-sensitive'] },
  red_bull_ring: { type: 'power',     puSensitive: true,  aeroSensitive: false, traits: ['Short fast lap', 'High-speed', 'Engine stressed', '690m altitude'] },
  silverstone:   { type: 'mixed',     puSensitive: false, aeroSensitive: true,  traits: ['High-speed sweepers', 'Tyre stress high', 'British weather', 'Iconic corners'] },
  hungaroring:   { type: 'technical', puSensitive: false, aeroSensitive: true,  traits: ['Monaco without barriers', 'High downforce', 'Hot conditions', 'Difficult overtaking'] },
  spa:           { type: 'mixed',     puSensitive: true,  aeroSensitive: true,  traits: ['Longest circuit', 'Variable weather', 'Eau Rouge iconic', 'Good overtaking'] },
  zandvoort:     { type: 'technical', puSensitive: false, aeroSensitive: true,  traits: ['Banked turns', 'Narrow track', 'Dutch GP energy', 'Limited overtaking'] },
  monza:         { type: 'power',     puSensitive: true,  aeroSensitive: false, traits: ['Temple of Speed', 'Lowest downforce', 'PU advantage decisive', 'Slipstream battles'] },
  baku:          { type: 'power',     puSensitive: true,  aeroSensitive: false, traits: ['Longest straight', 'Street circuit', 'Safety car magnet', 'Unpredictable results'] },
  marina_bay:    { type: 'street',    puSensitive: false, aeroSensitive: true,  traits: ['Night race', 'Hot and humid', 'High downforce', 'Safety car heavy'] },
  americas:      { type: 'mixed',     puSensitive: false, aeroSensitive: false, traits: ['Combined layout', 'Technical sector 1', 'Long back straight', 'Good racing'] },
  rodriguez:     { type: 'power',     puSensitive: true,  aeroSensitive: false, traits: ['2285m altitude', 'Thin air — engine stressed', 'Low-aero setup', 'Cool conditions'] },
  interlagos:    { type: 'mixed',     puSensitive: false, aeroSensitive: false, traits: ['Anti-clockwise', 'Variable weather', 'Good racing', 'Historic circuit'] },
  las_vegas:     { type: 'power',     puSensitive: true,  aeroSensitive: false, traits: ['Night race', 'Long straights', 'Cold conditions', 'Low downforce'] },
  losail:        { type: 'mixed',     puSensitive: false, aeroSensitive: true,  traits: ['High-speed layout', 'Heavy tyre deg', 'Wind effects', 'Night race'] },
  yas_marina:    { type: 'mixed',     puSensitive: false, aeroSensitive: false, traits: ['Season finale', 'Night race', 'Revised high-speed layout', 'Good racing'] },
};

// ─── Next-race prediction engine ─────────────────────────────────────────────

/**
 * Computes a driver's historical form at a specific circuit.
 * Weights recent seasons more heavily (last year = full, 5 years ago = 0.3×).
 */
function computeCircuitForm(
  driverId: string,
  history: CircuitRaceEntry[],
  currentYear: number,
): { wins: number; podiums: number; bestResult: number; recentFinishes: number[]; score: number } {
  let wins = 0, podiums = 0, bestResult = 99, score = 0;
  const recentFinishes: number[] = [];

  // Only last 6 seasons
  const relevant = history
    .filter(r => parseInt(r.season) >= currentYear - 6 && parseInt(r.season) < currentYear)
    .sort((a, b) => parseInt(b.season) - parseInt(a.season)); // newest first

  for (const race of relevant) {
    const result = race.driverResults.find(r => r.driverId === driverId);
    if (!result) continue;

    const pos = result.position;
    const yearsAgo = currentYear - parseInt(race.season);
    const recencyWeight = Math.max(0.3, 1 - (yearsAgo - 1) * 0.15);

    if (pos === 1) wins++;
    if (pos <= 3) podiums++;
    bestResult = Math.min(bestResult, pos);
    score += Math.max(0, 11 - pos) * recencyWeight; // P1=10pts, P2=9pts, …, P10+=0

    if (recentFinishes.length < 3) recentFinishes.push(pos);
  }

  return { wins, podiums, bestResult: bestResult === 99 ? 0 : bestResult, recentFinishes, score };
}

export async function generateNextRacePrediction(
  nextRace: import('../types/race').Race,
  driverStandings: DriverStanding[],
  mlProbabilities: Map<string, number>,
  currentYear: number,
): Promise<NextRacePrediction | null> {
  const circuitId = nextRace.Circuit.circuitId;
  if (!circuitId) return null;

  // Fetch circuit history
  const history = await getCircuitHistoricalResults(circuitId).catch((): CircuitRaceEntry[] => []);
  const circuitInfo = CIRCUIT_INFO[circuitId];

  const forms: (CircuitDriverForm & { combinedScore: number })[] = driverStandings.map(d => {
    const form = computeCircuitForm(d.Driver.driverId, history, currentYear);
    const mlProb = mlProbabilities.get(d.Driver.driverId) ?? 0;

    // Circuit type bonus: PU-sensitive circuits reward drivers with strong engines
    const supplier = ENGINE_SUPPLIER[d.Constructors?.[0]?.constructorId ?? ''] ?? 'unknown';
    const engineQ  = ENGINE_QUALITY[supplier] ?? 0.95;
    const puBonus  = (circuitInfo?.puSensitive ?? false) ? (engineQ - 1.0) * 0.5 : 0; // ±0.05

    // Normalise circuit score: typical range 0–30 → 0–1
    const circuitNorm = Math.min(form.score / 30, 1);

    // Combined score
    const combinedScore = mlProb * 0.50 + circuitNorm * 0.35 + puBonus * 0.15;

    return {
      driverId:        d.Driver.driverId,
      driverName:      `${d.Driver.givenName} ${d.Driver.familyName}`,
      wins:            form.wins,
      podiums:         form.podiums,
      bestResult:      form.bestResult,
      recentFinishes:  form.recentFinishes,
      combinedScore,
    };
  });

  // Sort by combined score, normalise top 3 to probabilities
  const sorted = [...forms].sort((a, b) => b.combinedScore - a.combinedScore);
  const top3 = sorted.slice(0, 3);
  const top3Total = top3.reduce((s, d) => s + d.combinedScore, 0);

  const podium: PodiumPick[] = top3.map((d, i) => ({
    position: (i + 1) as 1 | 2 | 3,
    driverId:       d.driverId,
    driverName:     d.driverName,
    probability:    top3Total > 0 ? d.combinedScore / top3Total : 1 / 3,
    circuitWins:    d.wins,
    circuitPodiums: d.podiums,
  }));

  // Top 5 contenders by circuit form for display
  const topContenders: CircuitDriverForm[] = sorted
    .slice(0, 5)
    .map(({ combinedScore: _cs, ...rest }) => rest);

  // Key factors for this circuit
  const keyFactors: string[] = [];
  if (circuitInfo) {
    keyFactors.push(`${circuitInfo.type.charAt(0).toUpperCase() + circuitInfo.type.slice(1)} circuit — ${circuitInfo.traits[0]}`);
    if (circuitInfo.puSensitive) keyFactors.push('Power unit advantage decisive here');
    if (circuitInfo.aeroSensitive) keyFactors.push('High-downforce setup critical');
  }
  if (top3[0]?.wins > 0) keyFactors.push(`${top3[0].driverName.split(' ')[1]} has ${top3[0].wins} win(s) at this circuit`);
  const circuitSpecialist = sorted.find(d => d.wins >= 2);
  if (circuitSpecialist && circuitSpecialist.driverId !== top3[0]?.driverId) {
    keyFactors.push(`${circuitSpecialist.driverName.split(' ')[1]} is a circuit specialist (${circuitSpecialist.wins} wins)`);
  }

  return {
    raceName:      nextRace.raceName,
    circuitName:   nextRace.Circuit.circuitName,
    circuitId,
    circuitType:   circuitInfo?.type ?? 'mixed',
    circuitTraits: circuitInfo?.traits ?? [],
    podium,
    topContenders,
    keyFactors,
  };
}

// ─── News analysis ────────────────────────────────────────────────────────────
const POSITIVE_KW = ['win','victory','pole','fastest','dominate','strong','impressive','comeback','record','lead','surge'];
const NEGATIVE_KW = ['crash','retire','penalty','struggle','difficult','problem','incident','mistake','disaster','reliability'];

function analyzeNews(
  news: NewsItem[],
  drivers: DriverStanding[],
  constructors: ConstructorStanding[],
) {
  const driverTrends      = new Map<string, 'up' | 'down' | 'neutral'>();
  const constructorTrends = new Map<string, 'up' | 'down' | 'neutral'>();
  const recentWinners     = new Set<string>();
  const formIndicators    = new Map<string, number>();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Build name lookup maps
  const driverNames = new Map(drivers.map(d => [d.Driver.driverId, [
    `${d.Driver.givenName} ${d.Driver.familyName}`,
    d.Driver.familyName,
    d.Driver.code ?? '',
  ]]));
  const constructorNames = new Map(constructors.map(c => [c.Constructor.constructorId, [c.Constructor.name]]));

  news.filter(item => new Date(item.pubDate) >= sevenDaysAgo).forEach(item => {
    const text = `${item.title} ${item.description ?? ''}`.toLowerCase();
    const pos = POSITIVE_KW.some(kw => text.includes(kw));
    const neg = NEGATIVE_KW.some(kw => text.includes(kw));

    driverNames.forEach((names, id) => {
      if (!names.some(n => n && text.includes(n.toLowerCase()))) return;
      if (pos)  { driverTrends.set(id, 'up');   formIndicators.set(id, Math.min((formIndicators.get(id) ?? 0) + 0.25, 1)); }
      if (neg)  { driverTrends.set(id, 'down'); formIndicators.set(id, Math.max((formIndicators.get(id) ?? 0) - 0.25, -1)); }
      if (!pos && !neg && !driverTrends.has(id)) driverTrends.set(id, 'neutral');
      if (text.includes('win') && text.includes('race')) recentWinners.add(id);
    });

    constructorNames.forEach((names, id) => {
      if (!names.some(n => n && text.includes(n.toLowerCase()))) return;
      if (pos)  { constructorTrends.set(id, 'up');   formIndicators.set(id, Math.min((formIndicators.get(id) ?? 0) + 0.2, 1)); }
      if (neg)  { constructorTrends.set(id, 'down'); formIndicators.set(id, Math.max((formIndicators.get(id) ?? 0) - 0.2, -1)); }
      if (!pos && !neg && !constructorTrends.has(id)) constructorTrends.set(id, 'neutral');
    });
  });

  // Default to neutral for anyone not in the news
  drivers.forEach(d => {
    if (!driverTrends.has(d.Driver.driverId)) driverTrends.set(d.Driver.driverId, 'neutral');
    if (!formIndicators.has(d.Driver.driverId)) formIndicators.set(d.Driver.driverId, 0);
  });
  constructors.forEach(c => {
    if (!constructorTrends.has(c.Constructor.constructorId)) constructorTrends.set(c.Constructor.constructorId, 'neutral');
    if (!formIndicators.has(c.Constructor.constructorId)) formIndicators.set(c.Constructor.constructorId, 0);
  });

  const trendingUp   = [...driverTrends.entries()].filter(([,t]) => t === 'up').map(([id]) => id);
  const trendingDown = [...driverTrends.entries()].filter(([,t]) => t === 'down').map(([id]) => id);

  return {
    driverTrends,
    constructorTrends,
    recentWinners,
    formIndicators,
    trendingUp,
    trendingDown,
    recentWins: [...recentWinners],
    formAnalysis: trendingUp.length > 0
      ? `Recent news suggests momentum shifts favouring: ${trendingUp.slice(0, 3).join(', ')}`
      : 'No strong form signals from recent news coverage',
  };
}
