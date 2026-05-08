import type { SessionStatus } from '@/types/domain';

export const sessionPillTone = (
  status: SessionStatus,
): 'success' | 'accent' | 'danger' | 'primary' => {
  if (status === 'completed') return 'success';
  if (status === 'in_progress') return 'accent';
  if (status === 'cancelled') return 'danger';
  return 'primary';
};

export const sessionPillLabel = (status: SessionStatus): string => {
  if (status === 'completed') return 'Final';
  if (status === 'in_progress') return 'Live';
  if (status === 'cancelled') return 'Cancelled';
  return 'Upcoming';
};
