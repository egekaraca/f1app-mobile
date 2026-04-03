// lib/api.ts
const BASE = "https://api.jolpi.ca/ergast/f1";

import type { Race } from "../types/race";
import type { DriverStanding, ConstructorStanding } from "../types/standings";

/* ————— Ortak tipler ————— */

export type DriverLite = {
  driverId: string;
  givenName: string;
  familyName: string;
  code?: string;
  permanentNumber?: string;
  nationality?: string;
};

export type ConstructorSeasonSummary = {
  position: number;
  points: number;
  wins: number;
};

export type ConstructorInfo = {
  constructorId: string;
  name: string;
  nationality?: string;
  url?: string;
};

/* ————— Races ————— */

export async function getSeasonRaces(season: string): Promise<Race[]> {
  const res = await fetch(`${BASE}/${encodeURIComponent(season)}.json`);
  if (!res.ok) throw new Error("Races fetch failed");
  const json = await res.json();
  const races: Race[] = json?.MRData?.RaceTable?.Races ?? [];
  return races;
}

/** UTC tarih+saat stringlerini cihaz saatine çevirip okunur yapar */
export function formatRaceDateTimeLocal(date: string, time?: string) {
  try {
    const iso = time ? `${date}T${time}` : `${date}T00:00:00Z`;
    const d = new Date(iso);
    const dateStr = new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      weekday: "short",
    }).format(d);
    const timeStr = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
    return { dateStr, timeStr };
  } catch {
    return { dateStr: date, timeStr: "" };
  }
}

/* ————— Standings (season) ————— */

export async function getDriverStandings(
  season: string
): Promise<DriverStanding[]> {
  const res = await fetch(`${BASE}/${encodeURIComponent(season)}/driverstandings.json`);
  if (!res.ok) throw new Error("Driver standings fetch failed");
  const json = await res.json();
  const list = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
  return list.map((it: any) => ({
    position: Number(it.position),
    points: Number(it.points),
    wins: Number(it.wins),
    Driver: it.Driver,
    Constructors: it.Constructors ?? [],
  }));
}

export async function getConstructorStandings(
  season: string
): Promise<ConstructorStanding[]> {
  const res = await fetch(`${BASE}/${encodeURIComponent(season)}/constructorstandings.json`);
  if (!res.ok) throw new Error("Constructor standings fetch failed");
  const json = await res.json();
  const list = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? [];
  return list.map((it: any) => ({
    position: Number(it.position),
    points: Number(it.points),
    wins: Number(it.wins),
    Constructor: it.Constructor,
  }));
}

/* ————— Constructor detayları ————— */

export async function getConstructorStandingForSeason(
  season: string,
  constructorId: string
): Promise<ConstructorSeasonSummary> {
  const res = await fetch(
    `${BASE}/${encodeURIComponent(season)}/constructors/${encodeURIComponent(constructorId)}/constructorstandings.json`
  );
  if (!res.ok) throw new Error("Constructor season standing failed");
  const json = await res.json();
  const item = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings?.[0];
  if (!item) return { position: 0, points: 0, wins: 0 };
  return {
    position: Number(item.position ?? 0),
    points: Number(item.points ?? 0),
    wins: Number(item.wins ?? 0),
  };
}

export async function getConstructorDrivers(
  season: string,
  constructorId: string
): Promise<DriverLite[]> {
  const res = await fetch(
    `${BASE}/${encodeURIComponent(season)}/constructors/${encodeURIComponent(constructorId)}/drivers.json`
  );
  if (!res.ok) throw new Error("Constructor drivers failed");
  const json = await res.json();
  const list = json?.MRData?.DriverTable?.Drivers ?? [];
  return list.map(
    (d: any): DriverLite => ({
      driverId: d.driverId,
      givenName: d.givenName,
      familyName: d.familyName,
      code: d.code,
      permanentNumber: d.permanentNumber,
      nationality: d.nationality,
    })
  );
}

