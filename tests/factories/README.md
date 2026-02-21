# Factories Architecture

## Goals

- Keep factories modular and easy to navigate.
- Avoid monolithic files that are hard to maintain.
- Preserve backward compatibility through stable entrypoints.
- Follow SSOT (Single Source of Truth) principle.
- **Use real implementations instead of mocks** (NEW)

## 🆕 Real Factories (NEW - Replaces Mocks)

The `real/` directory contains **Real Factories** that create actual files and projects instead of mocks.

```
tests/factories/
├── real/                          # Real Factories (NO MOCKS)
│   ├── filesystem.factory.js      # Creates real files/directories
│   ├── project.factory.js         # Creates real projects
│   ├── index.js                   # Public API
│   └── MIGRATION_GUIDE.md         # How to migrate from mocks
│
├── test-suite-generator/          # Meta-Factory for test generation
│   ├── contracts.js               # Reusable contract tests (SSOT)
│   ├── core.js                    # Test suite generator logic
│   ├── index.js                   # Public API
│   └── test/
│       └── meta-factory.validation.test.js
│
├── extractor-test.factory.js      # Data factory (legacy pattern)
├── graph-test.factory.js          # Data factory
├── ...                            # Other data factories
```

### Why Real Factories?

| Aspect | Mocks (OLD) | Real Factories (NEW) |
|--------|-------------|---------------------|
| **Fragility** | High - breaks with implementation changes | Low - tests behavior, not internals |
| **Confidence** | Low - mocks may not match reality | High - tests real system |
| **Maintainability** | Hard - mocks need updates | Easy - just use the system |
| **Debugging** | Hard - mocks hide real issues | Easy - real errors surface |

### Quick Start

```javascript
// ❌ OLD: Mock-based test (fragile)
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('fake')
}));

// ✅ NEW: Real factory test (robust)
import { withSandbox } from '#test-factories/real/index.js';

await withSandbox({ 'test.js': 'real content' }, async (sandbox) => {
  const content = await sandbox.readFile('test.js');
  expect(content).toBe('real content'); // Real filesystem
});
```

### Available Real Factories

- **FileSystemFactory** - Creates real files/directories in temp folder
- **ProjectFactory** - Creates complete projects with templates
- **createSandbox** - Quick helper for simple cases
- **withSandbox** - Auto-cleanup version
- **createTestProject** - Creates projects from templates
- **withProject** - Auto-cleanup for projects

### Migration

See `real/MIGRATION_GUIDE.md` for detailed migration instructions.

## 🆕 Meta-Factory (NEW)

The `test-suite-generator/` is a **Meta-Factory** that generates standardized test suites automatically.

```
tests/factories/
├── test-suite-generator/          # Meta-Factory for test generation
│   ├── contracts.js               # Reusable contract tests (SSOT)
│   ├── core.js                    # Test suite generator logic
│   ├── index.js                   # Public API
│   └── test/
│       └── meta-factory.validation.test.js
│
├── extractor-test.factory.js      # Data factory (legacy pattern)
├── graph-test.factory.js          # Data factory
├── ...                            # Other data factories
```

### Data Factories vs Meta-Factory

| Type | Purpose | Example |
|------|---------|---------|
| **Data Factory** | Creates test data (mocks, builders) | `SystemMapBuilder.create().withFile().build()` |
| **Meta-Factory** | Generates test suites (contracts) | `createAnalysisTestSuite({ module, analyzeFn })` |

### Usage

```javascript
// Data Factory - Creates test data
import { SystemMapBuilder } from '#test-factories/graph-test.factory.js';
const systemMap = SystemMapBuilder.create().withFile('test.js').build();

// Meta-Factory - Generates test suite with contracts
import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
createAnalysisTestSuite({
  module: 'analyses/tier2/coupling',
  exports: { analyzeCoupling },
  analyzeFn: analyzeCoupling,
  expectedFields: { couplings: 'array', total: 'number' },
  createMockInput: () => systemMap
});
```

See [Meta-Factory Guide](../META_FACTORY_GUIDE.md) for complete documentation.

## Conventions

- One public entrypoint per factory:
  - Example: `extractor-test.factory.js`
- Internal modules by domain:
  - Example: `extractor-test/core-builders.js`
  - Example: `extractor-test/extraction-suite.js`
  - Example: `extractor-test/communication-suite.js`
- Entry points must only:
  - Re-export named APIs from internal modules.
  - Export a backward-compatible default object.

## Size Guardrail

- Preferred max per file: `<= 350` lines.
- Hard limit before mandatory split: `> 500` lines.

## Current State

- Top-level `*.factory.js` files are now thin entrypoints.
- Internal implementations live in `tests/factories/<factory-name>/`.
- Public imports remain stable (tests keep importing from `tests/factories/*.factory.js`).
- Meta-Factory is fully modular with 3 files (< 350 lines each).

## EntryPoint Pattern

- Example:
  - `tests/factories/pipeline-test.factory.js` (entrypoint)
  - `tests/factories/pipeline-test/builders.js`
  - `tests/factories/pipeline-test/helpers.js`

- Meta-Factory Example:
  - `tests/factories/test-suite-generator/index.js` (entrypoint)
  - `tests/factories/test-suite-generator/contracts.js`
  - `tests/factories/test-suite-generator/core.js`

## Domain Map

### Data Factories (Test Data)
- `analysis.factory.js` -> `analysis/`
- `comprehensive-extractor-test.factory.js` -> `comprehensive-extractor-test/`
- `css-in-js-test.factory.js` -> `css-in-js-test/`
- `data-flow-test.factory.js` -> `data-flow-test/`
- `detector-test.factory.js` -> `detector-test/`
- `extractor.factory.js` -> `extractor/`
- `extractor-test.factory.js` -> `extractor-test/`
- `graph-test.factory.js` -> `graph-test/`
- `module-system-test.factory.js` -> `module-system-test/`
- `parser-test.factory.js` -> `parser-test/`
- `pattern-detection-test.factory.js` -> `pattern-detection-test/`
- `phases-test.factory.js` -> `phases-test/`
- `pipeline-test.factory.js` -> `pipeline-test/`
- `query-test.factory.js` -> `query-test/`
- `race-detector-test.factory.js` -> `race-detector-test/`
- `root-infrastructure-test.factory.js` -> `root-infrastructure-test/`
- `state-management-test.factory.js` -> `state-management-test/`
- `static-extractor-test.factory.js` -> `static-extractor-test/`
- `tier3-analysis.factory.js` -> `tier3-analysis/`

### Meta-Factory (Test Generation)
- `test-suite-generator/index.js` -> Entry point
- `test-suite-generator/contracts.js` -> Contract definitions (SSOT)
- `test-suite-generator/core.js` -> Suite generator logic

## Migration Rule

- Refactor in small batches.
- Run focused suites that consume the factory before commit.
- Do not break existing import paths from tests.
- When adding new systems, prefer modular structure from the start.
