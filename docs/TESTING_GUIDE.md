# Testing Guide - OmnySys v0.7.1

**Última actualización**: 2026-02-09
**Coverage estimado**: ~20%
**Total test files**: 33 archivos
**Total test cases**: 350+ casos

---

## 🎯 Visión General

OmnySys tiene un sistema de tests distribuido en múltiples ubicaciones, reflejando la evolución del proyecto. Esta guía documenta toda la estructura de testing, gaps críticos, y cómo ejecutar/crear tests.

---

## 📊 Estado Actual

### Coverage Summary

| Componente | Tests | Coverage | Prioridad |
|------------|-------|----------|-----------|
| **Race Detector** | 15+ casos | ~60% | ✅ Good |
| **Derivation Engine** | 12 casos | ~70% | ✅ Good |
| **Tunnel Vision** | 8+ casos | ~50% | 🟡 Medium |
| **Function Analyzer** | 10+ casos | ~40% | 🟡 Medium |
| **File Watcher** | 12+ casos | ~30% | 🟡 Medium |
| **Batch Processor** | 8+ casos | ~40% | 🟡 Medium |
| **Static Extractors** | 20+ casos | ~25% | 🔴 Low |
| **Orchestrator** | 0 casos | 0% | 🔴 Critical Gap |
| **MCP Tools** | 0 casos | 0% | 🔴 Critical Gap |
| **Graph Algorithms** | 0 casos | 0% | 🔴 Critical Gap |
| **Parser** | 0 casos | 0% | 🔴 Critical Gap |
| **LLM Analyzer** | 0 casos | 0% | 🔴 Critical Gap |
| **Shadow Registry** | 0 casos | 0% | 🔴 Critical Gap |
| **Cache Manager** | 0 casos | 0% | 🔴 Critical Gap |

---

## 📁 Estructura de Tests

### 1. tests/ (Nuevos - Jest)

**Ubicación**: `tests/`
**Framework**: Jest (configurado en package.json)
**Estilo**: BDD (Behavior-Driven Development)

```
tests/
├── unit/                           # Tests unitarios
│   ├── config.test.js              # Config paths/limits
│   └── architecture-utils.test.js  # Pattern detection utils
│
├── integration/                    # Tests de integración
│   └── smoke.test.js               # Smoke test básico
│
└── smoke-test.js                   # Smoke test standalone
```

**Ejecutar**:
```bash
# Todos los tests
npm test

# Solo unitarios
npm run test:unit

# Solo integración
npm run test:integration
```

**Ejemplo de test**:
```javascript
// tests/unit/config.test.js
import { describe, it, expect } from '@jest/globals';
import { PATHS } from '../../src/config/paths.js';

describe('Config Paths', () => {
  it('should export all required paths', () => {
    expect(PATHS.OUTPUT_DIR).toBeDefined();
    expect(PATHS.CACHE_DIR).toBeDefined();
  });
});
```

---

### 2. src/__tests__/ (Co-localizados - Jest)

**Ubicación**: Junto a archivos fuente
**Framework**: Jest
**Estilo**: Co-located tests (tests cerca del código)

```
src/
├── core/
│   └── __tests__/
│       └── tunnel-vision-detector.test.js
│
├── layer-a-static/
│   ├── race-detector/
│   │   └── __tests__/
│   │       └── race-detector.test.js
│   └── module-system/
│       └── __tests__/
│           └── utils.test.js
│
└── shared/
    ├── analysis/
    │   └── __tests__/
    │       └── function-analyzer.test.js
    └── __tests__/
        └── derivation-engine.test.js
```

**Ejecutar**:
```bash
# Ejecuta automáticamente con npm test
npm test
```

**Ejemplo de test**:
```javascript
// src/shared/__tests__/derivation-engine.test.js
import { describe, it, expect } from '@jest/globals';
import { DerivationRules } from '../derivation-engine.js';

describe('DerivationRules', () => {
  describe('moleculeArchetype', () => {
    it('should detect network-hub from fragile-network atoms', () => {
      const atoms = [
        { archetype: 'fragile-network' },
        { archetype: 'fragile-network' }
      ];
      const result = DerivationRules.moleculeArchetype(atoms);
      expect(result).toBe('network-hub');
    });

    it('should detect internal-module when no atoms exported', () => {
      const atoms = [
        { isExported: false },
        { isExported: false }
      ];
      const result = DerivationRules.moleculeArchetype(atoms);
      expect(result).toBe('internal-module');
    });
  });
});
```

