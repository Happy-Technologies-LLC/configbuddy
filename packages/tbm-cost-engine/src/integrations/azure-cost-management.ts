// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Azure Cost Management Integration
 * Fetches cost and usage data from Azure Cost Management API
 */

import { CostManagementClient } from '@azure/arm-costmanagement';
import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Logger } from 'winston';
import {
  CostBreakdown,
  DailyCostData,
  AzureCostData,
  AzureCostManagementParams,
} from './types/cloud-cost-types';

export interface AzureCredentials {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  subscriptionId: string;
}

export class AzureCostManagement {
  private client: CostManagementClient;
  private credential: ClientSecretCredential;
  private subscriptionId: string;
  private logger: Logger;
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000; // ms

  constructor(credentials: AzureCredentials, logger: Logger) {
    this.credential = new ClientSecretCredential(
      credentials.tenantId,
      credentials.clientId,
      credentials.clientSecret
    );

    this.client = new CostManagementClient(this.credential);
    this.subscriptionId = credentials.subscriptionId;
    this.logger = logger;
  }

  /**
   * Get costs by resource group
   */
  async getCostsByResourceGroup(
    resourceGroupId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    this.logger.info('Fetching Azure costs by resource group', {
      resourceGroupId,
      startDate,
      endDate,
    });

    try {
      const scope = `/subscriptions/${this.subscriptionId}/resourceGroups/${resourceGroupId}`;

      const queryResult = await this.retryWithBackoff(async () => {
        return await this.client.query.usage(scope, {
          type: 'ActualCost',
          timeframe: 'Custom',
          timePeriod: {
            from: startDate,
            to: endDate,
          },
          dataset: {
            granularity: 'Daily',
            aggregation: {
              totalCost: {
                name: 'Cost',
                function: 'Sum',
              },
            },
          },
        });
      });

      let totalCost = 0;

      if (queryResult.rows && queryResult.rows.length > 0) {
        for (const row of queryResult.rows) {
          // Cost is typically in the first column after date columns
          const costValue = row[row.length - 1];
          if (typeof costValue === 'number') {
            totalCost += costValue;
          }
        }
      }

      this.logger.info('Successfully fetched costs by resource group', {
        resourceGroupId,
        totalCost,
      });

      return totalCost;
    } catch (error) {
      this.logger.error('Failed to fetch costs by resource group', { error });
      throw new Error(`Azure Cost Management error: ${error}`);
    }
  }

