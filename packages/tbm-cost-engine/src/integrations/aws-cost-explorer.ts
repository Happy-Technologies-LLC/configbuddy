/**
 * AWS Cost Explorer Integration
 * Fetches cost and usage data from AWS Cost Explorer API
 */

import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostAndUsageWithResourcesCommand,
  GetCostForecastCommand,
  GroupDefinition,
  Expression,
} from '@aws-sdk/client-cost-explorer';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Logger } from 'winston';
import {
  CostBreakdown,
  DailyCostData,
  ResourceCost,
  AWSCostData,
  AWSCostExplorerParams,
  CostForecast,
  CostAnomalyDetection,
} from './types/cloud-cost-types';

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  sessionToken?: string;
}

export class AWSCostExplorer {
  private client: CostExplorerClient;
  private logger: Logger;
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000; // ms

  constructor(credentials: AWSCredentials, logger: Logger) {
    this.client = new CostExplorerClient({
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
      region: credentials.region || 'us-east-1',
    });
    this.logger = logger;
  }

  /**
   * Get costs by specific resource IDs using Cost and Usage API with resources
   */
  async getCostsByResourceId(
    resourceIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, number>> {
    this.logger.info('Fetching AWS costs by resource ID', {
      resourceCount: resourceIds.length,
      startDate,
      endDate,
    });

    const costs = new Map<string, number>();

    try {
      // AWS limits resource queries to 100 resources at a time
      const batchSize = 100;
      for (let i = 0; i < resourceIds.length; i += batchSize) {
        const batch = resourceIds.slice(i, i + batchSize);

        const command = new GetCostAndUsageWithResourcesCommand({
          TimePeriod: {
            Start: format(startDate, 'yyyy-MM-dd'),
            End: format(endDate, 'yyyy-MM-dd'),
          },
          Granularity: 'DAILY',
          Metrics: ['UnblendedCost', 'UsageQuantity'],
          Filter: {
            Dimensions: {
              Key: 'RESOURCE_ID',
              Values: batch,
            },
          },
        });

        const response = await this.retryWithBackoff(async () => {
          return await this.client.send(command);
        });

        if (response.ResultsByTime) {
          for (const result of response.ResultsByTime) {
            if (result.Groups) {
              for (const group of result.Groups) {
                const resourceId = group.Keys?.[0] || '';
                const amount = parseFloat(
                  group.Metrics?.UnblendedCost?.Amount || '0'
                );

                const currentCost = costs.get(resourceId) || 0;
                costs.set(resourceId, currentCost + amount);
              }
            }
          }
        }
      }

      this.logger.info('Successfully fetched costs by resource ID', {
        resourcesWithCosts: costs.size,
      });

      return costs;
    } catch (error) {
      this.logger.error('Failed to fetch costs by resource ID', { error });
      throw new Error(`AWS Cost Explorer error: ${error}`);
    }
  }

  /**
   * Get costs grouped by AWS service
   */
  async getCostsByService(
    serviceName: string,
    startDate: Date,
    endDate: Date
  ): Promise<CostBreakdown> {
    this.logger.info('Fetching AWS costs by service', {
      service: serviceName,
      startDate,
      endDate,
    });

    try {
      const command = new GetCostAndUsageCommand({
        TimePeriod: {
          Start: format(startDate, 'yyyy-MM-dd'),
          End: format(endDate, 'yyyy-MM-dd'),
        },
        Granularity: 'MONTHLY',
        Metrics: ['UnblendedCost'],
        Filter: {
          Dimensions: {
            Key: 'SERVICE',
            Values: [serviceName],
          },
        },
        GroupBy: [
          {
            Type: 'DIMENSION',
            Key: 'USAGE_TYPE',
          },
        ],
      });

      const response = await this.retryWithBackoff(async () => {
        return await this.client.send(command);
      });

      let total = 0;
      const breakdown: Array<{
        category: string;
        amount: number;
        currency: string;
        percentage?: number;
      }> = [];

      if (response.ResultsByTime && response.ResultsByTime.length > 0) {
        const result = response.ResultsByTime[0];

        if (result.Groups) {
          for (const group of result.Groups) {
            const usageType = group.Keys?.[0] || 'Unknown';
            const amount = parseFloat(
              group.Metrics?.UnblendedCost?.Amount || '0'
            );

            total += amount;
            breakdown.push({
              category: usageType,
              amount,
              currency: 'USD',
            });
          }
        }

        // Calculate percentages
        if (total > 0) {
          breakdown.forEach((item) => {
            item.percentage = (item.amount / total) * 100;
          });
        }
      }

      this.logger.info('Successfully fetched costs by service', {
        service: serviceName,
        total,
        breakdownItems: breakdown.length,
      });

      return {
        total,
        currency: 'USD',
        breakdown,
      };
    } catch (error) {
      this.logger.error('Failed to fetch costs by service', { error });
      throw new Error(`AWS Cost Explorer error: ${error}`);
    }
  }

  /**
   * Get daily cost data for a date range
   */
  async getDailyCosts(
    startDate: Date,
    endDate: Date
  ): Promise<DailyCostData[]> {
    this.logger.info('Fetching AWS daily costs', { startDate, endDate });

    try {
      const command = new GetCostAndUsageCommand({
        TimePeriod: {
          Start: format(startDate, 'yyyy-MM-dd'),
          End: format(endDate, 'yyyy-MM-dd'),
        },
        Granularity: 'DAILY',
        Metrics: ['UnblendedCost', 'UsageQuantity'],
        GroupBy: [
          {
            Type: 'DIMENSION',
            Key: 'SERVICE',
          },
        ],
      });

      const response = await this.retryWithBackoff(async () => {
        return await this.client.send(command);
      });

      const dailyCosts: DailyCostData[] = [];

      if (response.ResultsByTime) {
        for (const result of response.ResultsByTime) {
          const date = new Date(result.TimePeriod?.Start || '');

          if (result.Groups) {
            for (const group of result.Groups) {
              const service = group.Keys?.[0] || 'Unknown';
              const amount = parseFloat(
                group.Metrics?.UnblendedCost?.Amount || '0'
              );

              if (amount > 0) {
                dailyCosts.push({
                  date,
                  amount,
                  currency: 'USD',
                  service,
                });
              }
            }
          }
        }
      }

      this.logger.info('Successfully fetched daily costs', {
        daysProcessed: dailyCosts.length,
      });

      return dailyCosts;
    } catch (error) {
      this.logger.error('Failed to fetch daily costs', { error });
      throw new Error(`AWS Cost Explorer error: ${error}`);
    }
  }

  /**
   * Get cost forecast for upcoming period
   */
  async getCostForecast(
    startDate: Date,
    endDate: Date
  ): Promise<CostForecast> {
    this.logger.info('Fetching AWS cost forecast', { startDate, endDate });

    try {
      const command = new GetCostForecastCommand({
        TimePeriod: {
          Start: format(startDate, 'yyyy-MM-dd'),
          End: format(endDate, 'yyyy-MM-dd'),
        },
        Metric: 'UNBLENDED_COST',
        Granularity: 'MONTHLY',
      });

      const response = await this.retryWithBackoff(async () => {
        return await this.client.send(command);
      });

      const predictedCost = parseFloat(response.Total?.Amount || '0');

      const lookbackDays = 30; // AWS uses last 30 days for forecast

      this.logger.info('Successfully fetched cost forecast', {
        predictedCost,
      });

      return {
        period: {
          startDate,
          endDate,
        },
        predictedCost,
        currency: 'USD',
        confidence: 0.85, // AWS doesn't provide confidence, using typical value
        basedOnDays: lookbackDays,
      };
    } catch (error) {
      this.logger.error('Failed to fetch cost forecast', { error });
      throw new Error(`AWS Cost Explorer error: ${error}`);
    }
  }

  /**
   * Get monthly costs aggregated by service for the current month
   */
  async getCurrentMonthCosts(): Promise<CostBreakdown> {
    const startDate = startOfMonth(new Date());
    const endDate = endOfMonth(new Date());

    this.logger.info('Fetching current month costs', { startDate, endDate });

    try {
      const command = new GetCostAndUsageCommand({
        TimePeriod: {
          Start: format(startDate, 'yyyy-MM-dd'),
          End: format(endDate, 'yyyy-MM-dd'),
        },
        Granularity: 'MONTHLY',
        Metrics: ['UnblendedCost'],
        GroupBy: [
          {
            Type: 'DIMENSION',
            Key: 'SERVICE',
          },
        ],
      });

      const response = await this.retryWithBackoff(async () => {
        return await this.client.send(command);
      });

      let total = 0;
      const breakdown: Array<{
        category: string;
        amount: number;
        currency: string;
        percentage?: number;
      }> = [];

      if (response.ResultsByTime && response.ResultsByTime.length > 0) {
        const result = response.ResultsByTime[0];

        if (result.Groups) {
          for (const group of result.Groups) {
            const service = group.Keys?.[0] || 'Unknown';
            const amount = parseFloat(
              group.Metrics?.UnblendedCost?.Amount || '0'
            );

            total += amount;
            breakdown.push({
              category: service,
              amount,
              currency: 'USD',
            });
          }
        }

        // Calculate percentages and sort by amount
        if (total > 0) {
          breakdown.forEach((item) => {
            item.percentage = (item.amount / total) * 100;
          });
          breakdown.sort((a, b) => b.amount - a.amount);
        }
      }

      this.logger.info('Successfully fetched current month costs', {
        total,
        services: breakdown.length,
      });

      return {
        total,
        currency: 'USD',
        breakdown,
      };
    } catch (error) {
      this.logger.error('Failed to fetch current month costs', { error });
      throw new Error(`AWS Cost Explorer error: ${error}`);
    }
  }

  /**
   * Detect cost anomalies by comparing current vs historical costs
   */
  async detectCostAnomalies(
    resourceId: string,
    currentCost: number
  ): Promise<CostAnomalyDetection> {
    this.logger.info('Detecting cost anomalies', { resourceId, currentCost });

    try {
      // Get last 30 days of costs for baseline
      const endDate = new Date();
      const startDate = subDays(endDate, 30);

      const historicalCosts = await this.getCostsByResourceId(
        [resourceId],
        startDate,
        endDate
      );

      const historicalCost = historicalCosts.get(resourceId) || 0;
      const expectedCost = historicalCost / 30; // Daily average
      const variance = currentCost - expectedCost;
      const variancePercentage = expectedCost > 0
        ? (variance / expectedCost) * 100
        : 0;

      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (Math.abs(variancePercentage) > 100) {
        severity = 'critical';
      } else if (Math.abs(variancePercentage) > 50) {
        severity = 'high';
      } else if (Math.abs(variancePercentage) > 25) {
        severity = 'medium';
      }

      const detected = Math.abs(variancePercentage) > 25;

      this.logger.info('Cost anomaly detection completed', {
        resourceId,
        detected,
        severity,
        variancePercentage,
      });

      return {
        detected,
        severity,
        expectedCost,
        actualCost: currentCost,
        variance,
        variancePercentage,
        reason: detected
          ? `Cost ${variance > 0 ? 'increased' : 'decreased'} by ${Math.abs(
              variancePercentage
            ).toFixed(1)}% compared to 30-day average`
          : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to detect cost anomalies', { error });
      throw new Error(`Cost anomaly detection error: ${error}`);
    }
  }

  /**
   * Get costs with custom grouping and filtering
   */
  async getCustomCostData(params: AWSCostExplorerParams): Promise<AWSCostData[]> {
    this.logger.info('Fetching custom AWS cost data', { params });

    try {
      const groupBy: GroupDefinition[] = params.groupBy?.map((g) => ({
        Type: g.type,
        Key: g.key,
      })) || [];

      const command = new GetCostAndUsageCommand({
        TimePeriod: {
          Start: format(params.startDate, 'yyyy-MM-dd'),
          End: format(params.endDate, 'yyyy-MM-dd'),
        },
        Granularity: params.granularity,
        Metrics: ['UnblendedCost', 'UsageQuantity'],
        GroupBy: groupBy.length > 0 ? groupBy : undefined,
        Filter: params.filter,
      });

      const response = await this.retryWithBackoff(async () => {
        return await this.client.send(command);
      });

      const costData: AWSCostData[] = [];

      if (response.ResultsByTime) {
        for (const result of response.ResultsByTime) {
          if (result.Groups) {
            for (const group of result.Groups) {
              const amount = parseFloat(
                group.Metrics?.UnblendedCost?.Amount || '0'
              );

              if (amount > 0) {
                costData.push({
                  accountId: '', // Would need to add LINKED_ACCOUNT to groupBy
                  service: group.Keys?.[0] || 'Unknown',
                  cost: amount,
                  currency: 'USD',
                });
              }
            }
          }
        }
      }

      this.logger.info('Successfully fetched custom cost data', {
        recordCount: costData.length,
      });

      return costData;
    } catch (error) {
      this.logger.error('Failed to fetch custom cost data', { error });
      throw new Error(`AWS Cost Explorer error: ${error}`);
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt >= this.maxRetries) {
        throw error;
      }

      // Check if error is retryable
      if (
        error.name === 'ThrottlingException' ||
        error.name === 'TooManyRequestsException' ||
        error.$metadata?.httpStatusCode === 429 ||
        error.$metadata?.httpStatusCode >= 500
      ) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        this.logger.warn(`Retrying AWS Cost Explorer request after ${delay}ms`, {
          attempt,
          error: error.name,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.retryWithBackoff(fn, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Close the client connection
   */
  async close(): Promise<void> {
    this.client.destroy();
  }
}
