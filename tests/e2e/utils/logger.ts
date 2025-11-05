/**
 * E2E Test Logger
 *
 * Simple logger for E2E test setup, teardown, and execution
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

class Logger {
  private formatMessage(level: LogLevel, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(7);
    return `[${timestamp}] ${levelStr} ${args.join(' ')}`;
  }

  info(...args: any[]): void {
    console.log(colors.cyan + this.formatMessage('info', ...args) + colors.reset);
  }

  success(...args: any[]): void {
    console.log(colors.green + this.formatMessage('success', ...args) + colors.reset);
  }

  warn(...args: any[]): void {
    console.warn(colors.yellow + this.formatMessage('warn', ...args) + colors.reset);
  }

  error(...args: any[]): void {
    console.error(colors.red + this.formatMessage('error', ...args) + colors.reset);
  }

  debug(...args: any[]): void {
    if (process.env.DEBUG === 'true') {
      console.log(colors.blue + this.formatMessage('debug', ...args) + colors.reset);
    }
  }
}

export const logger = new Logger();
