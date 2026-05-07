type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

const format = (entry: LogEntry): string => {
  const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  return `[${entry.level.toUpperCase()}] ${entry.message}${ctx}`;
};

const emit = (entry: LogEntry): void => {
  const line = format(entry);
  if (entry.level === 'error') {
    console.error(line);
    return;
  }
  if (entry.level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
};

const build = (
  level: LogLevel,
  message: string,
  context: Record<string, unknown> | undefined,
): LogEntry => {
  if (context === undefined) {
    return { level, message };
  }
  return { level, message, context };
};

export const logger = {
  debug: (message: string, context?: Record<string, unknown>): void =>
    emit(build('debug', message, context)),
  info: (message: string, context?: Record<string, unknown>): void =>
    emit(build('info', message, context)),
  warn: (message: string, context?: Record<string, unknown>): void =>
    emit(build('warn', message, context)),
  error: (message: string, context?: Record<string, unknown>): void =>
    emit(build('error', message, context)),
  format,
};
