# Contract Testing Guide

This guide covers contract testing patterns used in the OmnySystem test suite.

## What is Contract Testing?

Contract testing verifies that components adhere to agreed-upon interfaces and behaviors. Unlike unit tests that check internal logic, contract tests ensure:

1. **Interface Compatibility** - Components can communicate
2. **Data Structure Consistency** - Returns follow expected formats
3. **Error Handling** - Failures are handled gracefully
4. **Behavioral Guarantees** - Side effects occur as expected

## Contract Test Types

### 1. Structure Contracts

Verify data structures have required fields.

```javascript
// contracts/layer-a-analysis.contract.test.js
describe('Structure Contract', () => {
  it('MUST return an object', async () => {
    const result = await analyzeFunction(validInput);
    expect(result).toBeTypeOf('object');
  });

  it('MUST have required fields', async () => {
    const result = await analyzeFunction(validInput);
    expect(result).toHaveProperty('files');
    expect(result).toHaveProperty('metadata');
    expect(result).toHaveProperty('dependencies');
  });

  it('MUST have correct field types', async () => {
    const result = await analyzeFunction(validInput);
    expect(typeof result.metadata.totalFiles).toBe('number');
    expect(Array.isArray(result.dependencies)).toBe(true);
    expect(typeof result.files).toBe('object');
  });
});
```

### 2. Extractor Contracts

Verify all extractors return consistent structures.

```javascript
// contracts/layer-a-extractor.contract.test.js
describe('Extractor Return Structure', () => {
  const requiredFields = {
    filePath: 'string',
    fileName: 'string',
    imports: 'array',
    exports: 'array',
    definitions: 'array'
  };

  it.each(extractors)('%s MUST return required fields', async (name, extractor) => {
    const result = await extractor.parse('test.js', '');
    
    for (const [field, type] of Object.entries(requiredFields)) {
      expect(result).toHaveProperty(field);
      if (type === 'array') {
        expect(Array.isArray(result[field])).toBe(true);
      } else {
        expect(typeof result[field]).toBe(type);
      }
    }
  });
});
```

### 3. Detector Contracts

Verify detectors follow the same interface.

```javascript
// contracts/pattern-detection.contract.test.js
describe('Detector Interface Contract', () => {
  it('MUST have detect method', () => {
    const detector = new HotspotDetector();
    expect(typeof detector.detect).toBe('function');
  });

  it('detect() MUST return array of findings', async () => {
    const detector = new HotspotDetector();
    const results = await detector.detect(systemMap);
    
    expect(Array.isArray(results)).toBe(true);
  });

  it('findings MUST have required fields', async () => {
    const detector = new HotspotDetector();
    const results = await detector.detect(systemMap);
    
    for (const finding of results) {
      expect(finding).toHaveProperty('id');
      expect(finding).toHaveProperty('type');
      expect(finding).toHaveProperty('severity');
      expect(['low', 'medium', 'high', 'critical']).toContain(finding.severity);
    }
  });
});
```

### 4. Builder Pattern Contracts

Verify builders follow consistent patterns.

```javascript
describe('Builder Pattern Contract', () => {
  it('MUST have static create() method', () => {
    expect(typeof GraphBuilder.create).toBe('function');
  });

  it('chainable methods MUST return this', () => {
    const builder = GraphBuilder.create();
    expect(builder.withFile('test.js')).toBe(builder);
    expect(builder.withDependency('a.js', 'b.js')).toBe(builder);
  });

  it('MUST have build() method', () => {
    const builder = GraphBuilder.create();
    expect(typeof builder.build).toBe('function');
  });

  it('build() MUST return defined object', () => {
    const result = GraphBuilder.create().build();
    expect(result).toBeDefined();
  });
});
```

### 5. Error Handling Contracts

Verify consistent error handling.

```javascript
describe('Error Handling Contract', () => {
  it('MUST handle null input gracefully', async () => {
    const result = await analyzer.analyze(null);
    expect(result).toBeDefined();
    // Should not throw, return safe default
  });

  it('MUST handle undefined input gracefully', async () => {
    const result = await analyzer.analyze(undefined);
    expect(result).toBeDefined();
  });

  it('errors MUST have required fields', async () => {
    try {
      await analyzer.analyze(invalidInput);
    } catch (error) {
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('code');
      expect(typeof error.message).toBe('string');
      expect(typeof error.code).toBe('string');
    }
  });
});
```

### 6. Async Operation Contracts

Verify async operations behave consistently.

```javascript
describe('Async Operation Contract', () => {
  it('async methods MUST return Promises', () => {
    const result = analyzer.analyze(data);
    expect(result).toBeInstanceOf(Promise);
  });

  it('MUST resolve with expected structure', async () => {
    const result = await analyzer.analyze(data);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('data');
  });

  it('MUST reject with Error on failure', async () => {
    await expect(analyzer.analyze(invalidData))
      .rejects
      .toBeInstanceOf(Error);
  });
});
```

## Writing Contract Tests

### Step 1: Identify the Contract

Define what the component promises:

```javascript
// Component: Extractor
// Contract: Given file content, returns structured data
const contract = {
  input: 'file content',
  output: {
    filePath: string,
    imports: array,
    exports: array,
    // ...
  }
};
```

### Step 2: Test Happy Path

