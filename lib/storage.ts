import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITE_DRIVERS_KEY = 'favorite_drivers';
const FAVORITE_CONSTRUCTORS_KEY = 'favorite_constructors';
const USER_PICKS_KEY = 'user_race_picks';

// ─── User race pick types ─────────────────────────────────────────────────────

export type PickResult = {
  actualP1Id: string;
  actualP2Id: string;
  actualP3Id: string;
  p1Correct: boolean;
  p2Correct: boolean;
  p3Correct: boolean;
  score: number; // 0–6: P1 hit=3pts, P2 hit=2pts, P3 hit=1pt
};

export type UserPick = {
  raceId: string;      // "{season}-{round}"
  raceName: string;
  raceDate: string;
  round: number;
  season: string;
  p1DriverId: string;
  p1Name: string;
  p2DriverId?: string;
  p2Name?: string;
  p3DriverId?: string;
  p3Name?: string;
  submittedAt: string;
  result?: PickResult; // filled in after race day
};

// ─── Pick storage helpers ────────────────────────────────────────────────────

export async function getUserPicks(): Promise<UserPick[]> {
  try {
    const stored = await AsyncStorage.getItem(USER_PICKS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function saveUserPick(pick: UserPick): Promise<void> {
  try {
    const picks = await getUserPicks();
    const idx = picks.findIndex(p => p.raceId === pick.raceId);
    if (idx >= 0) {
      picks[idx] = pick;
    } else {
      picks.unshift(pick);
    }
    await AsyncStorage.setItem(USER_PICKS_KEY, JSON.stringify(picks));
  } catch {
    // silently fail
  }
}

export async function updatePickResult(raceId: string, result: PickResult): Promise<void> {
  try {
    const picks = await getUserPicks();
    const idx = picks.findIndex(p => p.raceId === raceId);
    if (idx >= 0) {
      picks[idx].result = result;
      await AsyncStorage.setItem(USER_PICKS_KEY, JSON.stringify(picks));
    }
  } catch {
    // silently fail
  }
}

export async function getFavoriteDrivers(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(FAVORITE_DRIVERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting favorite drivers:', error);
    return [];
  }
}

export async function setFavoriteDrivers(driverIds: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FAVORITE_DRIVERS_KEY, JSON.stringify(driverIds));
  } catch (error) {
    console.error('Error setting favorite drivers:', error);
  }
}

export async function getFavoriteConstructors(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(FAVORITE_CONSTRUCTORS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting favorite constructors:', error);
    return [];
  }
}

export async function setFavoriteConstructors(constructorIds: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FAVORITE_CONSTRUCTORS_KEY, JSON.stringify(constructorIds));
  } catch (error) {
    console.error('Error setting favorite constructors:', error);
  }
}

