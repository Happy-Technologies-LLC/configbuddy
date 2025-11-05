import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Network interface information
 */
export interface NetworkInterface {
  _name: string;
  _mac: string;
  _ipv4: string[];
  _ipv6: string[];
  _internal: boolean;
  _status: string;
}

/**
 * Network connection information
 */
export interface NetworkConnection {
  _protocol: string;
  _localAddress: string;
  _localPort: string;
  _remoteAddress: string;
  _remotePort: string;
  _state: string;
  pid?: string;
  program?: string;
}

/**
 * Network collection result
 */
export interface NetworkCollectionResult {
  _interfaces: NetworkInterface[];
  _connections: NetworkConnection[];
  _timestamp: Date;
}

/**
 * NetworkCollector - Collects network interface and connection information
 */
export class NetworkCollector {
  /**
   * Collect all network information
   */
  async collect(): Promise<NetworkCollectionResult> {
    return {
      _interfaces: await this.collectInterfaces(),
      _connections: await this.collectConnections(),
      _timestamp: new Date(),
    };
  }

  /**
   * Collect network interfaces using Node.js os module
   */
  private async collectInterfaces(): Promise<NetworkInterface[]> {
    const interfaces = os.networkInterfaces();
    const result: NetworkInterface[] = [];

    for (const [name, addresses] of Object.entries(interfaces)) {
      if (!addresses) continue;

      const ipv4: string[] = [];
      const ipv6: string[] = [];
      let mac = '';
      let internal = false;

      addresses.forEach(addr => {
        if (addr.family === 'IPv4') {
          ipv4.push(addr.address);
        } else if (addr.family === 'IPv6') {
          ipv6.push(addr.address);
        }
        if (addr.mac && !mac) {
          mac = addr.mac;
        }
        if (addr.internal) {
          internal = true;
        }
      });

      result.push({
        _name: name,
        _mac: mac,
        _ipv4: ipv4,
        _ipv6: ipv6,
        _internal: internal,
        _status: 'up', // Simplified - could be enhanced with platform-specific checks
      });
    }

    return result;
  }

  /**
   * Collect active network connections
   */
  private async collectConnections(): Promise<NetworkConnection[]> {
    const platform = os.platform();

    try {
      if (platform === 'linux') {
        return await this.collectLinuxConnections();
      } else if (platform === 'darwin') {
        return await this.collectMacOSConnections();
      } else if (platform === 'win32') {
        return await this.collectWindowsConnections();
      }
    } catch (error) {
      console.error('Error collecting network connections:', error);
    }

    return [];
  }

  /**
   * Collect connections on Linux
   */
  private async collectLinuxConnections(): Promise<NetworkConnection[]> {
    try {
      // Using netstat or ss if available
      let stdout: string;
      try {
        const result = await execAsync('ss -tunap 2>/dev/null || netstat -tunap 2>/dev/null');
        stdout = result.stdout;
      } catch {
        // If both fail, return empty array
        return [];
      }

      const lines = stdout.trim().split('\n').slice(1); // Skip header
      const connections: NetworkConnection[] = [];

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 5) continue;

        const protocol = parts[0] || '';
        const localAddr = parts[4] || '';
        const remoteAddr = parts[5] || '';
        const state = parts[6] || '';

        const [localAddress, localPort] = this.parseAddress(localAddr);
        const [remoteAddress, remotePort] = this.parseAddress(remoteAddr);

        connections.push({
          _protocol: protocol,
          _localAddress: localAddress,
          _localPort: localPort,
          _remoteAddress: remoteAddress,
          _remotePort: remotePort,
          _state: state,
        });
      }

      return connections;
    } catch (error) {
      console.error('Error collecting Linux connections:', error);
      return [];
    }
  }

  /**
   * Collect connections on macOS
   */
  private async collectMacOSConnections(): Promise<NetworkConnection[]> {
    try {
      const { stdout } = await execAsync('netstat -an');
      const lines = stdout.trim().split('\n').slice(2); // Skip headers
      const connections: NetworkConnection[] = [];

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 5) continue;

        const protocol = parts[0] || '';
        const localAddr = parts[3] || '';
        const remoteAddr = parts[4] || '';
        const state = parts[5] || '';

        const [localAddress, localPort] = this.parseAddress(localAddr);
        const [remoteAddress, remotePort] = this.parseAddress(remoteAddr);

        connections.push({
          _protocol: protocol,
          _localAddress: localAddress,
          _localPort: localPort,
          _remoteAddress: remoteAddress,
          _remotePort: remotePort,
          _state: state,
        });
      }

      return connections;
    } catch (error) {
      console.error('Error collecting macOS connections:', error);
      return [];
    }
  }

  /**
   * Collect connections on Windows
   */
  private async collectWindowsConnections(): Promise<NetworkConnection[]> {
    try {
      const { stdout } = await execAsync('netstat -ano');
      const lines = stdout.trim().split('\n').slice(4); // Skip headers
      const connections: NetworkConnection[] = [];

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 4) continue;

        const protocol = parts[0] || '';
        const localAddr = parts[1] || '';
        const remoteAddr = parts[2] || '';
        const state = parts[3] || '';
        const pid = parts[4] || '';

        const [localAddress, localPort] = this.parseAddress(localAddr);
        const [remoteAddress, remotePort] = this.parseAddress(remoteAddr);

        connections.push({
          _protocol: protocol,
          _localAddress: localAddress,
          _localPort: localPort,
          _remoteAddress: remoteAddress,
          _remotePort: remotePort,
          _state: state,
          pid,
        });
      }

      return connections;
    } catch (error) {
      console.error('Error collecting Windows connections:', error);
      return [];
    }
  }

  /**
   * Parse address:port format
   */
  private parseAddress(addressStr: string): [string, string] {
    const lastColon = addressStr.lastIndexOf(':');
    if (lastColon === -1) {
      return [addressStr, ''];
    }

    const address = addressStr.substring(0, lastColon);
    const port = addressStr.substring(lastColon + 1);

    return [address, port];
  }

  /**
   * Filter connections by state (ESTABLISHED, LISTEN, etc.)
   */
  filterByState(connections: NetworkConnection[], state: string): NetworkConnection[] {
    return connections.filter(c =>
      c._state.toUpperCase() === state.toUpperCase()
    );
  }

  /**
   * Filter connections by protocol (TCP, UDP)
   */
  filterByProtocol(connections: NetworkConnection[], protocol: string): NetworkConnection[] {
    return connections.filter(c =>
      c._protocol.toLowerCase().includes(protocol.toLowerCase())
    );
  }
}
