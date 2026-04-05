// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * ConnectorInstaller Tests
 *
 * Tests for ConnectorInstaller including:
 * - Package download and verification
 * - Checksum validation
 * - Package extraction
 * - Dependency installation
 * - Connector build process
 * - Installation, update, and uninstall workflows
 */

import { ConnectorInstaller, DownloadOptions } from '../../src/installer/connector-installer';
import { getConnectorRegistry } from '../../src/registry/connector-registry';
import { ConnectorMetadata, InstalledConnector } from '../../src/types/connector.types';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { promisify } from 'util';
import { exec } from 'child_process';

// Mock dependencies
jest.mock('@cmdb/common', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('../../src/registry/connector-registry');
jest.mock('fs');
jest.mock('child_process');
jest.mock('crypto');

describe('ConnectorInstaller', () => {
  let installer: ConnectorInstaller;
  let mockRegistry: any;
  let mockExecAsync: jest.Mock;
  let mockFsPromises: any;

  const sampleMetadata: ConnectorMetadata = {
    type: 'test-connector',
    name: 'Test Connector',
    version: '1.0.0',
    description: 'Test connector',
    author: 'Test',
    verified: true,
    category: 'connector',
    resources: [],
    capabilities: {
      extraction: true,
      relationships: false,
      incremental: false,
      bidirectional: false,
    },
    configuration_schema: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock exec
    mockExecAsync = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
    (exec as any).__promisify__ = mockExecAsync;

    // Mock fs promises
    mockFsPromises = {
      mkdir: jest.fn().mockResolvedValue(undefined),
      rm: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn(),
      access: jest.fn().mockResolvedValue(undefined),
    };
    (fs as any).promises = mockFsPromises;
    (fs as any).existsSync = jest.fn().mockReturnValue(true);

    // Mock crypto
    const mockHash = {
      update: jest.fn(),
      digest: jest.fn().mockReturnValue('abc123'),
    };
    (crypto.createHash as jest.Mock).mockReturnValue(mockHash);

    // Mock registry
    mockRegistry = {
      getInstalledConnector: jest.fn(),
      saveInstalledConnector: jest.fn(),
      removeInstalledConnector: jest.fn(),
      registerConnector: jest.fn(),
      getAllConnectorTypes: jest.fn().mockReturnValue([]),
    };
    (getConnectorRegistry as jest.Mock).mockReturnValue(mockRegistry);

    // Reset singleton
    (ConnectorInstaller as any).instance = null;
    installer = ConnectorInstaller.getInstance('/opt/cmdb/connectors');
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ConnectorInstaller.getInstance();
      const instance2 = ConnectorInstaller.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should use custom connectors directory', () => {
      (ConnectorInstaller as any).instance = null;
      const customInstaller = ConnectorInstaller.getInstance('/custom/path');

      expect(customInstaller).toBeDefined();
    });
  });

  describe('downloadConnector', () => {
    it('should download from URL', async () => {
      const options: DownloadOptions = {
        url: 'https://example.com/connector.tar.gz',
      };

      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });

      const packagePath = await installer.downloadConnector(
        'test-connector',
        options
      );

      expect(mockFsPromises.mkdir).toHaveBeenCalled();
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('curl -L -o')
      );
      expect(packagePath).toContain('test-connector.tar.gz');
    });

    it('should use local path if provided', async () => {
      const options: DownloadOptions = {
        localPath: '/local/path/connector.tar.gz',
      };

      mockFsPromises.access.mockResolvedValue(undefined);

      const packagePath = await installer.downloadConnector(
        'test-connector',
        options
      );

      expect(packagePath).toBe('/local/path/connector.tar.gz');
      expect(mockExecAsync).not.toHaveBeenCalled();
    });

    it('should download from registry with version', async () => {
      const options: DownloadOptions = {
        version: '1.5.0',
      };

      process.env.CONNECTOR_REGISTRY_URL = 'https://registry.test.com';

      await installer.downloadConnector('test-connector', options);

      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('https://registry.test.com/connectors/test-connector/1.5.0')
      );
    });

    it('should download latest version by default', async () => {
      await installer.downloadConnector('test-connector');

      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('/latest/package.tar.gz')
      );
    });

    it('should throw error on download failure', async () => {
      mockExecAsync.mockRejectedValue(new Error('Download failed'));

      await expect(
        installer.downloadConnector('test-connector', { url: 'https://bad.url' })
      ).rejects.toThrow('Failed to download connector test-connector');
    });

    it('should throw error if local path does not exist', async () => {
      mockFsPromises.access.mockRejectedValue(new Error('File not found'));

      await expect(
        installer.downloadConnector('test-connector', {
          localPath: '/nonexistent/file.tar.gz',
        })
      ).rejects.toThrow('Failed to download connector test-connector');
    });
  });

  describe('verifyChecksum', () => {
    it('should verify matching checksum', async () => {
      const fileBuffer = Buffer.from('test data');
      mockFsPromises.readFile.mockResolvedValue(fileBuffer);

      const mockHash = {
        update: jest.fn(),
        digest: jest.fn().mockReturnValue('expected123'),
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHash);

      const result = await installer.verifyChecksum(
        '/path/to/file',
        'expected123'
      );

      expect(result).toBe(true);
      expect(mockHash.update).toHaveBeenCalledWith(fileBuffer);
      expect(mockHash.digest).toHaveBeenCalledWith('hex');
    });

    it('should detect checksum mismatch', async () => {
      mockFsPromises.readFile.mockResolvedValue(Buffer.from('test'));

      const mockHash = {
        update: jest.fn(),
        digest: jest.fn().mockReturnValue('actual123'),
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHash);

      const result = await installer.verifyChecksum(
        '/path/to/file',
        'expected456'
      );

      expect(result).toBe(false);
    });

    it('should handle file read errors', async () => {
      mockFsPromises.readFile.mockRejectedValue(new Error('Read failed'));

      const result = await installer.verifyChecksum(
        '/path/to/file',
        'checksum'
      );

      expect(result).toBe(false);
    });
  });

  describe('extractPackage', () => {
    it('should extract tar.gz package', async () => {
      await installer.extractPackage(
        '/path/to/package.tar.gz',
        '/target/dir'
      );

      expect(mockFsPromises.mkdir).toHaveBeenCalledWith('/target/dir', {
        recursive: true,
      });
      expect(mockExecAsync).toHaveBeenCalledWith(
        'tar -xzf "/path/to/package.tar.gz" -C "/target/dir"'
      );
    });

    it('should throw error on extraction failure', async () => {
      mockExecAsync.mockRejectedValue(new Error('Extraction failed'));

      await expect(
        installer.extractPackage('/package.tar.gz', '/target')
      ).rejects.toThrow('Failed to extract package');
    });
  });

  describe('installDependencies', () => {
    it('should install npm dependencies', async () => {
      mockFsPromises.access.mockResolvedValue(undefined); // package.json exists

      await installer.installDependencies('/connector/dir');

      expect(mockExecAsync).toHaveBeenCalledWith(
        'npm install --production',
        { cwd: '/connector/dir' }
      );
    });

    it('should skip if no package.json', async () => {
      mockFsPromises.access.mockRejectedValue(new Error('Not found'));

      await installer.installDependencies('/connector/dir');

      expect(mockExecAsync).not.toHaveBeenCalledWith(
        expect.stringContaining('npm install'),
        expect.anything()
      );
    });

    it('should throw error on npm install failure', async () => {
      mockFsPromises.access.mockResolvedValue(undefined);
      mockExecAsync.mockRejectedValue(new Error('npm install failed'));

      await expect(
        installer.installDependencies('/connector/dir')
      ).rejects.toThrow('Failed to install dependencies');
    });
  });

  describe('buildConnector', () => {
    it('should build connector with build script', async () => {
      const packageJson = {
        scripts: {
          build: 'tsc',
        },
      };
      mockFsPromises.readFile.mockResolvedValue(JSON.stringify(packageJson));

      await installer.buildConnector('/connector/dir');

      expect(mockExecAsync).toHaveBeenCalledWith('npm run build', {
        cwd: '/connector/dir',
      });
    });

    it('should skip build if no build script', async () => {
      const packageJson = {
        scripts: {},
      };
      mockFsPromises.readFile.mockResolvedValue(JSON.stringify(packageJson));

      await installer.buildConnector('/connector/dir');

      expect(mockExecAsync).not.toHaveBeenCalledWith(
        expect.stringContaining('npm run build'),
        expect.anything()
      );
    });

    it('should throw error on build failure', async () => {
      const packageJson = {
        scripts: { build: 'tsc' },
      };
      mockFsPromises.readFile.mockResolvedValue(JSON.stringify(packageJson));
      mockExecAsync.mockRejectedValue(new Error('Build failed'));

      await expect(
        installer.buildConnector('/connector/dir')
      ).rejects.toThrow('Failed to build connector');
    });
  });

  describe('registerConnector', () => {
    it('should register connector in database and registry', async () => {
      mockFsPromises.readFile.mockResolvedValue(
        JSON.stringify(sampleMetadata)
      );
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Mock dynamic import
      const MockConnector = class {};
      jest.doMock(
        '/install/path/dist/index.js',
        () => ({ default: MockConnector }),
        { virtual: true }
      );

      await installer.registerConnector(
        'test-connector',
        '1.0.0',
        '/install/path',
        'checksum123'
      );

      expect(mockRegistry.saveInstalledConnector).toHaveBeenCalledWith(
        expect.objectContaining({
          connector_type: 'test-connector',
          version: '1.0.0',
          install_path: '/install/path',
          checksum: 'checksum123',
        })
      );
    });

    it('should throw error on metadata type mismatch', async () => {
      const mismatchedMetadata = {
        ...sampleMetadata,
        type: 'different-connector',
      };
      mockFsPromises.readFile.mockResolvedValue(
        JSON.stringify(mismatchedMetadata)
      );

      await expect(
        installer.registerConnector('test-connector', '1.0.0', '/path')
      ).rejects.toThrow('Metadata type mismatch');
    });

    it('should throw error if implementation not found', async () => {
      mockFsPromises.readFile.mockResolvedValue(
        JSON.stringify(sampleMetadata)
      );
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(
        installer.registerConnector('test-connector', '1.0.0', '/path')
      ).rejects.toThrow('Connector implementation not found');
    });
  });

  describe('installConnector', () => {
    it('should complete full installation workflow', async () => {
      mockRegistry.getInstalledConnector.mockResolvedValue(null); // Not installed

      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });
      mockFsPromises.readFile.mockResolvedValue(
        JSON.stringify(sampleMetadata)
      );
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const MockConnector = class {};
      jest.doMock(
        '/opt/cmdb/connectors/test-connector/dist/index.js',
        () => ({ default: MockConnector }),
        { virtual: true }
      );

      await installer.installConnector('test-connector', {
        localPath: '/local/package.tar.gz',
      });

      expect(mockFsPromises.mkdir).toHaveBeenCalled(); // Download
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('tar -xzf'),
        expect.anything()
      ); // Extract
      expect(mockRegistry.saveInstalledConnector).toHaveBeenCalled(); // Register
    });

    it('should throw error if already installed', async () => {
      mockRegistry.getInstalledConnector.mockResolvedValue({
        connector_type: 'test-connector',
        version: '1.0.0',
      });

      await expect(
        installer.installConnector('test-connector')
      ).rejects.toThrow('already installed');
    });

    it('should verify checksum if provided', async () => {
      process.env.CONNECTOR_VERIFY_CHECKSUM = 'true';
      mockRegistry.getInstalledConnector.mockResolvedValue(null);

      const checksumContent = 'expected123\n';
      mockFsPromises.readFile
        .mockResolvedValueOnce(checksumContent) // Checksum file
        .mockResolvedValueOnce(Buffer.from('package data')) // Package file
        .mockResolvedValueOnce(JSON.stringify(sampleMetadata)); // metadata

      const mockHash = {
        update: jest.fn(),
        digest: jest.fn().mockReturnValue('expected123'),
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHash);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await installer.installConnector('test-connector', {
        localPath: '/local/package.tar.gz',
      });

      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
    });

    it('should cleanup temp files after installation', async () => {
      mockRegistry.getInstalledConnector.mockResolvedValue(null);
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });
      mockFsPromises.readFile.mockResolvedValue(
        JSON.stringify(sampleMetadata)
      );
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await installer.installConnector('test-connector');

      expect(mockFsPromises.rm).toHaveBeenCalledWith(
        expect.stringContaining('.temp'),
        { force: true }
      );
    });
  });

  describe('uninstallConnector', () => {
    const installedConnector: InstalledConnector = {
      connector_type: 'test-connector',
      version: '1.0.0',
      installed_at: new Date(),
      metadata: sampleMetadata,
      install_path: '/opt/cmdb/connectors/test-connector',
    };

    it('should uninstall connector successfully', async () => {
      mockRegistry.getInstalledConnector.mockResolvedValue(installedConnector);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await installer.uninstallConnector('test-connector');

      expect(mockRegistry.removeInstalledConnector).toHaveBeenCalledWith(
        'test-connector'
      );
      expect(mockFsPromises.rm).toHaveBeenCalledWith(
        installedConnector.install_path,
        { recursive: true, force: true }
      );
    });

    it('should throw error if not installed', async () => {
      mockRegistry.getInstalledConnector.mockResolvedValue(null);

      await expect(
        installer.uninstallConnector('test-connector')
      ).rejects.toThrow('is not installed');
    });

    it('should handle missing installation directory', async () => {
      mockRegistry.getInstalledConnector.mockResolvedValue(installedConnector);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await installer.uninstallConnector('test-connector');

      expect(mockRegistry.removeInstalledConnector).toHaveBeenCalled();
      expect(mockFsPromises.rm).not.toHaveBeenCalled();
    });
  });

  describe('updateConnector', () => {
    const existingConnector: InstalledConnector = {
      connector_type: 'test-connector',
      version: '1.0.0',
      installed_at: new Date(),
      metadata: sampleMetadata,
      install_path: '/opt/cmdb/connectors/test-connector',
    };

    it('should update connector to new version', async () => {
      mockRegistry.getInstalledConnector.mockResolvedValue(existingConnector);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const newMetadata = { ...sampleMetadata, version: '2.0.0' };
      mockFsPromises.readFile.mockResolvedValue(JSON.stringify(newMetadata));

      await installer.updateConnector('test-connector', { version: '2.0.0' });

      // Should create backup
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('cp -r'),
        expect.anything()
      );

      // Should remove old version
      expect(mockFsPromises.rm).toHaveBeenCalledWith(
        existingConnector.install_path,
        { recursive: true, force: true }
      );

      // Should register new version
      expect(mockRegistry.saveInstalledConnector).toHaveBeenCalled();
    });

    it('should throw error if not installed', async () => {
      mockRegistry.getInstalledConnector.mockResolvedValue(null);

      await expect(
        installer.updateConnector('test-connector')
      ).rejects.toThrow('is not installed');
    });

    it('should restore from backup on failure', async () => {
      mockRegistry.getInstalledConnector.mockResolvedValue(existingConnector);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Fail during extraction
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // Backup
        .mockRejectedValueOnce(new Error('Extract failed')); // Extract fails

      await expect(
        installer.updateConnector('test-connector')
      ).rejects.toThrow();

      // Should restore backup
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('mv'),
        expect.anything()
      );
    });

    it('should remove backup on successful update', async () => {
      mockRegistry.getInstalledConnector.mockResolvedValue(existingConnector);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(
        JSON.stringify(sampleMetadata)
      );

      await installer.updateConnector('test-connector');

      expect(mockFsPromises.rm).toHaveBeenCalledWith(
        expect.stringContaining('.backup'),
        { recursive: true, force: true }
      );
    });
  });

  describe('listInstalledConnectors', () => {
    it('should list all installed connectors', async () => {
      const metadata1 = { ...sampleMetadata, type: 'connector-1' };
      const metadata2 = { ...sampleMetadata, type: 'connector-2' };

      mockRegistry.getAllConnectorTypes.mockReturnValue([metadata1, metadata2]);
      mockRegistry.getInstalledConnector
        .mockResolvedValueOnce({
          connector_type: 'connector-1',
          version: '1.0.0',
          metadata: metadata1,
          install_path: '/path1',
          installed_at: new Date(),
        })
        .mockResolvedValueOnce({
          connector_type: 'connector-2',
          version: '2.0.0',
          metadata: metadata2,
          install_path: '/path2',
          installed_at: new Date(),
        });

      const connectors = await installer.listInstalledConnectors();

      expect(connectors).toHaveLength(2);
      expect(connectors.map((c) => c.connector_type)).toContain('connector-1');
      expect(connectors.map((c) => c.connector_type)).toContain('connector-2');
    });

    it('should return empty array on database error', async () => {
      mockRegistry.getAllConnectorTypes.mockImplementation(() => {
        throw new Error('DB error');
      });

      const connectors = await installer.listInstalledConnectors();

      expect(connectors).toEqual([]);
    });
  });

  describe('getConnectorStatus', () => {
    it('should return status for installed connector', async () => {
      const installedConnector: InstalledConnector = {
        connector_type: 'test-connector',
        version: '1.0.0',
        installed_at: new Date('2025-01-15'),
        metadata: sampleMetadata,
        install_path: '/path',
      };

      mockRegistry.getInstalledConnector.mockResolvedValue(installedConnector);

      const status = await installer.getConnectorStatus('test-connector');

      expect(status.installed).toBe(true);
      expect(status.version).toBe('1.0.0');
      expect(status.install_path).toBe('/path');
    });

    it('should return not installed for unknown connector', async () => {
      mockRegistry.getInstalledConnector.mockResolvedValue(null);

      const status = await installer.getConnectorStatus('unknown');

      expect(status.installed).toBe(false);
      expect(status.version).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts during download', async () => {
      mockExecAsync.mockRejectedValue(new Error('Timeout'));

      await expect(
        installer.downloadConnector('test-connector', {
          url: 'https://slow.server/package.tar.gz',
        })
      ).rejects.toThrow('Failed to download connector');
    });

    it('should handle disk space errors during extraction', async () => {
      mockExecAsync.mockRejectedValue(new Error('No space left on device'));

      await expect(
        installer.extractPackage('/package.tar.gz', '/target')
      ).rejects.toThrow('Failed to extract package');
    });

    it('should handle permission errors during file operations', async () => {
      mockFsPromises.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(
        installer.downloadConnector('test-connector')
      ).rejects.toThrow();
    });
  });
});
