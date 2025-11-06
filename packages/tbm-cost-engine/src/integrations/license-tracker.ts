/**
 * License Cost Tracking
 * Manages software licenses, usage metrics, and renewal tracking
 */

import { addDays, differenceInDays, format, isBefore } from 'date-fns';
import { Logger } from 'winston';
import { getPostgresClient } from '@cmdb/database';

export interface SoftwareLicense {
  id: string;
  softwareName: string;
  vendor: string;
  licenseType: 'per_user' | 'per_device' | 'subscription' | 'perpetual';
  quantity: number;
  unitCost: number;
  currency: string;
  renewalDate?: Date;
  purchaseDate: Date;
  expiryDate?: Date;
  licenseKey?: string;
  supportIncluded: boolean;
  notes?: string;
}

export interface LicenseUsage {
  licenseId: string;
  usedCount: number;
  availableCount: number;
  utilizationPercentage: number;
  lastUpdated: Date;
  users?: string[];
  devices?: string[];
}

export interface LicenseRenewal {
  licenseId: string;
  softwareName: string;
  vendor: string;
  renewalDate: Date;
  daysUntilRenewal: number;
  renewalCost: number;
  currency: string;
  autoRenew: boolean;
  contactPerson?: string;
  contactEmail?: string;
}

export interface LicenseCostBreakdown {
  totalAnnualCost: number;
  totalMonthlyCost: number;
  currency: string;
  byVendor: Map<string, number>;
  byLicenseType: Map<string, number>;
  byDepartment: Map<string, number>;
  underutilized: Array<{
    licenseId: string;
    softwareName: string;
    utilization: number;
    wastedCost: number;
  }>;
}

export class LicenseTracker {
  private logger: Logger;
  private dbClient: any;

  constructor(logger: Logger) {
    this.logger = logger;
    this.dbClient = getPostgresClient();
  }

  /**
   * Track a new software license
   */
  async trackSoftwareLicense(license: SoftwareLicense): Promise<void> {
    this.logger.info('Tracking software license', {
      licenseId: license.id,
      softwareName: license.softwareName,
    });

    try {
      await this.dbClient.query(
        `
        INSERT INTO software_licenses (
          license_id, software_name, vendor, license_type,
          quantity, unit_cost, currency, renewal_date,
          purchase_date, expiry_date, license_key,
          support_included, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        ON CONFLICT (license_id)
        DO UPDATE SET
          software_name = EXCLUDED.software_name,
          vendor = EXCLUDED.vendor,
          license_type = EXCLUDED.license_type,
          quantity = EXCLUDED.quantity,
          unit_cost = EXCLUDED.unit_cost,
          currency = EXCLUDED.currency,
          renewal_date = EXCLUDED.renewal_date,
          purchase_date = EXCLUDED.purchase_date,
          expiry_date = EXCLUDED.expiry_date,
          license_key = EXCLUDED.license_key,
          support_included = EXCLUDED.support_included,
          notes = EXCLUDED.notes,
          updated_at = NOW()
      `,
        [
          license.id,
          license.softwareName,
          license.vendor,
          license.licenseType,
          license.quantity,
          license.unitCost,
          license.currency,
          license.renewalDate,
          license.purchaseDate,
          license.expiryDate,
          license.licenseKey,
          license.supportIncluded,
          license.notes,
        ]
      );

      this.logger.info('Successfully tracked software license', {
        licenseId: license.id,
      });
    } catch (error) {
      this.logger.error('Failed to track software license', { error });
      throw new Error(`License tracking error: ${error}`);
    }
  }

