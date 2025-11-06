/**
 * NMAP Discovery Tool
 * Allows AI to scan network ports and services
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { DiscoveryTool } from '../types';
import { logger } from '@cmdb/common';

const execAsync = promisify(exec);

export const nmapTool: DiscoveryTool = {
  name: 'nmap_scan',
  description:
    'Scan network ports and detect services on a target host. Use this to identify open ports, running services, and service versions.',
  inputSchema: {
    type: 'object',
    properties: {
      host: {
        type: 'string',
        description: 'Target hostname or IP address',
      },
      ports: {
        type: 'string',
        description:
          'Port range to scan (e.g., "80,443" or "1-1000"). Default: top 100 ports',
      },
      scanType: {
        type: 'string',
        enum: ['quick', 'version', 'aggressive'],
        description:
          'Type of scan: quick (fast), version (detect versions), aggressive (OS detection + scripts)',
      },
    },
    required: ['host'],
  },
  execute: async (params: any) => {
    const { host, ports = '--top-ports 100', scanType = 'quick' } = params;

    logger.info(`Executing NMAP scan`, { host, ports, scanType });

    try {
      // Build nmap command
      let nmapArgs = '-sV'; // Service version detection

      switch (scanType) {
        case 'quick':
          nmapArgs = '-sT'; // TCP connect scan (no version detection)
          break;
        case 'version':
          nmapArgs = '-sV'; // Version detection
          break;
        case 'aggressive':
          nmapArgs = '-A'; // Aggressive (OS detection, version, scripts, traceroute)
          break;
      }

      const portArg = ports.includes('-') || ports.includes(',')
        ? `-p ${ports}`
        : ports;

      const command = `nmap ${nmapArgs} ${portArg} ${host} -oX - 2>&1`;

      // Set timeout to 30 seconds
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000,
        maxBuffer: 1024 * 1024, // 1MB
      });

      if (stderr && !stderr.includes('Starting Nmap')) {
        logger.warn('NMAP stderr output', { stderr });
      }

      // Parse nmap XML output (simplified parser)
      const result = parseNmapOutput(stdout);

      logger.info(`NMAP scan completed`, {
        host,
        openPorts: result.openPorts?.length || 0,
      });

      return result;
    } catch (error) {
      logger.error('NMAP scan failed', { host, error });
      throw new Error(
        `NMAP scan failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
};

/**
 * Parse NMAP output (simplified)
 * In production, use a proper XML parser like xml2js
 */
function parseNmapOutput(output: string): any {
  const result: any = {
    status: 'unknown',
    openPorts: [],
    services: [],
    osGuess: null,
  };

  try {
    // Check if host is up
    if (output.includes('Host is up')) {
      result.status = 'up';
    } else if (output.includes('host down')) {
      result.status = 'down';
      return result;
    }

    // Extract open ports (simple regex parsing)
    const portRegex = /(\d+)\/tcp\s+open\s+(\S+)\s*(.*)/g;
    let match;

    while ((match = portRegex.exec(output)) !== null) {
      const port = parseInt(match[1], 10);
      const service = match[2];
      const version = match[3]?.trim() || '';

      result.openPorts.push(port);
      result.services.push({
        port,
        protocol: 'tcp',
        state: 'open',
        service,
        version,
      });
    }

    // Extract OS guess (if available)
    const osMatch = output.match(/OS details: (.+)/);
    if (osMatch) {
      result.osGuess = osMatch[1];
    }

    return result;
  } catch (error) {
    logger.error('Failed to parse NMAP output', { error });
    return {
      status: 'error',
      error: 'Failed to parse output',
      rawOutput: output.substring(0, 500), // First 500 chars
    };
  }
}
