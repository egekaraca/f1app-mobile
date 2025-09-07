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
