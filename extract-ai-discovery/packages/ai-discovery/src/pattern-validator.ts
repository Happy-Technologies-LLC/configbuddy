// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Pattern Validator
 * Tests and validates generated patterns before activation
 */

import { DiscoveryPattern } from './types';
import { PatternMatcher } from './pattern-matcher';
import { logger } from '@cmdb/common';
import { VM } from 'vm2';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  testResults: TestResult[];
}

export interface TestResult {
  testName: string;
  passed: boolean;
  actual: any;
  expected: any;
  error?: string;
}

export class PatternValidator {
  /**
   * Validate pattern comprehensively
   */
  async validate(pattern: DiscoveryPattern): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const testResults: TestResult[] = [];

    logger.info('Validating pattern', { patternId: pattern.patternId });

    // 1. Syntax validation
    const syntaxCheck = this.validateSyntax(pattern);
    errors.push(...syntaxCheck.errors);
    warnings.push(...syntaxCheck.warnings);

    // 2. Security validation
    const securityCheck = this.validateSecurity(pattern);
    errors.push(...securityCheck.errors);
    warnings.push(...securityCheck.warnings);

    // 3. Test case execution
    if (pattern.testCases && pattern.testCases.length > 0) {
      const testCheck = await this.runTestCases(pattern);
      testResults.push(...testCheck.results);
      errors.push(...testCheck.errors);
      warnings.push(...testCheck.warnings);
    } else {
      warnings.push('No test cases defined for pattern');
    }

    // 4. Performance validation
    const perfCheck = await this.validatePerformance(pattern);
    errors.push(...perfCheck.errors);
    warnings.push(...perfCheck.warnings);

    const isValid = errors.length === 0;

    logger.info('Pattern validation complete', {
      patternId: pattern.patternId,
      isValid,
      errors: errors.length,
      warnings: warnings.length,
    });

