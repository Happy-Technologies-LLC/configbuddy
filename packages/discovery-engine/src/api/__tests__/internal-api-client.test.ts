// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

// packages/discovery-engine/src/api/__tests__/internal-api-client.test.ts

import axios from 'axios';
import { InternalAPIClient } from '../internal-api-client';
import { DiscoveredCI } from '@cmdb/common';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('InternalAPIClient', () => {
  let client: InternalAPIClient;
  const mockCreate = jest.fn();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock axios.create to return a mock instance
    const mockAxiosInstance = {
      post: jest.fn(),
      put: jest.fn(),
      get: jest.fn(),
      interceptors: {
        response: {
          use: jest.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    mockedAxios.isAxiosError = jest.fn().mockReturnValue(false);

    client = new InternalAPIClient();
  });

  describe('createCI', () => {
    it('should create a CI via API with correct headers', async () => {
      const mockCI: DiscoveredCI = {
        _id: 'test-ci-1',
        name: 'Test Server',
        _type: 'server',
        status: 'active',
        discovery_job_id: 'job-123',
        discovery_provider: 'aws',
        confidence_score: 0.95,
        metadata: { region: 'us-east-1' },
      };

      const mockResponse = {
        data: {
          _success: true,
          _data: { id: 'test-ci-1', name: 'Test Server' },
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      await client.createCI(mockCI);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/cis',
        expect.objectContaining({
          id: 'test-ci-1',
          name: 'Test Server',
          type: 'server',
          status: 'active',
          metadata: expect.objectContaining({
            region: 'us-east-1',
            discovery_job_id: 'job-123',
            discovery_provider: 'aws',
            confidence_score: 0.95,
          }),
        })
      );
    });

    it('should include discovery metadata in CI creation', async () => {
      const mockCI: DiscoveredCI = {
        _id: 'test-ci-2',
        name: 'Azure VM',
        _type: 'virtual-machine',
        discovery_job_id: 'job-456',
        discovery_provider: 'azure',
        confidence_score: 0.88,
      };

      const mockResponse = {
        data: { _success: true, _data: { id: 'test-ci-2' } },
      };

      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      await client.createCI(mockCI);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/cis',
        expect.objectContaining({
          metadata: expect.objectContaining({
            discovery_job_id: 'job-456',
            discovery_provider: 'azure',
            confidence_score: 0.88,
          }),
        })
      );
    });
  });

  describe('updateCI', () => {
    it('should update a CI via API with discovery metadata', async () => {
      const mockCI: DiscoveredCI = {
        _id: 'test-ci-1',
        name: 'Updated Server',
        _type: 'server',
        status: 'maintenance',
        discovery_job_id: 'job-789',
        discovery_provider: 'ssh',
        confidence_score: 0.92,
        metadata: { os: 'ubuntu-22.04' },
      };

      const mockResponse = {
        data: { _success: true, _data: { id: 'test-ci-1' } },
      };

      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.put as jest.Mock).mockResolvedValue(mockResponse);

      await client.updateCI('test-ci-1', mockCI);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/api/v1/cis/test-ci-1',
        expect.objectContaining({
          _name: 'Updated Server',
          _status: 'maintenance',
          _metadata: expect.objectContaining({
            os: 'ubuntu-22.04',
            discovery_job_id: 'job-789',
            discovery_provider: 'ssh',
            confidence_score: 0.92,
            last_discovered_at: expect.any(String),
          }),
        })
      );
    });
  });

  describe('getCI', () => {
    it('should return CI when found', async () => {
      const mockResponse = {
        data: {
          _success: true,
          _data: { id: 'test-ci-1', name: 'Test Server' },
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await client.getCI('test-ci-1');

      expect(result).toEqual({ id: 'test-ci-1', name: 'Test Server' });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/cis/test-ci-1');
    });

    it('should return null when CI not found (404)', async () => {
      const mockAxiosInstance = mockedAxios.create();
      const mockError = {
        response: { status: 404 },
      };
      (mockAxiosInstance.get as jest.Mock).mockRejectedValue(mockError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const result = await client.getCI('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('configuration', () => {
    it('should use default API URL when CMDB_API_URL not set', () => {
      const originalEnv = process.env['CMDB_API_URL'];
      delete process.env['CMDB_API_URL'];

      new InternalAPIClient();

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:3000',
        })
      );

      if (originalEnv) process.env['CMDB_API_URL'] = originalEnv;
    });

    it('should include x-actor header for audit logging', () => {
      new InternalAPIClient();

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-actor': 'discovery-engine',
          }),
        })
      );
    });
  });
});
