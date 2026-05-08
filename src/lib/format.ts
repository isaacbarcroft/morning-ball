import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { APP_TIMEZONE } from './constants';

export const parseSessionDate = (scheduledFor: string): Date => parseISO(`${scheduledFor}T00:00:00`);

export const formatGameDate = (scheduledFor: string): string => {
  const date = parseSessionDate(scheduledFor);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
};

export const formatGameDateLong = (scheduledFor: string): string => {
  const date = parseSessionDate(scheduledFor);
  return format(date, 'EEEE, MMMM d');
};

export const formatGameTime = (scheduledTime: string): string => {
  const ref = new Date(`2000-01-01T${scheduledTime}`);
  return format(ref, 'h:mm a');
};

export const formatTimestampInTz = (iso: string, fmt: string = 'EEE, MMM d · h:mm a'): string =>
  formatInTimeZone(parseISO(iso), APP_TIMEZONE, fmt);

export const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(1)}%`;
};

export const formatStat = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return value.toFixed(1);
};

export const formatHeight = (heightInches: number | null | undefined): string => {
  if (heightInches === null || heightInches === undefined) return '—';
  const feet = Math.floor(heightInches / 12);
  const inches = heightInches % 12;
  return `${feet}'${inches}"`;
};

export const initials = (displayName: string): string => {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const letter = parts[0]?.charAt(0) ?? '?';
    return letter.toUpperCase();
  }
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts[parts.length - 1]?.charAt(0) ?? '';
  return `${first}${last}`.toUpperCase();
};
