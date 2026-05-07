import { describe, it, expect } from 'vitest';
import { logger } from '@/services/logger';

describe('logger.format', () => {
  it('formats a message without context', () => {
    expect(logger.format({ level: 'info', message: 'hello' })).toBe('[INFO] hello');
  });

  it('formats a message with context as JSON', () => {
    const out = logger.format({ level: 'error', message: 'boom', context: { code: 42 } });
    expect(out).toBe('[ERROR] boom {"code":42}');
  });

  it('uppercases the level', () => {
    expect(logger.format({ level: 'warn', message: 'x' })).toMatch(/^\[WARN\]/);
  });
});
