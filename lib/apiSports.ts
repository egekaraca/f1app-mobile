// lib/apiSports.ts
// API-Sports Formula 1 — supplements Ergast/Jolpica for biographical and
// career-stats data not available in Ergast (podiums, pole positions, base, etc.)
//
// Free tier: 100 requests/day. All responses are cached in AsyncStorage for
// 24 hours — driver and team profiles are static within a season.
//
// Setup: add EXPO_PUBLIC_API_SPORTS_KEY=<your_key> to a .env file in the
// project root. Get a free key at https://api-sports.io (no credit card needed).

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY = process.env.EXPO_PUBLIC_API_SPORTS_KEY ?? '';
const BASE = 'https://v1.formula1.api-sports.io';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

// ─── Internal cache helper ────────────────────────────────────────

async function cachedFetch<T>(cacheKey: string, url: string): Promise<T | null> {
  if (!API_KEY) return null;

  // Try AsyncStorage cache first
  try {
    const raw = await AsyncStorage.getItem(`apisports:${cacheKey}`);
    if (raw) {
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL) return data as T;
    }
  } catch {}

  // Fetch from API-Sports
  try {
    const res = await fetch(url, {
      headers: { 'x-apisports-key': API_KEY },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // API-Sports wraps all results in a `response` array
    const data: T | null = json?.response?.[0] ?? null;
    if (data) {
      await AsyncStorage.setItem(
        `apisports:${cacheKey}`,
        JSON.stringify({ data, ts: Date.now() })
      );
    }
    return data;
  } catch {
    return null;
  }
}

// ─── Driver career stats ──────────────────────────────────────────

export type DriverStats = {
  podiums: number;
  careerPoints: number;
  grandPrixEntered: number;
  worldChampionships: number;
  highestRaceFinish: number | null;
  highestGridPosition: number | null;
};

/**
 * Returns career stats for a driver, searched by family name.
 * Returns null if no API key is configured or the request fails.
 *
 * Usage: pass driver.familyName from Ergast (e.g. "Verstappen").
 */
export async function getDriverStats(familyName: string): Promise<DriverStats | null> {
  const key = `driver:${familyName.toLowerCase()}`;
  const url = `${BASE}/drivers?search=${encodeURIComponent(familyName)}`;
  const raw = await cachedFetch<any>(key, url);
  if (!raw) return null;

  return {
    podiums:             Number(raw.podiums            ?? 0),
    careerPoints:        Number(raw.careerpoints        ?? 0),
    grandPrixEntered:    Number(raw.grandsprixentered   ?? 0),
    worldChampionships:  Number(raw.worldchampionships  ?? 0),
    // highestracefinish is an object: { position, number } — take position only
    highestRaceFinish:   raw.highestracefinish?.position != null
                           ? Number(raw.highestracefinish.position)
                           : null,
    highestGridPosition: raw.highestgridposition != null
                           ? Number(raw.highestgridposition)
                           : null,
  };
}

// ─── Constructor (team) stats ─────────────────────────────────────

export type ConstructorStats = {
  base: string | null;
  firstTeamEntry: number | null;
  worldChampionships: number;
  highestRaceFinish: string | null;
  polePositions: number;
  fastestLaps: number;
  technicalChief: string | null;
  chassis: string | null;
};

/**
 * Returns team profile stats, searched by display name.
 * Returns null if no API key is configured or the request fails.
 *
 * Usage: pass the human-readable team name (e.g. "McLaren", "Red Bull").
 */
export async function getConstructorStats(teamName: string): Promise<ConstructorStats | null> {
  const key = `team:${teamName.toLowerCase()}`;
  const url = `${BASE}/teams?search=${encodeURIComponent(teamName)}`;
  const raw = await cachedFetch<any>(key, url);
  if (!raw) return null;

  return {
    base:               raw.base               ?? null,
    firstTeamEntry:     raw.firstteamentry != null ? Number(raw.firstteamentry) : null,
    worldChampionships: Number(raw.worldchampionships ?? 0),
    highestRaceFinish:  raw.highestracefinish   ?? null,
    polePositions:      Number(raw.polepositions ?? 0),
    fastestLaps:        Number(raw.fastestlaps   ?? 0),
    technicalChief:     raw.technicalchief       ?? null,
    chassis:            raw.chassis              ?? null,
  };
}
