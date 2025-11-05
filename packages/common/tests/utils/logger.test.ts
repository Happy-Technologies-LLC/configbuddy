/**
 * Logger Utility Tests
 *
 * Tests for Winston-based logging functionality including:
 * - Logger creation with various configurations
 * - Log level filtering
 * - Transport configuration (console, file)
 * - Child logger creation
 * - Log helper functions
 */

import winston from 'winston';
import { createLogger, createChildLogger, log, LogLevel } from '../../src/utils/logger';

// Mock winston to avoid actual file/console output
jest.mock('winston', () => {
  const mFormat = {
    _json: jest.fn(() => 'json-format'),
    _combine: jest.fn((...args) => 'combined-format'),
    _colorize: jest.fn(() => 'colorize-format'),
    _timestamp: jest.fn(() => 'timestamp-format'),
    _errors: jest.fn(() => 'errors-format'),
    _printf: jest.fn(() => 'printf-format'),
    _metadata: jest.fn(() => 'metadata-format'),
  };

  const mTransports = {
    _Console: jest.fn(),
    _File: jest.fn(),
  };

  const mockLogger = {
    _error: jest.fn(),
    _warn: jest.fn(),
    _info: jest.fn(),
    _http: jest.fn(),
    _verbose: jest.fn(),
    _debug: jest.fn(),
    _child: jest.fn(() => mockLogger),
  };

  return {
    _format: mFormat,
    _transports: mTransports,
    _createLogger: jest.fn(() => mockLogger),
  };
});

describe('Logger Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.LOG_LEVEL;
    delete process.env.SERVICE_NAME;
    delete process.env.NODE_ENV;
  });

  describe('createLogger', () => {
    it('should create a logger with default options', () => {
      const logger = createLogger();

      expect(winston.createLogger).toHaveBeenCalled();
      const call = (winston.createLogger as jest.Mock).mock.calls[0][0];
      expect(call.level).toBe('info');
      expect(call.defaultMeta.service).toBe('cmdb');
    });

    it('should create a logger with custom log level', () => {
      const logger = createLogger({ level: 'debug' });

      expect(winston.createLogger).toHaveBeenCalled();
      const call = (winston.createLogger as jest.Mock).mock.calls[0][0];
      expect(call.level).toBe('debug');
    });

    it('should create a logger with custom service name', () => {
      const logger = createLogger({ service: 'test-service' });

      expect(winston.createLogger).toHaveBeenCalled();
      const call = (winston.createLogger as jest.Mock).mock.calls[0][0];
      expect(call.defaultMeta.service).toBe('test-service');
    });

    it('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'warn';
      const logger = createLogger();

      expect(winston.createLogger).toHaveBeenCalled();
      const call = (winston.createLogger as jest.Mock).mock.calls[0][0];
      expect(call.level).toBe('warn');
    });

    it('should respect SERVICE_NAME environment variable', () => {
      process.env.SERVICE_NAME = 'custom-service';
      const logger = createLogger();

      expect(winston.createLogger).toHaveBeenCalled();
      const call = (winston.createLogger as jest.Mock).mock.calls[0][0];
      expect(call.defaultMeta.service).toBe('custom-service');
    });

    it('should enable JSON format in production', () => {
      process.env.NODE_ENV = 'production';
      const logger = createLogger();

      expect(winston.format.json).toHaveBeenCalled();
    });

    it('should use pretty format in development', () => {
      process.env.NODE_ENV = 'development';
      const logger = createLogger();

      expect(winston.format.colorize).toHaveBeenCalled();
      expect(winston.format.printf).toHaveBeenCalled();
    });

    it('should configure console transport when enabled', () => {
      const logger = createLogger({ console: true });

      expect(winston.transports.Console).toHaveBeenCalled();
    });

    it('should not configure console transport when disabled', () => {
      const logger = createLogger({ console: false });

      expect(winston.transports.Console).not.toHaveBeenCalled();
    });

    it('should configure file transports when paths provided', () => {
      const logger = createLogger({
        _errorFile: '/tmp/error.log',
        _combinedFile: '/tmp/combined.log',
      });

      expect(winston.transports.File).toHaveBeenCalledTimes(2);
      const calls = (winston.transports.File as jest.Mock).mock.calls;
      expect(calls[0][0].filename).toBe('/tmp/error.log');
      expect(calls[0][0].level).toBe('error');
      expect(calls[1][0].filename).toBe('/tmp/combined.log');
    });

    it('should set exitOnError to false', () => {
      const logger = createLogger();

      expect(winston.createLogger).toHaveBeenCalled();
      const call = (winston.createLogger as jest.Mock).mock.calls[0][0];
      expect(call.exitOnError).toBe(false);
    });
  });

  describe('createChildLogger', () => {
    it('should create a child logger with additional context', () => {
      const mockLogger = (winston.createLogger as jest.Mock)();
      const context = { requestId: '123', userId: 'user-1' };

      createChildLogger(context);

      expect(mockLogger.child).toHaveBeenCalledWith(context);
    });
  });

  describe('log helper functions', () => {
    let mockLogger: any;

    beforeEach(() => {
      mockLogger = (winston.createLogger as jest.Mock)();
    });

    it('should call logger.error with message and metadata', () => {
      const message = 'Test error';
      const meta = { code: 'ERR_001' };

      log.error(message, meta);

      expect(mockLogger.error).toHaveBeenCalledWith(message, meta);
    });

    it('should call logger.warn with message and metadata', () => {
      const message = 'Test warning';
      const meta = { deprecated: true };

      log.warn(message, meta);

      expect(mockLogger.warn).toHaveBeenCalledWith(message, meta);
    });

    it('should call logger.info with message and metadata', () => {
      const message = 'Test info';
      const meta = { status: 'ok' };

      log.info(message, meta);

      expect(mockLogger.info).toHaveBeenCalledWith(message, meta);
    });

    it('should call logger.http with message and metadata', () => {
      const message = 'HTTP request';
      const meta = { method: 'GET', path: '/api/v1/ci' };

      log.http(message, meta);

      expect(mockLogger.http).toHaveBeenCalledWith(message, meta);
    });

    it('should call logger.verbose with message and metadata', () => {
      const message = 'Verbose log';

      log.verbose(message);

      expect(mockLogger.verbose).toHaveBeenCalledWith(message, undefined);
    });

    it('should call logger.debug with message and metadata', () => {
      const message = 'Debug info';
      const meta = { query: 'MATCH (n) RETURN n' };

      log.debug(message, meta);

      expect(mockLogger.debug).toHaveBeenCalledWith(message, meta);
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const logger = createLogger({});

      expect(winston.createLogger).toHaveBeenCalled();
    });

    it('should handle undefined options', () => {
      const logger = createLogger(undefined);

      expect(winston.createLogger).toHaveBeenCalled();
    });

    it('should handle log calls without metadata', () => {
      const mockLogger = (winston.createLogger as jest.Mock)();

      log.info('No metadata');

      expect(mockLogger.info).toHaveBeenCalledWith('No metadata', undefined);
    });

    it('should handle empty context for child logger', () => {
      const mockLogger = (winston.createLogger as jest.Mock)();

      createChildLogger({});

      expect(mockLogger.child).toHaveBeenCalledWith({});
    });
  });
});
