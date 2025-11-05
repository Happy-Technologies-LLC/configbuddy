import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * System information data structure
 */
export interface SystemInfo {
  _hostname: string;
  _platform: string;
  _platformVersion: string;
  _architecture: string;
  _cpuModel: string;
  _cpuCores: number;
  _cpuSpeed: number;
  _totalMemory: number;
  _freeMemory: number;
  _uptime: number;
  _diskInfo: DiskInfo[];
  _timestamp: Date;
}

/**
 * Disk information structure
 */
export interface DiskInfo {
  _filesystem: string;
  _size: string;
  _used: string;
  _available: string;
  _usePercentage: string;
  _mountpoint: string;
}

/**
 * SystemInfoCollector - Collects OS, CPU, memory, and disk information
 */
export class SystemInfoCollector {
  /**
   * Collect all system information
   */
  async collect(): Promise<SystemInfo> {
    const cpus = os.cpus();

    return {
      _hostname: os.hostname(),
      _platform: os.platform(),
      _platformVersion: os.release(),
      _architecture: os.arch(),
      _cpuModel: cpus[0]?.model || 'Unknown',
      _cpuCores: cpus.length,
      _cpuSpeed: cpus[0]?.speed || 0,
      _totalMemory: os.totalmem(),
      _freeMemory: os.freemem(),
      _uptime: os.uptime(),
      _diskInfo: await this.collectDiskInfo(),
      _timestamp: new Date(),
    };
  }

  /**
   * Collect disk information based on platform
   */
  private async collectDiskInfo(): Promise<DiskInfo[]> {
    try {
      const platform = os.platform();

      if (platform === 'linux' || platform === 'darwin') {
        return await this.collectUnixDiskInfo();
      } else if (platform === 'win32') {
        return await this.collectWindowsDiskInfo();
      }

      return [];
    } catch (error) {
      console.error('Error collecting disk info:', error);
      return [];
    }
  }

  /**
   * Collect disk info on Unix-like systems (Linux, macOS)
   */
  private async collectUnixDiskInfo(): Promise<DiskInfo[]> {
    try {
      const { stdout } = await execAsync('df -h');
      const lines = stdout.trim().split('\n').slice(1); // Skip header

      return lines.map(line => {
        const parts = line.split(/\s+/);
        return {
          _filesystem: parts[0] || '',
          _size: parts[1] || '',
          _used: parts[2] || '',
          _available: parts[3] || '',
          _usePercentage: parts[4] || '',
          _mountpoint: parts[5] || '',
        };
      });
    } catch (error) {
      console.error('Error collecting Unix disk info:', error);
      return [];
    }
  }

  /**
   * Collect disk info on Windows systems
   */
  private async collectWindowsDiskInfo(): Promise<DiskInfo[]> {
    try {
      const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
      const lines = stdout.trim().split('\n').slice(1); // Skip header

      return lines
        .filter(line => line.trim())
        .map(line => {
          const parts = line.trim().split(/\s+/);
          const size = parseInt(parts[2] || '0');
          const free = parseInt(parts[1] || '0');
          const used = size - free;
          const usePercentage = size > 0 ? ((used / size) * 100).toFixed(0) + '%' : '0%';

          return {
            _filesystem: parts[0] || '',
            _size: this.formatBytes(size),
            _used: this.formatBytes(used),
            _available: this.formatBytes(free),
            _usePercentage: usePercentage,
            _mountpoint: parts[0] || '',
          };
        });
    } catch (error) {
      console.error('Error collecting Windows disk info:', error);
      return [];
    }
  }

  /**
   * Format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
