// lib/openf1.ts
// Free-tier OpenF1 REST API — historical data from 2023+
// Docs: https://openf1.org/docs/

const BASE = 'https://api.openf1.org/v1';

// ─── Types ────────────────────────────────────────────────────────

export type OpenF1Meeting = {
  meeting_key: number;
  meeting_name: string;
  location: string;        // e.g. "Sakhir", "Melbourne"
  country_name: string;
  circuit_short_name: string;
  date_start: string;      // ISO date of first session (FP1)
  year: number;
};

export type OpenF1Session = {
  session_key: number;
  session_name: string;    // "Race", "Qualifying", "Practice 1", "Sprint", etc.
  session_type: string;    // "Race", "Qualifying", "Practice"
  date_start: string;
  date_end: string;
  circuit_short_name: string;
  country_name: string;
  year: number;
  meeting_key: number;
};

export type OpenF1Weather = {
  air_temperature: number;
  date: string;
  humidity: number;
  pressure: number;
  rainfall: number;        // 0 = dry, 1 = wet
  session_key: number;
  track_temperature: number;
  wind_direction: number;  // degrees
  wind_speed: number;      // m/s
};

export type OpenF1Stint = {
  compound: string;        // "SOFT" | "MEDIUM" | "HARD" | "INTERMEDIATE" | "WET"
  driver_number: number;
  lap_end: number;
  lap_start: number;
  session_key: number;
  stint_number: number;
  tyre_age_at_start: number;
};

export type OpenF1RaceControl = {
  category: string;        // "Flag" | "SafetyCar" | "Drs" | "Other"
  date: string;
  flag: string | null;     // "GREEN" | "YELLOW" | "RED" | "SAFETY_CAR" | etc.
  lap_number: number | null;
  message: string;
  scope: string | null;    // "Track" | "Driver" | "Sector"
  sector: number | null;
  session_key: number;
  driver_number: number | null;
};

export type OpenF1Driver = {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;   // 3-letter code (e.g. "NOR", "VER")
  team_name: string;
  team_colour: string;    // hex without #
  session_key: number;
};

// ─── Compound → colour mapping ────────────────────────────────────

export const TYRE_COLORS: Record<string, string> = {
  SOFT:         '#E8002D',
  MEDIUM:       '#FFF200',
  HARD:         '#FFFFFF',
  INTERMEDIATE: '#39B54A',
  WET:          '#0067FF',
};

// ─── Locality matching ────────────────────────────────────────────
// Ergast Race.Circuit.Location.locality → used to find the right OpenF1 meeting.
// Most match directly; this map handles the exceptions.
const LOCALITY_OVERRIDES: Record<string, string> = {
  'São Paulo':   'São Paulo',
  'Sao Paulo':   'São Paulo',
  'Le Castellet': 'Le Castellet',
};

function normaliseLocality(s: string): string {
  return (LOCALITY_OVERRIDES[s] ?? s).toLowerCase();
}

// ─── Meeting discovery ────────────────────────────────────────────

/** Fetch all Grand Prix meetings for a given year. */
export async function getMeetings(year: number): Promise<OpenF1Meeting[]> {
  const res = await fetch(`${BASE}/meetings?year=${year}`);
  if (!res.ok) return [];
  return res.json();
}

/**
 * Find the OpenF1 meeting that corresponds to an Ergast race.
 * Matches on circuit locality (most reliable cross-API key).
 */
export function findMeeting(
  meetings: OpenF1Meeting[],
  locality: string,
): OpenF1Meeting | undefined {
  const target = normaliseLocality(locality);
  return meetings.find(m => normaliseLocality(m.location) === target);
}

// ─── Sessions ─────────────────────────────────────────────────────

/** All sessions for a meeting (FP1, FP2, FP3, Qualifying, Race, Sprint…). */
export async function getMeetingSessions(meetingKey: number): Promise<OpenF1Session[]> {
  const res = await fetch(`${BASE}/sessions?meeting_key=${meetingKey}`);
  if (!res.ok) return [];
  const data: OpenF1Session[] = await res.json();
  // Sort chronologically
  return data.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
}

/** Get the session_key for the Race session of a meeting. */
export async function getRaceSessionKey(meetingKey: number): Promise<number | null> {
  const sessions = await getMeetingSessions(meetingKey);
  const race = sessions.find(s => s.session_name === 'Race');
  return race?.session_key ?? null;
}

// ─── Weather ──────────────────────────────────────────────────────

/**
 * Returns the most representative weather reading for a session.
 * OpenF1 updates every ~60 seconds — we return the median reading
 * (roughly mid-session) rather than start or end.
 */
export async function getSessionWeather(sessionKey: number): Promise<OpenF1Weather | null> {
  const res = await fetch(`${BASE}/weather?session_key=${sessionKey}`);
  if (!res.ok) return null;
  const data: OpenF1Weather[] = await res.json();
  if (data.length === 0) return null;
  return data[Math.floor(data.length / 2)];
}

// ─── Stints (tyre strategy) ───────────────────────────────────────

export async function getSessionStints(sessionKey: number): Promise<OpenF1Stint[]> {
  const res = await fetch(`${BASE}/stints?session_key=${sessionKey}`);
  if (!res.ok) return [];
  return res.json();
}

// ─── Drivers ─────────────────────────────────────────────────────

export async function getSessionDrivers(sessionKey: number): Promise<OpenF1Driver[]> {
  const res = await fetch(`${BASE}/drivers?session_key=${sessionKey}`);
  if (!res.ok) return [];
  return res.json();
}

// ─── Race control ─────────────────────────────────────────────────

/**
 * Returns only the "headline" race control events worth surfacing in the UI:
 * red flags, safety car deployments, VSC, and investigation notices.
 */
export async function getSessionHighlights(sessionKey: number): Promise<OpenF1RaceControl[]> {
  const res = await fetch(`${BASE}/race_control?session_key=${sessionKey}`);
  if (!res.ok) return [];
  const all: OpenF1RaceControl[] = await res.json();

  const KEYWORDS = ['RED FLAG', 'SAFETY CAR', 'VIRTUAL SAFETY CAR', 'INVESTIGATION', 'PENALTY', 'DISQUALIFIED', 'RETIRED'];
  return all.filter(e =>
    e.flag === 'RED' ||
    e.category === 'SafetyCar' ||
    KEYWORDS.some(kw => e.message?.toUpperCase().includes(kw))
  );
}
