// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Logger Utility
 *
 * Centralized logging configuration using Winston.
 * Provides structured logging with different log levels and formats
 * for development and production environments.
 */

import winston from 'winston';

/**
 * Log level type
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  /** Log level (default: 'info') */
  level?: LogLevel;
  /** Service name for log context */
  service?: string;
  /** Whether to output logs to console (default: true) */
  console?: boolean;
  /** File path for error logs */
  errorFile?: string;
  /** File path for combined logs */
  combinedFile?: string;
  /** Whether to enable JSON formatting (default: true in production) */
  json?: boolean;
}

/**
 * Create and configure a Winston logger instance
 *
 * @param options - Logger configuration options
 * @returns Configured Winston logger
 */
export function createLogger(options: LoggerOptions = {}): winston.Logger {
  const {
    level = process.env['LOG_LEVEL'] || 'info',
    service = process.env['SERVICE_NAME'] || 'cmdb',
    console: enableConsole = true,
    errorFile,
    combinedFile,
    json = process.env['NODE_ENV'] === 'production',
  } = options;

  // Define log format
  const logFormat = json
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, service, ...metadata }) => {
          let msg = `${timestamp} [${service}] ${level}: ${message}`;

          // Append metadata if present
          if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
          }

          return msg;
        })
      );

  // Configure transports
  const transports: winston.transport[] = [];

  // Console transport
  if (enableConsole) {
    transports.push(
      new winston.transports.Console({
        format: logFormat,
      })
    );
  }

  // File transports
  if (errorFile) {
    transports.push(
      new winston.transports.File({
        filename: errorFile,
        level: 'error',
        format: winston.format.json(),
      })
    );
  }

  if (combinedFile) {
    transports.push(
      new winston.transports.File({
        filename: combinedFile,
        format: winston.format.json(),
      })
    );
  }

  // Create logger
  const logger = winston.createLogger({
    level,
    defaultMeta: { service },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.metadata()
    ),
    transports,
    exitOnError: false,
  });

  return logger;
}

/**
 * Default logger instance
 *
 * This is the default logger used across the application.
 * Can be configured via environment variables:
 * - LOG_LEVEL: Set log level (default: 'info')
 * - SERVICE_NAME: Set service name (default: 'cmdb')
 * - NODE_ENV: Set environment (affects formatting)
 */
export const logger = createLogger();

/**
 * Create a child logger with additional context
 *
 * @param context - Additional context to include in all logs
 * @returns Child logger with context
 */
export function createChildLogger(context: Record<string, any>): winston.Logger {
  return logger.child(context);
}

/**
 * Log helper functions
 */
export const log = {
  _error: (message: string, meta?: any) => logger.error(message, meta),
  _warn: (message: string, meta?: any) => logger.warn(message, meta),
  _info: (message: string, meta?: any) => logger.info(message, meta),
  _http: (message: string, meta?: any) => logger.http(message, meta),
  _verbose: (message: string, meta?: any) => logger.verbose(message, meta),
  _debug: (message: string, meta?: any) => logger.debug(message, meta),
};

export default logger;
