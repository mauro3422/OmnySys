# Adding New Tests

Guide for adding new tests to the OmnySystem test suite.

> **🆕 NEW: Meta-Factory Pattern (Recommended)**
> Use the test-suite-generator for standardized, DRY test suites.
> See [Meta-Factory Guide](./META_FACTORY_GUIDE.md) for complete documentation.

## Quick Start (Modern - Meta-Factory)

### 1. Create Test File

```bash
# Create new test file
touch tests/unit/layer-a-analysis/my-feature.test.js
```

### 2. Use Meta-Factory Template (Recommended)

```javascript
/**
 * @fileoverview Tests for My Feature
 * 
 * Description of what these tests cover.
 * Uses Meta-Factory pattern for standardized contracts.
 * 
 * @module tests/unit/layer-a-analysis/my-feature
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { SystemMapBuilder } from '#test-factories/graph-test.factory.js';
import { myFeature } from '#layer-a/my-feature.js';

// Generate standardized test suite with contracts
createAnalysisTestSuite({
  module: 'my-feature',
  exports: { myFeature },
  analyzeFn: myFeature,
  expectedFields: { results: 'array', total: 'number' },
  createMockInput: () => SystemMapBuilder.create().withFile('src/test.js').build(),
  specificTests: [
    {
      name: 'should handle specific scenario',
      fn: async () => {
        const input = createSpecificScenario();
        const result = await myFeature(input);
        expect(result.specificProperty).toBe('expected');
      }
    }
  ]
});
```

## Quick Start (Legacy - Manual)

### 1. Create Test File

```bash
# Create new test file
touch tests/unit/layer-a-analysis/my-feature.test.js
```

### 2. Basic Template

```javascript
/**
 * @fileoverview Tests for My Feature
 * 
 * Description of what these tests cover.
 * 
 * @module tests/unit/layer-a-analysis/my-feature
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SystemMapBuilder } from '../../factories/graph-test.factory.js';

// Subject under test
import { myFeature } from '../../../src/layer-a-static/my-feature.js';

describe('My Feature', () => {
  let builder;

  beforeEach(() => {
    builder = SystemMapBuilder.create();
  });

  describe('Basic Functionality', () => {
    it('should do something', async () => {
      const systemMap = builder
        .withFile('src/test.js')
        .build();

      const result = await myFeature(systemMap);

      expect(result).toBeDefined();
    });
  });
});
```

## 🏭 Meta-Factory Pattern (Recommended)

### Why Use Meta-Factory?

- **DRY**: Define contracts once, reuse everywhere
- **Consistency**: All tests follow same structure
- **Maintainability**: Change contract in one place
- **Readability**: Less boilerplate, more meaning

### Available Quick-Start Functions

```javascript
import { 
  createAnalysisTestSuite,      // For analysis functions
  createDetectorTestSuite,      // For detector classes
  createUtilityTestSuite,       // For utility functions
  createTestSuite               // For custom configurations
} from '#test-factories/test-suite-generator';
```

### Example: Analysis Function

```javascript
import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { SystemMapBuilder } from '#test-factories/graph-test.factory.js';
import { analyzeCoupling } from '#layer-a/analyses/tier2/coupling.js';

createAnalysisTestSuite({
  module: 'analyses/tier2/coupling',
  exports: { analyzeCoupling },
  analyzeFn: analyzeCoupling,
  expectedFields: { 
    couplings: 'array', 
    maxCoupling: 'number' 
  },
  createMockInput: () => SystemMapBuilder.create()
    .withFile('src/a.js')
    .withFile('src/b.js')
    .build(),
  specificTests: [
    {
      name: 'detects bidirectional coupling',
      fn: async () => {
        const systemMap = {
          files: {
            'a.js': { dependsOn: ['b.js'], usedBy: [] },
            'b.js': { dependsOn: [], usedBy: ['a.js'] }
          }
        };
        const result = await analyzeCoupling(systemMap);
        expect(result.total).toBe(1);
        expect(result.maxCoupling).toBe(1);
      }
    }
  ]
});
```

### Example: Utility Function

```javascript
import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { formatDate } from '#layer-a/utils/date-utils.js';

createUtilityTestSuite({
  module: 'utils/date-utils',
  exports: { formatDate },
  fn: formatDate,
  expectedSafeResult: null,
  specificTests: [
    {
      name: 'formats ISO date correctly',
      fn: () => {
        const result = formatDate('2024-01-15');
        expect(result).toBe('Jan 15, 2024');
      }
    }
  ]
});
```

### Example: Custom Configuration