  /**
   * Calculate license cost based on usage metrics
   */
  async calculateLicenseCost(
    softwareId: string,
    usageMetrics: LicenseUsage
  ): Promise<number> {
    this.logger.info('Calculating license cost', {
      softwareId,
      usageMetrics,
    });

    try {
      // Get license details
      const result = await this.dbClient.query(
        `
        SELECT license_type, unit_cost, quantity
        FROM software_licenses
        WHERE license_id = $1
      `,
        [softwareId]
      );

      if (result.rows.length === 0) {
        throw new Error(`License ${softwareId} not found`);
      }

      const license = result.rows[0];
      let cost = 0;

      switch (license.license_type) {
        case 'per_user':
          cost = usageMetrics.usedCount * license.unit_cost;
          break;

        case 'per_device':
          cost = usageMetrics.usedCount * license.unit_cost;
          break;

        case 'subscription':
          // Subscription is typically monthly/annual flat fee
          cost = license.unit_cost;
          break;

        case 'perpetual':
          // Perpetual license - only maintenance/support costs
          // Typically 20% of license cost annually
          cost = license.unit_cost * license.quantity * 0.2;
          break;

        default:
          cost = license.unit_cost * license.quantity;
      }

      this.logger.info('Successfully calculated license cost', {
        softwareId,
        cost,
      });

      return cost;
    } catch (error) {
      this.logger.error('Failed to calculate license cost', { error });
      throw new Error(`License cost calculation error: ${error}`);
    }
  }

  /**
   * Get upcoming license renewals
   */
  async getUpcomingRenewals(daysAhead: number): Promise<LicenseRenewal[]> {
    this.logger.info('Fetching upcoming license renewals', { daysAhead });

    try {
      const cutoffDate = addDays(new Date(), daysAhead);

      const result = await this.dbClient.query(
        `
        SELECT
          license_id, software_name, vendor, renewal_date,
          unit_cost, quantity, currency, auto_renew,
          contact_person, contact_email
        FROM software_licenses
        WHERE renewal_date IS NOT NULL
          AND renewal_date <= $1
          AND renewal_date >= CURRENT_DATE
        ORDER BY renewal_date ASC
      `,
        [cutoffDate]
      );

      const renewals: LicenseRenewal[] = result.rows.map((row: any) => {
        const renewalDate = new Date(row.renewal_date);
        const daysUntilRenewal = differenceInDays(renewalDate, new Date());
        const renewalCost = row.unit_cost * row.quantity;

        return {
          licenseId: row.license_id,
          softwareName: row.software_name,
          vendor: row.vendor,
          renewalDate,
          daysUntilRenewal,
          renewalCost,
          currency: row.currency,
          autoRenew: row.auto_renew || false,
          contactPerson: row.contact_person,
          contactEmail: row.contact_email,
        };
      });

      this.logger.info('Successfully fetched upcoming renewals', {
        count: renewals.length,
      });

      return renewals;
    } catch (error) {
      this.logger.error('Failed to fetch upcoming renewals', { error });
      throw new Error(`License renewal fetch error: ${error}`);
    }
  }

  /**
   * Track license usage
   */
  async trackLicenseUsage(usage: LicenseUsage): Promise<void> {
    this.logger.info('Tracking license usage', {
      licenseId: usage.licenseId,
      usedCount: usage.usedCount,
    });

    try {
      await this.dbClient.query(
        `
        INSERT INTO license_usage (
          license_id, used_count, available_count,
          utilization_percentage, users, devices,
          last_updated, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (license_id)
        DO UPDATE SET
          used_count = EXCLUDED.used_count,
          available_count = EXCLUDED.available_count,
          utilization_percentage = EXCLUDED.utilization_percentage,
          users = EXCLUDED.users,
          devices = EXCLUDED.devices,
          last_updated = NOW()
      `,
        [
          usage.licenseId,
          usage.usedCount,
          usage.availableCount,
          usage.utilizationPercentage,
          usage.users ? JSON.stringify(usage.users) : null,
          usage.devices ? JSON.stringify(usage.devices) : null,
        ]
      );

      this.logger.info('Successfully tracked license usage', {
        licenseId: usage.licenseId,
      });
    } catch (error) {
      this.logger.error('Failed to track license usage', { error });
      throw new Error(`License usage tracking error: ${error}`);
    }
  }