export async function getConstructorSeasonsCount(
  constructorId: string
): Promise<number> {
  const res = await fetch(
    `${BASE}/constructors/${encodeURIComponent(constructorId)}/seasons.json?limit=2000`
  );
  if (!res.ok) throw new Error("Constructor seasons failed");
  const json = await res.json();
  const seasons = json?.MRData?.SeasonTable?.Seasons ?? [];
  return seasons.length;
}

export async function getConstructorSeasonsList(
  constructorId: string
): Promise<string[]> {
  const res = await fetch(
    `${BASE}/constructors/${encodeURIComponent(constructorId)}/seasons.json?limit=2000`
  );
  if (!res.ok) return [];
  const json = await res.json();
  const seasons: any[] = json?.MRData?.SeasonTable?.Seasons ?? [];
  return seasons.map((s: any) => String(s.season)).sort((a, b) => Number(b) - Number(a));
}

export async function getConstructorChampionships(
  constructorId: string
): Promise<number> {
  const res = await fetch(
    `${BASE}/constructors/${encodeURIComponent(constructorId)}/constructorstandings/1.json?limit=1`
  );
  if (!res.ok) return 0;
  const json = await res.json();
  return Number(json?.MRData?.total ?? 0);
}

export async function getConstructorTotalWins(
  constructorId: string
): Promise<number> {
  const res = await fetch(
    `${BASE}/constructors/${encodeURIComponent(constructorId)}/results/1.json?limit=2000`
  );
  if (!res.ok) throw new Error("Constructor total wins failed");
  const json = await res.json();
  const races = json?.MRData?.RaceTable?.Races ?? [];
  let count = 0;
  for (const r of races) {
    const arr = r?.Results ?? [];
    count += arr.length;
  }
  return count;
}

export async function getConstructorInfo(
  constructorId: string
): Promise<ConstructorInfo | null> {
  const res = await fetch(
    `${BASE}/constructors/${encodeURIComponent(constructorId)}.json`
  );
  if (!res.ok) throw new Error("Constructor info failed");
  const json = await res.json();
  const item = json?.MRData?.ConstructorTable?.Constructors?.[0];
  if (!item) return null;
  return {
    constructorId: item.constructorId,
    name: item.name,
    nationality: item.nationality,
    url: item.url,
  };
}

/* ————— Race results (used by Elo engine) ————— */

export type DriverRaceResult = {
  driverId: string;
  constructorId: string;
  position: number; // classified position; DNF drivers still get a position in Ergast
};

export type SeasonRaceResult = {
  round: number;
  results: DriverRaceResult[];
};

/**
 * Returns all completed race results for a season in one API call.
 * Ergast returns only finished races, so no date filtering needed.
 */
export async function getSeasonResults(season: string): Promise<SeasonRaceResult[]> {
  const res = await fetch(`${BASE}/${encodeURIComponent(season)}/results.json?limit=1000`);
  if (!res.ok) throw new Error(`Season results fetch failed: ${season}`);
  const json = await res.json();
  const races: any[] = json?.MRData?.RaceTable?.Races ?? [];
  return races.map(r => ({
    round: Number(r.round),
    results: (r.Results ?? []).map((x: any) => ({
      driverId:      x.Driver.driverId,
      constructorId: x.Constructor.constructorId,
      position:      Number(x.position),
    })),
  }));
}

/* ————— Circuit historical results ————— */

export type CircuitRaceEntry = {
  season: string;
  driverResults: {
    driverId: string;
    constructorId: string;
    position: number;
  }[];
};

/**
 * Returns all historical race results at a specific circuit.
 * Used by the next-race prediction engine.
 */
export async function getCircuitHistoricalResults(circuitId: string): Promise<CircuitRaceEntry[]> {
  const res = await fetch(`${BASE}/circuits/${encodeURIComponent(circuitId)}/results.json?limit=500`);
  if (!res.ok) throw new Error(`Circuit results fetch failed: ${circuitId}`);
  const json = await res.json();
  const races: any[] = json?.MRData?.RaceTable?.Races ?? [];
  return races.map(r => ({
    season: r.season,
    driverResults: (r.Results ?? []).map((x: any) => ({
      driverId:      x.Driver.driverId,
      constructorId: x.Constructor.constructorId,
      position:      Number(x.position),
    })),
  }));
}

