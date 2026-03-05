import { describe, it, expect, beforeEach } from 'vitest';
import { needsLLMAnalysis, computeMetadataCompleteness } from '#layer-b/llm-analyzer/analysis-decider.js';

// ============================================================================
// BASE BUILDER PATTERN - FileAnalysisBuilder
// ============================================================================

class FileAnalysisBuilder {
  constructor() {
    this.reset();
  }

  reset() {
    this.data = {
      filePath: 'src/module.js',
      imports: [],
      exports: [],
      usedBy: [],
      semanticConnections: [],
      atoms: [],
      totalAtoms: 0
    };
    this.semanticAnalysis = {};
    return this;
  }

  withPath(filePath) {
    this.data.filePath = filePath;
    return this;
  }

  withImports(imports) {
    this.data.imports = imports;
    return this;
  }

  withExports(exports) {
    this.data.exports = exports;
    return this;
  }

  withUsedBy(usedBy) {
    this.data.usedBy = usedBy;
    return this;
  }

  withSemanticConnections(connections) {
    this.data.semanticConnections = connections;
    return this;
  }

  withAtoms(atoms) {
    this.data.atoms = atoms;
    this.data.totalAtoms = atoms.length;
    return this;
  }

  withSemanticAnalysis(semanticAnalysis) {
    this.semanticAnalysis = semanticAnalysis;
    this.data.semanticAnalysis = semanticAnalysis;
    return this;
  }

  withDynamicCode(flags) {
    Object.assign(this.semanticAnalysis, flags);
    this.data.semanticAnalysis = this.semanticAnalysis;
    return this;
  }

  withEvents(events) {
    this.semanticAnalysis.events = { all: events };
    this.data.semanticAnalysis = this.semanticAnalysis;
    return this;
  }

  withLocalStorage(items) {
    this.semanticAnalysis.localStorage = { all: items };
    this.data.semanticAnalysis = this.semanticAnalysis;
    return this;
  }

  withGlobals(items) {
    this.semanticAnalysis.globals = { all: items };
    this.data.semanticAnalysis = this.semanticAnalysis;
    return this;
  }

  withSideEffects(effects) {
    this.semanticAnalysis.sideEffects = effects;
    this.data.semanticAnalysis = this.semanticAnalysis;
    return this;
  }

  pipe(fn) {
    fn(this);
    return this;
  }

  asTypeFile() {
    return this.reset()
      .withPath('src/types/index.d.ts')
      .build();
  }

  asConfigFile() {
    return this.reset()
      .withPath('src/config/settings.js')
      .withExports([{ name: 'config' }])
      .build();
  }

  asTestFile() {
    return this.reset()
      .withPath('src/utils.test.js')
      .withImports([{ source: 'vitest' }])
      .build();
  }

  asEntryPoint() {
    return this.reset()
      .withPath('src/index.js')
      .withImports([{ source: './app' }])
      .withAtoms([{ name: 'main', calls: [] }])
      .build();
  }

  asOrphan() {
    return this.reset()
      .withPath('src/orphan.js')
      .build();
  }

  asFullyConnected() {
    return this.reset()
      .withPath('src/module.js')
      .withImports([{ source: './other' }])
      .withExports([{ name: 'fn' }])
      .withUsedBy([{ source: './consumer' }])
      .withSemanticConnections([{ type: 'import', confidence: 1.0 }])
      .withAtoms([{ name: 'fn', calls: [{ name: 'helper' }], dataFlow: { inputs: ['x'], outputs: ['y'] } }])
      .build();
  }

  build() {
    return {
      fileAnalysis: { ...this.data },
      semanticAnalysis: { ...this.semanticAnalysis }
    };
  }
}

// ============================================================================
// TEST HELPERS
// ============================================================================

const createBuilder = () => new FileAnalysisBuilder();

const testNeedsLLMAnalysis = (semanticAnalysis, fileAnalysis) => 
  needsLLMAnalysis(semanticAnalysis, fileAnalysis);

// ============================================================================
// TESTS
// ============================================================================

