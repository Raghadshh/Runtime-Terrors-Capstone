import * as Notifications from 'expo-notifications';

export const scheduleTaskNotification = async (
  taskId: string,
  title: string,
  triggerDate: Date
): Promise<string> => {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'RemindME Task Reminder',
      body: `It's time for: ${title}`,
      data: { taskId },
    },
    trigger: triggerDate,
  });

  return notificationId;
};

export const cancelTaskNotification = async (notificationId: string): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};