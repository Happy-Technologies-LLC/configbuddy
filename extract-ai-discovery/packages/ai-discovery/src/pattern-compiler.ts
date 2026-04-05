// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Pattern Compiler
 * Generates TypeScript detection and discovery code from AI discovery patterns
 */

import { AIDiscoverySession, DiscoveryPattern, IPatternCompiler } from './types';
import { PatternAnalyzer, PatternCandidate } from './pattern-analyzer';
import { logger } from '@cmdb/common';

export class PatternCompiler implements IPatternCompiler {
  private analyzer: PatternAnalyzer;

  constructor(analyzer?: PatternAnalyzer) {
    this.analyzer = analyzer || new PatternAnalyzer();
  }

  /**
   * Analyze session to check if it's part of a pattern
   */
  async analyzeSession(session: AIDiscoverySession): Promise<boolean> {
    const result = await this.analyzer.analyzeSession(session);
    return result.isPattern;
  }

  /**
   * Compile pattern from multiple discovery sessions
   */
  async compilePattern(sessions: AIDiscoverySession[]): Promise<DiscoveryPattern> {
    if (sessions.length === 0) {
      throw new Error('No sessions provided for pattern compilation');
    }

    logger.info('Compiling pattern from sessions', {
      sessionCount: sessions.length,
    });

    // Analyze sessions to build candidate
    const result = await this.analyzer.analyzeSession(sessions[0]);
    if (!result.candidate) {
      throw new Error('Unable to build pattern candidate from sessions');
    }

    const candidate = result.candidate;

    // Generate detection code
    const detectionCode = this.generateDetectionCode(candidate);

    // Generate discovery code
    const discoveryCode = this.generateDiscoveryCode(candidate, sessions);

    // Generate test cases
    const testCases = this.generateTestCases(candidate, sessions);

    // Build pattern object
    const pattern: Omit<DiscoveryPattern, 'id'> = {
      patternId: this.generatePatternId(candidate),
      name: candidate.suggestedName,
      version: '1.0.0',
      category: candidate.suggestedCategory,
      detectionCode,
      discoveryCode,
      description: `Auto-generated pattern for ${candidate.suggestedName}`,
      author: 'ai-compiler',
      license: 'MIT',
      confidenceScore: candidate.signature.confidenceScore,
      usageCount: 0,
      successCount: 0,
      failureCount: 0,
      learnedFromSessions: candidate.signature.sessions,
      aiModel: sessions[0].aiModel,
      status: 'draft',
      isActive: false,
      testCases,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logger.info('Pattern compiled successfully', {
      patternId: pattern.patternId,
      name: pattern.name,
      category: pattern.category,
    });

    return pattern as DiscoveryPattern;
  }

  /**
   * Validate generated pattern
   */
  async validatePattern(pattern: DiscoveryPattern): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Validate detection code
    try {
      const detectionFn = new Function(
        'scanResult',
        `${pattern.detectionCode}\nreturn detect(scanResult);`
      );

      // Test with empty scan result
      const testResult = detectionFn({});
      if (
        typeof testResult !== 'object' ||
        typeof testResult.matches !== 'boolean' ||
        typeof testResult.confidence !== 'number'
      ) {
        errors.push(
          'Detection function must return { matches: boolean, confidence: number }'
        );
      }
    } catch (error) {
      errors.push(
        `Detection code error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Validate discovery code
    try {
      // Check for required function signature
      if (!pattern.discoveryCode.includes('async function discover(context)')) {
        errors.push('Discovery function must be: async function discover(context)');
      }

      // Check for dangerous code patterns
      const dangerous = ['eval', 'exec', 'require', 'process.exit', '__dirname', '__filename'];
      for (const keyword of dangerous) {
        if (pattern.discoveryCode.includes(keyword)) {
          errors.push(`Discovery code contains dangerous keyword: ${keyword}`);
        }
      }
    } catch (error) {
      errors.push(
        `Discovery code error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Validate test cases
    if (!pattern.testCases || pattern.testCases.length === 0) {
      errors.push('Pattern must have at least one test case');
    }

    const isValid = errors.length === 0;

    if (isValid) {
      logger.info('Pattern validation passed', { patternId: pattern.patternId });
    } else {
      logger.warn('Pattern validation failed', {
        patternId: pattern.patternId,
        errors,
      });
    }

    return { isValid, errors };
  }

  /**
   * Generate detection code from candidate
   */
  private generateDetectionCode(candidate: PatternCandidate): string {
    const { commonElements } = candidate;

    // Build detection logic based on common elements
    const checks: string[] = [];

    // Port checks
    if (commonElements.ports.length > 0) {
      checks.push(`
  // Check ports
  const services = scanResult.services || [];
  const targetPorts = [${commonElements.ports.join(', ')}];
  const hasPort = services.some(s => targetPorts.includes(s.port));
  if (hasPort) {
    confidence += 0.3;
    indicators.push('standard-port');
  }`);
    }

    // Header checks
    if (commonElements.headers.length > 0) {
      const headerChecks = commonElements.headers
        .map(header => {
          const headerKey = header.split(':')[0];
          return `
  if (headers['${headerKey}'] || headers['${headerKey.toLowerCase()}']) {
    confidence += 0.4;
    indicators.push('${headerKey}-header');
  }`;
        })
        .join('');

      checks.push(`
  // Check HTTP headers
  const headers = scanResult.http?.headers || {};${headerChecks}`);
    }

    // Endpoint checks
    if (commonElements.endpoints.length > 0) {
      const endpointList = commonElements.endpoints.map(e => `'${e}'`).join(', ');
      checks.push(`
  // Check endpoints
  const endpoints = scanResult.http?.endpoints || [];
  const expectedEndpoints = [${endpointList}];
  const hasEndpoint = expectedEndpoints.some(ep => endpoints.includes(ep));
  if (hasEndpoint) {
    confidence += 0.5;
    indicators.push('known-endpoint');
  }`);
    }

    // Service name checks
    if (commonElements.serviceNames.length > 0) {
      const serviceChecks = commonElements.serviceNames
        .map(name => `
  if (serviceName.includes('${name}')) {
    confidence += 0.3;
    indicators.push('${name}-service');
  }`)
        .join('');

      checks.push(`
  // Check service names
  const serviceName = (scanResult.services?.[0]?.service || '').toLowerCase();${serviceChecks}`);
    }

    return `function detect(scanResult) {
  let confidence = 0;
  const indicators = [];
${checks.join('\n')}

  return {
    matches: confidence >= 0.5,
    confidence: Math.min(confidence, 1.0),
    indicators
  };
}`;
  }

  /**
   * Generate discovery code from candidate and sessions
   */
  private generateDiscoveryCode(
    candidate: PatternCandidate,
    sessions: AIDiscoverySession[]
  ): string {
    const { commonElements } = candidate;

    // Determine service type from category
    const serviceType = this.mapCategoryToServiceType(candidate.suggestedCategory);

    // Build discovery logic
    const discoverySteps: string[] = [];

    // Basic CI structure
    discoverySteps.push(`
  const ci = {
    _type: '${serviceType}',
    name: '${candidate.suggestedName} on ' + targetHost + ':' + targetPort,
    hostname: targetHost,
    port: targetPort,
    metadata: {
      technology: '${candidate.suggestedName}',
      category: '${candidate.suggestedCategory}'
    }
  };`);

    // Add HTTP probing if endpoints are common
    if (commonElements.endpoints.length > 0) {
      const endpoints = commonElements.endpoints.slice(0, 3); // Top 3
      discoverySteps.push(`
  // Try common endpoints
  const protocol = targetPort === 443 ? 'https' : 'http';
  const baseUrl = protocol + '://' + targetHost + ':' + targetPort;
  const endpoints = ${JSON.stringify(endpoints)};

  for (const endpoint of endpoints) {
    try {
      const resp = await fetch(baseUrl + endpoint);
      if (resp.ok) {
        const data = await resp.json();
        ci.metadata[endpoint.replace('/', '')] = data;
      }
    } catch (e) {
      // Endpoint not available
    }
  }`);
    }

    // Extract version if possible
    discoverySteps.push(`
  // Try to extract version
  if (scanResult.services && scanResult.services.length > 0) {
    const service = scanResult.services[0];
    if (service.version) {
      ci.metadata.version = service.version;
    }
  }`);

    return `async function discover(context) {
  const { targetHost, targetPort, scanResult } = context;
${discoverySteps.join('\n')}

  return [ci];
}`;
  }

  /**
   * Generate test cases from sessions
   */
  private generateTestCases(
    candidate: PatternCandidate,
    sessions: AIDiscoverySession[]
  ): any[] {
    const testCases: any[] = [];

    // Take first session as test case
    const testSession = sessions[0];

    testCases.push({
      name: 'Detection test',
      input: (testSession as any).scanResult || testSession.discoveredCIs || {},
      expected: {
        matches: true,
        confidenceMin: 0.5,
      },
    });

    // Add port test if applicable
    if (candidate.commonElements.ports.length > 0) {
      testCases.push({
        name: 'Port detection',
        input: {
          services: [{ port: candidate.commonElements.ports[0], service: 'http' }],
        },
        expected: {
          matches: true,
          confidenceMin: 0.3,
        },
      });
    }

    // Add endpoint test if applicable
    if (candidate.commonElements.endpoints.length > 0) {
      testCases.push({
        name: 'Endpoint detection',
        input: {
          http: {
            endpoints: candidate.commonElements.endpoints,
          },
        },
        expected: {
          matches: true,
          confidenceMin: 0.5,
        },
      });
    }

    return testCases;
  }

  /**
   * Generate pattern ID from candidate
   */
  private generatePatternId(candidate: PatternCandidate): string {
    return candidate.suggestedName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Map category to CI service type
   */
  private mapCategoryToServiceType(category: string): string {
    const mapping: Record<string, string> = {
      'databases': 'database',
      'caching': 'cache',
      'web-servers': 'web-server',
      'message-queues': 'message-queue',
      'search-engines': 'search-engine',
      'container-platforms': 'container-platform',
      'java-frameworks': 'application',
      'nodejs-frameworks': 'application',
      'applications': 'application',
    };

    return mapping[category] || 'application';
  }

  /**
   * Get pattern candidates ready for compilation
   */
  async getCandidates(): Promise<PatternCandidate[]> {
    return await this.analyzer.getPatternCandidates();
  }
}
