/**
 * F1 Championship Prediction — Logistic Regression Engine
 *
 * Architecture:
 *   Binary logistic regression: P(driver wins championship | current season state)
 *   Trained via mini-batch gradient descent on historical Ergast race data.
 *
 * Training data:
 *   For each historical season, the season is replayed race by race.
 *   At every race checkpoint, 8 features are extracted for each driver.
 *   Label = 1 if that driver won the championship that season, 0 otherwise.
 *
 * Features (all normalised to roughly [0, 1]):
 *   1. seasonProgress      — races done / total races
 *   2. relativePoints      — driver pts / leader pts  (1.0 = is the leader)
 *   3. gapNorm             — gap to leader / max still catchable  (0 = leader)
 *   4. fieldShare          — driver pts / total pts scored by entire field
 *   5. winRate             — wins / races completed
 *   6. racesRemainingNorm  — races remaining / total races
 *   7. isLeader            — 1 if currently P1, else 0
 *   8. notEliminated       — 1 if mathematically still possible to win, else 0
 *
 * Caching:
 *   Weights are stored in AsyncStorage after first training.
 *   The cache is reused for up to 7 days, then silently refreshed in background.
 *
 * Why logistic regression and not a neural network?
 *   - Training happens on-device using data fetched at runtime (no bundled model)
 *   - ~3 000–5 000 samples from 6 seasons — LR generalises better than a deep net here
 *   - Milliseconds to train on this size; interpretable coefficients for debugging
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSeasonResults, getSeasonRaces, getDriverStandings } from './api';
import type { SeasonRaceResult } from './api';

// ─── Constants ───────────────────────────────────────────────────────────────

const FEATURE_COUNT       = 8;
const TRAINING_SEASONS    = 6;      // how many prior seasons to train on
const EPOCHS              = 400;
const LEARNING_RATE       = 0.08;
const MAX_POINTS_PER_RACE = 26;     // 25 win + 1 fastest lap
const F1_PTS              = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const CACHE_KEY           = 'apex_ml_model_v2';
const CACHE_TTL_MS        = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MLModel {
  weights: number[];           // FEATURE_COUNT coefficients
  bias: number;
  trainedOnSeasons: string[];
  trainedAt: number;           // unix ms
  trainingSamples: number;
}

export interface DriverMLSnapshot {
  driverId: string;
  points: number;
  wins: number;
  racesCompleted: number;
}

// ─── Feature extraction ───────────────────────────────────────────────────────

export function extractFeatures(
  driver: DriverMLSnapshot,
  allDrivers: DriverMLSnapshot[],
  totalRaces: number,
): number[] {
  const { points, wins, racesCompleted } = driver;
  const racesRemaining  = totalRaces - racesCompleted;
  const maxCatchable    = racesRemaining * MAX_POINTS_PER_RACE;

  const sorted      = [...allDrivers].sort((a, b) => b.points - a.points);
  const leaderPts   = sorted[0]?.points ?? 0;
  const fieldTotal  = allDrivers.reduce((s, d) => s + d.points, 0) || 1;

  const gap         = Math.max(0, leaderPts - points);
  const isLeader    = points === leaderPts && leaderPts > 0 ? 1 : 0;

  return [
    racesCompleted / Math.max(totalRaces, 1),          // 1. seasonProgress
    leaderPts > 0 ? points / leaderPts : 0,            // 2. relativePoints
    maxCatchable > 0 ? Math.min(gap / maxCatchable, 2) : 2, // 3. gapNorm (>1 = eliminated)
    points / fieldTotal,                                // 4. fieldShare
    racesCompleted > 0 ? wins / racesCompleted : 0,    // 5. winRate
    racesRemaining / Math.max(totalRaces, 1),           // 6. racesRemainingNorm
    isLeader,                                           // 7. isLeader (binary)
    gap <= maxCatchable ? 1 : 0,                        // 8. notEliminated (binary)
  ];
}

// ─── Logistic regression primitives ─────────────────────────────────────────

function sigmoid(x: number): number {
  // Clamp to avoid overflow in Math.exp
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
}

export function predictProba(features: number[], model: MLModel): number {
  const z = features.reduce((sum, fi, i) => sum + fi * (model.weights[i] ?? 0), model.bias);
  return sigmoid(z);
}

function gradientDescent(
  X: number[][],
  y: number[],
): { weights: number[]; bias: number } {
  const n = X.length;
  const weights = new Array(FEATURE_COUNT).fill(0.0);
  let bias = -1.0; // negative prior: most drivers don't win

  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    const dw = new Array(FEATURE_COUNT).fill(0.0);
    let db = 0.0;

    for (let i = 0; i < n; i++) {
      const z   = X[i].reduce((s, xi, j) => s + xi * weights[j], bias);
      const err = sigmoid(z) - y[i];
      for (let j = 0; j < FEATURE_COUNT; j++) dw[j] += err * X[i][j];
      db += err;
    }

    // Gradient step (no regularisation — dataset is small, no overfitting risk)
    for (let j = 0; j < FEATURE_COUNT; j++) weights[j] -= (LEARNING_RATE / n) * dw[j];
    bias -= (LEARNING_RATE / n) * db;
  }

  return { weights, bias };
}

// ─── Training data construction ──────────────────────────────────────────────

/**
 * Replays a historical season race-by-race, extracting feature/label pairs at
 * each race checkpoint. Only drivers still mathematically alive are included to
 * keep the dataset focused on meaningful decisions.
 */