---

### 3. test/ (Legacy - Custom Runner)

**Ubicación**: `test/`
**Framework**: Custom test runner
**Estilo**: Manual assertions

```
test/
├── batch-processor/
│   └── batch-processor.test.js     # Batch processing tests
├── detectors/
│   └── broken-connections.test.js  # Connection validation
├── extractors/
│   ├── advanced-extractors.test.js # Advanced metadata
│   └── static-extractors.test.js   # Static analysis
├── file-watcher/
│   └── file-watcher.test.js        # File watching logic
└── websocket/
    └── websocket.test.js           # WebSocket server
```

**Ejecutar**:
```bash
# Ejecutar archivo específico
node test/batch-processor/batch-processor.test.js
```

**Ejemplo de test**:
```javascript
// test/batch-processor/batch-processor.test.js
import assert from 'assert';
import { BatchProcessor } from '../../src/core/batch-processor/index.js';

async function testBatchProcessor() {
  const processor = new BatchProcessor();
  const result = await processor.process(['file1.js', 'file2.js']);

  assert(result.success, 'Should process successfully');
  assert.equal(result.processed, 2, 'Should process 2 files');
}

testBatchProcessor().then(() => {
  console.log('✅ Batch processor tests passed');
}).catch(err => {
  console.error('❌ Tests failed:', err);
  process.exit(1);
});
```

---

### 4. scripts/ (Validation Scripts)

**Ubicación**: `scripts/`
**Tipo**: Standalone validation scripts
**Propósito**: Validación end-to-end del sistema

```
scripts/
├── validate-full.js                # Meta-validator completo
└── cleanup-ghosts.js               # Limpieza y validación
```

**Ejecutar**:
```bash
# Validar proyecto completo
node scripts/validate-full.js .

# Con auto-fix
node scripts/validate-full.js . --auto-fix

# Output JSON
node scripts/validate-full.js . --json

# Guardar reporte
node scripts/validate-full.js . --save --verbose
```

**Ejemplo de uso**:
```bash
$ node scripts/validate-full.js .

🔍 OmnySys Meta-Validator v0.7.1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ CAPA 1: Source Validation (100%)
   ✅ File existence: 431/431 files found
   ✅ Export validation: 968/968 exports valid
   ✅ Import resolution: 487/487 imports resolved

⚠️  CAPA 2: Derivation Validation (0%)
   ⏳ Esperando formato molecular completo

✅ CAPA 3: Semantic Validation (80%)
   ✅ Data flow coherence: 85%
   ⚠️  Some unused inputs detected

⏳ CAPA 4: Cross-Metadata (Pendiente)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Score: 60% (3/4 capas parcial/completo)
```

---

### 5. test-cases/ (Scenarios de prueba)

**Ubicación**: `test-cases/`
**Tipo**: Real-world test scenarios
**Propósito**: Testing con código real

```
test-cases/
├── scenario-7-forgotten-test/
│   └── src/
│       └── Calculator.test.js      # Test olvidado (scenario)
└── scenario-new-extractors/
    └── Button.test.js              # Test de extractors
```

**Uso**:
```bash
# Analizar scenario
npm run analyze -- test-cases/scenario-7-forgotten-test
```

---

## 🔴 Critical Gaps (Sin Tests)

### 1. Orchestrator (CRITICAL)

**Archivo**: `src/core/orchestrator.js`
**Líneas**: ~300
**Complejidad**: Alta
**Uso**: Core del sistema

**Por qué es crítico**:
- Maneja queue de análisis
- Worker que procesa archivos
- Invalidación de caché
- Error handling de todo el sistema

**Tests necesarios**:
```javascript
describe('Orchestrator', () => {
  it('should queue files with correct priority');
  it('should process queue in order');
  it('should invalidate cache on file change');
  it('should handle worker errors gracefully');
  it('should respect max concurrent workers');
});
```

---

### 2. MCP Tools (15 tools - CRITICAL)

**Archivos**: `src/layer-c-memory/mcp/tools/*.js`
**Total**: 14 tools sin tests
**Complejidad**: Media-Alta
**Uso**: API pública para Claude/OpenCode

**Por qué es crítico**:
- API pública del sistema
- Breaking changes afectan usuarios
- Lógica compleja (impact maps, risk assessment)

