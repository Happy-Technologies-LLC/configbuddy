// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Process information structure
 */
export interface ProcessInfo {
  _pid: number;
  _name: string;
  _command: string;
  _cpuUsage: string;
  _memoryUsage: string;
  _user: string;
  _startTime: string;
}

/**
 * Process collection result
 */
export interface ProcessCollectionResult {
  _processes: ProcessInfo[];
  _totalProcesses: number;
  _timestamp: Date;
}

/**
 * ProcessCollector - Collects information about running processes
 */
export class ProcessCollector {
  private maxProcesses: number;

  constructor(maxProcesses: number = 100) {
    this.maxProcesses = maxProcesses;
  }

  /**
   * Collect running process information
   */
  async collect(): Promise<ProcessCollectionResult> {
    const platform = os.platform();
    let processes: ProcessInfo[] = [];

    try {
      if (platform === 'linux') {
        processes = await this.collectLinuxProcesses();
      } else if (platform === 'darwin') {
        processes = await this.collectMacOSProcesses();
      } else if (platform === 'win32') {
        processes = await this.collectWindowsProcesses();
      }
    } catch (error) {
      console.error('Error collecting process info:', error);
    }

    return {
      _processes: processes.slice(0, this.maxProcesses),
      _totalProcesses: processes.length,
      _timestamp: new Date(),
    };
  }

  /**
   * Collect processes on Linux
   */
  private async collectLinuxProcesses(): Promise<ProcessInfo[]> {
    try {
      const { stdout } = await execAsync(
        'ps aux --sort=-%mem | head -n 101'
      );

      const lines = stdout.trim().split('\n').slice(1); // Skip header

      return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          _pid: parseInt(parts[1] || '0'),
          _user: parts[0] || '',
          _cpuUsage: parts[2] || '0',
          _memoryUsage: parts[3] || '0',
          _startTime: parts[8] || '',
          _name: parts[10] || '',
          _command: parts.slice(10).join(' ') || '',
        };
      });
    } catch (error) {
      console.error('Error collecting Linux processes:', error);
      return [];
    }
  }

  /**
   * Collect processes on macOS
   */
  private async collectMacOSProcesses(): Promise<ProcessInfo[]> {
    try {
      const { stdout } = await execAsync(
        'ps aux -m | head -n 101'
      );

      const lines = stdout.trim().split('\n').slice(1); // Skip header

      return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          _pid: parseInt(parts[1] || '0'),
          _user: parts[0] || '',
          _cpuUsage: parts[2] || '0',
          _memoryUsage: parts[3] || '0',
          _startTime: parts[8] || '',
          _name: parts[10] || '',
          _command: parts.slice(10).join(' ') || '',
        };
      });
    } catch (error) {
      console.error('Error collecting macOS processes:', error);
      return [];
    }
  }

  /**
   * Collect processes on Windows
   */
  private async collectWindowsProcesses(): Promise<ProcessInfo[]> {
    try {
      const { stdout } = await execAsync(
        'wmic process get ProcessId,Name,CommandLine,UserModeTime,KernelModeTime /format:csv'
      );

      const lines = stdout.trim().split('\n').slice(1); // Skip header

      return lines
        .filter(line => line.trim())
        .map(line => {
          const parts = line.split(',');
          return {
            _pid: parseInt(parts[3] || '0'),
            _user: 'N/A',
            _cpuUsage: '0',
            _memoryUsage: '0',
            _startTime: 'N/A',
            _name: parts[2] || '',
            _command: parts[1] || '',
          };
        });
    } catch (error) {
      console.error('Error collecting Windows processes:', error);
      return [];
    }
  }

  /**
   * Filter processes by name pattern
   */
  filterByName(processes: ProcessInfo[], pattern: string): ProcessInfo[] {
    const regex = new RegExp(pattern, 'i');
    return processes.filter(p => regex.test(p._name) || regex.test(p._command));
  }

  /**
   * Sort processes by CPU usage
   */
  sortByCpu(processes: ProcessInfo[]): ProcessInfo[] {
    return [...processes].sort((a, b) =>
      parseFloat(b._cpuUsage) - parseFloat(a._cpuUsage)
    );
  }

  /**
   * Sort processes by memory usage
   */
  sortByMemory(processes: ProcessInfo[]): ProcessInfo[] {
    return [...processes].sort((a, b) =>
      parseFloat(b._memoryUsage) - parseFloat(a._memoryUsage)
    );
  }
}
