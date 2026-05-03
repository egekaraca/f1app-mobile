import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITE_DRIVERS_KEY = 'favorite_drivers';
const FAVORITE_CONSTRUCTORS_KEY = 'favorite_constructors';
const USER_PICKS_KEY = 'user_race_picks';
const USERNAME_KEY = 'apex_username';
const NOTIFICATIONS_ENABLED_KEY = 'apex_notifications_enabled';
const NOTIFICATION_PROMPT_SEEN_KEY = 'apex_notification_prompt_seen';

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

export async function getUsername(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(USERNAME_KEY);
    return stored ?? 'F1 Fan';
  } catch {
    return 'F1 Fan';
  }
}

export async function saveUsername(name: string): Promise<void> {
  try {
    await AsyncStorage.setItem(USERNAME_KEY, name);
  } catch {}
}

export async function getNotificationsEnabled(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    return stored === null ? false : stored === 'true';
  } catch {
    return false;
  }
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled));
  } catch {}
}

export async function hasSeenNotificationPrompt(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(NOTIFICATION_PROMPT_SEEN_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function markNotificationPromptSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_PROMPT_SEEN_KEY, 'true');
  } catch {}
}

export async function clearAllUserData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      FAVORITE_DRIVERS_KEY,
      FAVORITE_CONSTRUCTORS_KEY,
      USER_PICKS_KEY,
      USERNAME_KEY,
      NOTIFICATIONS_ENABLED_KEY,
      NOTIFICATION_PROMPT_SEEN_KEY,
    ]);
  } catch {}
}

