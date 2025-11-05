/**
 * TransformationEngine (v2.0)
 * Executes transformation rules on source data
 */

import { TransformationRule, TransformationContext, TransformationResult } from '../types/transformation.types';
import { ExpressionEvaluator } from './expression-evaluator';
import { logger } from '@cmdb/common';

export class TransformationEngine {
  private expressionEvaluator: ExpressionEvaluator;

  constructor() {
    this.expressionEvaluator = new ExpressionEvaluator();
  }

  /**
   * Transform source data using rule
   */
  async transform(
    rule: TransformationRule,
    context: TransformationContext
  ): Promise<TransformationResult> {
    const errors: any[] = [];
    const warnings: string[] = [];

    try {
      // Check if rule conditions are met
      if (rule.conditions) {
        const conditionsMet = this.evaluateConditions(rule.conditions, context.source_data);
        if (!conditionsMet) {
          return {
            success: false,
            errors: [{ field: '_rule', message: 'Rule conditions not met', error_type: 'validation' }],
          };
        }
      }

      // Transform each field
      const transformedData: any = {};

      for (const mapping of rule.field_mappings) {
        try {
          const value = await this.transformField(mapping, context);
          this.setNestedValue(transformedData, mapping.target_field, value);
        } catch (error) {
          errors.push({
            field: mapping.target_field,
            message: (error as Error).message,
            error_type: 'expression',
          });
        }
      }

      // Validate transformed data
      if (rule.validations) {
        const validationErrors = this.validateData(transformedData, rule.validations);
        errors.push(...validationErrors);
      }

      if (errors.length > 0) {
        return { success: false, errors, warnings };
      }

      return {
        success: true,
        transformed_data: transformedData,
        warnings,
      };

    } catch (error) {
      logger.error('Transformation failed', { rule: rule.id, error });
      return {
        success: false,
        errors: [{ field: '_global', message: (error as Error).message, error_type: 'expression' }],
      };
    }
  }

  /**
   * Transform single field
   */
  private async transformField(mapping: any, context: TransformationContext): Promise<any> {
    let sourceValue = this.getNestedValue(context.source_data, mapping.source_field);

    if (sourceValue == null && mapping.default_value !== undefined) {
      return mapping.default_value;
    }

    if (sourceValue == null && mapping.required) {
      throw new Error(`Required field ${mapping.source_field} is missing`);
    }

    if (!mapping.transformation) {
      return sourceValue;
    }

    const transform = mapping.transformation;

    switch (transform.type) {
      case 'direct':
        return sourceValue;

      case 'expression':
        return this.expressionEvaluator.evaluate(
          transform.expression,
          context.source_data
        );

      case 'lookup':
        return this.performLookup(
          sourceValue,
          transform.lookup_table,
          transform.lookup_key,
          transform.lookup_value,
          context.lookup_tables
        );

      case 'conditional':
        const condition = this.expressionEvaluator.evaluate(
          transform.if_condition,
          context.source_data
        );
        return condition ? transform.then_value : transform.else_value;

      default:
        throw new Error(`Unknown transformation type: ${transform.type}`);
    }
  }

  /**
   * Perform lookup transformation
   */
  private performLookup(
    value: any,
    tableName: string,
    keyField: string,
    valueField: string,
    lookupTables: Record<string, any>
  ): any {
    const table = lookupTables[tableName];
    if (!table) {
      throw new Error(`Lookup table not found: ${tableName}`);
    }

    const entry = table.find((row: any) => row[keyField] === value);
    return entry ? entry[valueField] : null;
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateConditions(conditions: any[], data: any): boolean {
    return conditions.every(condition => {
      const fieldValue = this.getNestedValue(data, condition.field);

      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'not_equals':
          return fieldValue !== condition.value;
        case 'contains':
          return String(fieldValue).includes(condition.value);
        case 'regex':
          return new RegExp(condition.value).test(String(fieldValue));
        case 'exists':
          return fieldValue != null;
        default:
          return true;
      }
    });
  }

  /**
   * Validate transformed data
   */
  private validateData(data: any, validations: any[]): any[] {
    const errors: any[] = [];

    for (const validation of validations) {
      const value = this.getNestedValue(data, validation.field);

      switch (validation.rule_type) {
        case 'required':
          if (value == null) {
            errors.push({
              field: validation.field,
              message: validation.error_message || `${validation.field} is required`,
              error_type: 'validation',
            });
          }
          break;

        case 'regex':
          if (value != null && !new RegExp(validation.parameters.pattern).test(String(value))) {
            errors.push({
              field: validation.field,
              message: validation.error_message,
              error_type: 'validation',
            });
          }
          break;

        case 'range':
          const numValue = Number(value);
          if (validation.parameters.min != null && numValue < validation.parameters.min) {
            errors.push({
              field: validation.field,
              message: validation.error_message,
              error_type: 'validation',
            });
          }
          if (validation.parameters.max != null && numValue > validation.parameters.max) {
            errors.push({
              field: validation.field,
              message: validation.error_message,
              error_type: 'validation',
            });
          }
          break;
      }
    }

    return errors;
  }

  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }
    return current;
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!part) continue;
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    if (lastPart) {
      current[lastPart] = value;
    }
  }
}
