// Slow games' notifications, the native half. The web half is
// src/lib/push.ts in the web app: it asks for `pushToken` over the bridge,
// sends the token to the room server, and the room server pushes through
// Expo's service (rooms/src/notify.ts).

import * as Notifications from 'expo-notifications'

// Shown while the app is open too: a friend's move in another game is news
// even while you are at a table.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/** Ask the system once, then hand back this install's Expo push token. */
export async function pushToken(): Promise<{ token?: string; error?: string }> {
  const current = await Notifications.getPermissionsAsync()
  const granted =
    current.granted ||
    (await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    })).granted
  if (!granted) return { error: 'denied' }
  const { data } = await Notifications.getExpoPushTokenAsync()
  return { token: data }
}

/** The page a notification opens: a path on Pip, or nothing. */
export function pathOf(response: Notifications.NotificationResponse | null | undefined): string | null {
  const url = response?.notification.request.content.data?.url
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : null
}