**Tests necesarios**:
```javascript
describe('get_impact_map', () => {
  it('should return all direct dependents');
  it('should calculate transitive dependencies');
  it('should compute risk levels correctly');
});

describe('analyze_change', () => {
  it('should detect breaking changes');
  it('should identify affected call sites');
});

describe('get_tunnel_vision_stats', () => {
  it('should calculate statistics correctly');
  it('should detect patterns');
});
```

---

### 3. Graph Algorithms (CRITICAL)

**Archivos**:
- `src/layer-a-static/graph-algorithms/impact-analyzer.js`
- `src/layer-a-static/graph-algorithms/chain-builder.js`

**Por qué es crítico**:
- Lógica central de análisis de impacto
- Algoritmos complejos (DFS, transitive closure)
- Bugs causan resultados incorrectos

**Tests necesarios**:
```javascript
describe('ImpactAnalyzer', () => {
  it('should find all direct dependents');
  it('should calculate transitive dependencies');
  it('should detect circular dependencies');
  it('should handle disconnected components');
});

describe('ChainBuilder', () => {
  it('should build call chains correctly');
  it('should detect cycles');
  it('should limit depth correctly');
});
```

---

### 4. Parser (CRITICAL)

**Archivos**: `src/layer-a-static/parser.js`
**Por qué es crítico**:
- Parsing de JavaScript/TypeScript
- Extracción de funciones del AST
- Bugs causan análisis incorrecto

**Tests necesarios**:
```javascript
describe('Parser', () => {
  it('should parse JavaScript correctly');
  it('should parse TypeScript correctly');
  it('should handle JSX');
  it('should extract all functions');
  it('should handle edge cases (IIFE, arrow functions)');
});
```

---

### 5. LLM Analyzer (MEDIUM)

**Archivos**:
- `src/layer-b-semantic/llm-analyzer/index.js`
- `src/layer-b-semantic/llm-analyzer/analysis-decider.js`

**Por qué es importante**:
- Integración con LLM (Ollama)
- Confidence-based bypass (90% de casos)
- Prompt building complejo

**Tests necesarios**:
```javascript
describe('AnalysisDecider', () => {
  it('should bypass LLM when confidence >= 0.8');
  it('should calculate confidence correctly');
  it('should use LLM when needed');
});

describe('PromptBuilder', () => {
  it('should build prompts with metadata');
  it('should select correct archetype template');
});
```

---

### 6. Shadow Registry (MEDIUM)

**Archivos**: `src/layer-c-memory/shadow-registry/*.js`
**Por qué es importante**:
- Sistema nuevo (v0.7.1)
- Preservación de linaje
- DNA matching complejo

**Tests necesarios**:
```javascript
describe('ShadowRegistry', () => {
  it('should create shadow on delete');
  it('should find similar by DNA (>85%)');
  it('should track lineage correctly');
  it('should calculate vibration scores');
});
```

---

### 7. Cache Manager (MEDIUM)

**Archivos**: `src/core/cache/*.js`
**Por qué es importante**:
- Performance crítica
- Invalidación compleja
- Bugs causan datos stale

**Tests necesarios**:
```javascript
describe('CacheManager', () => {
  it('should cache atoms correctly');
  it('should invalidate on file change');
  it('should handle cache miss');
  it('should respect TTL');
});
```

---

## ✅ Tests Existentes (Bien Cubiertos)

### 1. Race Detector (60% coverage)

**Archivo**: `src/layer-a-static/race-detector/__tests__/race-detector.test.js`
**Tests**: 15+ casos
**Estado**: ✅ Good

**Cobertura**:
```javascript
describe('RaceDetectionPipeline', () => {
  // Lock detection
  it('should detect mutex locks');
  it('should detect navigator.locks');
  it('should detect Atomics operations');

  // Atomic operations
  it('should detect atomic DB operations');
  it('should detect atomic counters');

  // Transactions
  it('should detect Prisma transactions');
  it('should detect MongoDB transactions');
  it('should detect SQL transactions');

  // Async queues
  it('should detect p-queue');
  it('should detect Bull queues');
  it('should detect worker threads');

  // Closures
  it('should find captured variables');
  it('should detect closure races');

  // Mitigation
  it('should detect full mitigation');
  it('should detect partial mitigation');
});
```

---

### 2. Derivation Engine (70% coverage)

**Archivo**: `src/shared/__tests__/derivation-engine.test.js`
**Tests**: 12 casos
**Estado**: ✅ Good

