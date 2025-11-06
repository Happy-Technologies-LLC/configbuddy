/**
 * Framework Integration Test Setup
 * Configures mocks and test utilities
 */

// Mock all framework engines
jest.mock('@cmdb/bsm-impact-engine', () => ({
  CriticalityCalculatorService: jest.fn(),
  ImpactScoringService: jest.fn(),
  RiskRatingService: jest.fn(),
  BlastRadiusService: jest.fn(),
}));

jest.mock('@cmdb/tbm-cost-engine', () => ({
  TowerMappingService: jest.fn(),
  CostAllocationService: jest.fn(),
  DepreciationService: jest.fn(),
}));

jest.mock('@cmdb/itil-service-manager', () => ({
  IncidentPriorityService: jest.fn(),
  ChangeRiskService: jest.fn(),
  BaselineService: jest.fn(),
  ConfigurationManagementService: jest.fn(),
}));

// Mock Database
jest.mock('@cmdb/database', () => ({
  getNeo4jClient: jest.fn(() => ({
    session: jest.fn(() => ({
      run: jest.fn(),
      close: jest.fn(),
    })),
  })),
  getPostgresClient: jest.fn(() => ({
    query: jest.fn(),
  })),
}));

jest.setTimeout(10000);

afterEach(() => {
  jest.clearAllMocks();
});
