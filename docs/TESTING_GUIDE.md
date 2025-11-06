# ConfigBuddy v3.0 Testing Guide

**Version**: 3.0.0
**Last Updated**: November 2025
**Status**: Production-Ready

## Table of Contents

1. [Overview](#overview)
2. [Testing Philosophy](#testing-philosophy)
3. [Test Infrastructure](#test-infrastructure)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Test Coverage](#test-coverage)
7. [Testing Best Practices](#testing-best-practices)
8. [CI/CD Integration](#cicd-integration)
9. [Troubleshooting](#troubleshooting)

---

## Overview

ConfigBuddy v3.0 includes a comprehensive test suite covering all major packages:

- **BSM Impact Engine**: 15+ test suites
- **TBM Cost Engine**: 12+ test suites
- **ITIL Service Manager**: 10+ test suites
- **Framework Integration**: 12+ test suites
- **AI/ML Engine**: 10+ test suites
- **AI Discovery**: 8+ test suites

**Total Coverage**: 70%+ code coverage across all v3.0 packages.

## Testing Philosophy

### Test Types

1. **Unit Tests**: Test individual functions and methods in isolation
2. **Integration Tests**: Test interactions between components
3. **E2E Tests**: Test complete workflows (future enhancement)

### Coverage Goals

| Component | Target Coverage | Current Status |
|-----------|----------------|----------------|
| BSM Impact Engine | 80%+ | ✅ 82% |
| TBM Cost Engine | 80%+ | ✅ 81% |
| ITIL Service Manager | 80%+ | ⏳ 75% |
| Framework Integration | 75%+ | ✅ 78% |
| AI/ML Engine | 70%+ | ✅ 74% |
| AI Discovery | 70%+ | ⏳ 68% |

## Test Infrastructure

### Technology Stack

- **Test Framework**: Jest 29.x
- **Assertion Library**: Jest (built-in)
- **TypeScript Support**: ts-jest
- **Mocking**: Jest mocks + custom test helpers

### Directory Structure

```
packages/<package-name>/
├── __tests__/
│   ├── setup.ts                    # Test configuration and global mocks
│   ├── helpers/
│   │   └── test-data.ts           # Mock data generators
│   ├── unit/
│   │   ├── service1.test.ts       # Unit tests for services
│   │   ├── service2.test.ts
│   │   └── calculator.test.ts
│   └── integration/
│       ├── workflow1.test.ts      # Integration tests
│       └── workflow2.test.ts
├── jest.config.js                  # Jest configuration
├── src/                            # Source code
└── package.json
```

### Jest Configuration

Each package has a `jest.config.js` file:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/index.ts',
    '!src/types/**/*.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testTimeout: 10000,
};
```

## Running Tests

### Run All Tests

```bash
# From root (runs all packages)
npm test

# From specific package
cd packages/bsm-impact-engine
npm test
```

### Run Tests by Type

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode (auto-rerun on changes)
npm run test:watch
```

### Run Tests with Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

### Run Specific Test Files

```bash
# Run single test file
npm test -- criticality-calculator.service.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should calculate tier_0"

# Run tests for specific package
npm test -- --projects packages/bsm-impact-engine
```

### Run Tests in CI Mode

```bash
# Run once without watch (for CI/CD)
npm test -- --ci --coverage --maxWorkers=2
```

## Writing Tests

### Test Structure

Follow the **Arrange-Act-Assert** pattern:

```typescript
describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(() => {
    // Arrange: Set up test environment
    service = new ServiceName();
  });

  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange: Prepare test data
      const input = mockData();

      // Act: Execute the method
      const result = service.methodName(input);

      // Assert: Verify the outcome
      expect(result).toBeDefined();
      expect(result.property).toBe(expectedValue);
    });
  });

  describe('edge cases', () => {
    it('should handle invalid input gracefully', () => {
      expect(() => service.methodName(null)).not.toThrow();
    });
  });
});
```

### Naming Conventions

**Test Files**: `<source-file-name>.test.ts`
```
src/services/criticality-calculator.service.ts
→ __tests__/unit/criticality-calculator.service.test.ts
```

**Describe Blocks**: Use clear, hierarchical descriptions
```typescript
describe('CriticalityCalculatorService', () => {
  describe('calculateCriticality', () => {
    describe('tier_0 services', () => {
      it('should calculate tier_0 for high revenue service', () => {
        // Test implementation
      });
    });
  });
});
```

**Test Names**: Start with "should" and describe expected behavior
```typescript
✅ it('should calculate tier_0 for high revenue service', () => {})
✅ it('should handle missing data gracefully', () => {})
❌ it('test calculation', () => {})
❌ it('works', () => {})
```

### Using Test Helpers

#### Mock Data Generators

Located in `__tests__/helpers/test-data.ts`:

```typescript
import { mockCI, mockBusinessService } from '../helpers/test-data';

it('should process business service', () => {
  const service = mockBusinessService({
    annual_revenue_supported: 50_000_000,
    customer_count: 500_000,
  });

  const result = calculator.calculate(service);
  expect(result.criticality).toBe('tier_0');
});
```

#### Database Mocks

Mocked in `__tests__/setup.ts`:

```typescript
// Neo4j is mocked globally
const mockSession = {
  run: jest.fn(),
  close: jest.fn(),
};

// Use in tests
it('should query Neo4j', async () => {
  mockSession.run.mockResolvedValue({
    records: [/* mock data */],
  });

  const result = await service.queryGraph();
  expect(mockSession.run).toHaveBeenCalled();
});
```

### Testing Async Code

```typescript
// Using async/await (preferred)
it('should handle async operations', async () => {
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
});

// Using done callback (when needed)
it('should handle callbacks', (done) => {
  service.methodWithCallback((error, result) => {
    expect(error).toBeNull();
    expect(result).toBeDefined();
    done();
  });
});
```

### Testing Error Handling

```typescript
it('should throw error for invalid input', () => {
  expect(() => {
    service.methodThatShouldThrow(invalidInput);
  }).toThrow('Expected error message');
});

it('should handle errors gracefully', async () => {
  mockDependency.method.mockRejectedValue(new Error('Network error'));

  const result = await service.methodThatCatchesErrors();
  expect(result.error).toBeDefined();
  expect(result.error.message).toContain('Network error');
});
```

### Testing with Spies

```typescript
it('should call dependency method', () => {
  const spy = jest.spyOn(dependency, 'method');

  service.performAction();

  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith(expectedArg);
  spy.mockRestore();
});
```

## Test Coverage

### Viewing Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open packages/<package-name>/coverage/lcov-report/index.html
```

### Coverage Thresholds

Configured in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
}
```

**Tests will fail if coverage drops below threshold.**

### What to Test (Priority Order)

1. **Critical Business Logic** (P0)
   - Cost calculations
   - Risk assessments
   - Impact scoring
   - Depreciation schedules

2. **Service Methods** (P1)
   - Public API methods
   - Integration points
   - Error handling

3. **Edge Cases** (P2)
   - Null/undefined handling
   - Boundary conditions
   - Invalid inputs

4. **Helper Functions** (P3)
   - Utility methods
   - Formatters
   - Validators

### What NOT to Test

- ❌ TypeScript type definitions
- ❌ Third-party library internals
- ❌ Simple getters/setters
- ❌ Index files (exports only)
- ❌ Configuration objects

## Testing Best Practices

### 1. Test Isolation

Each test should be independent:

```typescript
✅ Good: Independent tests
beforeEach(() => {
  service = new Service(); // Fresh instance each test
});

❌ Bad: Shared state
let service = new Service(); // Reused across tests
```

### 2. Clear Assertions

Use specific, meaningful assertions:

```typescript
✅ Good: Specific assertions
expect(result.criticality).toBe('tier_0');
expect(result.impactScore).toBeGreaterThan(80);

❌ Bad: Vague assertions
expect(result).toBeTruthy();
expect(result).toBeDefined();
```

### 3. Test One Thing

Each test should verify a single behavior:

```typescript
✅ Good: Single behavior
it('should calculate tier_0 for high revenue', () => {
  // Test one scenario
});

it('should calculate tier_4 for low revenue', () => {
  // Test different scenario
});

❌ Bad: Multiple behaviors
it('should calculate all tiers', () => {
  // Tests tier_0, tier_1, tier_2, tier_3, tier_4
});
```

### 4. Descriptive Test Names

```typescript
✅ Good: Descriptive
it('should return tier_0 when annual revenue exceeds $50M', () => {})

❌ Bad: Vague
it('should work', () => {})
it('test revenue', () => {})
```

### 5. Use Test Data Builders

```typescript
// Create a helper for complex test data
function buildBusinessService(overrides = {}) {
  return {
    id: 'svc-001',
    service_name: 'Test Service',
    bsm_attributes: {
      annual_revenue_supported: 10_000_000,
      customer_count: 100_000,
      ...overrides.bsm_attributes,
    },
    ...overrides,
  };
}

// Use in tests
it('should handle high revenue service', () => {
  const service = buildBusinessService({
    bsm_attributes: { annual_revenue_supported: 100_000_000 },
  });
  // Test with service
});
```

### 6. Clean Up After Tests

```typescript
afterEach(() => {
  jest.clearAllMocks(); // Clear mock call history
  jest.restoreAllMocks(); // Restore spied methods
});

afterAll(async () => {
  await database.close(); // Close connections
});
```

## CI/CD Integration

### GitHub Actions

Example workflow (`.github/workflows/test.yml`):

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm test -- --ci --coverage --maxWorkers=2
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Pre-commit Hooks

Use Husky to run tests before commits:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:unit",
      "pre-push": "npm run test:coverage"
    }
  }
}
```

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors

**Problem**: TypeScript can't resolve imports

**Solution**: Check `moduleNameMapper` in `jest.config.js`:

```javascript
moduleNameMapper: {
  '^@cmdb/(.*)$': '<rootDir>/../$1/src',
}
```

#### 2. Tests timing out

**Problem**: Async operations exceed default timeout

**Solution**: Increase timeout in jest.config.js or specific test:

```javascript
// jest.config.js
testTimeout: 10000, // 10 seconds

// Or in specific test
it('should handle slow operation', async () => {
  // Test code
}, 15000); // 15 second timeout
```

#### 3. Mock not working

**Problem**: Mock isn't intercepting calls

**Solution**: Ensure mock is set up before import:

```typescript
// ❌ Wrong order
import { Service } from './service';
jest.mock('./dependency');

// ✅ Correct order
jest.mock('./dependency');
import { Service } from './service';
```

#### 4. Coverage not collecting

**Problem**: Coverage report is empty

**Solution**: Check `collectCoverageFrom` in jest.config.js:

```javascript
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/**/*.d.ts',
  '!src/**/__tests__/**',
],
```

#### 5. Database connection errors in tests

**Problem**: Tests trying to connect to real database

**Solution**: Verify mocks in `__tests__/setup.ts`:

```typescript
jest.mock('@cmdb/database', () => ({
  getNeo4jClient: jest.fn(() => ({
    session: jest.fn(() => ({
      run: jest.fn(),
      close: jest.fn(),
    })),
  })),
}));
```

### Debugging Tests

#### Run single test with debugging

```bash
# Node debugging
node --inspect-brk node_modules/.bin/jest --runInBand <test-file>

# VS Code launch configuration
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"],
  "console": "integratedTerminal"
}
```

#### Add console logs

```typescript
it('should debug test', () => {
  console.log('Input:', input);
  const result = service.method(input);
  console.log('Result:', result);
  expect(result).toBeDefined();
});
```

#### Use Jest's verbose mode

```bash
npm test -- --verbose
```

## Performance Tips

### 1. Run tests in parallel

```bash
npm test -- --maxWorkers=4
```

### 2. Use test.only for development

```typescript
it.only('should test this one test', () => {
  // Only this test will run
});
```

### 3. Skip slow tests during development

```typescript
it.skip('should run slow integration test', () => {
  // Skipped during development
});
```

### 4. Use coverage selectively

```bash
# Only generate coverage for changed files
npm test -- --coverage --changedSince=main
```

## Example: Complete Test File

```typescript
/**
 * Unit Tests for Example Service
 */

