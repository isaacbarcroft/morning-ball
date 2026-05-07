// Send push notifications via Expo's push API.
// https://docs.expo.dev/push-notifications/sending-notifications/

interface ExpoPushMessage {
  to: string;
  title?: string;
  body: string;
  sound?: 'default';
  data?: Record<string, unknown>;
  badge?: number;
}

export const sendExpoPush = async (messages: ExpoPushMessage[]): Promise<void> => {
  if (messages.length === 0) return;
  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }
  for (const chunk of chunks) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      console.warn(`expo push api error: ${res.status} ${await res.text()}`);
    }
  }
};

export const looksLikeExpoPushToken = (token: string | null): token is string =>
  typeof token === 'string' && token.startsWith('ExponentPushToken[');
