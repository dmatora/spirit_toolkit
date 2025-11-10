import { Platform } from 'react-native';
import notifee, {
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import {
  getPrayerActivityThresholds,
  type PrayerActivityThresholds,
} from '@spirit/prayer-feature/prayer/services/prayerActivityConfig';
import {
  getLastPrayerActivitySync,
  hydratePrayerActivityFromStorage,
  subscribeToPrayerActivity,
} from '@spirit/prayer-feature/prayer/services/prayerActivityState';

const PRAYER_ACTIVITY_CHANNEL_ID = 'prayer-activity';
const WARNING_NOTIFICATION_ID = 'prayer-activity-warning';
const DANGER_NOTIFICATION_ID = 'prayer-activity-danger';
const MIN_DELAY_MS = 15000;
const MS_IN_MINUTE = 60000;

let currentThresholds: PrayerActivityThresholds | null = null;
let activityUnsubscribe: (() => void) | null = null;
let isInitialized = false;

const warn = (error: unknown, context = 'unknown'): void => {
  console.warn(`[PrayerActivityNotifications] ${context}`, error);
};

const ensurePrayerActivityChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await notifee.createChannel({
      id: PRAYER_ACTIVITY_CHANNEL_ID,
      name: 'Prayer activity',
      importance: AndroidImportance.DEFAULT,
    });
  } catch (error) {
    warn(error, 'createChannel');
  }
};

const cancelScheduledPrayerActivityNotifications = async (): Promise<void> => {
  try {
    await notifee.cancelNotification(WARNING_NOTIFICATION_ID);
  } catch (error) {
    warn(error, 'cancel warning');
  }

  try {
    await notifee.cancelNotification(DANGER_NOTIFICATION_ID);
  } catch (error) {
    warn(error, 'cancel danger');
  }
};

const schedulePrayerActivityNotificationsForTimestamp = async (
  lastActivity: number | null,
): Promise<void> => {
  await ensurePrayerActivityChannel();
  await cancelScheduledPrayerActivityNotifications();

  if (lastActivity === null || currentThresholds === null) {
    return;
  }

  const nowWithGrace = Date.now() + MIN_DELAY_MS;
  const scheduleNotification = async (
    minutes: number,
    notificationId: string,
    title: string,
    body: string,
  ): Promise<void> => {
    if (minutes <= 0) {
      return;
    }

    const triggerTimestamp = lastActivity + minutes * MS_IN_MINUTE;
    if (triggerTimestamp <= nowWithGrace) {
      return;
    }

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerTimestamp,
    };

    try {
      await notifee.createTriggerNotification(
        {
          id: notificationId,
          title,
          body,
          android: Platform.OS === 'android' ? { channelId: PRAYER_ACTIVITY_CHANNEL_ID } : undefined,
          ios: { sound: 'angels_sing_in_heaven.caf' },
        },
        trigger,
      );
    } catch (error) {
      warn(error, `schedule ${notificationId}`);
    }
  };

  await scheduleNotification(
    currentThresholds.warningMinutes,
    WARNING_NOTIFICATION_ID,
    'Пора вернуться к молитве',
    `Прошло более ${currentThresholds.warningMinutes} минут с последней молитвы.`,
  );

  await scheduleNotification(
    currentThresholds.dangerMinutes,
    DANGER_NOTIFICATION_ID,
    'Вы давно не молились',
    `Прошло более ${currentThresholds.dangerMinutes} минут с последней молитвы.`,
  );
};

const rescheduleFromCurrentState = async (): Promise<void> => {
  await schedulePrayerActivityNotificationsForTimestamp(getLastPrayerActivitySync());
};

export const initializePrayerActivityNotifications = async (): Promise<void> => {
  if (isInitialized) {
    return;
  }
  isInitialized = true;

  try {
    try {
      await notifee.requestPermission();
    } catch (error) {
      warn(error, 'request permission');
    }

    const [, thresholds] = await Promise.all([
      hydratePrayerActivityFromStorage(),
      getPrayerActivityThresholds(),
    ]);
    currentThresholds = thresholds;

    await rescheduleFromCurrentState();

    activityUnsubscribe = subscribeToPrayerActivity((timestamp) => {
      schedulePrayerActivityNotificationsForTimestamp(timestamp).catch((error) =>
        warn(error, 'schedule on activity'),
      );
    });
  } catch (error) {
    warn(error, 'initialize');
    isInitialized = false;
  }
};

export const updatePrayerActivityNotificationThresholds = async (
  thresholds: PrayerActivityThresholds,
): Promise<void> => {
  currentThresholds = thresholds;

  try {
    await rescheduleFromCurrentState();
  } catch (error) {
    warn(error, 'update thresholds');
  }
};

export const stopPrayerActivityNotifications = (): void => {
  if (activityUnsubscribe) {
    activityUnsubscribe();
    activityUnsubscribe = null;
  }

  cancelScheduledPrayerActivityNotifications().catch((error) =>
    warn(error, 'cancel during stop'),
  );

  isInitialized = false;
};
