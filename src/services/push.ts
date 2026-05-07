import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logger } from './logger';

interface RegisterResult {
  status: 'granted' | 'denied' | 'unsupported';
  token?: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const registerForPush = async (): Promise<RegisterResult> => {
  if (!Device.isDevice) {
    return { status: 'unsupported' };
  }

  const settings = await Notifications.getPermissionsAsync();
  let finalStatus = settings.status;
  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    return { status: 'denied' };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return { status: 'granted', token: tokenResponse.data };
  } catch (err) {
    logger.warn('failed to get expo push token', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: 'denied' };
  }
};