**Cobertura**:
```javascript
describe('DerivationRules', () => {
  // Archetype derivation
  it('should detect network-hub from fragile-network atoms');
  it('should detect internal-module when no atoms exported');
  it('should detect god-module from god-function atoms');

  // Complexity
  it('should sum complexity of all atoms');
  it('should calculate average complexity');

  // Risk
  it('should return max severity from atoms');
  it('should calculate risk score');

  // Side effects
  it('should detect if any atom has side effects');
  it('should aggregate side effect types');

  // Cache
  it('should cache derivation results');
  it('should invalidate cache on atom change');
  it('should recompute on cache miss');
});
```

---

## 📝 Cómo Escribir Tests

### Template: Test Unitario (Jest)

```javascript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MyClass } from '../my-module.js';

describe('MyClass', () => {
  let instance;

  beforeEach(() => {
    instance = new MyClass();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('myMethod', () => {
    it('should return expected value', () => {
      const result = instance.myMethod('input');
      expect(result).toBe('expected');
    });

    it('should throw on invalid input', () => {
      expect(() => instance.myMethod(null)).toThrow();
    });

    it('should handle edge cases', () => {
      expect(instance.myMethod('')).toBe('');
      expect(instance.myMethod(undefined)).toBe(null);
    });
  });
});
```

### Template: Test de Integración

```javascript
import { describe, it, expect } from '@jest/globals';
import { Orchestrator } from '../../src/core/orchestrator.js';
import { FileWatcher } from '../../src/core/file-watcher/index.js';

describe('Orchestrator Integration', () => {
  it('should process file change end-to-end', async () => {
    const orchestrator = new Orchestrator();
    const watcher = new FileWatcher();

    // Setup
    await orchestrator.start();

    // Trigger change
    const result = await orchestrator.queueAnalysis('test.js', 'CRITICAL');

    // Verify
    expect(result.success).toBe(true);
    expect(result.analyzed).toBe(true);

    // Cleanup
    await orchestrator.stop();
  });
});
```

### Template: Test Legacy (Custom Runner)

```javascript
import assert from 'assert';
import { MyClass } from '../src/my-class.js';

async function testMyClass() {
  const instance = new MyClass();

  // Test 1
  const result1 = await instance.method1();
  assert(result1, 'Should return truthy value');

  // Test 2
  try {
    await instance.method2(null);
    assert.fail('Should throw on null input');
  } catch (err) {
    assert(err.message.includes('null'), 'Should throw correct error');
  }

  console.log('✅ All tests passed');
}

testMyClass().catch(err => {
  console.error('❌ Tests failed:', err);
  process.exit(1);
});
```

---

## 🎯 Roadmap de Testing

### v0.7.2 (Short-term)
- ✅ Tests para Shadow Registry (20+ casos)
- ✅ Tests para Data Flow v2 (30+ casos)
- ✅ Tests para Connection Enricher (15+ casos)
- Target: 30% coverage

### v0.8.0 (Mid-term)
- ✅ Tests para Orchestrator (25+ casos)
- ✅ Tests para 14 MCP Tools (100+ casos)
- ✅ Tests para Graph Algorithms (40+ casos)
- Target: 50% coverage

### v0.9.0 (Long-term)
- ✅ Tests para Parser (50+ casos)
- ✅ Tests para LLM Analyzer (30+ casos)
- ✅ Tests para Cache Manager (25+ casos)
- ✅ E2E tests completos (20+ scenarios)
- Target: 80% coverage

---

## 🚀 Ejecutar Tests

### Todos los Tests

```bash
# NPM scripts
npm test                # Todos (Jest)
npm run test:unit       # Solo unitarios
npm run test:integration # Solo integración

# Smoke test
npm run smoke
```

### Tests Específicos

```bash
# Jest con pattern
npx jest race-detector

# Legacy test específico
node test/batch-processor/batch-processor.test.js

# Validation script
node scripts/validate-full.js .
```

### Con Coverage

```bash
# Jest con coverage (requiere configuración)
npx jest --coverage

# Output: coverage/lcov-report/index.html
```

### Watch Mode

```bash
# Jest watch
npx jest --watch

# Re-run on file change
```

---

## 📚 Referencias

- **Jest Docs**: https://jestjs.io/
- **Test Structure**: Ver archivos en `tests/`, `src/__tests__/`
- **Validation**: `scripts/validate-full.js`
- **Coverage Report**: Run `npx jest --coverage`

---

**Última actualización**: 2026-02-09
**Versión del documento**: 1.0.0
