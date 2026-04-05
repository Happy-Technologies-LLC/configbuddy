// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Discovery Tools
 * Collection of tools available to AI agents for infrastructure discovery
 */

import { DiscoveryTool } from '../types';
import { nmapTool } from './nmap-tool';
import { httpProbeTool } from './http-tool';
import { sshExecuteTool, sshReadFileTool } from './ssh-tool';

export * from './nmap-tool';
export * from './http-tool';
export * from './ssh-tool';

/**
 * Get all available discovery tools
 */
export function getAllDiscoveryTools(): DiscoveryTool[] {
  return [nmapTool, httpProbeTool, sshExecuteTool, sshReadFileTool];
}

/**
 * Get discovery tools by name
 */
export function getDiscoveryTool(name: string): DiscoveryTool | undefined {
  const tools = getAllDiscoveryTools();
  return tools.find(t => t.name === name);
}

/**
 * Get basic discovery tools (nmap + http only)
 * Useful for read-only discovery without SSH access
 */
export function getBasicDiscoveryTools(): DiscoveryTool[] {
  return [nmapTool, httpProbeTool];
}

/**
 * Get privileged discovery tools (requires credentials)
 */
export function getPrivilegedDiscoveryTools(): DiscoveryTool[] {
  return [sshExecuteTool, sshReadFileTool];
}
