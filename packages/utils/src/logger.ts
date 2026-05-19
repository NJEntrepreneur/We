// §12: structured JSON logger — never use console.log in services
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// §12: documented log fields; keep the public API fully typed
export interface LogContext {
  traceId?: string;
  spanId?: string;
  userId?: string;
  durationMs?: number;
}

// §12: exact shape of every log line
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  durationMs?: number;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  // Returns a new logger with context merged into every subsequent line
  child(context: LogContext): Logger;
}

function buildEntry(
  level: LogLevel,
  service: string,
  message: string,
  context: LogContext,
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
  };
  if (context.traceId !== undefined) entry.traceId = context.traceId;
  if (context.spanId !== undefined) entry.spanId = context.spanId;
  if (context.userId !== undefined) entry.userId = context.userId;
  if (context.durationMs !== undefined) entry.durationMs = context.durationMs;
  return entry;
}

// Isolated so tests can intercept without mocking the full process.stdout
function writeEntry(entry: LogEntry): void {
  process.stdout.write(JSON.stringify(entry) + '\n');
}

export function createLogger(service: string, defaultContext: LogContext = {}): Logger {
  function log(level: LogLevel, message: string, context: LogContext = {}): void {
    const merged: LogContext = { ...defaultContext, ...context };
    writeEntry(buildEntry(level, service, message, merged));
  }

  return {
    debug: (msg, ctx?) => log('debug', msg, ctx),
    info:  (msg, ctx?) => log('info',  msg, ctx),
    warn:  (msg, ctx?) => log('warn',  msg, ctx),
    error: (msg, ctx?) => log('error', msg, ctx),
    child: (ctx) => createLogger(service, { ...defaultContext, ...ctx }),
  };
}
