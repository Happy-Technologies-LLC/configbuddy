// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * ExpressionEvaluator (v2.0)
 * Safely evaluates transformation expressions
 */

import { logger } from '@cmdb/common';

export class ExpressionEvaluator {
  private context: Map<string, any>;

  constructor() {
    this.context = new Map();
    this.registerBuiltinFunctions();
  }

  /**
   * Evaluate expression with given data
   */
  evaluate(expression: string, data: any): any {
    try {
      const safeContext = this.createSafeContext(data);
      const result = this.evaluateExpression(expression, safeContext);
      return result;
    } catch (error) {
      logger.error('Expression evaluation failed', { expression, error });
      throw new Error(`Expression evaluation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Register built-in transformation functions
   */
  private registerBuiltinFunctions(): void {
    // String functions
    this.context.set('lowercase', (val: string) => val?.toLowerCase());
    this.context.set('uppercase', (val: string) => val?.toUpperCase());
    this.context.set('trim', (val: string) => val?.trim());
    this.context.set('substring', (val: string, start: number, length?: number) =>
      val?.substring(start, length ? start + length : undefined)
    );

    // Concatenation
    this.context.set('concat', (...args: any[]) =>
      args.filter(a => a != null).join('')
    );

    // Replacement
    this.context.set('replace', (val: string, search: string, replacement: string) =>
      val?.replace(new RegExp(search, 'g'), replacement)
    );

    // Date functions
    this.context.set('now', () => new Date().toISOString());
    this.context.set('format_date', (val: string | Date) => {
      const date = typeof val === 'string' ? new Date(val) : val;
      return date.toISOString();
    });

    // Conditional
    this.context.set('if', (condition: boolean, thenValue: any, elseValue: any) =>
      condition ? thenValue : elseValue
    );

    // Type conversions
    this.context.set('to_string', (val: any) => String(val));
    this.context.set('to_number', (val: any) => Number(val));
    this.context.set('to_boolean', (val: any) => Boolean(val));

    // Array functions
    this.context.set('first', (arr: any[]) => arr?.[0]);
    this.context.set('last', (arr: any[]) => arr?.[arr.length - 1]);
    this.context.set('join', (arr: any[], separator: string) => arr?.join(separator));

    // Null handling
    this.context.set('coalesce', (...args: any[]) =>
      args.find(a => a != null)
    );
    this.context.set('default', (val: any, defaultValue: any) =>
      val != null ? val : defaultValue
    );
  }

  /**
   * Create safe evaluation context from data
   */
  private createSafeContext(data: any): any {
    return {
      ...data,
      ...Object.fromEntries(this.context.entries()),
      // Prevent access to dangerous globals
      eval: undefined,
      Function: undefined,
      setTimeout: undefined,
      setInterval: undefined,
    };
  }

  /**
   * Safely evaluate expression
   */
  private evaluateExpression(expression: string, context: any): any {
    if (expression.includes('(')) {
      return this.evaluateFunctionCall(expression, context);
    } else {
      return this.getNestedValue(context, expression);
    }
  }

  /**
   * Evaluate function call expression
   */
  private evaluateFunctionCall(expression: string, context: any): any {
    const match = expression.match(/^(\w+)\((.*)\)$/);
    if (!match) {
      throw new Error(`Invalid function call: ${expression}`);
    }

    const funcName = match[1];
    const argsString = match[2] || '';

    if (!funcName) {
      throw new Error(`Invalid function name in: ${expression}`);
    }

    const func = context[funcName];

    if (typeof func !== 'function') {
      throw new Error(`Unknown function: ${funcName}`);
    }

    const args = this.parseArguments(argsString, context);
    return func(...args);
  }

  /**
   * Parse function arguments
   */
  private parseArguments(argsString: string, context: any): any[] {
    if (!argsString.trim()) {
      return [];
    }

    const args: any[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      } else if (char === ',' && !inQuotes) {
        args.push(this.parseArgument(current.trim(), context));
        current = '';
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      args.push(this.parseArgument(current.trim(), context));
    }

    return args;
  }

  /**
   * Parse single argument
   */
  private parseArgument(arg: string, context: any): any {
    // String literal
    if ((arg.startsWith('"') && arg.endsWith('"')) ||
        (arg.startsWith("'") && arg.endsWith("'"))) {
      return arg.slice(1, -1);
    }

    // Number literal
    if (!isNaN(Number(arg))) {
      return Number(arg);
    }

    // Boolean literal
    if (arg === 'true') return true;
    if (arg === 'false') return false;
    if (arg === 'null') return null;

    // Nested function call
    if (arg.includes('(')) {
      return this.evaluateFunctionCall(arg, context);
    }

    // Field access
    return this.getNestedValue(context, arg);
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }

    return current;
  }
}