import { ExampleService } from '../../src/services/example.service';
import { mockData } from '../helpers/test-data';

describe('ExampleService', () => {
  let service: ExampleService;

  beforeEach(() => {
    service = new ExampleService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('primaryMethod', () => {
    it('should return expected result for valid input', () => {
      const input = mockData();
      const result = service.primaryMethod(input);

      expect(result).toBeDefined();
      expect(result.status).toBe('success');
    });

    it('should handle invalid input gracefully', () => {
      const result = service.primaryMethod(null);

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('should call dependency method', () => {
      const spy = jest.spyOn(service['dependency'], 'method');

      service.primaryMethod(mockData());

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => {
      expect(() => service.primaryMethod({})).not.toThrow();
    });

    it('should handle very large input', () => {
      const largeInput = generateLargeData();
      const result = service.primaryMethod(largeInput);

      expect(result).toBeDefined();
    });
  });
});
```

## Regression Testing

For comprehensive regression testing procedures, including:
- Full test execution strategy
- Performance testing benchmarks
- End-to-end workflow validation
- Data validation and accuracy testing
- Monitoring and alerting verification
- Complete regression test matrix

**See**: [REGRESSION_TESTING_GUIDE.md](/home/user/configbuddy/docs/REGRESSION_TESTING_GUIDE.md)

The regression testing guide provides:
- **Pre-testing checklists** for environment setup and data preparation
- **Detailed test suites** organized by type (Unit, Integration, E2E, Performance, Monitoring, Data Validation)
- **Test scripts and commands** for automated execution
- **Performance targets** and acceptance criteria
- **Issue tracking templates** and severity guidelines
- **Sign-off criteria** for production release approval

**When to use**:
- Before major releases (v3.x, v4.x)
- After significant architectural changes
- Before production deployments
- During quarterly validation cycles
- After infrastructure upgrades

**Estimated execution time**: 4-6 hours for full suite

---

## Test Data Generation

ConfigBuddy includes a comprehensive test data generator for creating realistic test datasets.

**Location**: `/packages/common/src/test-utils/data-generator.ts`

**Usage Examples:**

```typescript
import {
  generateTestCI,
  generateTestCIs,
  generateTestBusinessService,
  generateTestIncident,
  generateTestChange,
  seedTestDataset,
} from '@cmdb/common/test-utils';

// Generate single CI with specific attributes
const server = generateTestCI({
  type: 'server',
  environment: 'production',
  criticality: 'tier_0',
  monthly_cost: 5000,
});

// Generate multiple CIs
const cis = generateTestCIs({
  count: 100,
  type: 'virtual-machine',
  environment: 'staging',
});

// Generate business service with specific metrics
const service = generateTestBusinessService({
  criticality: 'tier_1',
  annual_revenue_supported: 25_000_000,
  customer_count: 500_000,
});

// Generate complete test dataset
const dataset = seedTestDataset({
  ciCount: 1000,
  businessServiceCount: 50,
  incidentCount: 100,
  changeCount: 75,
});

// Export as JSON
import { exportTestDataAsJSON } from '@cmdb/common/test-utils';
const json = exportTestDataAsJSON(dataset);
```

**Available Generators:**

| Generator | Description | Options |
|-----------|-------------|---------|
| `generateTestCI()` | Single CI with ITIL+TBM+BSM attributes | type, status, environment, criticality, cost |
| `generateTestCIs()` | Multiple CIs | count, type, status, environment |
| `generateTestBusinessService()` | Business service | criticality, revenue, customers, cost |
| `generateTestIncident()` | ITIL incident | priority, status, affected_ci_id |
| `generateTestChange()` | ITIL change request | status, affected_ci_ids |
| `generateTestCostAllocation()` | TBM cost allocation | ci_id, service_id, amount, method |
| `seedTestDataset()` | Complete dataset | ciCount, serviceCount, incidentCount |

**Test Data Characteristics:**

- ✅ Realistic attribute values based on criticality tiers
- ✅ Consistent relationships between entities
- ✅ Valid ITIL workflow states
- ✅ Accurate TBM cost calculations
- ✅ Proper BSM impact scoring
- ✅ Randomized but deterministic data
- ✅ Supports all v3.0 frameworks (ITIL, TBM, BSM)

**Seeding Test Databases:**

```bash
# From common package
cd packages/common

# Build the package
npm run build

# Use in test scripts
node -e "
const { seedTestDataset, exportTestDataAsJSON } = require('./dist/test-utils');
const dataset = seedTestDataset({ ciCount: 1000 });
console.log(exportTestDataAsJSON(dataset));
" > test-data.json

# Import to database
cat test-data.json | docker exec -i cmdb-postgres psql -U cmdb_user -d cmdb -c "..."
```

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
- [TypeScript Testing](https://github.com/kulshekhar/ts-jest)
- [Regression Testing Guide](REGRESSION_TESTING_GUIDE.md)

---

**Questions or Issues?** Contact the ConfigBuddy team or open an issue on GitHub.
