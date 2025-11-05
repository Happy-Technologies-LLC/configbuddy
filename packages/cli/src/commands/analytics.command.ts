import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';

/**
 * Analytics command handlers for CMDB analytics and reporting
 */
export class AnalyticsCommand {
  private apiUrl: string;
  private apiKey?: string;

  constructor(apiUrl: string, apiKey?: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  /**
   * Register analytics commands
   */
  register(program: Command): void {
    const analytics = program
      .command('analytics')
      .description('Analytics and reporting commands');

    // Summary statistics
    analytics
      .command('summary')
      .description('Show summary statistics and dashboard overview')
      .option('--json', 'Output as JSON')
      .action(async (options) => {
        await this.getSummary(options);
      });

    // CI count by type
    analytics
      .command('by-type')
      .description('Show CI count by type')
      .option('--json', 'Output as JSON')
      .action(async (options) => {
        await this.getCICountsByType(options);
      });

    // CI count by environment
    analytics
      .command('by-env')
      .description('Show CI count by environment')
      .option('--json', 'Output as JSON')
      .action(async (options) => {
        await this.getCICountsByEnvironment(options);
      });

    // Recent changes report
    analytics
      .command('changes')
      .description('Show recent changes report')
      .option('--ci-id <ciId>', 'Filter by specific CI ID')
      .option('--limit <limit>', 'Limit number of results', '50')
      .option('--json', 'Output as JSON')
      .action(async (options) => {
        await this.getRecentChanges(options);
      });

    // Relationship statistics
    analytics
      .command('relationships')
      .description('Show relationship statistics')
      .option('--type <type>', 'Filter by relationship type')
      .option('--direction <direction>', 'Filter by direction: in, out, both', 'both')
      .option('--limit <limit>', 'Limit top connected CIs', '10')
      .option('--json', 'Output as JSON')
      .action(async (options) => {
        await this.getRelationshipStats(options);
      });

    // Custom query
    analytics
      .command('query <queryType>')
      .description('Run custom analytics query (discovery-stats, discovery-timeline, top-connected, dependency-depth)')
      .option('--start-date <date>', 'Start date for time-based queries (ISO 8601)')
      .option('--end-date <date>', 'End date for time-based queries (ISO 8601)')
      .option('--interval <interval>', 'Interval for timeline: hour, day, week, month', 'day')
      .option('--limit <limit>', 'Limit results', '30')
      .option('--direction <direction>', 'Direction: in, out, both', 'both')
      .option('--json', 'Output as JSON')
      .action(async (queryType, options) => {
        await this.runCustomQuery(queryType, options);
      });
  }

  /**
   * Get summary statistics
   */
  private async getSummary(options: any): Promise<void> {
    const spinner = ora('Fetching summary statistics...').start();

    try {
      const response = await axios.get(`${this.apiUrl}/analytics/dashboard`, {
        headers: this.getHeaders(),
      });

      spinner.succeed(chalk.green('Summary statistics retrieved'));

      if (options.json) {
        console.log(JSON.stringify(response.data, null, 2));
        return;
      }

      const { summary, breakdown } = response.data.data;

      console.log(chalk.cyan('\nCMDB Dashboard Summary'));
      console.log(chalk.cyan('='.repeat(50)));
      console.log(`\n${chalk.bold('Overall Statistics:')}`);
      console.log(`  Total CIs: ${chalk.bold(summary.total_cis)}`);
      console.log(`  Unique Types: ${chalk.bold(summary.unique_types)}`);
      console.log(`  Unique Environments: ${chalk.bold(summary.unique_environments)}`);
      console.log(`  Total Relationships: ${chalk.bold(summary.total_relationships)}`);
      console.log(`  Recent Discoveries (24h): ${chalk.bold(summary.recent_discoveries_24h)}`);

      if (breakdown.by_type && breakdown.by_type.length > 0) {
        console.log(`\n${chalk.bold('Top CI Types:')}`);
        breakdown.by_type.forEach((item: any) => {
          const bar = '█'.repeat(Math.min(Math.floor(item.count / 10), 50));
          console.log(`  ${item.ci_type.padEnd(20)} ${chalk.blue(bar)} ${item.count}`);
        });
      }

      if (breakdown.by_status && breakdown.by_status.length > 0) {
        console.log(`\n${chalk.bold('By Status:')}`);
        breakdown.by_status.forEach((item: any) => {
          console.log(`  ${this.colorizeStatus(item.status).padEnd(30)} ${item.count}`);
        });
      }

      if (breakdown.by_environment && breakdown.by_environment.length > 0) {
        console.log(`\n${chalk.bold('By Environment:')}`);
        breakdown.by_environment.forEach((item: any) => {
          console.log(`  ${item.environment.padEnd(20)} ${item.count}`);
        });
      }

    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch summary statistics'));
      this.handleError(error);
    }
  }

  /**
   * Get CI counts by type
   */
  private async getCICountsByType(options: any): Promise<void> {
    const spinner = ora('Fetching CI counts by type...').start();

    try {
      const response = await axios.get(`${this.apiUrl}/analytics/ci-counts`, {
        headers: this.getHeaders(),
      });

      spinner.succeed(chalk.green('CI counts by type retrieved'));

      if (options.json) {
        console.log(JSON.stringify(response.data, null, 2));
        return;
      }

      const data = response.data.data;

      if (data.length === 0) {
        console.log(chalk.yellow('\nNo CIs found'));
        return;
      }

      console.log(chalk.cyan('\nCI Count by Type'));
      console.log(chalk.cyan('='.repeat(50)));

      const total = data.reduce((sum: number, item: any) => sum + parseInt(item.count), 0);

      data.forEach((item: any) => {
        const percentage = ((item.count / total) * 100).toFixed(1);
        const bar = '█'.repeat(Math.min(Math.floor(parseInt(item.count) / 10), 50));
        console.log(`\n  ${chalk.bold(item.ci_type)}`);
        console.log(`    Count: ${item.count} (${percentage}%)`);
        console.log(`    ${chalk.blue(bar)}`);
      });

      console.log(chalk.gray(`\n  Total: ${total}`));

    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch CI counts by type'));
      this.handleError(error);
    }
  }

  /**
   * Get CI counts by environment
   */
  private async getCICountsByEnvironment(options: any): Promise<void> {
    const spinner = ora('Fetching CI counts by environment...').start();

    try {
      const response = await axios.get(`${this.apiUrl}/analytics/ci-environments`, {
        headers: this.getHeaders(),
      });

      spinner.succeed(chalk.green('CI counts by environment retrieved'));

      if (options.json) {
        console.log(JSON.stringify(response.data, null, 2));
        return;
      }

      const data = response.data.data;

      if (data.length === 0) {
        console.log(chalk.yellow('\nNo environment data found'));
        return;
      }

      console.log(chalk.cyan('\nCI Count by Environment'));
      console.log(chalk.cyan('='.repeat(50)));

      const total = data.reduce((sum: number, item: any) => sum + parseInt(item.count), 0);

      data.forEach((item: any) => {
        const percentage = ((item.count / total) * 100).toFixed(1);
        const bar = '█'.repeat(Math.min(Math.floor(parseInt(item.count) / 10), 50));
        console.log(`\n  ${chalk.bold(item.environment)}`);
        console.log(`    Count: ${item.count} (${percentage}%)`);
        console.log(`    ${chalk.green(bar)}`);
      });

      console.log(chalk.gray(`\n  Total: ${total}`));

    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch CI counts by environment'));
      this.handleError(error);
    }
  }

  /**
   * Get recent changes
   */
  private async getRecentChanges(options: any): Promise<void> {
    const spinner = ora('Fetching recent changes...').start();

    try {
      if (!options.ciId) {
        spinner.fail(chalk.red('CI ID is required for change history'));
        console.log(chalk.yellow('  Use --ci-id <ciId> to specify a CI'));
        return;
      }

      const response = await axios.get(`${this.apiUrl}/analytics/change-history`, {
        params: {
          ci_id: options.ciId,
          limit: options.limit,
        },
        headers: this.getHeaders(),
      });

      spinner.succeed(chalk.green('Change history retrieved'));

      if (options.json) {
        console.log(JSON.stringify(response.data, null, 2));
        return;
      }

      const data = response.data.data;

      if (data.length === 0) {
        console.log(chalk.yellow('\nNo changes found for this CI'));
        return;
      }

      console.log(chalk.cyan(`\nChange History for CI: ${response.data.ci_id}`));
      console.log(chalk.cyan('='.repeat(70)));

      data.forEach((change: any, index: number) => {
        const timestamp = new Date(change.change_timestamp).toLocaleString();
        console.log(`\n${chalk.bold(`${index + 1}. ${change.change_type.toUpperCase()}`)}`);
        console.log(`   Time: ${timestamp}`);
        console.log(`   Field: ${change.field_name}`);
        console.log(`   Old Value: ${chalk.red(change.old_value || 'null')}`);
        console.log(`   New Value: ${chalk.green(change.new_value || 'null')}`);
        if (change.changed_by) {
          console.log(`   Changed By: ${change.changed_by}`);
        }
      });

      console.log(chalk.gray(`\n  Total Changes: ${data.length}`));

    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch change history'));
      this.handleError(error);
    }
  }

  /**
   * Get relationship statistics
   */
  private async getRelationshipStats(options: any): Promise<void> {
    const spinner = ora('Fetching relationship statistics...').start();

    try {
      const [countsResponse, topConnectedResponse] = await Promise.all([
        axios.get(`${this.apiUrl}/analytics/relationship-counts`, {
          headers: this.getHeaders(),
        }),
        axios.get(`${this.apiUrl}/analytics/top-connected`, {
          params: {
            limit: options.limit,
            direction: options.direction,
          },
          headers: this.getHeaders(),
        }),
      ]);

      spinner.succeed(chalk.green('Relationship statistics retrieved'));

      if (options.json) {
        console.log(JSON.stringify({
          counts: countsResponse.data,
          topConnected: topConnectedResponse.data,
        }, null, 2));
        return;
      }

      const counts = countsResponse.data.data;
      const topConnected = topConnectedResponse.data.data;

      console.log(chalk.cyan('\nRelationship Statistics'));
      console.log(chalk.cyan('='.repeat(50)));

      if (counts && counts.length > 0) {
        console.log(`\n${chalk.bold('Relationships by Type:')}`);
        const total = counts.reduce((sum: number, item: any) => sum + parseInt(item.count), 0);

        counts.forEach((item: any) => {
          const percentage = ((item.count / total) * 100).toFixed(1);
          const bar = '█'.repeat(Math.min(Math.floor(parseInt(item.count) / 10), 50));
          console.log(`\n  ${item.relationship_type}`);
          console.log(`    Count: ${item.count} (${percentage}%)`);
          console.log(`    ${chalk.blue(bar)}`);
        });

        console.log(chalk.gray(`\n  Total Relationships: ${total}`));
      }

      if (topConnected && topConnected.length > 0) {
        console.log(`\n${chalk.bold(`\nTop ${options.limit} Connected CIs (${options.direction}):`)}`)
        console.log(chalk.gray('  CI Name'.padEnd(30) + 'Type'.padEnd(20) + 'Connections'));
        console.log(chalk.gray('  ' + '-'.repeat(68)));

        topConnected.forEach((item: any) => {
          const name = item.ci_name.substring(0, 28).padEnd(30);
          const type = item.ci_type.substring(0, 18).padEnd(20);
          const count = chalk.bold(item.relationship_count);
          console.log(`  ${name}${type}${count}`);
        });
      }

    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch relationship statistics'));
      this.handleError(error);
    }
  }

  /**
   * Run custom analytics query
   */
  private async runCustomQuery(queryType: string, options: any): Promise<void> {
    const spinner = ora(`Running ${queryType} query...`).start();

    try {
      let endpoint = '';
      let params: any = {};

      switch (queryType) {
        case 'discovery-stats':
          endpoint = '/analytics/discovery-stats';
          if (options.startDate) params.start_date = options.startDate;
          if (options.endDate) params.end_date = options.endDate;
          break;

        case 'discovery-timeline':
          endpoint = '/analytics/discovery-timeline';
          params.interval = options.interval;
          params.limit = options.limit;
          break;

        case 'top-connected':
          endpoint = '/analytics/top-connected';
          params.limit = options.limit;
          params.direction = options.direction;
          break;

        case 'dependency-depth':
          endpoint = '/analytics/dependency-depth';
          break;

        default:
          spinner.fail(chalk.red(`Unknown query type: ${queryType}`));
          console.log(chalk.yellow('  Valid types: discovery-stats, discovery-timeline, top-connected, dependency-depth'));
          return;
      }

      const response = await axios.get(`${this.apiUrl}${endpoint}`, {
        params,
        headers: this.getHeaders(),
      });

      spinner.succeed(chalk.green(`Query ${queryType} completed`));

      if (options.json) {
        console.log(JSON.stringify(response.data, null, 2));
        return;
      }

      this.formatCustomQueryOutput(queryType, response.data);

    } catch (error: any) {
      spinner.fail(chalk.red(`Query ${queryType} failed`));
      this.handleError(error);
    }
  }

  /**
   * Format custom query output
   */
  private formatCustomQueryOutput(queryType: string, data: any): void {
    console.log(chalk.cyan(`\n${queryType.toUpperCase()} Results`));
    console.log(chalk.cyan('='.repeat(50)));

    switch (queryType) {
      case 'discovery-stats':
        const { summary, by_provider } = data.data;
        console.log(`\n${chalk.bold('Summary:')}`);
        console.log(`  Total CIs: ${summary.total_cis}`);
        console.log(`  Unique Types: ${summary.unique_types}`);
        console.log(`  First Discovery: ${summary.first_discovery ? new Date(summary.first_discovery).toLocaleString() : 'N/A'}`);
        console.log(`  Last Discovery: ${summary.last_discovery ? new Date(summary.last_discovery).toLocaleString() : 'N/A'}`);

        if (by_provider && by_provider.length > 0) {
          console.log(`\n${chalk.bold('By Provider:')}`);
          by_provider.forEach((item: any) => {
            console.log(`  ${item.discovery_provider.padEnd(20)} ${item.count}`);
          });
        }
        break;

      case 'discovery-timeline':
        if (data.data && data.data.length > 0) {
          console.log(`\n${chalk.bold(`Timeline (${data.interval}):`)}`)
          data.data.forEach((item: any) => {
            const period = new Date(item.period).toLocaleDateString();
            const bar = '█'.repeat(Math.min(Math.floor(parseInt(item.count) / 5), 40));
            console.log(`  ${period.padEnd(15)} ${chalk.blue(bar)} ${item.count} (${item.unique_types} types)`);
          });
        } else {
          console.log(chalk.yellow('\nNo timeline data available'));
        }
        break;

      case 'top-connected':
        if (data.data && data.data.length > 0) {
          console.log(`\n${chalk.bold('Top Connected CIs:')}`);
          data.data.forEach((item: any, index: number) => {
            console.log(`\n  ${index + 1}. ${chalk.bold(item.ci_name)}`);
            console.log(`     Type: ${item.ci_type}`);
            console.log(`     Connections: ${chalk.bold(item.relationship_count)}`);
          });
        } else {
          console.log(chalk.yellow('\nNo data available'));
        }
        break;

      case 'dependency-depth':
        const { top_cis, depth_distribution } = data.data;

        if (top_cis && top_cis.length > 0) {
          console.log(`\n${chalk.bold('CIs with Deepest Dependencies:')}`);
          top_cis.slice(0, 10).forEach((item: any, index: number) => {
            console.log(`  ${index + 1}. CI: ${item.ci_id} - Depth: ${chalk.bold(item.max_depth)}, Dependencies: ${item.total_dependencies}`);
          });
        }

        if (depth_distribution && depth_distribution.length > 0) {
          console.log(`\n${chalk.bold('Depth Distribution:')}`);
          depth_distribution.forEach((item: any) => {
            const bar = '█'.repeat(Math.min(parseInt(item.count), 50));
            console.log(`  Depth ${item.max_depth}: ${chalk.blue(bar)} ${item.count}`);
          });
        }
        break;
    }
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * Colorize status text
   */
  private colorizeStatus(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
        return chalk.green(status);
      case 'inactive':
        return chalk.gray(status);
      case 'maintenance':
        return chalk.yellow(status);
      case 'decommissioned':
        return chalk.red(status);
      default:
        return status;
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): void {
    if (error.response) {
      console.error(chalk.red(`  Error: ${error.response.data.message || error.response.statusText}`));
      console.error(chalk.red(`  Status: ${error.response.status}`));
    } else if (error.request) {
      console.error(chalk.red('  Error: No response from server'));
    } else {
      console.error(chalk.red(`  Error: ${error.message}`));
    }
  }
}
