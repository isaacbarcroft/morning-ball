// We anchor session scheduling to America/New_York, but pg_cron runs in UTC.
// These helpers convert UTC `now()` to ET to decide what "today" / "tomorrow" mean
// for the crew, regardless of DST.

export const APP_TIMEZONE = 'America/New_York' as const;

const formatter = (timeZone: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, ...options });

export const todayInAppTz = (now: Date = new Date()): string => {
  const fmt = formatter(APP_TIMEZONE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(now);
};

export const tomorrowInAppTz = (now: Date = new Date()): string => {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return todayInAppTz(tomorrow);
};

export const dayOfWeekInAppTz = (now: Date = new Date()): number => {
  const fmt = formatter(APP_TIMEZONE, { weekday: 'long' });
  const day = fmt.format(now).toLowerCase();
  const map: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  return map[day] ?? 0;
};

export const addDaysAppTz = (isoDate: string, days: number): string => {
  const [y, m, d] = isoDate.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) throw new Error(`Invalid isoDate: ${isoDate}`);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