/* ————— Enhanced API functions for home screen ————— */

export async function getTopDrivers(season: string, limit: number = 3): Promise<DriverStanding[]> {
  const standings = await getDriverStandings(season);
  return standings.slice(0, limit);
}

export async function getTopConstructors(season: string, limit: number = 3): Promise<ConstructorStanding[]> {
  const standings = await getConstructorStandings(season);
  return standings.slice(0, limit);
}

export type DriverCareerSummary = {
  bestPosition:  number | null;
  bestSeason:    string | null;
  totalWins:     number;
  seasonsInF1:   number;
  careerSeasons: string[]; // all seasons the driver raced, newest first
  constructors:  Array<{ constructorId: string; name: string; yearRange: string }>;
};

function formatYearRange(years: string[]): string {
  if (years.length === 0) return '';
  if (years.length === 1) return years[0];
  const sorted = [...years].sort();
  return `${sorted[0]}–${sorted[sorted.length - 1]}`;
}

export async function getDriverCareerSummary(driverId: string): Promise<DriverCareerSummary> {
  // Step 1: get all seasons the driver participated in
  // (The jolpi.ca mirror requires a season year on standings endpoints,
  //  so we can't use /drivers/{id}/driverstandings.json directly.)
  const seasonsRes = await fetch(`${BASE}/drivers/${encodeURIComponent(driverId)}/seasons.json?limit=100`);
  if (!seasonsRes.ok) return { bestPosition: null, bestSeason: null, totalWins: 0, seasonsInF1: 0, careerSeasons: [], constructors: [] };
  const seasonsJson = await seasonsRes.json();
  const seasons: string[] = (seasonsJson?.MRData?.SeasonTable?.Seasons ?? []).map((s: any) => String(s.season));

  if (seasons.length === 0) return { bestPosition: null, bestSeason: null, totalWins: 0, seasonsInF1: 0, careerSeasons: [], constructors: [] };

  // Step 2: fan-out — fetch each season's standing in parallel
  const results = await Promise.all(
    seasons.map(async (season) => {
      try {
        const r = await fetch(`${BASE}/${season}/drivers/${encodeURIComponent(driverId)}/driverstandings.json`);
        if (!r.ok) return null;
        const j = await r.json();
        const s = j?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings?.[0];
        return s ? { season, standing: s } : null;
      } catch { return null; }
    })
  );

  let bestPosition: number | null = null;
  let bestSeason:   string | null = null;
  let totalWins = 0;
  const constructorMap: Record<string, { name: string; seasons: string[] }> = {};

  for (const item of results) {
    if (!item) continue;
    const { season, standing } = item;
    const pos  = Number(standing.position ?? 99);
    const wins = Number(standing.wins ?? 0);
    totalWins += wins;
    if (bestPosition === null || pos < bestPosition) { bestPosition = pos; bestSeason = season; }
    for (const c of (standing.Constructors ?? [])) {
      if (!constructorMap[c.constructorId]) constructorMap[c.constructorId] = { name: c.name, seasons: [] };
      constructorMap[c.constructorId].seasons.push(season);
    }
  }

  const constructors = Object.entries(constructorMap).map(([constructorId, data]) => ({
    constructorId,
    name: data.name,
    yearRange: formatYearRange(data.seasons),
  }));

  const careerSeasons = [...seasons].sort((a, b) => Number(b) - Number(a));

  return { bestPosition, bestSeason, totalWins, seasonsInF1: seasons.length, careerSeasons, constructors };
}

// Fetch a single driver's basic info — works for any season, never null if the driver exists
export async function getDriverById(driverId: string): Promise<DriverStanding['Driver'] | null> {
  const res = await fetch(`${BASE}/drivers/${encodeURIComponent(driverId)}.json`);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.MRData?.DriverTable?.Drivers?.[0] ?? null;
}

