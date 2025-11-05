/**
 * Tracing Decorators
 * Convenient decorators for automatic span creation
 */

import { getTracingService } from './tracer';
import { SpanStatusCode } from '@opentelemetry/api';

/**
 * Decorator to automatically trace a method
 */
export function Trace(operationName?: string) {
  return function (
    __target: any,
    _propertyKey: string,
    _descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const spanName = operationName || `${_target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const tracingService = getTracingService();
      const span = tracingService.startSpan(spanName);

      try {
        // Add method arguments as attributes (sanitized)
        span.setAttribute('method', propertyKey);
        span.setAttribute('class', _target.constructor.name);

        const result = await originalMethod.apply(this, args);

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error: any) {
        span.setStatus({
          _code: SpanStatusCode.ERROR,
          _message: error.message,
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    };

    return descriptor;
  };
}

/**
 * Decorator to trace discovery operations
 */
export function TraceDiscovery(provider: string) {
  return function (
    __target: any,
    _propertyKey: string,
    _descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const tracingService = getTracingService();
      const span = tracingService.startSpan(`discovery.${provider}.${propertyKey}`);

      span.setAttribute('discovery.provider', provider);
      span.setAttribute('discovery.operation', propertyKey);

      try {
        const result = await originalMethod.apply(this, args);

        // Add result metadata
        if (Array.isArray(result)) {
          span.setAttribute('discovery.cis_found', result.length);
        }

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error: any) {
        span.setStatus({
          _code: SpanStatusCode.ERROR,
          _message: error.message,
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    };

    return descriptor;
  };
}

/**
 * Decorator to trace ETL operations
 */
export function TraceETL(jobType: string) {
  return function (
    __target: any,
    _propertyKey: string,
    _descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const tracingService = getTracingService();
      const span = tracingService.startSpan(`etl.${jobType}.${propertyKey}`);

      span.setAttribute('etl.job_type', jobType);
      span.setAttribute('etl.operation', propertyKey);

      try {
        const result = await originalMethod.apply(this, args);

        // Add result metadata
        if (result && typeof result === 'object') {
          if (result.recordsProcessed !== undefined) {
            span.setAttribute('etl.records_processed', result.recordsProcessed);
          }
          if (result.recordsSynced !== undefined) {
            span.setAttribute('etl.records_synced', result.recordsSynced);
          }
        }

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error: any) {
        span.setStatus({
          _code: SpanStatusCode.ERROR,
          _message: error.message,
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    };

    return descriptor;
  };
}

/**
 * Decorator to trace database operations
 */
export function TraceDatabase(database: string) {
  return function (
    __target: any,
    _propertyKey: string,
    _descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const tracingService = getTracingService();
      const span = tracingService.startSpan(`database.${database}.${propertyKey}`);

      span.setAttribute('db.system', database);
      span.setAttribute('db.operation', propertyKey);

      try {
        const result = await originalMethod.apply(this, args);

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error: any) {
        span.setStatus({
          _code: SpanStatusCode.ERROR,
          _message: error.message,
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    };

    return descriptor;
  };
}
