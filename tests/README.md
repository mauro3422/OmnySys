# OmnySystem Test Suite Documentation

## Overview

The OmnySystem test suite provides comprehensive coverage of the Layer A Analysis pipeline, including extractors, detectors, builders, and analysis components. With **230+ test files** and **5,000+ tests**, this suite ensures reliability and consistency across the entire static analysis system.

## Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/layer-a-analysis/layer-a-integration.test.js

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Structure

```
tests/
├── factories/           # Test data factories
├── unit/               # Unit tests
│   ├── layer-a-analysis/    # Layer A specific tests
│   ├── layer-a-static/      # Static analysis tests
│   └── layer-a-core/        # Core component tests
├── contracts/          # Contract tests
├── integration/        # Integration tests
└── README.md          # This file
```

## Test Categories

### 1. Unit Tests

Individual component testing with mocked dependencies:
- **Extractors**: Test data extraction from source files
- **Detectors**: Test pattern detection algorithms
- **Builders**: Test graph and system map construction
- **Parsers**: Test code parsing functionality

### 2. Integration Tests

Cross-component testing:
- `layer-a-integration.test.js` - Complete pipeline workflows
- `smoke.test.js` - Basic system health checks

### 3. Contract Tests

Interface consistency verification:
- `layer-a-contracts.test.js` - Cross-system contracts
- Individual contract tests per subsystem

## Factory System

The test suite includes 19 specialized factories for creating test data:

| Factory | Purpose |
|---------|---------|
| `analysis.factory.js` | Mock system maps and analysis data |
| `detector-test.factory.js` | Tier 3 detector test scenarios |
| `graph-test.factory.js` | Graph structures and nodes |
| `pipeline-test.factory.js` | Pipeline configurations |
| `phases-test.factory.js` | Phase execution contexts |
| `race-detector-test.factory.js` | Race condition scenarios |
| `query-test.factory.js` | Query system test data |

See [FACTORY_GUIDE.md](./FACTORY_GUIDE.md) for detailed usage.

## Writing New Tests

### Basic Test Structure

```javascript
import { describe, it, expect } from 'vitest';
import { SystemMapBuilder } from '../factories/graph-test.factory.js';

describe('My Feature', () => {
  it('should do something', () => {
    const systemMap = SystemMapBuilder.create()
      .withFile('src/test.js')
      .build();
    
    expect(systemMap.files['src/test.js']).toBeDefined();
  });
});
```

### Using Factories

```javascript
import { GraphBuilder } from '../factories/graph-test.factory.js';
import { DetectorTestFactory } from '../factories/detector-test.factory.js';

// Create complex test data
const graph = GraphBuilder.create()
  .withFile('src/a.js')
  .withFile('src/b.js')
  .withDependency('src/a.js', 'src/b.js')
  .build();

// Use predefined scenarios
const scenario = DetectorTestFactory.createScenario('deadCode');
```

## Test Conventions

### Naming
- Test files: `*.test.js`
- Test suites: `describe('Component Name', () => {})`
- Test cases: `it('should do something', () => {})`

### Structure
- Group related tests in `describe` blocks
- Use `beforeEach`/`afterEach` for setup/teardown
- Prefer factory methods over manual mock creation

### Assertions
- Use `expect().toBe()` for primitive comparisons
- Use `expect().toEqual()` for object comparisons
- Use `expect().toBeDefined()` for existence checks

## Coverage Areas

| System | Coverage | Files |
|--------|----------|-------|
| Extractors | 85% | 45 |
| Detectors | 80% | 32 |
| Graph | 90% | 28 |
| Pipeline | 75% | 38 |
| Query | 85% | 24 |
| Race Detector | 80% | 18 |

## Debugging Tests

```bash
# Debug specific test
npm test -- --reporter=verbose tests/unit/my-test.test.js

# Debug with logs
DEBUG=true npm test -- tests/unit/my-test.test.js

# Debug failing tests only
npm test -- --only-failures
```

## Continuous Integration

Tests run automatically on:
- Pull request creation
- Merge to main branch
- Nightly builds

## Contributing

See [ADDING_TESTS.md](./ADDING_TESTS.md) for guidelines on adding new tests.

## Resources

- [FACTORY_GUIDE.md](./FACTORY_GUIDE.md) - Complete factory documentation
- [CONTRACT_PATTERNS.md](./CONTRACT_PATTERNS.md) - Contract testing guide
- [LAYER_A_TEST_SUMMARY.md](./LAYER_A_TEST_SUMMARY.md) - Test suite summary
