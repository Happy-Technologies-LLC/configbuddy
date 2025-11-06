/**
 * TBM Cost Engine Test Setup
 * Configures mocks and test utilities
 */

// Mock Database Clients
jest.mock('@cmdb/database', () => ({
  getNeo4jClient: jest.fn(() => ({
    session: jest.fn(() => ({
      run: jest.fn(),
      close: jest.fn(),
    })),
    close: jest.fn(),
  })),
  getPostgresClient: jest.fn(() => ({
    query: jest.fn(),
    end: jest.fn(),
  })),
}));

// Mock AWS Cost Explorer
jest.mock('@aws-sdk/client-cost-explorer', () => ({
  CostExplorerClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  GetCostAndUsageCommand: jest.fn(),
}));

// Mock Azure Cost Management
jest.mock('@azure/arm-costmanagement', () => ({
  CostManagementClient: jest.fn().mockImplementation(() => ({
    query: {
      usage: jest.fn(),
    },
  })),
}));

// Mock Azure Identity
jest.mock('@azure/identity', () => ({
  DefaultAzureCredential: jest.fn(),
}));

// Mock GCP Billing
jest.mock('@google-cloud/billing', () => ({
  CloudBillingClient: jest.fn().mockImplementation(() => ({
    listProjectBillingInfo: jest.fn(),
  })),
}));

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
