/**
 * Pattern Matcher
 * Executes pre-compiled discovery patterns for fast detection
 */

import { DiscoveryPattern, PatternMatch, AIDiscoveryContext, IPatternMatcher } from './types';
import { PatternStorageService } from './pattern-storage';
import { logger } from '@cmdb/common';
import { VM } from 'vm2';

export class PatternMatcher implements IPatternMatcher {
  private patternStorage: PatternStorageService;
  private patterns: DiscoveryPattern[] = [];

  constructor(patternStorage?: PatternStorageService) {
    this.patternStorage = patternStorage || new PatternStorageService();
  }

  /**
   * Load patterns from storage
   */
  async loadPatterns(): Promise<void> {
    this.patterns = await this.patternStorage.loadPatterns();
    logger.info(`Pattern matcher loaded ${this.patterns.length} patterns`);
  }

  /**
   * Match scan result against patterns
   */
  async match(scanResult: any): Promise<PatternMatch | null> {
    if (this.patterns.length === 0) {
      await this.loadPatterns();
    }

    let bestMatch: PatternMatch | null = null;
    let bestConfidence = 0;

    logger.debug('Matching scan result against patterns', {
      patternCount: this.patterns.length,
    });

    for (const pattern of this.patterns) {
      try {
        const result = this.executeDetection(pattern, scanResult);

        if (result.matches && result.confidence > bestConfidence) {
          bestConfidence = result.confidence;
          bestMatch = {
            patternId: pattern.patternId,
            patternVersion: pattern.version,
            confidence: result.confidence,
            matchedIndicators: result.indicators || [],
          };

          logger.debug('Pattern matched', {
            patternId: pattern.patternId,
            confidence: result.confidence,
            indicators: result.indicators,
          });
        }
      } catch (error) {
        logger.error('Pattern detection failed', {
          patternId: pattern.patternId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (bestMatch) {
      logger.info('Best pattern match found', {
        patternId: bestMatch.patternId,
        confidence: bestMatch.confidence,
      });
    } else {
      logger.debug('No pattern matches found');
    }

    return bestMatch;
  }

  /**
   * Execute detection function from pattern
   */
  private executeDetection(
    pattern: DiscoveryPattern,
    scanResult: any
  ): { matches: boolean; confidence: number; indicators?: string[] } {
    try {
      // Create sandboxed VM for pattern execution
      const vm = new VM({
        timeout: 1000, // 1 second max
        sandbox: {
          scanResult,
          console: {
            log: (...args: any[]) => logger.debug('Pattern log', { pattern: pattern.patternId, args }),
          },
        },
      });

      // Execute detection code
      const code = `
        ${pattern.detectionCode}
        detect(scanResult);
      `;

      const result = vm.run(code);

      return {
        matches: !!result.matches,
        confidence: result.confidence || 0,
        indicators: result.indicators || [],
      };
    } catch (error) {
      logger.error('Pattern execution error', {
        patternId: pattern.patternId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { matches: false, confidence: 0 };
    }
  }

  /**
   * Execute matched pattern for discovery
   */
  async executePattern(
    patternId: string,
    context: AIDiscoveryContext
  ): Promise<any[]> {
    const startTime = Date.now();

    try {
      const pattern = this.patterns.find(p => p.patternId === patternId);
      if (!pattern) {
        throw new Error(`Pattern not found: ${patternId}`);
      }

      logger.info('Executing pattern', {
        patternId,
        target: `${context.targetHost}:${context.targetPort}`,
      });

      // Execute discovery function
      const result = await this.executeDiscovery(pattern, context);

      const executionTime = Date.now() - startTime;

      // Record successful usage
      await this.patternStorage.recordUsage(
        patternId,
        `pattern-exec-${Date.now()}`,
        true,
        executionTime
      );

      logger.info('Pattern executed successfully', {
        patternId,
        discovered: result.length,
        executionTime,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Record failed usage
      await this.patternStorage.recordUsage(
        patternId,
        `pattern-exec-${Date.now()}`,
        false,
        executionTime,
        undefined,
        errorMessage
      );

      logger.error('Pattern execution failed', { patternId, error: errorMessage });
      throw error;
    }
  }

  /**
   * Execute discovery function from pattern
   */
  private async executeDiscovery(
    pattern: DiscoveryPattern,
    context: AIDiscoveryContext
  ): Promise<any[]> {
    try {
      // Create sandboxed VM with more capabilities for discovery
      const vm = new VM({
        timeout: 10000, // 10 seconds max for discovery
        sandbox: {
          context,
          fetch: this.createSafeFetch(),
          console: {
            log: (...args: any[]) => logger.debug('Pattern discovery log', { pattern: pattern.patternId, args }),
            error: (...args: any[]) => logger.error('Pattern discovery error', { pattern: pattern.patternId, args }),
          },
        },
      });

      // Execute discovery code
      const code = `
        ${pattern.discoveryCode}
        (async () => {
          return await discover(context);
        })();
      `;

      const result = await vm.run(code);

      return Array.isArray(result) ? result : [result];
    } catch (error) {
      logger.error('Pattern discovery execution error', {
        patternId: pattern.patternId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create safe fetch function for pattern discovery
   * (limits what patterns can access)
   */
  private createSafeFetch() {
    return async (url: string, options?: any) => {
      // Basic safety checks
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('Invalid URL protocol');
      }

      // Use native fetch or axios
      const axios = require('axios');
      const response = await axios({
        url,
        method: options?.method || 'GET',
        headers: options?.headers,
        timeout: 5000,
        maxRedirects: 0,
        validateStatus: () => true,
      });

      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        json: async () => response.data,
        text: async () =>
          typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      };
    };
  }

  /**
   * Add new pattern (and reload)
   */
  async addPattern(pattern: DiscoveryPattern): Promise<void> {
    await this.patternStorage.savePattern(pattern);
    await this.loadPatterns(); // Reload all patterns
    logger.info('Pattern added and reloaded', { patternId: pattern.patternId });
  }

  /**
   * Get all loaded patterns
   */
  getPatterns(): DiscoveryPattern[] {
    return this.patterns;
  }
}