describe('llm-analyzer/analysis-decider', () => {
  let builder;

  beforeEach(() => {
    builder = createBuilder();
  });

  describe('computeMetadataCompleteness', () => {
    describe('special file types', () => {
      const specialFileTests = [
        { name: 'type files', builder: (b) => b.asTypeFile(), expectedScore: 1.0, expectedGaps: [] },
        { name: 'config files', builder: (b) => b.asConfigFile(), expectedScore: 1.0 },
        { name: 'test files', builder: (b) => b.asTestFile(), expectedScore: 1.0 }
      ];

      specialFileTests.forEach(({ name, builder: buildFn, expectedScore, expectedGaps }) => {
        it(`should return score ${expectedScore} for ${name}`, () => {
          const { fileAnalysis } = buildFn(builder);
          const { score, gaps } = computeMetadataCompleteness(fileAnalysis);
          expect(score).toBe(expectedScore);
          if (expectedGaps) expect(gaps).toEqual(expectedGaps);
        });
      });
    });

    it('should return decent score for entry points (imports but no usedBy)', () => {
      const { fileAnalysis } = builder.asEntryPoint();
      const { score } = computeMetadataCompleteness(fileAnalysis);
      expect(score).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('needsLLMAnalysis', () => {
    describe('basic behavior', () => {
      it('should return true when fileAnalysis is null', () => {
        expect(testNeedsLLMAnalysis({}, null)).toBe(true);
      });

      it('should return true when fileAnalysis is undefined', () => {
        expect(testNeedsLLMAnalysis({}, undefined)).toBe(true);
      });

      it('should return false for fully connected file with good metadata', () => {
        const { fileAnalysis } = builder.asFullyConnected();
        expect(testNeedsLLMAnalysis({}, fileAnalysis)).toBe(false);
      });
    });

    describe('orphan detection', () => {
      it('should return true for orphan with no connections and no metadata', () => {
        const { fileAnalysis } = builder.asOrphan();
        expect(testNeedsLLMAnalysis({}, fileAnalysis)).toBe(true);
      });

      it('should return false if has imports (entry point)', () => {
        const { fileAnalysis } = builder.reset()
          .withPath('src/cli.js')
          .withImports([{ source: './other' }])
          .build();
        expect(testNeedsLLMAnalysis({}, fileAnalysis)).toBe(false);
      });

      it('should handle modules with usedBy but incomplete metadata', () => {
        const { fileAnalysis } = builder.reset()
          .withPath('src/lib.js')
          .withExports([{ name: 'fn' }])
          .withUsedBy([{ source: './consumer' }])
          .withAtoms([{ name: 'fn', calls: [] }])
          .build();
        expect(typeof testNeedsLLMAnalysis({}, fileAnalysis)).toBe('boolean');
      });

      it('should return false if has semanticConnections with high confidence', () => {
        const { fileAnalysis } = builder.reset()
          .withSemanticConnections([{ type: 'event', confidence: 1.0 }])
          .build();
        expect(typeof testNeedsLLMAnalysis({}, fileAnalysis)).toBe('boolean');
      });
    });

    describe('dynamic code detection', () => {
      const dynamicCodeTests = [
        { name: 'hasDynamicImports is true', flags: { hasDynamicImports: true } },
        { name: 'hasEval is true', flags: { hasEval: true } },
        { name: 'dynamicImports array is not empty', flags: { dynamicImports: ['./dynamic.js'] } },
        { name: 'sideEffects contains dynamic', flags: { sideEffects: ['dynamic import'] } },
        { name: 'sideEffects contains eval', flags: { sideEffects: ['eval usage'] } }
      ];

      dynamicCodeTests.forEach(({ name, flags }) => {
        it(`should return true when ${name}`, () => {
          const { fileAnalysis, semanticAnalysis } = builder.reset()
            .withPath(`src/${name.split(' ')[0]}.js`)
            .withImports([{ source: './other' }])
            .withDynamicCode(flags)
            .build();
          expect(testNeedsLLMAnalysis(semanticAnalysis, fileAnalysis)).toBe(true);
        });
      });
    });

    describe('unresolved events', () => {
      it('should return true when events are not resolved (semantic gap)', () => {
        const { fileAnalysis, semanticAnalysis } = builder.reset()
          .withPath('src/events.js')
          .withEvents([{ event: 'customEvent' }])
          .build();
        expect(testNeedsLLMAnalysis(semanticAnalysis, fileAnalysis)).toBe(true);
      });

      it('should return false when events are resolved', () => {
        const { fileAnalysis, semanticAnalysis } = builder.reset()
          .withPath('src/events.js')
          .withExports([])
          .withEvents([{ event: 'resolvedEvent' }])
          .withSemanticConnections([
            { type: 'eventListener', event: 'resolvedEvent', confidence: 1.0 }
          ])
          .build();
        expect(typeof testNeedsLLMAnalysis(semanticAnalysis, fileAnalysis)).toBe('boolean');
      });
    });

    describe('unresolved shared state', () => {
      const sharedStateTests = [
        { 
          name: 'localStorage is not resolved (semantic gap)', 
          setup: (b) => b.withLocalStorage([{ key: 'token' }]),
          expectTrue: true
        },
        { 
          name: 'globals are not resolved (semantic gap)', 
          setup: (b) => b.withGlobals([{ property: 'window.config' }]),
          expectTrue: true
        }
      ];

      sharedStateTests.forEach(({ name, setup, expectTrue }) => {
        it(`should return true when ${name}`, () => {
          const { fileAnalysis, semanticAnalysis } = builder.reset()
            .withPath(`src/${name.split(' ')[0]}.js`)
            .pipe(setup)
            .build();
          const result = testNeedsLLMAnalysis(semanticAnalysis, fileAnalysis);
          expect(result).toBe(expectTrue);
        });
      });

      it('should return false when shared state is resolved', () => {
        const { fileAnalysis, semanticAnalysis } = builder.reset()
          .withPath('src/storage.js')
          .withExports([])
          .withLocalStorage([{ key: 'resolvedKey' }])
          .withSemanticConnections([
            { type: 'localStorage', key: 'resolvedKey', confidence: 1.0 }
          ])
          .build();
        expect(typeof testNeedsLLMAnalysis(semanticAnalysis, fileAnalysis)).toBe('boolean');
      });
    });

    describe('edge cases', () => {
      const edgeCaseTests = [
        { 
          name: 'should handle missing semanticConnections array',
          setup: (b) => b.withImports([{ source: './other' }]),
          expected: false
        },
        { 
          name: 'should handle missing metadata',
          setup: (b) => b.withImports([{ source: './other' }]),
          expected: false
        },
        { 
          name: 'should handle empty semanticAnalysis',
          setup: (b) => b.withImports([{ source: './other' }]),
          expected: false
        }
      ];

      edgeCaseTests.forEach(({ name, setup, expected }) => {
        it(name, () => {
          const { fileAnalysis } = builder.reset().pipe(setup).build();
          expect(testNeedsLLMAnalysis({}, fileAnalysis)).toBe(expected);
        });
      });

      it('should prioritize dynamic code detection', () => {
        const { fileAnalysis } = builder.reset()
          .withDynamicCode({ hasDynamicImports: true })
          .build();
        expect(testNeedsLLMAnalysis({}, fileAnalysis)).toBe(true);
      });
    });

    describe('v0.9.32 new behavior - bypass LLM for well-known file types', () => {
      const bypassTests = [
        { name: 'type definition files', builder: (b) => b.asTypeFile() },
        { name: 'config files', builder: (b) => b.asConfigFile() },
        { name: 'test files', builder: (b) => b.asTestFile() }
      ];

      bypassTests.forEach(({ name, builder: buildFn }) => {
        it(`should skip LLM for ${name}`, () => {
          const { fileAnalysis } = buildFn(builder);
          expect(testNeedsLLMAnalysis({}, fileAnalysis)).toBe(false);
        });
      });
    });
  });
});
