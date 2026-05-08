import { describe, it, expect } from 'vitest';
import { sessionPillTone, sessionPillLabel } from '@/lib/session-status';

describe('sessionPillTone', () => {
  it('returns success for completed', () => {
    expect(sessionPillTone('completed')).toBe('success');
  });

  it('returns accent for in_progress', () => {
    expect(sessionPillTone('in_progress')).toBe('accent');
  });

  it('returns danger for cancelled', () => {
    expect(sessionPillTone('cancelled')).toBe('danger');
  });

  it('returns primary for upcoming', () => {
    expect(sessionPillTone('upcoming')).toBe('primary');
  });

  it('returns primary for unknown status', () => {
    expect(sessionPillTone('unknown_future_status')).toBe('primary');
  });
});

describe('sessionPillLabel', () => {
  it('returns Final for completed', () => {
    expect(sessionPillLabel('completed')).toBe('Final');
  });

  it('returns Live for in_progress', () => {
    expect(sessionPillLabel('in_progress')).toBe('Live');
  });

  it('returns Cancelled for cancelled', () => {
    expect(sessionPillLabel('cancelled')).toBe('Cancelled');
  });

  it('returns Upcoming for upcoming', () => {
    expect(sessionPillLabel('upcoming')).toBe('Upcoming');
  });

  it('returns Upcoming for unknown status', () => {
    expect(sessionPillLabel('unknown_future_status')).toBe('Upcoming');
  });
});