// Fetch one driver's standing for a specific season via the targeted endpoint
export async function getDriverStandingById(season: string, driverId: string): Promise<DriverStanding | null> {
  try {
    const res = await fetch(`${BASE}/${encodeURIComponent(season)}/drivers/${encodeURIComponent(driverId)}/driverstandings.json`);
    if (!res.ok) return null;
    const json = await res.json();
    const it = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings?.[0] ?? null;
    if (!it) return null;
    return {
      position: Number(it.position),
      points:   Number(it.points),
      wins:     Number(it.wins),
      Driver:   it.Driver,
      Constructors: it.Constructors ?? [],
    };
  } catch {
    return null;
  }
}

export type DriverSeasonResult = {
  round: number;
  raceName: string;
  position: number | null;
  status: string;
};

export async function getDriverSeasonResults(season: string, driverId: string): Promise<DriverSeasonResult[]> {
  const res = await fetch(`${BASE}/${encodeURIComponent(season)}/drivers/${encodeURIComponent(driverId)}/results.json?limit=100`);
  if (!res.ok) throw new Error('Driver results fetch failed');
  const json = await res.json();
  const races: any[] = json?.MRData?.RaceTable?.Races ?? [];
  return races.map(r => {
    const result = r.Results?.[0];
    return {
      round: Number(r.round),
      raceName: r.raceName,
      position: result?.position ? Number(result.position) : null,
      status: result?.status ?? '',
    };
  });
}

export async function getNextRace(season: string): Promise<Race | null> {
  const races = await getSeasonRaces(season);
  const now = new Date();
  
  const upcomingRaces = races.filter(race => {
    const raceDate = new Date(race.date);
    return raceDate > now;
  });
  
  return upcomingRaces.length > 0 ? upcomingRaces[0] : null;
}

export type RacePodium = {
  p1: { driverId: string; name: string };
  p2: { driverId: string; name: string };
  p3: { driverId: string; name: string };
};

export async function getRaceResults(season: string, round: number): Promise<RacePodium | null> {
  const res = await fetch(`${BASE}/${encodeURIComponent(season)}/${round}/results.json`);
  if (!res.ok) return null;
  const json = await res.json();
  const results = json?.MRData?.RaceTable?.Races?.[0]?.Results ?? [];
  if (results.length < 3) return null;
  const fmt = (r: any) => ({
    driverId: r.Driver.driverId,
    name: `${r.Driver.givenName} ${r.Driver.familyName}`,
  });
  return { p1: fmt(results[0]), p2: fmt(results[1]), p3: fmt(results[2]) };
}

export type DriverResult = {
  position: number;
  driverId: string;
  givenName: string;
  familyName: string;
  constructorId: string;
  constructorName: string;
  time: string | null;    // "+1.234s" or race time for P1
  points: string;
  status: string;         // "Finished", "+1 Lap", "Accident", etc.
};

export async function getFullRaceResults(season: string, round: string): Promise<DriverResult[]> {
  const res = await fetch(`${BASE}/${encodeURIComponent(season)}/${encodeURIComponent(round)}/results.json`);
  if (!res.ok) return [];
  const json = await res.json();
  const results: any[] = json?.MRData?.RaceTable?.Races?.[0]?.Results ?? [];
  return results.map(r => ({
    position:        Number(r.position),
    driverId:        r.Driver.driverId,
    givenName:       r.Driver.givenName,
    familyName:      r.Driver.familyName,
    constructorId:   r.Constructor.constructorId,
    constructorName: r.Constructor.name,
    time:            r.Time?.time ?? null,
    points:          r.points,
    status:          r.status,
  }));
}

export async function getLatestRaceResults(season: string): Promise<Race | null> {
  const races = await getSeasonRaces(season);
  const now = new Date();
  
  const completedRaces = races.filter(race => {
    const raceDate = new Date(race.date);
    return raceDate < now;
  });
  
  return completedRaces.length > 0 ? completedRaces[completedRaces.length - 1] : null;
}