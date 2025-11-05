/**
 * Distributed Tracing Infrastructure
 * OpenTelemetry-based distributed tracing for request flow tracking
 */

import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import * as resources from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { GraphQLInstrumentation } from '@opentelemetry/instrumentation-graphql';
import { trace, context, Span, SpanStatusCode, Tracer } from '@opentelemetry/api';
import { getLogger } from '../logging/logger';

const logger = getLogger();

export interface TracingConfig {
  _serviceName: string;
  serviceVersion?: string;
  environment?: string;
  jaegerEndpoint?: string;
  enableConsoleExport?: boolean;
  sampleRate?: number;
}

export class TracingService {
  private static instance: TracingService;
  private provider!: NodeTracerProvider;
  private tracer!: Tracer;
  private initialized: boolean = false;

  private constructor() {
    // Initialize will be called separately
  }

  public static getInstance(): TracingService {
    if (!TracingService.instance) {
      TracingService.instance = new TracingService();
    }
    return TracingService.instance;
  }

  /**
   * Initialize OpenTelemetry tracing
   */
  public initialize(config: TracingConfig): void {
    if (this.initialized) {
      logger.warn('Tracing already initialized');
      return;
    }

    const {
      serviceName,
      serviceVersion = '1.0.0',
      environment = process.env['NODE_ENV'] || 'development',
      jaegerEndpoint = process.env['JAEGER_ENDPOINT'] || 'http://localhost:14268/api/traces',
      enableConsoleExport = false,
    } = config;

    // Create resource with service information
    const resource = (resources.Resource as any).default().merge(
      new (resources.Resource as any)({
        [ATTR_SERVICE_NAME]: serviceName,
        [ATTR_SERVICE_VERSION]: serviceVersion,
        [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
      })
    );

    // Create provider
    this.provider = new NodeTracerProvider({
      resource,
    });

    // Add Jaeger exporter
    const jaegerExporter = new JaegerExporter({
      _endpoint: jaegerEndpoint,
    });
    this.provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));

    // Add console exporter for development
    if (enableConsoleExport || environment === 'development') {
      this.provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    }

    // Register provider
    this.provider.register();

    // Register instrumentations
    registerInstrumentations({
      _instrumentations: [
        new HttpInstrumentation({
          _requestHook: (span: any, request: any) => {
            span.setAttribute('http.request.headers', JSON.stringify(request.headers));
          },
        }),
        new ExpressInstrumentation({
          _requestHook: (span: any, requestInfo: any) => {
            span.setAttribute('express.route', requestInfo.route || 'unknown');
          },
        }),
        new GraphQLInstrumentation({
          _mergeItems: true,
        }),
      ],
    });

    // Get tracer
    this.tracer = trace.getTracer(serviceName, serviceVersion);
    this.initialized = true;

    logger.info(`Tracing initialized for service: ${serviceName}`);
  }

  /**
   * Get tracer instance
   */
  public getTracer(): Tracer {
    if (!this.initialized) {
      throw new Error('Tracing not initialized. Call initialize() first.');
    }
    return this.tracer;
  }

  /**
   * Start a new span
   */
  public startSpan(name: string, attributes?: Record<string, any>): Span {
    const span = this.tracer.startSpan(name, {
      attributes,
    });
    return span;
  }

  /**
   * Start a span with active context
   */
  public startActiveSpan<T>(
    name: string,
    _attributes: Record<string, any> | undefined,
    _fn: (span: Span) => T
  ): T {
    return this.tracer.startActiveSpan(name, { attributes }, (span) => {
      try {
        const result = fn(span);

        // If result is a promise, handle it
        if (result instanceof Promise) {
          return result
            .then((value) => {
              span.setStatus({ code: SpanStatusCode.OK });
              span.end();
              return value;
            })
            .catch((error) => {
              span.setStatus({
                _code: SpanStatusCode.ERROR,
                _message: error.message,
              });
              span.recordException(error);
              span.end();
              throw error;
            }) as any;
        }

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return result;
      } catch (error: any) {
        span.setStatus({
          _code: SpanStatusCode.ERROR,
          _message: error.message,
        });
        span.recordException(error);
        span.end();
        throw error;
      }
    });
  }

  /**
   * Get current span
   */
  public getCurrentSpan(): Span | undefined {
    return trace.getSpan(context.active());
  }

  /**
   * Add event to current span
   */
  public addEvent(name: string, attributes?: Record<string, any>): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  /**
   * Set attribute on current span
   */
  public setAttribute(key: string, value: any): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.setAttribute(key, value);
    }
  }

  /**
   * Record exception on current span
   */
  public recordException(error: Error): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.recordException(error);
      span.setStatus({
        _code: SpanStatusCode.ERROR,
        _message: error.message,
      });
    }
  }

  /**
   * Shutdown tracing gracefully
   */
  public async shutdown(): Promise<void> {
    if (this.provider) {
      await this.provider.shutdown();
      this.initialized = false;
    }
  }
}

/**
 * Get tracing service instance
 */
export const getTracingService = (): TracingService => TracingService.getInstance();

/**
 * Initialize tracing (convenience function)
 */
export const initializeTracing = (config: TracingConfig): void => {
  getTracingService().initialize(config);
};