```javascript
import { createTestSuite } from '#test-factories/test-suite-generator';
import { myComplexModule } from '#layer-a/complex-module.js';

createTestSuite({
  module: 'complex-module',
  exports: { myComplexModule },
  contracts: ['structure', 'error-handling', 'runtime', 'async'],
  contractOptions: {
    testFn: myComplexModule,
    async: true,
    expectedSafeResult: { success: false }
  },
  specificTests: [
    // Your specific tests here
  ]
});
```

## Test File Organization

### Directory Structure

```
tests/
├── unit/
│   └── layer-a-analysis/
│       ├── extractors/       # Extractor tests
│       ├── detectors/        # Detector tests
│       ├── pipeline/         # Pipeline tests
│       ├── graph/            # Graph tests
│       └── my-feature/       # Your new feature
│           ├── index.test.js
│           ├── core.test.js
│           └── utils.test.js
```

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Test file | `*.test.js` | `my-feature.test.js` |
| Test suite | Component name | `describe('MyFeature', ...)` |
| Test case | `should ...` | `it('should handle empty input', ...)` |
| Factory file | `*-test.factory.js` | `my-feature-test.factory.js` |

## Writing Tests

### Using Factories

```javascript
import { 
  SystemMapBuilder, 
  GraphBuilder 
} from '../../factories/graph-test.factory.js';

import { 
  DetectorTestFactory 
} from '../../factories/detector-test.factory.js';

// Create test data
const systemMap = SystemMapBuilder.create()
  .withFile('src/a.js')
  .withFile('src/b.js')
  .withDependency('src/a.js', 'src/b.js')
  .withFunction('src/a.js', 'main', { isExported: true })
  .build();

// Use predefined scenario
const scenario = DetectorTestFactory.createScenario('deadCode');
```

### Test Patterns

#### Happy Path

```javascript
it('should return results on valid input', async () => {
  const input = createValidInput();
  
  const result = await functionUnderTest(input);
  
  expect(result).toBeDefined();
  expect(result.success).toBe(true);
});
```

#### Error Handling

```javascript
it('should throw on invalid input', async () => {
  await expect(functionUnderTest(null))
    .rejects
    .toThrow('Invalid input');
});
```

#### Edge Cases

```javascript
it('should handle empty array', async () => {
  const result = await functionUnderTest([]);
  
  expect(result).toEqual([]);
});

it('should handle single item', async () => {
  const result = await functionUnderTest([item]);
  
  expect(result).toHaveLength(1);
});
```

#### Async Operations

```javascript
it('should process asynchronously', async () => {
  const result = await functionUnderTest(data);
  
  expect(result).toBeDefined();
});

it('should handle async errors', async () => {
  await expect(asyncFunctionThatFails())
    .rejects
    .toThrow();
});
```

### Mocking

#### Mock Functions

```javascript
import { vi } from 'vitest';

it('should call dependency', () => {
  const mockFn = vi.fn();
  
  myFunction(mockFn);
  
  expect(mockFn).toHaveBeenCalled();
  expect(mockFn).toHaveBeenCalledWith(expectedArg);
});
```

#### Mock Modules

```javascript
vi.mock('../../../src/layer-a-static/utils.js', () => ({
  helperFunction: vi.fn(() => 'mocked')
}));
```

#### Mock File System

```javascript
import { createMockFileSystem } from '../../factories/pipeline-test.factory.js';

const fs = createMockFileSystem({
  'src/index.js': 'export const main = () => {}'
});
```

## Creating Factories

If your feature needs test data, create a factory:

```javascript
// tests/factories/my-feature-test.factory.js

/**
 * @fileoverview My Feature Test Factory
 * 
 * Factory for creating test data for My Feature.
 */

/**
 * Builder for creating my feature scenarios
 */
export class MyFeatureBuilder {
  constructor() {
    this.data = {
      items: [],
      config: {}
    };
  }

  static create() {
    return new MyFeatureBuilder();
  }

  withItem(item) {
    this.data.items.push(item);
    return this;
  }

  withConfig(config) {
    this.data.config = { ...this.data.config, ...config };
    return this;
  }

  build() {
    return { ...this.data };
  }
}

/**
 * Predefined scenarios
 */
export const MyFeatureScenarios = {
  empty: () => MyFeatureBuilder.create().build(),
  
  withItems: (count) => {
    const builder = MyFeatureBuilder.create();
    for (let i = 0; i < count; i++) {
      builder.withItem({ id: i, name: `item${i}` });
    }
    return builder.build();
  },
  
  complex: () => MyFeatureBuilder.create()
    .withItem({ id: 1, type: 'special' })
    .withConfig({ enabled: true })
    .build()
};

export default { MyFeatureBuilder, MyFeatureScenarios };
```

## Contract Tests

Add contract tests for public interfaces:

```javascript
// tests/contracts/my-feature.contract.test.js

describe('My Feature Contract', () => {
  describe('Input Contract', () => {
    it('MUST accept valid input structure', async () => {
      const validInput = { requiredField: 'value' };
      
      await expect(myFeature(validInput)).resolves.not.toThrow();
    });

    it('MUST reject invalid input structure', async () => {
      const invalidInput = { missingRequiredField: true };
      
      await expect(myFeature(invalidInput)).rejects.toThrow();
    });
  });

  describe('Output Contract', () => {
    it('MUST return expected structure', async () => {
      const result = await myFeature(validInput);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(typeof result.success).toBe('boolean');
    });
  });
});
```

## Integration Tests

Add integration tests for cross-component functionality:

```javascript
// tests/integration/my-feature.integration.test.js

describe('My Feature Integration', () => {
  it('should work with graph system', async () => {
    const graph = GraphBuilder.create()
      .withFile('src/test.js')
      .buildSystemMap();
    
    const result = await myFeature(graph);
    
    expect(result).toBeDefined();
  });

  it('should work with detector system', async () => {
    const scenario = DetectorTestFactory.createScenario('complex');
    
    const result = await myFeature(scenario.systemMap);
    
    expect(result).toBeDefined();
  });
});
```

## Running Tests

### Run Your New Test

```bash
# Run specific test file
npm test -- tests/unit/layer-a-analysis/my-feature.test.js

# Run with verbose output
npm test -- --reporter=verbose tests/unit/layer-a-analysis/my-feature.test.js

# Run in watch mode
npm test -- --watch tests/unit/layer-a-analysis/my-feature.test.js
```

### Debugging

```bash
# Debug with console output
DEBUG=true npm test -- tests/unit/layer-a-analysis/my-feature.test.js

# Debug specific test
npm test -- --grep "should do something"
```

## Test Checklist

Before submitting new tests:

- [ ] Test file created in appropriate directory
- [ ] All tests passing locally
- [ ] Factories used for test data
- [ ] Edge cases covered
- [ ] Error handling tested
- [ ] Contract tests added (if public API)
- [ ] JSDoc comments added
- [ ] No hardcoded values (use factories)
- [ ] No external dependencies (mock if needed)
- [ ] Clean state between tests (use beforeEach)

## Common Patterns

### Testing Tier 1 Analyses

```javascript
describe('Tier 1: My Analysis', () => {
  it('should detect basic patterns', () => {
    const systemMap = ScenarioBuilder.hotspot(10);
    
    const result = analyze(systemMap);
    
    expect(result.total).toBeGreaterThan(0);
  });
});
```

### Testing Tier 2 Analyses

```javascript
describe('Tier 2: My Cycle Analysis', () => {
  it('should classify cycles correctly', () => {
    const systemMap = ScenarioBuilder.importCycles([
      ['a.js', 'b.js', 'c.js', 'a.js']
    ]);
    
    const result = classifyCycles(systemMap);
    
    expect(result[0].category).toBe('REQUIRES_REVIEW');
  });
});
```

### Testing Tier 3 Detectors

```javascript
describe('Tier 3: My Detector', () => {
  it('should return findings with severity', async () => {
    const scenario = DetectorTestFactory.createScenario('complex');
    
    const detector = new MyDetector();
    const findings = await detector.detect(scenario.systemMap);
    
    for (const finding of findings) {
      expect(finding).toHaveProperty('severity');
      expect(['low', 'medium', 'high', 'critical']).toContain(finding.severity);
    }
  });
});
```

### Testing Extractors

```javascript
describe('My Extractor', () => {
  it('should extract functions from code', async () => {
    const code = `
      export function test() { return 1; }
      function helper() { return 2; }
    `;
    
    const result = await extract(code);
    
    expect(result.functions).toHaveLength(2);
    expect(result.functions[0].name).toBe('test');
  });
});
```

## Tips

1. **Start with factories** - Use existing factories before creating new ones
2. **Test behavior, not implementation** - Focus on what, not how
3. **One assertion per test** - Keep tests focused
4. **Use descriptive names** - Test names should explain the scenario
5. **Clean up state** - Use `beforeEach` to reset state
6. **Mock external deps** - Don't test external systems
7. **Document with JSDoc** - Explain what the test covers

## Troubleshooting

### Test Timeouts

```javascript
// Increase timeout for slow tests
it('should process large files', { timeout: 10000 }, async () => {
  // Test code
});
```

### Flaky Tests

```javascript
// Use retries for flaky tests
it('should be stable', { retry: 3 }, async () => {
  // Test code
});
```

### Module Resolution

```javascript
// If imports fail, use relative paths
import { myModule } from '../../../src/layer-a-static/my-module.js';
```
