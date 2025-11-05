/**
 * Unit tests for SystemInfoCollector
 */

import * as os from 'os';
import { exec } from 'child_process';
import { SystemInfoCollector } from '../../src/collectors/system-info.collector';

// Mock modules
jest.mock('child_process');
jest.mock('os');

const mockedExec = exec as jest.MockedFunction<typeof exec>;
const mockedOs = os as jest.Mocked<typeof os>;

describe('SystemInfoCollector', () => {
  let collector: SystemInfoCollector;

  beforeEach(() => {
    collector = new SystemInfoCollector();
    jest.clearAllMocks();
  });

  describe('collect', () => {
    it('should collect complete system information', async () => {
      // Mock os functions
      (mockedOs.hostname as jest.Mock).mockReturnValue('test-server');
      (mockedOs.platform as jest.Mock).mockReturnValue('linux');
      (mockedOs.release as jest.Mock).mockReturnValue('5.4.0-42-generic');
      (mockedOs.arch as jest.Mock).mockReturnValue('x64');
      (mockedOs.cpus as jest.Mock).mockReturnValue([
        { model: 'Intel Core i7', speed: 2400, times: {} as any },
        { model: 'Intel Core i7', speed: 2400, times: {} as any },
        { model: 'Intel Core i7', speed: 2400, times: {} as any },
        { model: 'Intel Core i7', speed: 2400, times: {} as any },
      ]);
      (mockedOs.totalmem as jest.Mock).mockReturnValue(16000000000);
      (mockedOs.freemem as jest.Mock).mockReturnValue(8000000000);
      (mockedOs.uptime as jest.Mock).mockReturnValue(86400);

      // Mock disk info
      const diskOutput = `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       100G   50G   45G  53% /
/dev/sdb1       500G  200G  275G  42% /data`;

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: diskOutput, stderr: '' } as any);
        return {} as any;
      });

      const result = await collector.collect();

      expect(result).toHaveProperty('_hostname', 'test-server');
      expect(result).toHaveProperty('_platform', 'linux');
      expect(result).toHaveProperty('_platformVersion', '5.4.0-42-generic');
      expect(result).toHaveProperty('_architecture', 'x64');
      expect(result).toHaveProperty('_cpuModel', 'Intel Core i7');
      expect(result).toHaveProperty('_cpuCores', 4);
      expect(result).toHaveProperty('_cpuSpeed', 2400);
      expect(result).toHaveProperty('_totalMemory', 16000000000);
      expect(result).toHaveProperty('_freeMemory', 8000000000);
      expect(result).toHaveProperty('_uptime', 86400);
      expect(result).toHaveProperty('_diskInfo');
      expect(result).toHaveProperty('_timestamp');
      expect(result._diskInfo).toHaveLength(2);
    });

    it('should handle missing CPU information', async () => {
      (mockedOs.hostname as jest.Mock).mockReturnValue('test-server');
      (mockedOs.platform as jest.Mock).mockReturnValue('linux');
      (mockedOs.release as jest.Mock).mockReturnValue('5.4.0');
      (mockedOs.arch as jest.Mock).mockReturnValue('x64');
      (mockedOs.cpus as jest.Mock).mockReturnValue([]);
      (mockedOs.totalmem as jest.Mock).mockReturnValue(8000000000);
      (mockedOs.freemem as jest.Mock).mockReturnValue(4000000000);
      (mockedOs.uptime as jest.Mock).mockReturnValue(3600);

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: '', stderr: '' } as any);
        return {} as any;
      });

      const result = await collector.collect();

      expect(result._cpuModel).toBe('Unknown');
      expect(result._cpuCores).toBe(0);
      expect(result._cpuSpeed).toBe(0);
    });
  });

  describe('collectDiskInfo - Unix/Linux', () => {
    it('should parse Unix disk information correctly', async () => {
      (mockedOs.platform as jest.Mock).mockReturnValue('linux');

      const dfOutput = `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       100G   50G   45G  53% /
/dev/sdb1       500G  200G  275G  42% /data
tmpfs           8.0G  1.0G  7.0G  13% /tmp`;

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: dfOutput, stderr: '' } as any);
        return {} as any;
      });

      const diskInfo = await (collector as any).collectDiskInfo();

      expect(diskInfo).toHaveLength(3);
      expect(diskInfo[0]._filesystem).toBe('/dev/sda1');
      expect(diskInfo[0]._size).toBe('100G');
      expect(diskInfo[0]._used).toBe('50G');
      expect(diskInfo[0]._available).toBe('45G');
      expect(diskInfo[0]._usePercentage).toBe('53%');
      expect(diskInfo[0]._mountpoint).toBe('/');
    });

    it('should handle macOS disk information', async () => {
      (mockedOs.platform as jest.Mock).mockReturnValue('darwin');

      const dfOutput = `Filesystem     Size   Used  Avail Capacity  Mounted on
/dev/disk1s1  250Gi   100Gi  145Gi    41%    /
/dev/disk2s1  500Gi   200Gi  295Gi    40%    /Volumes/Data`;

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: dfOutput, stderr: '' } as any);
        return {} as any;
      });

      const diskInfo = await (collector as any).collectDiskInfo();

      expect(diskInfo).toHaveLength(2);
      expect(diskInfo[0]._filesystem).toBe('/dev/disk1s1');
    });

    it('should handle df command errors gracefully', async () => {
      (mockedOs.platform as jest.Mock).mockReturnValue('linux');

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(new Error('df command failed'), { stdout: '', stderr: 'error' } as any);
        return {} as any;
      });

      const diskInfo = await (collector as any).collectDiskInfo();

      expect(diskInfo).toEqual([]);
    });
  });

  describe('collectDiskInfo - Windows', () => {
    it('should parse Windows disk information correctly', async () => {
      (mockedOs.platform as jest.Mock).mockReturnValue('win32');

      const wmicOutput = `Caption  FreeSpace    Size
C:       107374182400 214748364800
D:       536870912000 1073741824000`;

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: wmicOutput, stderr: '' } as any);
        return {} as any;
      });

      const diskInfo = await (collector as any).collectDiskInfo();

      expect(diskInfo).toHaveLength(2);
      expect(diskInfo[0]._filesystem).toBe('C:');
      expect(diskInfo[0]._mountpoint).toBe('C:');
      expect(diskInfo[0]._usePercentage).toMatch(/^\d+%$/);
    });

    it('should handle Windows wmic errors gracefully', async () => {
      (mockedOs.platform as jest.Mock).mockReturnValue('win32');

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(new Error('wmic not found'), { stdout: '', stderr: 'error' } as any);
        return {} as any;
      });

      const diskInfo = await (collector as any).collectDiskInfo();

      expect(diskInfo).toEqual([]);
    });

    it('should handle empty Windows output', async () => {
      (mockedOs.platform as jest.Mock).mockReturnValue('win32');

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: 'Caption  FreeSpace    Size\n', stderr: '' } as any);
        return {} as any;
      });

      const diskInfo = await (collector as any).collectDiskInfo();

      expect(diskInfo).toEqual([]);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes to human-readable format', () => {
      expect((collector as any).formatBytes(0)).toBe('0 B');
      expect((collector as any).formatBytes(1024)).toBe('1 KB');
      expect((collector as any).formatBytes(1048576)).toBe('1 MB');
      expect((collector as any).formatBytes(1073741824)).toBe('1 GB');
      expect((collector as any).formatBytes(1099511627776)).toBe('1 TB');
    });

    it('should handle decimal values correctly', () => {
      expect((collector as any).formatBytes(1536)).toBe('1.5 KB');
      expect((collector as any).formatBytes(5242880)).toBe('5 MB');
    });

    it('should handle large values', () => {
      const largeValue = 5497558138880; // 5 TB
      const formatted = (collector as any).formatBytes(largeValue);
      expect(formatted).toContain('TB');
    });
  });

  describe('edge cases', () => {
    it('should handle unknown platform gracefully', async () => {
      (mockedOs.platform as jest.Mock).mockReturnValue('freebsd');

      const diskInfo = await (collector as any).collectDiskInfo();

      expect(diskInfo).toEqual([]);
    });

    it('should handle partial disk output', async () => {
      (mockedOs.platform as jest.Mock).mockReturnValue('linux');

      const partialOutput = `Filesystem      Size
/dev/sda1       100G`;

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: partialOutput, stderr: '' } as any);
        return {} as any;
      });

      const diskInfo = await (collector as any).collectDiskInfo();

      // Should handle gracefully even with incomplete data
      expect(diskInfo).toBeDefined();
    });
  });
});