async function buildSeasonTrainingData(
  season: string,
): Promise<{ X: number[][]; y: number[] }> {
  const [results, races, finalStandings] = await Promise.all([
    getSeasonResults(season),
    getSeasonRaces(season),
    getDriverStandings(season),
  ]);

  const totalRaces  = races.length;
  const championId  = finalStandings[0]?.Driver?.driverId;

  if (!championId || results.length === 0 || totalRaces === 0) return { X: [], y: [] };

  const X: number[][] = [];
  const y: number[]   = [];

  const cumPoints = new Map<string, number>();
  const cumWins   = new Map<string, number>();

  for (const race of results) {
    // Accumulate points for this race
    for (const r of race.results) {
      const pts = F1_PTS[r.position - 1] ?? 0;
      cumPoints.set(r.driverId, (cumPoints.get(r.driverId) ?? 0) + pts);
      if (r.position === 1) cumWins.set(r.driverId, (cumWins.get(r.driverId) ?? 0) + 1);
    }

    const snapshots: DriverMLSnapshot[] = [...cumPoints.entries()].map(([id, pts]) => ({
      driverId:      id,
      points:        pts,
      wins:          cumWins.get(id) ?? 0,
      racesCompleted: race.round,
    }));

    const leaderPts      = Math.max(...snapshots.map(s => s.points), 0);
    const racesRemaining = totalRaces - race.round;

    // Skip samples where the champion was already mathematically certain (boring)
    // and samples where drivers are eliminated (label always 0, would skew model)
    for (const driver of snapshots) {
      const gap = leaderPts - driver.points;
      if (gap > racesRemaining * MAX_POINTS_PER_RACE) continue; // mathematically eliminated

      X.push(extractFeatures(driver, snapshots, totalRaces));
      y.push(driver.driverId === championId ? 1 : 0);
    }
  }

  return { X, y };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Trains a fresh logistic regression model on the last TRAINING_SEASONS
 * complete seasons of Ergast race data. Fetches all season data in parallel.
 */
export async function trainModel(currentSeason: string): Promise<MLModel> {
  const currentYear   = parseInt(currentSeason, 10);
  const trainSeasons  = Array.from({ length: TRAINING_SEASONS }, (_, i) =>
    String(currentYear - TRAINING_SEASONS + i),
  ); // for 2026 → ['2020','2021','2022','2023','2024','2025']

  // Fetch all seasons in parallel; silently skip failed seasons
  const seasonDataArr = await Promise.all(
    trainSeasons.map(s =>
      buildSeasonTrainingData(s).catch(() => ({ X: [] as number[][], y: [] as number[] })),
    ),
  );

  const allX: number[][] = [];
  const allY: number[]   = [];
  for (const { X, y } of seasonDataArr) { allX.push(...X); allY.push(...y); }

  if (allX.length < 30) {
    // Not enough training data — return a neutral fallback model
    // (this can happen if the API is unreachable on first launch)
    console.warn('[ML] Insufficient training data, using fallback weights');
    return {
      weights:          new Array(FEATURE_COUNT).fill(0),
      bias:             -2,
      trainedOnSeasons: trainSeasons,
      trainedAt:        Date.now(),
      trainingSamples:  allX.length,
    };
  }

  const { weights, bias } = gradientDescent(allX, allY);

  return {
    weights,
    bias,
    trainedOnSeasons: trainSeasons,
    trainedAt:        Date.now(),
    trainingSamples:  allX.length,
  };
}

/**
 * Returns a trained model, loading from cache if available and fresh.
 * Cache is invalidated after CACHE_TTL_MS or if the season has changed.
 */
export async function loadOrTrainModel(currentSeason: string): Promise<MLModel> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached: MLModel = JSON.parse(raw);
      const age      = Date.now() - cached.trainedAt;
      const prevSeason = String(parseInt(currentSeason, 10) - 1);

      if (age < CACHE_TTL_MS && cached.trainedOnSeasons.includes(prevSeason)) {
        return cached; // fresh, relevant cache hit
      }
    }
  } catch { /* storage unavailable */ }

  const model = await trainModel(currentSeason);

  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(model));
  } catch { /* storage unavailable */ }

  return model;
}

/**
 * Given a trained model and the current season standings, returns a map of
 * driverId → championship probability (values sum to 1.0).
 *
 * Drivers mathematically eliminated are forced to 0 before normalisation.
 */
export function applyModelToStandings(
  model: MLModel,
  snapshots: DriverMLSnapshot[],
  totalRaces: number,
  leaderPoints: number,
): Map<string, number> {
  const raw = new Map<string, number>();
  const racesRemaining = totalRaces - (snapshots[0]?.racesCompleted ?? 0);

  for (const driver of snapshots) {
    const gap       = leaderPoints - driver.points;
    const maxPossible = racesRemaining * MAX_POINTS_PER_RACE;

    if (gap > maxPossible) {
      raw.set(driver.driverId, 0); // mathematically eliminated
      continue;
    }

    const features = extractFeatures(driver, snapshots, totalRaces);
    raw.set(driver.driverId, predictProba(features, model));
  }

  // Normalise so probabilities sum to 1.0
  const total = [...raw.values()].reduce((s, v) => s + v, 0);
  const normalised = new Map<string, number>();
  raw.forEach((prob, id) => normalised.set(id, total > 0 ? prob / total : 0));

  return normalised;
}
