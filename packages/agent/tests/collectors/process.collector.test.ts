// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Unit tests for ProcessCollector
 */

import * as os from 'os';
import { exec } from 'child_process';
import { ProcessCollector } from '../../src/collectors/process.collector';

// Mock modules
jest.mock('child_process');
jest.mock('os');

const mockedExec = exec as jest.MockedFunction<typeof exec>;
const mockedOs = os as jest.Mocked<typeof os>;

describe('ProcessCollector', () => {
  let collector: ProcessCollector;

  beforeEach(() => {
    collector = new ProcessCollector(100);
    jest.clearAllMocks();
  });

  describe('collect', () => {
    it('should collect process information on Linux', async () => {
      (mockedOs.platform as jest.Mock).mockReturnValue('linux');

      const psOutput = `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.1  19356  1512 ?        Ss   10:00   0:01 /sbin/init
www-data    1234  1.5  2.3  45678  3456 ?        S    10:05   1:23 nginx: worker
postgres    5678  0.8  5.2  98765  6789 ?        Ss   10:10   0:45 /usr/lib/postgresql/bin/postgres`;

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: psOutput, stderr: '' } as any);
        return {} as any;
      });

      const result = await collector.collect();

      expect(result).toHaveProperty('_processes');
      expect(result).toHaveProperty('_totalProcesses');
      expect(result).toHaveProperty('_timestamp');
      expect(result._processes).toHaveLength(3);
      expect(result._totalProcesses).toBe(3);
      expect(result._processes[0]._pid).toBe(1);
      expect(result._processes[0]._user).toBe('root');
      expect(result._processes[0]._name).toBe('/sbin/init');
    });

    it('should collect process information on macOS', async () => {
      (mockedOs.platform as jest.Mock).mockReturnValue('darwin');

      const psOutput = `USER         PID  %CPU %MEM      VSZ    RSS   TT  STAT STARTED      TIME COMMAND
root           1   0.0  0.1  4298520   1664   ??  Ss   Mon09AM   1:23.45 /sbin/launchd
_windowserver 234   2.1  3.4  6234560  12345   ??  Ss   Mon09AM  12:34.56 /System/Library/WindowServer`;

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: psOutput, stderr: '' } as any);
        return {} as any;
      });

      const result = await collector.collect();

      expect(result._processes).toHaveLength(2);
      expect(result._processes[0]._user).toBe('root');
      expect(result._processes[1]._user).toBe('_windowserver');
    });

    it('should collect process information on Windows', async () => {
      (mockedOs.platform as jest.Mock).mockReturnValue('win32');

      const wmicOutput = `Node,CommandLine,Name,ProcessId
DESKTOP-PC,C:\\Windows\\System32\\svchost.exe,svchost.exe,1234
DESKTOP-PC,C:\\Program Files\\App\\app.exe,app.exe,5678`;

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: wmicOutput, stderr: '' } as any);
        return {} as any;
      });

      const result = await collector.collect();

      expect(result._processes).toHaveLength(2);
      expect(result._processes[0]._pid).toBe(1234);
      expect(result._processes[0]._name).toBe('svchost.exe');
    });

    it('should respect maxProcesses limit', async () => {
      const smallCollector = new ProcessCollector(2);
      (mockedOs.platform as jest.Mock).mockReturnValue('linux');

      const psOutput = `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.1  19356  1512 ?        Ss   10:00   0:01 /sbin/init
user        1234  1.5  2.3  45678  3456 ?        S    10:05   1:23 process1
user        5678  0.8  5.2  98765  6789 ?        Ss   10:10   0:45 process2
user        9999  0.3  1.1  12345  2345 ?        S    10:15   0:10 process3`;

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: psOutput, stderr: '' } as any);
        return {} as any;
      });

      const result = await smallCollector.collect();

      expect(result._processes).toHaveLength(2);
      expect(result._totalProcesses).toBe(4);
    });

    it('should handle errors gracefully', async () => {
      (mockedOs.platform as jest.Mock).mockReturnValue('linux');

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(new Error('ps command failed'), { stdout: '', stderr: 'error' } as any);
        return {} as any;
      });

      const result = await collector.collect();

      expect(result._processes).toEqual([]);
      expect(result._totalProcesses).toBe(0);
    });

    it('should handle unknown platform', async () => {
      (mockedOs.platform as jest.Mock).mockReturnValue('freebsd');

      const result = await collector.collect();

      expect(result._processes).toEqual([]);
      expect(result._totalProcesses).toBe(0);
    });
  });

  describe('filterByName', () => {
    const sampleProcesses = [
      {
        _pid: 1,
        _user: 'root',
        _cpuUsage: '0.1',
        _memoryUsage: '0.5',
        _startTime: '10:00',
        _name: 'nginx',
        _command: '/usr/sbin/nginx -g daemon off;',
      },
      {
        _pid: 2,
        _user: 'postgres',
        _cpuUsage: '1.2',
        _memoryUsage: '3.4',
        _startTime: '10:05',
        _name: 'postgres',
        _command: '/usr/lib/postgresql/bin/postgres',
      },
      {
        _pid: 3,
        _user: 'user',
        _cpuUsage: '0.3',
        _memoryUsage: '1.1',
        _startTime: '10:10',
        _name: 'node',
        _command: 'node /app/server.js',
      },
    ];

    it('should filter processes by exact name', () => {
      const result = collector.filterByName(sampleProcesses, 'nginx');
      expect(result).toHaveLength(1);
      expect(result[0]._name).toBe('nginx');
    });

    it('should filter processes by partial name match', () => {
      const result = collector.filterByName(sampleProcesses, 'post');
      expect(result).toHaveLength(1);
      expect(result[0]._name).toBe('postgres');
    });

    it('should filter processes by command pattern', () => {
      const result = collector.filterByName(sampleProcesses, 'server.js');
      expect(result).toHaveLength(1);
      expect(result[0]._command).toContain('server.js');
    });

    it('should be case-insensitive', () => {
      const result = collector.filterByName(sampleProcesses, 'NGINX');
      expect(result).toHaveLength(1);
      expect(result[0]._name).toBe('nginx');
    });

    it('should return empty array for no matches', () => {
      const result = collector.filterByName(sampleProcesses, 'notfound');
      expect(result).toHaveLength(0);
    });
  });

  describe('sortByCpu', () => {
    const sampleProcesses = [
      {
        _pid: 1,
        _user: 'root',
        _cpuUsage: '0.5',
        _memoryUsage: '1.0',
        _startTime: '10:00',
        _name: 'process1',
        _command: 'cmd1',
      },
      {
        _pid: 2,
        _user: 'user',
        _cpuUsage: '5.2',
        _memoryUsage: '2.0',
        _startTime: '10:05',
        _name: 'process2',
        _command: 'cmd2',
      },
      {
        _pid: 3,
        _user: 'user',
        _cpuUsage: '2.1',
        _memoryUsage: '3.0',
        _startTime: '10:10',
        _name: 'process3',
        _command: 'cmd3',
      },
    ];

    it('should sort processes by CPU usage descending', () => {
      const sorted = collector.sortByCpu(sampleProcesses);
      expect(sorted[0]._cpuUsage).toBe('5.2');
      expect(sorted[1]._cpuUsage).toBe('2.1');
      expect(sorted[2]._cpuUsage).toBe('0.5');
    });

    it('should not modify original array', () => {
      const original = [...sampleProcesses];
      collector.sortByCpu(sampleProcesses);
      expect(sampleProcesses).toEqual(original);
    });
  });

  describe('sortByMemory', () => {
    const sampleProcesses = [
      {
        _pid: 1,
        _user: 'root',
        _cpuUsage: '0.5',
        _memoryUsage: '1.0',
        _startTime: '10:00',
        _name: 'process1',
        _command: 'cmd1',
      },
      {
        _pid: 2,
        _user: 'user',
        _cpuUsage: '1.0',
        _memoryUsage: '10.5',
        _startTime: '10:05',
        _name: 'process2',
        _command: 'cmd2',
      },
      {
        _pid: 3,
        _user: 'user',
        _cpuUsage: '2.0',
        _memoryUsage: '3.2',
        _startTime: '10:10',
        _name: 'process3',
        _command: 'cmd3',
      },
    ];

    it('should sort processes by memory usage descending', () => {
      const sorted = collector.sortByMemory(sampleProcesses);
      expect(sorted[0]._memoryUsage).toBe('10.5');
      expect(sorted[1]._memoryUsage).toBe('3.2');
      expect(sorted[2]._memoryUsage).toBe('1.0');
    });

    it('should not modify original array', () => {
      const original = [...sampleProcesses];
      collector.sortByMemory(sampleProcesses);
      expect(sampleProcesses).toEqual(original);
    });
  });

  describe('edge cases', () => {
    it('should handle empty process list', async () => {
      (mockedOs.platform as jest.Mock).mockReturnValue('linux');

      const psOutput = `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND`;

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: psOutput, stderr: '' } as any);
        return {} as any;
      });

      const result = await collector.collect();

      expect(result._processes).toEqual([]);
      expect(result._totalProcesses).toBe(0);
    });

    it('should handle malformed process data', async () => {
      (mockedOs.platform as jest.Mock).mockReturnValue('linux');

      const psOutput = `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
incomplete data`;

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: psOutput, stderr: '' } as any);
        return {} as any;
      });

      const result = await collector.collect();

      expect(result._processes).toBeDefined();
    });
  });
});
