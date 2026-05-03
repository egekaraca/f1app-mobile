import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import { setNotificationsEnabled } from './storage';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export async function getNotificationPermissionStatus(): Promise<PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionStatus;
}

// Requests system permission and saves the in-app preference.
// Returns the resulting system permission status.
export async function requestNotificationPermission(): Promise<PermissionStatus> {
  const { status } = await Notifications.requestPermissionsAsync();
  const granted = status === 'granted';
  await setNotificationsEnabled(granted);
  return status as PermissionStatus;
}

// Opens the system settings app so the user can change notification permissions.
export function openNotificationSettings() {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
}
