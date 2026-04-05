// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * General Ledger Integration
 * Handles GL account mapping, cost synchronization, and reconciliation
 */

import * as fs from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { Logger } from 'winston';
import { getPostgresClient } from '@cmdb/database';
import {
  GLAccount,
  GLTransaction,
  GLCostSync,
  GLCostPoolMapping,
  GLAssetDepreciation,
  GLImportConfig,
  GLExportConfig,
  GLReconciliation,
  OnPremiseAssetCost,
  CostCenterAllocation,
} from './types/gl-types';

export class GLIntegration {
  private logger: Logger;
  private dbClient: any;

  constructor(logger: Logger) {
    this.logger = logger;
    this.dbClient = getPostgresClient();
  }

  /**
   * Import GL accounts from CSV file
   */
  async importGLAccounts(
    filePath: string,
    config: GLImportConfig
  ): Promise<GLAccount[]> {
    this.logger.info('Importing GL accounts from CSV', { filePath });

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');

      const records = parse(fileContent, {
        columns: config.hasHeader,
        skip_empty_lines: true,
        skip_records_with_empty_values: true,
        from: config.skipRows ? config.skipRows + 1 : 1,
        delimiter: config.delimiter || ',',
      });

      const glAccounts: GLAccount[] = [];

      for (const record of records) {
        const accountNumber = record[config.columnMappings.accountNumber];
        const accountName = record[config.columnMappings.accountName];
        const costCenter = record[config.columnMappings.costCenter] || '';

        if (!accountNumber || !accountName) {
          this.logger.warn('Skipping record with missing required fields', {
            record,
          });
          continue;
        }

        const glAccount: GLAccount = {
          accountNumber,
          accountName,
          accountType: this.inferAccountType(accountNumber),
          costCenter,
          isActive: true,
        };

        glAccounts.push(glAccount);

        // Insert into database
        await this.dbClient.query(
          `
          INSERT INTO gl_accounts (
            account_number, account_name, account_type,
            cost_center, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (account_number)
          DO UPDATE SET
            account_name = EXCLUDED.account_name,
            account_type = EXCLUDED.account_type,
            cost_center = EXCLUDED.cost_center,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
        `,
          [
            glAccount.accountNumber,
            glAccount.accountName,
            glAccount.accountType,
            glAccount.costCenter,
            glAccount.isActive,
          ]
        );
      }

      this.logger.info('Successfully imported GL accounts', {
        count: glAccounts.length,
      });

      return glAccounts;
    } catch (error) {
      this.logger.error('Failed to import GL accounts', { error });
      throw new Error(`GL account import error: ${error}`);
    }
  }

  /**
   * Map GL account to TBM cost pool
   */
  async mapGLAccountToCostPool(
    glAccount: string,
    costPool: string,
    allocationPercentage: number = 100
  ): Promise<void> {
    this.logger.info('Mapping GL account to cost pool', {
      glAccount,
      costPool,
      allocationPercentage,
    });

    try {
      // Validate allocation percentage
      if (allocationPercentage < 0 || allocationPercentage > 100) {
        throw new Error('Allocation percentage must be between 0 and 100');
      }

      // Get account details
      const accountResult = await this.dbClient.query(
        'SELECT account_name FROM gl_accounts WHERE account_number = $1',
        [glAccount]
      );

      if (accountResult.rows.length === 0) {
        throw new Error(`GL account ${glAccount} not found`);
      }

      const accountName = accountResult.rows[0].account_name;

      // Insert mapping
      await this.dbClient.query(
        `
        INSERT INTO gl_cost_pool_mappings (
          gl_account, gl_account_name, cost_pool, cost_pool_name,
          allocation_percentage, effective_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
        ON CONFLICT (gl_account, cost_pool)
        DO UPDATE SET
          allocation_percentage = EXCLUDED.allocation_percentage,
          updated_at = NOW()
      `,
        [glAccount, accountName, costPool, costPool, allocationPercentage]
      );

      this.logger.info('Successfully mapped GL account to cost pool', {
        glAccount,
        costPool,
      });
    } catch (error) {
      this.logger.error('Failed to map GL account to cost pool', { error });
      throw new Error(`GL mapping error: ${error}`);
    }
  }

  /**
   * Synchronize monthly costs from GL system
   */
  async syncMonthlyCosts(month: Date): Promise<GLCostSync> {
    this.logger.info('Synchronizing monthly GL costs', { month });

    const syncId = `gl-sync-${format(month, 'yyyy-MM')}`;
    const startDate = startOfMonth(month);
    const endDate = endOfMonth(month);

    try {
      // Mark sync as processing
      await this.dbClient.query(
        `
        INSERT INTO gl_cost_syncs (
          sync_id, month, status, start_time, created_at
        ) VALUES ($1, $2, 'processing', NOW(), NOW())
        ON CONFLICT (sync_id)
        DO UPDATE SET status = 'processing', start_time = NOW()
      `,
        [syncId, month]
      );

      // Get all GL transactions for the month
      const transactions = await this.getGLTransactions(startDate, endDate);

      let accountsProcessed = 0;
      let totalAmount = 0;

      // Process each transaction and map to cost pools
      for (const transaction of transactions) {
        // Get cost pool mapping
        const mappingResult = await this.dbClient.query(
          `
          SELECT cost_pool, allocation_percentage
          FROM gl_cost_pool_mappings
          WHERE gl_account = $1 AND effective_date <= $2
            AND (end_date IS NULL OR end_date >= $2)
        `,
          [transaction.accountNumber, transaction.transactionDate]
        );

        if (mappingResult.rows.length > 0) {
          for (const mapping of mappingResult.rows) {
            const allocatedAmount =
              transaction.amount * (mapping.allocation_percentage / 100);

            // Insert cost allocation
            await this.dbClient.query(
              `
              INSERT INTO cost_allocations (
                sync_id, gl_account, cost_pool, transaction_date,
                amount, currency, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `,
              [
                syncId,
                transaction.accountNumber,
                mapping.cost_pool,
                transaction.transactionDate,
                allocatedAmount,
                transaction.currency,
              ]
            );

            totalAmount += allocatedAmount;
          }

          accountsProcessed++;
        }
      }

      // Mark sync as completed
      await this.dbClient.query(
        `
        UPDATE gl_cost_syncs
        SET status = 'completed',
            end_time = NOW(),
            accounts_processed = $1,
            total_amount = $2
        WHERE sync_id = $3
      `,
        [accountsProcessed, totalAmount, syncId]
      );

      this.logger.info('Successfully synchronized monthly GL costs', {
        syncId,
        accountsProcessed,
        totalAmount,
      });

      return {
        syncId,
        month,
        accountsProcessed,
        totalAmount,
        currency: 'USD',
        status: 'completed',
        startTime: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to synchronize monthly GL costs', { error });

      // Mark sync as failed
      await this.dbClient.query(
        `
        UPDATE gl_cost_syncs
        SET status = 'failed',
            end_time = NOW(),
            errors = $1
        WHERE sync_id = $2
      `,
        [JSON.stringify([{ error: String(error), timestamp: new Date() }]), syncId]
      );

      throw new Error(`GL sync error: ${error}`);
    }
  }

  /**
   * Get on-premise asset costs including depreciation
   */
  async getOnPremiseAssetCosts(): Promise<Map<string, number>> {
    this.logger.info('Fetching on-premise asset costs');

    try {
      const result = await this.dbClient.query(
        `
        SELECT
          asset_id,
          asset_name,
          monthly_depreciation,
          maintenance_cost,
          power_cost,
          cooling_cost,
          space_cost
        FROM on_premise_assets
        WHERE is_active = true
      `
      );

      const assetCosts = new Map<string, number>();

      for (const row of result.rows) {
        const monthlyCost =
          (row.monthly_depreciation || 0) +
          (row.maintenance_cost || 0) +
          (row.power_cost || 0) +
          (row.cooling_cost || 0) +
          (row.space_cost || 0);

        assetCosts.set(row.asset_id, monthlyCost);
      }

      this.logger.info('Successfully fetched on-premise asset costs', {
        assetCount: assetCosts.size,
      });

      return assetCosts;
    } catch (error) {
      this.logger.error('Failed to fetch on-premise asset costs', { error });
      throw new Error(`On-premise asset cost error: ${error}`);
    }
  }

  /**
   * Calculate asset depreciation
   */
  async calculateAssetDepreciation(
    assetId: string
  ): Promise<GLAssetDepreciation> {
    this.logger.info('Calculating asset depreciation', { assetId });

    try {
      const result = await this.dbClient.query(
        `
        SELECT
          asset_id, asset_name, gl_account, purchase_date,
          purchase_price, currency, depreciation_method,
          useful_life, salvage_value, current_book_value
        FROM on_premise_assets
        WHERE asset_id = $1
      `,
        [assetId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Asset ${assetId} not found`);
      }

      const asset = result.rows[0];

      let monthlyDepreciation = 0;

      if (asset.depreciation_method === 'straight-line') {
        const depreciableAmount = asset.purchase_price - asset.salvage_value;
        const totalMonths = asset.useful_life * 12;
        monthlyDepreciation = depreciableAmount / totalMonths;
      } else if (asset.depreciation_method === 'declining-balance') {
        const rate = 2 / asset.useful_life; // Double declining balance
        monthlyDepreciation = (asset.current_book_value * rate) / 12;
      }

      this.logger.info('Successfully calculated asset depreciation', {
        assetId,
        monthlyDepreciation,
      });

      return {
        assetId: asset.asset_id,
        assetName: asset.asset_name,
        glAccount: asset.gl_account,
        purchaseDate: asset.purchase_date,
        purchasePrice: asset.purchase_price,
        currency: asset.currency,
        depreciationMethod: asset.depreciation_method,
        usefulLife: asset.useful_life,
        salvageValue: asset.salvage_value,
        currentBookValue: asset.current_book_value,
        monthlyDepreciation,
      };
    } catch (error) {
      this.logger.error('Failed to calculate asset depreciation', { error });
      throw new Error(`Asset depreciation calculation error: ${error}`);
    }
  }

  /**
   * Export GL data to CSV
   */
  async exportGLData(
    outputPath: string,
    config: GLExportConfig
  ): Promise<void> {
    this.logger.info('Exporting GL data to CSV', { outputPath });

    try {
      const records: any[] = [];

      if (config.includeBalances) {
        // Export account balances
        const balances = await this.dbClient.query(
          `
          SELECT
            ga.account_number,
            ga.account_name,
            ga.cost_center,
            gcp.cost_pool,
            COALESCE(SUM(ca.amount), 0) as balance
          FROM gl_accounts ga
          LEFT JOIN gl_cost_pool_mappings gcp ON ga.account_number = gcp.gl_account
          LEFT JOIN cost_allocations ca ON ga.account_number = ca.gl_account
            AND ca.transaction_date BETWEEN $1 AND $2
          GROUP BY ga.account_number, ga.account_name, ga.cost_center, gcp.cost_pool
          ORDER BY ga.account_number
        `,
          [config.period.startDate, config.period.endDate]
        );

        records.push(...balances.rows);
      }

      // Convert to CSV
      const csv = stringify(records, {
        header: true,
        columns: [
          'account_number',
          'account_name',
          'cost_center',
          'cost_pool',
          'balance',
        ],
      });

      // Write to file
      await fs.writeFile(outputPath, csv, 'utf-8');

      this.logger.info('Successfully exported GL data', {
        outputPath,
        recordCount: records.length,
      });
    } catch (error) {
      this.logger.error('Failed to export GL data', { error });
      throw new Error(`GL export error: ${error}`);
    }
  }

  /**
   * Reconcile GL costs with CMDB costs
   */
  async reconcileCosts(month: Date): Promise<GLReconciliation> {
    this.logger.info('Reconciling GL costs with CMDB', { month });

    const reconciliationId = `gl-recon-${format(month, 'yyyy-MM')}`;

    try {
      // Get total GL costs for the month
      const glResult = await this.dbClient.query(
        `
        SELECT COALESCE(SUM(amount), 0) as total
        FROM cost_allocations
        WHERE DATE_TRUNC('month', transaction_date) = $1
      `,
        [startOfMonth(month)]
      );

      const glTotalCost = parseFloat(glResult.rows[0].total);

      // Get total CMDB costs for the month
      const cmdbResult = await this.dbClient.query(
        `
        SELECT COALESCE(SUM(cost), 0) as total
        FROM resource_costs
        WHERE DATE_TRUNC('month', cost_date) = $1
      `,
        [startOfMonth(month)]
      );

      const cmdbTotalCost = parseFloat(cmdbResult.rows[0].total);

      // Calculate variance
      const variance = glTotalCost - cmdbTotalCost;
      const variancePercentage =
        cmdbTotalCost > 0 ? (variance / cmdbTotalCost) * 100 : 0;

      // Determine status
      let status: 'matched' | 'variance' | 'unreconciled' = 'matched';
      if (Math.abs(variancePercentage) > 10) {
        status = 'unreconciled';
      } else if (Math.abs(variancePercentage) > 1) {
        status = 'variance';
      }

      // Get account-level breakdown
      const breakdownResult = await this.dbClient.query(
        `
        SELECT
          ga.account_number as gl_account,
          COALESCE(SUM(ca.amount), 0) as gl_amount,
          COALESCE(SUM(rc.cost), 0) as cmdb_amount
        FROM gl_accounts ga
        LEFT JOIN cost_allocations ca ON ga.account_number = ca.gl_account
          AND DATE_TRUNC('month', ca.transaction_date) = $1
        LEFT JOIN resource_costs rc ON ga.account_number = rc.cost_account
          AND DATE_TRUNC('month', rc.cost_date) = $1
        GROUP BY ga.account_number
        HAVING COALESCE(SUM(ca.amount), 0) > 0 OR COALESCE(SUM(rc.cost), 0) > 0
      `,
        [startOfMonth(month)]
      );

      const accountBreakdown = breakdownResult.rows.map((row) => ({
        glAccount: row.gl_account,
        glAmount: parseFloat(row.gl_amount),
        cmdbAmount: parseFloat(row.cmdb_amount),
        difference: parseFloat(row.gl_amount) - parseFloat(row.cmdb_amount),
      }));

      // Save reconciliation
      await this.dbClient.query(
        `
        INSERT INTO gl_reconciliations (
          reconciliation_id, month, gl_total_cost, cmdb_total_cost,
          variance, variance_percentage, status, account_breakdown,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (reconciliation_id)
        DO UPDATE SET
          gl_total_cost = EXCLUDED.gl_total_cost,
          cmdb_total_cost = EXCLUDED.cmdb_total_cost,
          variance = EXCLUDED.variance,
          variance_percentage = EXCLUDED.variance_percentage,
          status = EXCLUDED.status,
          account_breakdown = EXCLUDED.account_breakdown
      `,
        [
          reconciliationId,
          month,
          glTotalCost,
          cmdbTotalCost,
          variance,
          variancePercentage,
          status,
          JSON.stringify(accountBreakdown),
        ]
      );

      this.logger.info('Successfully reconciled GL costs', {
        reconciliationId,
        glTotalCost,
        cmdbTotalCost,
        variance,
        status,
      });

      return {
        reconciliationId,
        month,
        glTotalCost,
        cmdbTotalCost,
        variance,
        variancePercentage,
        status,
        accountBreakdown,
      };
    } catch (error) {
      this.logger.error('Failed to reconcile GL costs', { error });
      throw new Error(`GL reconciliation error: ${error}`);
    }
  }

  /**
   * Get GL transactions for a date range
   * This is a placeholder - actual implementation would depend on GL system API
   */
  private async getGLTransactions(
    startDate: Date,
    endDate: Date
  ): Promise<GLTransaction[]> {
    // In a real implementation, this would fetch from GL system API
    // For now, return from database if we have them stored
    const result = await this.dbClient.query(
      `
      SELECT
        transaction_id, account_number, transaction_date,
        amount, currency, debit_credit, description,
        cost_center, project, vendor, reference
      FROM gl_transactions
      WHERE transaction_date BETWEEN $1 AND $2
      ORDER BY transaction_date
    `,
      [startDate, endDate]
    );

    return result.rows.map((row: any) => ({
      transactionId: row.transaction_id,
      accountNumber: row.account_number,
      transactionDate: row.transaction_date,
      amount: parseFloat(row.amount),
      currency: row.currency,
      debitCredit: row.debit_credit,
      description: row.description,
      costCenter: row.cost_center,
      project: row.project,
      vendor: row.vendor,
      reference: row.reference,
    }));
  }

  /**
   * Infer account type from account number
   * This is a simple heuristic - adjust based on your GL chart of accounts
   */
  private inferAccountType(
    accountNumber: string
  ): 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' {
    const firstDigit = accountNumber.charAt(0);

    switch (firstDigit) {
      case '1':
        return 'asset';
      case '2':
        return 'liability';
      case '3':
        return 'equity';
      case '4':
        return 'revenue';
      case '5':
      case '6':
      case '7':
        return 'expense';
      default:
        return 'expense';
    }
  }
}
