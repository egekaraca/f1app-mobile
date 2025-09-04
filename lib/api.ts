const BASE = "https://api.jolpi.ca/ergast/f1";

import type { Race } from "../types/race";

export async function getSeasonRaces(season: string): Promise<Race[]> {
  const res = await fetch(`${BASE}/${season}.json`);
  if (!res.ok) throw new Error("Races fetch failed");
  const json = await res.json();
  const races: Race[] = json?.MRData?.RaceTable?.Races ?? [];
  return races;
}

/** UTC tarih+saat stringlerini cihaz saatine çevirip okunur yapar */
export function formatRaceDateTimeLocal(date: string, time?: string) {
  // Ergast genelde UTC saat verir (örn "14:00:00Z"); yoksa sadece tarihi gösterelim
  try {
    const iso = time ? `${date}T${time}` : `${date}T00:00:00Z`;
    const d = new Date(iso);
    // Cihazın yerel saatine göre: gün/ay, saat:dakika
    const dateStr = new Intl.DateTimeFormat(undefined, {
      year: "numeric", month: "short", day: "2-digit",
      weekday: "short"
    }).format(d);
    const timeStr = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit", minute: "2-digit"
    }).format(d);
    return { dateStr, timeStr };
  } catch {
    return { dateStr: date, timeStr: "" };
  }
}
import type { DriverStanding, ConstructorStanding } from "../types/standings";


/** Sezon sürücü puan durumu */
export async function getDriverStandings(season: string): Promise<DriverStanding[]> {
  const res = await fetch(`${BASE}/${season}/driverstandings.json`);
  if (!res.ok) throw new Error("Driver standings fetch failed");
  const json = await res.json();
  const list = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
  // position string gelebilir; güvence için number’a çevir
  return list.map((it: any) => ({
    position: Number(it.position),
    points: Number(it.points),
    wins: Number(it.wins),
    Driver: it.Driver,
    Constructors: it.Constructors ?? [],
  }));
}

/** Sezon takım puan durumu */
export async function getConstructorStandings(season: string): Promise<ConstructorStanding[]> {
  const res = await fetch(`${BASE}/${season}/constructorstandings.json`);
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