  /**
   * Get costs by subscription with service breakdown
   */
  async getCostsBySubscription(
    subscriptionId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CostBreakdown> {
    this.logger.info('Fetching Azure costs by subscription', {
      subscriptionId,
      startDate,
      endDate,
    });

    try {
      const scope = `/subscriptions/${subscriptionId}`;

      const queryResult = await this.retryWithBackoff(async () => {
        return await this.client.query.usage(scope, {
          type: 'ActualCost',
          timeframe: 'Custom',
          timePeriod: {
            from: startDate,
            to: endDate,
          },
          dataset: {
            granularity: 'None',
            aggregation: {
              totalCost: {
                name: 'Cost',
                function: 'Sum',
              },
            },
            grouping: [
              {
                type: 'Dimension',
                name: 'ServiceName',
              },
            ],
          },
        });
      });

      let total = 0;
      const breakdown: Array<{
        category: string;
        amount: number;
        currency: string;
        percentage?: number;
      }> = [];

      if (queryResult.rows && queryResult.rows.length > 0) {
        for (const row of queryResult.rows) {
          // Azure query result format: [cost, serviceName]
          const cost = typeof row[0] === 'number' ? row[0] : 0;
          const serviceName = String(row[1] || 'Unknown');

          total += cost;
          breakdown.push({
            category: serviceName,
            amount: cost,
            currency: 'USD', // Azure reports in billing currency
          });
        }

        // Calculate percentages
        if (total > 0) {
          breakdown.forEach((item) => {
            item.percentage = (item.amount / total) * 100;
          });
          breakdown.sort((a, b) => b.amount - a.amount);
        }
      }

      this.logger.info('Successfully fetched costs by subscription', {
        subscriptionId,
        total,
        services: breakdown.length,
      });

      return {
        total,
        currency: 'USD',
        breakdown,
      };
    } catch (error) {
      this.logger.error('Failed to fetch costs by subscription', { error });
      throw new Error(`Azure Cost Management error: ${error}`);
    }
  }

  /**
   * Get daily cost data for a subscription
   */
  async getDailyCosts(
    subscriptionId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyCostData[]> {
    this.logger.info('Fetching Azure daily costs', {
      subscriptionId,
      startDate,
      endDate,
    });

    try {
      const scope = `/subscriptions/${subscriptionId}`;

      const queryResult = await this.retryWithBackoff(async () => {
        return await this.client.query.usage(scope, {
          type: 'ActualCost',
          timeframe: 'Custom',
          timePeriod: {
            from: startDate,
            to: endDate,
          },
          dataset: {
            granularity: 'Daily',
            aggregation: {
              totalCost: {
                name: 'Cost',
                function: 'Sum',
              },
            },
            grouping: [
              {
                type: 'Dimension',
                name: 'ServiceName',
              },
            ],
          },
        });
      });

      const dailyCosts: DailyCostData[] = [];

      if (queryResult.rows && queryResult.rows.length > 0) {
        for (const row of queryResult.rows) {
          // Azure query result format: [cost, date, serviceName]
          const cost = typeof row[0] === 'number' ? row[0] : 0;
          const dateStr = String(row[1] || '');
          const serviceName = String(row[2] || 'Unknown');

          if (cost > 0 && dateStr) {
            dailyCosts.push({
              date: new Date(dateStr),
              amount: cost,
              currency: 'USD',
              service: serviceName,
            });
          }
        }
      }

      this.logger.info('Successfully fetched daily costs', {
        daysProcessed: dailyCosts.length,
      });

      return dailyCosts;
    } catch (error) {
      this.logger.error('Failed to fetch daily costs', { error });
      throw new Error(`Azure Cost Management error: ${error}`);
    }
  }

  /**
   * Get costs by resource type
   */
  async getCostsByResourceType(
    resourceType: string,
    startDate: Date,
    endDate: Date
  ): Promise<CostBreakdown> {
    this.logger.info('Fetching Azure costs by resource type', {
      resourceType,
      startDate,
      endDate,
    });

    try {
      const scope = `/subscriptions/${this.subscriptionId}`;

      const queryResult = await this.retryWithBackoff(async () => {
        return await this.client.query.usage(scope, {
          type: 'ActualCost',
          timeframe: 'Custom',
          timePeriod: {
            from: startDate,
            to: endDate,
          },
          dataset: {
            granularity: 'None',
            aggregation: {
              totalCost: {
                name: 'Cost',
                function: 'Sum',
              },
            },
            filter: {
              dimensions: {
                name: 'ResourceType',
                operator: 'In',
                values: [resourceType],
              },
            },
            grouping: [
              {
                type: 'Dimension',
                name: 'ResourceId',
              },
            ],
          },
        });
      });

      let total = 0;
      const breakdown: Array<{
        category: string;
        amount: number;
        currency: string;
        percentage?: number;
      }> = [];

      if (queryResult.rows && queryResult.rows.length > 0) {
        for (const row of queryResult.rows) {
          const cost = typeof row[0] === 'number' ? row[0] : 0;
          const resourceId = String(row[1] || 'Unknown');

          total += cost;
          breakdown.push({
            category: resourceId,
            amount: cost,
            currency: 'USD',
          });
        }

        // Calculate percentages
        if (total > 0) {
          breakdown.forEach((item) => {
            item.percentage = (item.amount / total) * 100;
          });
          breakdown.sort((a, b) => b.amount - a.amount);
        }
      }

      this.logger.info('Successfully fetched costs by resource type', {
        resourceType,
        total,
        resources: breakdown.length,
      });

      return {
        total,
        currency: 'USD',
        breakdown,
      };
    } catch (error) {
      this.logger.error('Failed to fetch costs by resource type', { error });
      throw new Error(`Azure Cost Management error: ${error}`);
    }
  }

  /**
   * Get costs by location/region
   */
  async getCostsByLocation(
    location: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    this.logger.info('Fetching Azure costs by location', {
      location,
      startDate,
      endDate,
    });

    try {
      const scope = `/subscriptions/${this.subscriptionId}`;

      const queryResult = await this.retryWithBackoff(async () => {
        return await this.client.query.usage(scope, {
          type: 'ActualCost',
          timeframe: 'Custom',
          timePeriod: {
            from: startDate,
            to: endDate,
          },
          dataset: {
            granularity: 'None',
            aggregation: {
              totalCost: {
                name: 'Cost',
                function: 'Sum',
              },
            },
            filter: {
              dimensions: {
                name: 'ResourceLocation',
                operator: 'In',
                values: [location],
              },
            },
          },
        });
      });

      let totalCost = 0;

      if (queryResult.rows && queryResult.rows.length > 0) {
        for (const row of queryResult.rows) {
          const cost = typeof row[0] === 'number' ? row[0] : 0;
          totalCost += cost;
        }
      }

      this.logger.info('Successfully fetched costs by location', {
        location,
        totalCost,
      });

      return totalCost;
    } catch (error) {
      this.logger.error('Failed to fetch costs by location', { error });
      throw new Error(`Azure Cost Management error: ${error}`);
    }
  }

  /**
   * Get costs with tags
   */
  async getCostsByTag(
    tagKey: string,
    tagValue: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    this.logger.info('Fetching Azure costs by tag', {
      tagKey,
      tagValue,
      startDate,
      endDate,
    });

    try {
      const scope = `/subscriptions/${this.subscriptionId}`;

      const queryResult = await this.retryWithBackoff(async () => {
        return await this.client.query.usage(scope, {
          type: 'ActualCost',
          timeframe: 'Custom',
          timePeriod: {
            from: startDate,
            to: endDate,
          },
          dataset: {
            granularity: 'None',
            aggregation: {
              totalCost: {
                name: 'Cost',
                function: 'Sum',
              },
            },
            filter: {
              tags: {
                name: tagKey,
                operator: 'In',
                values: [tagValue],
              },
            },
          },
        });
      });

      let totalCost = 0;

      if (queryResult.rows && queryResult.rows.length > 0) {
        for (const row of queryResult.rows) {
          const cost = typeof row[0] === 'number' ? row[0] : 0;
          totalCost += cost;
        }
      }

      this.logger.info('Successfully fetched costs by tag', {
        tagKey,
        tagValue,
        totalCost,
      });

      return totalCost;
    } catch (error) {
      this.logger.error('Failed to fetch costs by tag', { error });
      throw new Error(`Azure Cost Management error: ${error}`);
    }
  }

  /**
   * Get current month costs
   */
  async getCurrentMonthCosts(): Promise<CostBreakdown> {
    const startDate = startOfMonth(new Date());
    const endDate = new Date();

    return this.getCostsBySubscription(
      this.subscriptionId,
      startDate,
      endDate
    );
  }

  /**
   * Get custom cost data with flexible parameters
   */
  async getCustomCostData(
    params: AzureCostManagementParams
  ): Promise<AzureCostData[]> {
    this.logger.info('Fetching custom Azure cost data', { params });

    try {
      const queryResult = await this.retryWithBackoff(async () => {
        return await this.client.query.usage(params.scope, {
          type: 'ActualCost',
          timeframe: 'Custom',
          timePeriod: {
            from: params.startDate,
            to: params.endDate,
          },
          dataset: {
            granularity: params.granularity,
            aggregation: params.aggregation || {
              totalCost: {
                name: 'Cost',
                function: 'Sum',
              },
            },
            grouping: [
              {
                type: 'Dimension',
                name: 'ServiceName',
              },
              {
                type: 'Dimension',
                name: 'ResourceId',
              },
            ],
          },
        });
      });

      const costData: AzureCostData[] = [];

      if (queryResult.rows && queryResult.rows.length > 0) {
        for (const row of queryResult.rows) {
          const cost = typeof row[0] === 'number' ? row[0] : 0;
          const serviceName = String(row[1] || 'Unknown');
          const resourceId = String(row[2] || '');

          if (cost > 0) {
            costData.push({
              subscriptionId: this.subscriptionId,
              resourceId,
              serviceName,
              cost,
              currency: 'USD',
            });
          }
        }
      }

      this.logger.info('Successfully fetched custom cost data', {
        recordCount: costData.length,
      });

      return costData;
    } catch (error) {
      this.logger.error('Failed to fetch custom cost data', { error });
      throw new Error(`Azure Cost Management error: ${error}`);
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
      const isRetryable =
        error.statusCode === 429 ||
        error.statusCode >= 500 ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET';

      if (isRetryable) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Retrying Azure Cost Management request after ${delay}ms`,
          {
            attempt,
            error: error.message,
          }
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.retryWithBackoff(fn, attempt + 1);
      }

      throw error;
    }
  }
}