    return {
      isValid,
      errors,
      warnings,
      testResults,
    };
  }

  /**
   * Validate syntax of detection and discovery code
   */
  private validateSyntax(pattern: DiscoveryPattern): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check detection code
    try {
      const detectionFn = new Function(
        'scanResult',
        `${pattern.detectionCode}\nreturn detect(scanResult);`
      );

      // Test with empty input
      const result = detectionFn({});

      if (typeof result !== 'object') {
        errors.push('Detection function must return an object');
      } else {
        if (typeof result.matches !== 'boolean') {
          errors.push('Detection result must have boolean "matches" field');
        }
        if (typeof result.confidence !== 'number') {
          errors.push('Detection result must have number "confidence" field');
        }
        if (result.confidence < 0 || result.confidence > 1) {
          errors.push('Confidence must be between 0 and 1');
        }
      }
    } catch (error) {
      errors.push(
        `Detection code syntax error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Check discovery code
    try {
      // Check for async function signature
      if (
        !pattern.discoveryCode.includes('async function discover') &&
        !pattern.discoveryCode.includes('async discover')
      ) {
        errors.push('Discovery function must be async');
      }

      // Check for return statement
      if (!pattern.discoveryCode.includes('return')) {
        errors.push('Discovery function must return CIs');
      }
    } catch (error) {
      errors.push(
        `Discovery code syntax error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return { errors, warnings };
  }

  /**
   * Validate security - check for dangerous code
   */
  private validateSecurity(pattern: DiscoveryPattern): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const allCode = pattern.detectionCode + '\n' + pattern.discoveryCode;

    // Dangerous keywords that should never appear
    const forbidden = [
      'eval(',
      'Function(',
      'require(',
      'import(',
      'process.exit',
      '__dirname',
      '__filename',
      'child_process',
      'fs.writeFile',
      'fs.unlink',
      'fs.rmdir',
    ];

    for (const keyword of forbidden) {
      if (allCode.includes(keyword)) {
        errors.push(`Forbidden keyword detected: ${keyword}`);
      }
    }

    // Suspicious patterns that warrant warnings
    const suspicious = [
      { pattern: /setTimeout|setInterval/g, message: 'Timers detected' },
      { pattern: /fetch.*(?!http)/g, message: 'Non-HTTP fetch detected' },
      { pattern: /process\./g, message: 'Process access detected' },
      { pattern: /global\./g, message: 'Global object access detected' },
    ];

    for (const { pattern, message } of suspicious) {
      if (pattern.test(allCode)) {
        warnings.push(message);
      }
    }

    return { errors, warnings };
  }

  /**
   * Run test cases against pattern
   */
  private async runTestCases(pattern: DiscoveryPattern): Promise<{
    results: TestResult[];
    errors: string[];
    warnings: string[];
  }> {
    const results: TestResult[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const testCase of pattern.testCases) {
      try {
        const result = await this.runSingleTest(pattern, testCase);
        results.push(result);

        if (!result.passed) {
          errors.push(`Test "${testCase.name}" failed: ${result.error || 'Assertion failure'}`);
        }
      } catch (error) {
        results.push({
          testName: testCase.name,
          passed: false,
          actual: null,
          expected: testCase.expected,
          error: error instanceof Error ? error.message : String(error),
        });
        errors.push(`Test "${testCase.name}" threw error: ${error}`);
      }
    }

    return { results, errors, warnings };
  }

  /**
   * Run a single test case
   */
  private async runSingleTest(
    pattern: DiscoveryPattern,
    testCase: any
  ): Promise<TestResult> {
    const testName = testCase.name || 'Unnamed test';

    try {
      // Test detection function
      const vm = new VM({
        timeout: 1000,
        sandbox: {
          scanResult: testCase.input,
        },
      });

      const detectionResult = vm.run(`
        ${pattern.detectionCode}
        detect(scanResult);
      `);

      // Check expectations
      const expected = testCase.expected;
      let passed = true;
      let error: string | undefined;

      if (expected.matches !== undefined) {
        if (detectionResult.matches !== expected.matches) {
          passed = false;
          error = `Expected matches=${expected.matches}, got ${detectionResult.matches}`;
        }
      }

      if (expected.confidenceMin !== undefined) {
        if (detectionResult.confidence < expected.confidenceMin) {
          passed = false;
          error = `Expected confidence >=${expected.confidenceMin}, got ${detectionResult.confidence}`;
        }
      }

      if (expected.confidenceMax !== undefined) {
        if (detectionResult.confidence > expected.confidenceMax) {
          passed = false;
          error = `Expected confidence <=${expected.confidenceMax}, got ${detectionResult.confidence}`;
        }
      }

      return {
        testName,
        passed,
        actual: detectionResult,
        expected,
        error,
      };
    } catch (error) {
      return {
        testName,
        passed: false,
        actual: null,
        expected: testCase.expected,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate performance (execution time limits)
   */
  private async validatePerformance(pattern: DiscoveryPattern): Promise<{
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Test detection performance
    try {
      const start = Date.now();

      const vm = new VM({
        timeout: 1000,
        sandbox: {
          scanResult: {
            http: { headers: {}, endpoints: [] },
            services: [],
          },
        },
      });

      vm.run(`
        ${pattern.detectionCode}
        detect(scanResult);
      `);

      const duration = Date.now() - start;

      if (duration > 500) {
        warnings.push(`Detection function is slow: ${duration}ms (target: <500ms)`);
      }
      if (duration > 1000) {
        errors.push(`Detection function exceeds time limit: ${duration}ms (max: 1000ms)`);
      }
    } catch (error) {
      // Already caught in syntax validation
    }

    return { errors, warnings };
  }

  /**
   * Quick validation (syntax and security only)
   */
  async quickValidate(pattern: DiscoveryPattern): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    const syntaxCheck = this.validateSyntax(pattern);
    errors.push(...syntaxCheck.errors);

    const securityCheck = this.validateSecurity(pattern);
    errors.push(...securityCheck.errors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
