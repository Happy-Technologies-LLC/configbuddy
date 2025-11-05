import * as https from 'https';
import * as http from 'http';

/**
 * Reporter configuration
 */
export interface ReporterConfig {
  _apiUrl: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Report payload structure
 */
export interface ReportPayload {
  agentId?: string;
  _hostname: string;
  _timestamp: Date;
  _data: {
    systemInfo?: any;
    processes?: any;
    network?: any;
    [key: string]: any;
  };
}

/**
 * Reporter - Sends collected data to the CMDB API server
 */
export class Reporter {
  private config: Required<ReporterConfig>;

  constructor(config: ReporterConfig) {
    this.config = {
      _apiUrl: config._apiUrl,
      apiKey: config.apiKey || '',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 5000,
    };
  }

  /**
   * Send report to API server with retry logic
   */
  async send(payload: ReportPayload): Promise<boolean> {
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await this.sendRequest(payload);
        console.log(`Report sent successfully on attempt ${attempt}`);
        return true;
      } catch (error) {
        console.error(`Failed to send report (attempt ${attempt}/${this.config.retryAttempts}):`, error);

        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay);
        }
      }
    }

    console.error('All retry attempts failed');
    return false;
  }

  /**
   * Send HTTP/HTTPS request
   */
  private sendRequest(payload: ReportPayload): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.config._apiUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const postData = JSON.stringify(payload);

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        timeout: this.config.timeout,
      };

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test connection to API server
   */
  async testConnection(): Promise<boolean> {
    try {
      const testPayload: ReportPayload = {
        _hostname: 'test',
        _timestamp: new Date(),
        _data: { test: true },
      };

      await this.sendRequest(testPayload);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Update reporter configuration
   */
  updateConfig(config: Partial<ReporterConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }
}
