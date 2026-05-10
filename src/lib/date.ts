import { APP_TIMEZONE } from './constants';

export const todayInAppTz = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