  /**
   * Get license usage for a specific license
   */
  async getLicenseUsage(licenseId: string): Promise<LicenseUsage | null> {
    this.logger.info('Fetching license usage', { licenseId });

    try {
      const result = await this.dbClient.query(
        `
        SELECT
          license_id, used_count, available_count,
          utilization_percentage, users, devices, last_updated
        FROM license_usage
        WHERE license_id = $1
      `,
        [licenseId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      return {
        licenseId: row.license_id,
        usedCount: row.used_count,
        availableCount: row.available_count,
        utilizationPercentage: row.utilization_percentage,
        lastUpdated: row.last_updated,
        users: row.users ? JSON.parse(row.users) : undefined,
        devices: row.devices ? JSON.parse(row.devices) : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to fetch license usage', { error });
      throw new Error(`License usage fetch error: ${error}`);
    }
  }

  /**
   * Get comprehensive license cost breakdown
   */
  async getLicenseCostBreakdown(): Promise<LicenseCostBreakdown> {
    this.logger.info('Fetching license cost breakdown');

    try {
      // Get total costs
      const totalResult = await this.dbClient.query(
        `
        SELECT
          SUM(unit_cost * quantity) as total_annual_cost,
          currency
        FROM software_licenses
        WHERE expiry_date IS NULL OR expiry_date > CURRENT_DATE
        GROUP BY currency
      `
      );

      const totalAnnualCost = totalResult.rows.reduce(
        (sum: number, row: any) => sum + parseFloat(row.total_annual_cost),
        0
      );
      const currency = totalResult.rows[0]?.currency || 'USD';
      const totalMonthlyCost = totalAnnualCost / 12;

      // Get costs by vendor
      const vendorResult = await this.dbClient.query(
        `
        SELECT
          vendor,
          SUM(unit_cost * quantity) as total_cost
        FROM software_licenses
        WHERE expiry_date IS NULL OR expiry_date > CURRENT_DATE
        GROUP BY vendor
        ORDER BY total_cost DESC
      `
      );

      const byVendor = new Map<string, number>();
      for (const row of vendorResult.rows) {
        byVendor.set(row.vendor, parseFloat(row.total_cost));
      }

      // Get costs by license type
      const typeResult = await this.dbClient.query(
        `
        SELECT
          license_type,
          SUM(unit_cost * quantity) as total_cost
        FROM software_licenses
        WHERE expiry_date IS NULL OR expiry_date > CURRENT_DATE
        GROUP BY license_type
        ORDER BY total_cost DESC
      `
      );

      const byLicenseType = new Map<string, number>();
      for (const row of typeResult.rows) {
        byLicenseType.set(row.license_type, parseFloat(row.total_cost));
      }

      // Get costs by department (if available in license metadata)
      const deptResult = await this.dbClient.query(
        `
        SELECT
          department,
          SUM(unit_cost * quantity) as total_cost
        FROM software_licenses
        WHERE (expiry_date IS NULL OR expiry_date > CURRENT_DATE)
          AND department IS NOT NULL
        GROUP BY department
        ORDER BY total_cost DESC
      `
      );

      const byDepartment = new Map<string, number>();
      for (const row of deptResult.rows) {
        byDepartment.set(row.department, parseFloat(row.total_cost));
      }

      // Identify underutilized licenses
      const underutilizedResult = await this.dbClient.query(
        `
        SELECT
          sl.license_id,
          sl.software_name,
          lu.utilization_percentage,
          sl.unit_cost * sl.quantity * (1 - lu.utilization_percentage / 100) as wasted_cost
        FROM software_licenses sl
        JOIN license_usage lu ON sl.license_id = lu.license_id
        WHERE lu.utilization_percentage < 50
          AND (sl.expiry_date IS NULL OR sl.expiry_date > CURRENT_DATE)
        ORDER BY wasted_cost DESC
        LIMIT 10
      `
      );

      const underutilized = underutilizedResult.rows.map((row: any) => ({
        licenseId: row.license_id,
        softwareName: row.software_name,
        utilization: row.utilization_percentage,
        wastedCost: parseFloat(row.wasted_cost),
      }));

      this.logger.info('Successfully fetched license cost breakdown', {
        totalAnnualCost,
        underutilizedCount: underutilized.length,
      });

      return {
        totalAnnualCost,
        totalMonthlyCost,
        currency,
        byVendor,
        byLicenseType,
        byDepartment,
        underutilized,
      };
    } catch (error) {
      this.logger.error('Failed to fetch license cost breakdown', { error });
      throw new Error(`License cost breakdown error: ${error}`);
    }
  }

  /**
   * Get all active licenses
   */
  async getAllActiveLicenses(): Promise<SoftwareLicense[]> {
    this.logger.info('Fetching all active licenses');

    try {
      const result = await this.dbClient.query(
        `
        SELECT
          license_id, software_name, vendor, license_type,
          quantity, unit_cost, currency, renewal_date,
          purchase_date, expiry_date, license_key,
          support_included, notes
        FROM software_licenses
        WHERE expiry_date IS NULL OR expiry_date > CURRENT_DATE
        ORDER BY software_name
      `
      );

      const licenses: SoftwareLicense[] = result.rows.map((row: any) => ({
        id: row.license_id,
        softwareName: row.software_name,
        vendor: row.vendor,
        licenseType: row.license_type,
        quantity: row.quantity,
        unitCost: parseFloat(row.unit_cost),
        currency: row.currency,
        renewalDate: row.renewal_date ? new Date(row.renewal_date) : undefined,
        purchaseDate: new Date(row.purchase_date),
        expiryDate: row.expiry_date ? new Date(row.expiry_date) : undefined,
        licenseKey: row.license_key,
        supportIncluded: row.support_included,
        notes: row.notes,
      }));

      this.logger.info('Successfully fetched active licenses', {
        count: licenses.length,
      });

      return licenses;
    } catch (error) {
      this.logger.error('Failed to fetch active licenses', { error });
      throw new Error(`License fetch error: ${error}`);
    }
  }

  /**
   * Check for expired licenses
   */
  async getExpiredLicenses(): Promise<SoftwareLicense[]> {
    this.logger.info('Fetching expired licenses');

    try {
      const result = await this.dbClient.query(
        `
        SELECT
          license_id, software_name, vendor, license_type,
          quantity, unit_cost, currency, renewal_date,
          purchase_date, expiry_date, license_key,
          support_included, notes
        FROM software_licenses
        WHERE expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE
        ORDER BY expiry_date DESC
      `
      );

      const licenses: SoftwareLicense[] = result.rows.map((row: any) => ({
        id: row.license_id,
        softwareName: row.software_name,
        vendor: row.vendor,
        licenseType: row.license_type,
        quantity: row.quantity,
        unitCost: parseFloat(row.unit_cost),
        currency: row.currency,
        renewalDate: row.renewal_date ? new Date(row.renewal_date) : undefined,
        purchaseDate: new Date(row.purchase_date),
        expiryDate: row.expiry_date ? new Date(row.expiry_date) : undefined,
        licenseKey: row.license_key,
        supportIncluded: row.support_included,
        notes: row.notes,
      }));

      this.logger.info('Successfully fetched expired licenses', {
        count: licenses.length,
      });

      return licenses;
    } catch (error) {
      this.logger.error('Failed to fetch expired licenses', { error });
      throw new Error(`Expired license fetch error: ${error}`);
    }
  }

  /**
   * Send renewal reminders
   */
  async sendRenewalReminders(daysBeforeRenewal: number = 30): Promise<void> {
    this.logger.info('Sending renewal reminders', { daysBeforeRenewal });

    try {
      const renewals = await this.getUpcomingRenewals(daysBeforeRenewal);

      for (const renewal of renewals) {
        // In a real implementation, this would send email notifications
        this.logger.info('Renewal reminder needed', {
          licenseId: renewal.licenseId,
          softwareName: renewal.softwareName,
          renewalDate: renewal.renewalDate,
          daysUntilRenewal: renewal.daysUntilRenewal,
          contactEmail: renewal.contactEmail,
        });

        // Log reminder sent
        await this.dbClient.query(
          `
          INSERT INTO license_reminders (
            license_id, reminder_date, days_before_renewal,
            reminder_sent, created_at
          ) VALUES ($1, NOW(), $2, true, NOW())
        `,
          [renewal.licenseId, renewal.daysUntilRenewal]
        );
      }

      this.logger.info('Successfully sent renewal reminders', {
        count: renewals.length,
      });
    } catch (error) {
      this.logger.error('Failed to send renewal reminders', { error });
      throw new Error(`Renewal reminder error: ${error}`);
    }
  }
}