```javascript
it('MUST return expected structure on valid input', async () => {
  const result = await extractor.parse('test.js', validContent);
  
  expect(result).toMatchObject({
    filePath: expect.any(String),
    imports: expect.any(Array),
    exports: expect.any(Array)
  });
});
```

### Step 3: Test Edge Cases

```javascript
it('MUST handle empty content', async () => {
  const result = await extractor.parse('test.js', '');
  expect(result.imports).toEqual([]);
  expect(result.exports).toEqual([]);
});

it('MUST handle invalid content gracefully', async () => {
  const result = await extractor.parse('test.js', 'invalid !!!');
  expect(result).toBeDefined();
  // Should not throw
});
```

### Step 4: Test Error Cases

```javascript
it('MUST throw on null filePath', async () => {
  await expect(extractor.parse(null, content))
    .rejects
    .toThrow();
});
```

## Contract Test Suite Example

```javascript
// contracts/module-system.contract.test.js
import { describe, it, expect } from 'vitest';
import { SystemMapBuilder } from '../factories/graph-test.factory.js';

describe('Module System Contract', () => {
  describe('File Node Structure', () => {
    it('MUST have path property', () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/test.js')
        .build();
      
      expect(systemMap.files['src/test.js']).toHaveProperty('path');
    });

    it('MUST have imports array', () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/test.js')
        .build();
      
      expect(Array.isArray(systemMap.files['src/test.js'].imports)).toBe(true);
    });

    it('MUST have exports array', () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/test.js')
        .build();
      
      expect(Array.isArray(systemMap.files['src/test.js'].exports)).toBe(true);
    });
  });

  describe('Dependency Structure', () => {
    it('dependencies MUST have from and to properties', () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/a.js')
        .withFile('src/b.js')
        .withDependency('src/a.js', 'src/b.js')
        .build();
      
      for (const dep of systemMap.dependencies) {
        expect(dep).toHaveProperty('from');
        expect(dep).toHaveProperty('to');
        expect(typeof dep.from).toBe('string');
        expect(typeof dep.to).toBe('string');
      }
    });
  });

  describe('Metadata Structure', () => {
    it('MUST have totalFiles count', () => {
      const systemMap = SystemMapBuilder.create()
        .withFiles(['src/a.js', 'src/b.js', 'src/c.js'])
        .build();
      
      expect(systemMap.metadata.totalFiles).toBe(3);
    });

    it('MUST have analysis timestamp', () => {
      const systemMap = SystemMapBuilder.create().build();
      
      expect(systemMap.metadata).toHaveProperty('analyzedAt');
    });
  });
});
```

## Factory-Based Contract Testing

Use factories to create consistent test data:

```javascript
import { createAnalysisStructureSuite } from '../factories/analysis.factory.js';

// Creates structure contract tests automatically
createAnalysisStructureSuite('Hotspot Analysis', analyzeHotspots, mockSystemMap);

// Generates:
// - MUST return an object
// - MUST have a total/count field  
// - MUST NOT throw on empty/valid input
```

## Cross-System Contracts

Test interactions between systems:

```javascript
describe('Cross-System Contract: Graph → Detector', () => {
  it('detector MUST accept graph output', async () => {
    // Graph output
    const graph = GraphBuilder.create()
      .withFile('src/a.js')
      .buildSystemMap();
    
    // Detector should accept it
    const detector = new HotspotDetector();
    const results = await detector.detect(graph);
    
    expect(Array.isArray(results)).toBe(true);
  });
});

describe('Cross-System Contract: Extractor → Parser', () => {
  it('parser MUST handle extractor output', async () => {
    const extracted = await extractor.parse('test.js', content);
    const parsed = await parser.process(extracted);
    
    expect(parsed).toBeDefined();
    expect(parsed).toHaveProperty('functions');
  });
});
```

## Contract Testing Checklist

- [ ] All public methods tested
- [ ] Return structures verified
- [ ] Error handling covered
- [ ] Edge cases handled
- [ ] Null/undefined inputs tested
- [ ] Cross-system interactions verified
- [ ] Async behavior validated
- [ ] Side effects documented

## Common Contract Violations

### Missing Required Fields

```javascript
// ❌ Violation
function analyze() {
  return { files: {} }; // Missing metadata
}

// ✅ Correct
function analyze() {
  return { 
    files: {}, 
    metadata: { totalFiles: 0 } 
  };
}
```

### Incorrect Types

```javascript
// ❌ Violation
function getResults() {
  return { total: '5' }; // String instead of number
}

// ✅ Correct
function getResults() {
  return { total: 5 };
}
```

### Inconsistent Error Handling

```javascript
// ❌ Violation
function process(data) {
  if (!data) return null; // Returns null
  if (!data.files) throw new Error('No files'); // Throws
  // Inconsistent!
}

// ✅ Correct
function process(data) {
  if (!data || !data.files) {
    return { success: false, error: 'Invalid input', data: null };
  }
  return { success: true, data: result };
}
```

## Best Practices

1. **Test contracts first** - Define interfaces before implementation
2. **Use factories** - Ensure consistent test data
3. **Test at boundaries** - Focus on public APIs
4. **Document contracts** - Make expectations explicit
5. **Version contracts** - Track breaking changes
6. **Automate verification** - Run contract tests in CI
