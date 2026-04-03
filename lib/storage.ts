import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITE_DRIVERS_KEY = 'favorite_drivers';
const FAVORITE_CONSTRUCTORS_KEY = 'favorite_constructors';

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

