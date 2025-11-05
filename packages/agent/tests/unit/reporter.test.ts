/**
 * Unit tests for Reporter
 */

import * as http from 'http';
import * as https from 'https';
import { Reporter, ReportPayload } from '../../src/reporter';

// Mock http and https
jest.mock('http');
jest.mock('https');

const mockedHttp = http as jest.Mocked<typeof http>;
const mockedHttps = https as jest.Mocked<typeof https>;

describe('Reporter', () => {
  let reporter: Reporter;
  let mockRequest: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock request object
    mockRequest = {
      on: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      destroy: jest.fn(),
    };

    reporter = new Reporter({
      _apiUrl: 'http://localhost:3000/api/report',
      apiKey: 'test-api-key',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 100,
    });
  });

  describe('send', () => {
    const testPayload: ReportPayload = {
      agentId: 'test-agent-123',
      _hostname: 'test-host',
      _timestamp: new Date(),
      _data: {
        systemInfo: { cpu: 'Intel', memory: 16000000000 },
      },
    };

    it('should send report successfully on first attempt', async () => {
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler('{}');
          }
          if (event === 'end') {
            handler();
          }
          return mockResponse;
        }),
      };

      mockedHttp.request.mockImplementation((options, callback) => {
        callback!(mockResponse as any);
        return mockRequest;
      });

      const result = await reporter.send(testPayload);

      expect(result).toBe(true);
      expect(mockedHttp.request).toHaveBeenCalledTimes(1);
      expect(mockRequest.write).toHaveBeenCalled();
      expect(mockRequest.end).toHaveBeenCalled();
    });

    it('should include authorization header when API key is provided', async () => {
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'end') handler();
          return mockResponse;
        }),
      };

      mockedHttp.request.mockImplementation((options, callback) => {
        expect(options.headers).toHaveProperty('Authorization', 'Bearer test-api-key');
        callback!(mockResponse as any);
        return mockRequest;
      });

      await reporter.send(testPayload);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      let attempt = 0;

      const mockErrorResponse = {
        statusCode: 500,
        on: jest.fn((event, handler) => {
          if (event === 'data') handler('Internal Server Error');
          if (event === 'end') handler();
          return mockErrorResponse;
        }),
      };

      const mockSuccessResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'end') handler();
          return mockSuccessResponse;
        }),
      };

      mockedHttp.request.mockImplementation((options, callback) => {
        attempt++;
        callback!(attempt === 1 ? mockErrorResponse as any : mockSuccessResponse as any);
        return mockRequest;
      });

      const result = await reporter.send(testPayload);

      expect(result).toBe(true);
      expect(mockedHttp.request).toHaveBeenCalledTimes(2);
    });

    it('should fail after all retry attempts exhausted', async () => {
      const mockErrorResponse = {
        statusCode: 500,
        on: jest.fn((event, handler) => {
          if (event === 'data') handler('Error');
          if (event === 'end') handler();
          return mockErrorResponse;
        }),
      };

      mockedHttp.request.mockImplementation((options, callback) => {
        callback!(mockErrorResponse as any);
        return mockRequest;
      });

      const result = await reporter.send(testPayload);

      expect(result).toBe(false);
      expect(mockedHttp.request).toHaveBeenCalledTimes(3);
    });

    it('should handle network errors', async () => {
      mockedHttp.request.mockImplementation((options, callback) => {
        mockRequest.on.mockImplementation((event: string, handler: Function) => {
          if (event === 'error') {
            handler(new Error('Network error'));
          }
          return mockRequest;
        });
        return mockRequest;
      });

      const result = await reporter.send(testPayload);

      expect(result).toBe(false);
    });

    it('should handle timeout', async () => {
      mockedHttp.request.mockImplementation((options, callback) => {
        mockRequest.on.mockImplementation((event: string, handler: Function) => {
          if (event === 'timeout') {
            handler();
          }
          return mockRequest;
        });
        return mockRequest;
      });

      const result = await reporter.send(testPayload);

      expect(result).toBe(false);
      expect(mockRequest.destroy).toHaveBeenCalled();
    });

    it('should use HTTPS for https URLs', async () => {
      const httpsReporter = new Reporter({
        _apiUrl: 'https://api.example.com/report',
      });

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'end') handler();
          return mockResponse;
        }),
      };

      mockedHttps.request.mockImplementation((options, callback) => {
        callback!(mockResponse as any);
        return mockRequest;
      });

      await httpsReporter.send(testPayload);

      expect(mockedHttps.request).toHaveBeenCalled();
      expect(mockedHttp.request).not.toHaveBeenCalled();
    });

    it('should use correct port for HTTPS (443)', async () => {
      const httpsReporter = new Reporter({
        _apiUrl: 'https://api.example.com/report',
      });

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'end') handler();
          return mockResponse;
        }),
      };

      mockedHttps.request.mockImplementation((options, callback) => {
        expect(options.port).toBe(443);
        callback!(mockResponse as any);
        return mockRequest;
      });

      await httpsReporter.send(testPayload);
    });

    it('should handle different HTTP status codes', async () => {
      const statusCodes = [201, 204, 400, 404, 503];

      for (const statusCode of statusCodes) {
        const mockResponse = {
          statusCode,
          on: jest.fn((event, handler) => {
            if (event === 'data') handler('{}');
            if (event === 'end') handler();
            return mockResponse;
          }),
        };

        mockedHttp.request.mockImplementation((options, callback) => {
          callback!(mockResponse as any);
          return mockRequest;
        });

        const result = await reporter.send(testPayload);

        if (statusCode >= 200 && statusCode < 300) {
          expect(result).toBe(true);
        } else {
          expect(result).toBe(false);
        }
      }
    });
  });

  describe('testConnection', () => {
    it('should return true on successful connection test', async () => {
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'end') handler();
          return mockResponse;
        }),
      };

      mockedHttp.request.mockImplementation((options, callback) => {
        callback!(mockResponse as any);
        return mockRequest;
      });

      const result = await reporter.testConnection();

      expect(result).toBe(true);
    });

    it('should return false on failed connection test', async () => {
      mockedHttp.request.mockImplementation((options, callback) => {
        mockRequest.on.mockImplementation((event: string, handler: Function) => {
          if (event === 'error') {
            handler(new Error('Connection refused'));
          }
          return mockRequest;
        });
        return mockRequest;
      });

      const result = await reporter.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration properties', () => {
      reporter.updateConfig({
        timeout: 10000,
        retryAttempts: 5,
      });

      // Access private config via type assertion
      const config = (reporter as any).config;

      expect(config.timeout).toBe(10000);
      expect(config.retryAttempts).toBe(5);
    });

    it('should preserve unchanged properties', () => {
      const originalApiUrl = (reporter as any).config._apiUrl;

      reporter.updateConfig({
        timeout: 15000,
      });

      const config = (reporter as any).config;

      expect(config._apiUrl).toBe(originalApiUrl);
      expect(config.timeout).toBe(15000);
    });
  });

  describe('constructor', () => {
    it('should use default values when optional parameters not provided', () => {
      const minimalReporter = new Reporter({
        _apiUrl: 'http://localhost:3000/api',
      });

      const config = (minimalReporter as any).config;

      expect(config._apiUrl).toBe('http://localhost:3000/api');
      expect(config.apiKey).toBe('');
      expect(config.timeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.retryDelay).toBe(5000);
    });

    it('should accept all optional parameters', () => {
      const fullReporter = new Reporter({
        _apiUrl: 'https://api.example.com/report',
        apiKey: 'custom-key',
        timeout: 60000,
        retryAttempts: 5,
        retryDelay: 10000,
      });

      const config = (fullReporter as any).config;

      expect(config._apiUrl).toBe('https://api.example.com/report');
      expect(config.apiKey).toBe('custom-key');
      expect(config.timeout).toBe(60000);
      expect(config.retryAttempts).toBe(5);
      expect(config.retryDelay).toBe(10000);
    });
  });

  describe('request payload', () => {
    it('should send correct JSON payload', async () => {
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'end') handler();
          return mockResponse;
        }),
      };

      const payload: ReportPayload = {
        agentId: 'agent-456',
        _hostname: 'production-server',
        _timestamp: new Date('2025-01-15T10:00:00Z'),
        _data: {
          systemInfo: { platform: 'linux', arch: 'x64' },
          processes: { total: 150 },
        },
      };

      mockedHttp.request.mockImplementation((options, callback) => {
        callback!(mockResponse as any);
        return mockRequest;
      });

      await reporter.send(payload);

      const writtenData = mockRequest.write.mock.calls[0][0];
      const parsedPayload = JSON.parse(writtenData);

      expect(parsedPayload.agentId).toBe('agent-456');
      expect(parsedPayload._hostname).toBe('production-server');
      expect(parsedPayload._data).toHaveProperty('systemInfo');
    });

    it('should set correct content-type and content-length headers', async () => {
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'end') handler();
          return mockResponse;
        }),
      };

      const payload: ReportPayload = {
        _hostname: 'test',
        _timestamp: new Date(),
        _data: {},
      };

      mockedHttp.request.mockImplementation((options, callback) => {
        expect(options.headers).toHaveProperty('Content-Type', 'application/json');
        expect(options.headers).toHaveProperty('Content-Length');
        callback!(mockResponse as any);
        return mockRequest;
      });

      await reporter.send(payload);
    });
  });
});
