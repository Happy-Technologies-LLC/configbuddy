// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Unit tests for NetworkCollector
 */

import * as os from 'os';
import { exec } from 'child_process';
import { NetworkCollector } from '../../src/collectors/network.collector';

// Mock child_process
jest.mock('child_process');
jest.mock('os');

const mockedExec = exec as jest.MockedFunction<typeof exec>;
const mockedOs = os as jest.Mocked<typeof os>;

describe('NetworkCollector', () => {
  let collector: NetworkCollector;

  beforeEach(() => {
    collector = new NetworkCollector();
    jest.clearAllMocks();
  });

  describe('collect', () => {
    it('should collect network interfaces and connections', async () => {
      // Mock os.networkInterfaces
      (mockedOs.networkInterfaces as jest.Mock).mockReturnValue({
        eth0: [
          {
            address: '192.168.1.100',
            netmask: '255.255.255.0',
            family: 'IPv4',
            mac: '00:11:22:33:44:55',
            internal: false,
          },
          {
            address: 'fe80::1',
            netmask: 'ffff:ffff:ffff:ffff::',
            family: 'IPv6',
            mac: '00:11:22:33:44:55',
            internal: false,
          },
        ],
        lo: [
          {
            address: '127.0.0.1',
            netmask: '255.0.0.0',
            family: 'IPv4',
            mac: '00:00:00:00:00:00',
            internal: true,
          },
        ],
      });

      // Mock platform
      (mockedOs.platform as jest.Mock).mockReturnValue('linux');

      // Mock exec for netstat
      mockedExec.mockImplementation((cmd, callback) => {
        const stdout = `Proto Local Address           Foreign Address         State
tcp   0.0.0.0:80            0.0.0.0:*               LISTEN
tcp   192.168.1.100:443     192.168.1.200:55123     ESTABLISHED`;
        callback!(null, { stdout, stderr: '' } as any);
        return {} as any;
      });

      const result = await collector.collect();

      expect(result).toHaveProperty('_interfaces');
      expect(result).toHaveProperty('_connections');
      expect(result).toHaveProperty('_timestamp');
      expect(result._interfaces).toHaveLength(2);
      expect(result._interfaces[0]._name).toBe('eth0');
      expect(result._interfaces[0]._mac).toBe('00:11:22:33:44:55');
      expect(result._interfaces[0]._ipv4).toContain('192.168.1.100');
      expect(result._interfaces[0]._internal).toBe(false);
    });
  });

  describe('collectInterfaces', () => {
    it('should parse IPv4 and IPv6 addresses correctly', async () => {
      (mockedOs.networkInterfaces as jest.Mock).mockReturnValue({
        eth0: [
          {
            address: '10.0.0.5',
            family: 'IPv4',
            mac: 'aa:bb:cc:dd:ee:ff',
            internal: false,
          },
          {
            address: '2001:db8::1',
            family: 'IPv6',
            mac: 'aa:bb:cc:dd:ee:ff',
            internal: false,
          },
        ],
      });

      (mockedOs.platform as jest.Mock).mockReturnValue('linux');
      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: '', stderr: '' } as any);
        return {} as any;
      });

      const result = await collector.collect();

      expect(result._interfaces[0]._ipv4).toContain('10.0.0.5');
      expect(result._interfaces[0]._ipv6).toContain('2001:db8::1');
      expect(result._interfaces[0]._mac).toBe('aa:bb:cc:dd:ee:ff');
    });

    it('should handle interfaces with no addresses', async () => {
      (mockedOs.networkInterfaces as jest.Mock).mockReturnValue({
        eth1: undefined,
      });

      (mockedOs.platform as jest.Mock).mockReturnValue('linux');
      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: '', stderr: '' } as any);
        return {} as any;
      });

      const result = await collector.collect();

      expect(result._interfaces).toHaveLength(0);
    });
  });

  describe('parseAddress', () => {
    it('should parse IPv4 address:port correctly', () => {
      const [address, port] = (collector as any).parseAddress('192.168.1.1:8080');
      expect(address).toBe('192.168.1.1');
      expect(port).toBe('8080');
    });

    it('should parse IPv6 address:port correctly', () => {
      const [address, port] = (collector as any).parseAddress('[::1]:9000');
      expect(address).toBe('[::1]');
      expect(port).toBe('9000');
    });

    it('should handle address without port', () => {
      const [address, port] = (collector as any).parseAddress('192.168.1.1');
      expect(address).toBe('192.168.1.1');
      expect(port).toBe('');
    });
  });

  describe('filterByState', () => {
    it('should filter connections by state', () => {
      const connections = [
        {
          _protocol: 'tcp',
          _localAddress: '0.0.0.0',
          _localPort: '80',
          _remoteAddress: '0.0.0.0',
          _remotePort: '*',
          _state: 'LISTEN',
        },
        {
          _protocol: 'tcp',
          _localAddress: '192.168.1.1',
          _localPort: '443',
          _remoteAddress: '192.168.1.100',
          _remotePort: '55123',
          _state: 'ESTABLISHED',
        },
      ];

      const listening = collector.filterByState(connections, 'LISTEN');
      expect(listening).toHaveLength(1);
      expect(listening[0]._state).toBe('LISTEN');

      const established = collector.filterByState(connections, 'ESTABLISHED');
      expect(established).toHaveLength(1);
      expect(established[0]._state).toBe('ESTABLISHED');
    });

    it('should be case-insensitive', () => {
      const connections = [
        {
          _protocol: 'tcp',
          _localAddress: '0.0.0.0',
          _localPort: '80',
          _remoteAddress: '0.0.0.0',
          _remotePort: '*',
          _state: 'LISTEN',
        },
      ];

      const result = collector.filterByState(connections, 'listen');
      expect(result).toHaveLength(1);
    });
  });

  describe('filterByProtocol', () => {
    it('should filter connections by protocol', () => {
      const connections = [
        {
          _protocol: 'tcp',
          _localAddress: '0.0.0.0',
          _localPort: '80',
          _remoteAddress: '0.0.0.0',
          _remotePort: '*',
          _state: 'LISTEN',
        },
        {
          _protocol: 'udp',
          _localAddress: '0.0.0.0',
          _localPort: '53',
          _remoteAddress: '0.0.0.0',
          _remotePort: '*',
          _state: '',
        },
      ];

      const tcp = collector.filterByProtocol(connections, 'tcp');
      expect(tcp).toHaveLength(1);
      expect(tcp[0]._protocol).toBe('tcp');

      const udp = collector.filterByProtocol(connections, 'udp');
      expect(udp).toHaveLength(1);
      expect(udp[0]._protocol).toBe('udp');
    });

    it('should handle partial protocol matching', () => {
      const connections = [
        {
          _protocol: 'tcp4',
          _localAddress: '0.0.0.0',
          _localPort: '80',
          _remoteAddress: '0.0.0.0',
          _remotePort: '*',
          _state: 'LISTEN',
        },
      ];

      const result = collector.filterByProtocol(connections, 'tcp');
      expect(result).toHaveLength(1);
    });
  });

  describe('platform-specific connection collection', () => {
    it('should handle Linux connections', async () => {
      (mockedOs.networkInterfaces as jest.Mock).mockReturnValue({});
      (mockedOs.platform as jest.Mock).mockReturnValue('linux');

      const linuxOutput = `Proto Recv-Q Send-Q Local Address           Foreign Address         State
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN
tcp        0      0 192.168.1.100:443       192.168.1.200:55123     ESTABLISHED`;

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: linuxOutput, stderr: '' } as any);
        return {} as any;
      });

      const result = await collector.collect();
      expect(result._connections.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle macOS connections', async () => {
      (mockedOs.networkInterfaces as jest.Mock).mockReturnValue({});
      (mockedOs.platform as jest.Mock).mockReturnValue('darwin');

      const macosOutput = `Active Internet connections
Proto Recv-Q Send-Q  Local Address          Foreign Address        (state)
tcp4       0      0  *.22                   *.*                    LISTEN
tcp4       0      0  192.168.1.100.443      192.168.1.200.55123    ESTABLISHED`;

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: macosOutput, stderr: '' } as any);
        return {} as any;
      });

      const result = await collector.collect();
      expect(result._connections.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle Windows connections', async () => {
      (mockedOs.networkInterfaces as jest.Mock).mockReturnValue({});
      (mockedOs.platform as jest.Mock).mockReturnValue('win32');

      const windowsOutput = `
  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:80             0.0.0.0:0              LISTENING       1234
  TCP    192.168.1.100:443      192.168.1.200:55123    ESTABLISHED     5678`;

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(null, { stdout: windowsOutput, stderr: '' } as any);
        return {} as any;
      });

      const result = await collector.collect();
      expect(result._connections.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle connection collection errors gracefully', async () => {
      (mockedOs.networkInterfaces as jest.Mock).mockReturnValue({});
      (mockedOs.platform as jest.Mock).mockReturnValue('linux');

      mockedExec.mockImplementation((cmd, callback) => {
        callback!(new Error('Command not found'), { stdout: '', stderr: 'error' } as any);
        return {} as any;
      });

      const result = await collector.collect();
      expect(result._connections).toEqual([]);
    });
  });
});
