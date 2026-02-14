# 🏗️ ARQUITECTURA DE TESTING - OmnySys

**Versión**: 1.0.0  
**Fecha**: 2026-02-14  
**Estado**: ✅ Oficial / En Implementación  
**Autor**: OmnySys Team

---

## 📋 RESUMEN EJECUTIVO

Esta es la **arquitectura oficial de testing** de OmnySys. Define los estándares, patrones y estructura que TODOS los tests del proyecto deben seguir.

**Objetivo**: Sistema de testing escalable, mantenible y profesional que permita:
- Agregar nuevos lenguajes en minutos, no horas
- CI/CD rápido (paralelo por sistema)
- Detección temprana de regressions
- Onboarding simple para nuevos contribuidores

**Estado Actual**: Migrando desde tests monolíticos a arquitectura por capas.

---

## 🎯 PRINCIPIOS FUNDAMENTALES

### 1. **DRY (Don't Repeat Yourself)**
- Nunca duplicar lógica de tests
- Usar factories y parametrización

### 2. **Contract-First**
- Todo componente expuesto debe cumplir un contrato
- Tests de contrato automáticos

### 3. **Pirámide de Testing**
```
      /\
     /  \     E2E (5%)    - Flujos críticos
    /____\    
   /      \   Integration (15%) - Interacción entre sistemas
  /________\  
 /          \ Unit/Contract (80%) - Lógica individual
/____________\
```

### 4. **Fast Feedback**
- Tests unitarios: < 100ms cada uno
- Suite completa: < 5 minutos
- CI por sistema: Paralelo

### 5. **Determinístico**
- Mismo input = mismo output siempre
- No dependencias externas en unit tests
- Mocks controlados

---

## 🏛️ ESTRUCTURA DE CARPETAS

```
tests/
├── README.md                    # Guía de contribución a tests
├── ARCHITECTURE.md              # Este archivo
│
├── config/
│   ├── vitest.config.js         # Configuración base
│   ├── vitest.unit.config.js    # Tests unitarios
│   ├── vitest.integration.config.js
│   └── vitest.e2e.config.js
│
├── contracts/                   # Tests de contrato (OBLIGATORIOS)
│   ├── README.md
│   ├── layer-a-extractor.contract.test.js
│   ├── layer-a-graph.contract.test.js
│   ├── layer-b-semantic.contract.test.js
│   └── layer-c-mcp.contract.test.js
│
├── fixtures/                    # Datos de prueba compartidos
│   ├── README.md
│   ├── javascript/
│   │   ├── simple-module/
│   │   ├── complex-project/
│   │   └── edge-cases/
│   ├── typescript/
│   ├── python/                  # Futuro
│   └── go/                      # Futuro
│
├── factories/                   # Generadores de tests
│   ├── README.md
│   ├── extractor.factory.js     # Crear tests para extractores
│   ├── graph-algorithm.factory.js
│   └── mcp-tool.factory.js
│
├── unit/                        # Tests unitarios
│   ├── layer-a-core/           # ✅ Completado
│   ├── layer-a-analyses/       # 🔄 Pendiente
│   ├── layer-b-semantic/       # 🔄 Pendiente
│   ├── layer-c-memory/         # 🔄 Pendiente
│   └── shared/                 # Utilidades compartidas
│
├── integration/                 # Tests de integración
│   ├── layer-a-pipeline.test.js
│   ├── layer-b-llm.test.js
│   └── layer-c-mcp.test.js
│
├── e2e/                        # End-to-end
│   ├── scenarios/
│   │   ├── analyze-new-project.test.js
│   │   ├── detect-circular-deps.test.js
│   │   └── mcp-tool-execution.test.js
│   └── helpers/
│       └── project-setup.js
│
└── performance/                # Benchmarks
    ├── parser.benchmark.js
    ├── graph-large-project.benchmark.js
    └── memory-usage.test.js
```

---

## 📐 PATRONES DE TESTING

### Patrón 1: Parametrized Tests (Preferido)

**Cuándo usar**: Múltiples casos similares (lenguajes, extensiones, etc.)

```javascript
// ✅ BIEN: Un test, múltiples lenguajes
describe.each([
  ['JavaScript', 'js', "import { x } from './y'"],
  ['TypeScript', 'ts', "import { x } from './y'"],
  ['JSX',      'jsx', "import React from 'react'"],
])('Parser: %s', (name, ext, code) => {
  
  it('extracts imports', () => {
    const result = parseFile(`test.${ext}`, code);
    expect(result.imports).toHaveLength(1);
  });
  
  it('extracts exports', () => {
    const result = parseFile(`test.${ext}`, code);
    expect(result.exports).toBeDefined();
  });
});

// ❌ MAL: Tests duplicados
it('parses JS imports', () => { ... });
it('parses TS imports', () => { ... });
it('parses JSX imports', () => { ... });
```

---

### Patrón 2: Test Factory

**Cuándo usar**: Crear suite completa de tests para un componente tipo.

```javascript
// tests/factories/extractor.factory.js
export function createExtractorSuite(config) {
  const { name, extensions, parseFunction, fixtures } = config;
  
  return describe(`Extractor: ${name}`, () => {
    
    describe('Contract Compliance', () => {
      it('returns valid FileInfo structure', async () => {
        const result = await parseFunction(fixtures.empty);
        expect(result).toMatchObject({
          filePath: expect.any(String),
          imports: expect.any(Array),
          exports: expect.any(Array),
        });
      });
    });
    
    describe.each(extensions)('Extension: %s', (ext) => {
      it('extracts imports', async () => {
        const result = await parseFunction(fixtures[ext].withImports);
        expect(result.imports.length).toBeGreaterThan(0);
      });
      
      it('extracts exports', async () => {
        const result = await parseFunction(fixtures[ext].withExports);
        expect(result.exports.length).toBeGreaterThan(0);
      });
    });
    
  });
}

// Uso: tests/unit/layer-a/extractors/js-extractor.test.js
import { createExtractorSuite } from '../../factories/extractor.factory.js';
import { parseFile } from '#layer-a/parser/index.js';

createExtractorSuite({
  name: 'JavaScript',
  extensions: ['js', 'mjs', 'cjs'],
  parseFunction: (code) => parseFile('test.js', code),
  fixtures: {
    empty: '',
    js: {
      withImports: "import x from 'y'",
      withExports: "export const x = 1",
    },
  },
});
```

---

### Patrón 3: Contract Tests

**Cuándo usar**: Verificar que todos los componentes de un tipo cumplen el mismo contrato.

```javascript
// tests/contracts/layer-a-extractor.contract.test.js
const EXTRACTORS = [
  { name: 'JavaScript', module: '#layer-a/parser/index.js', ext: 'js' },
  { name: 'TypeScript', module: '#layer-a/parser/index.js', ext: 'ts' },
  // Futuro:
  // { name: 'Python', module: '#layer-a/parser/python.js', ext: 'py' },
  // { name: 'Go', module: '#layer-a/parser/go.js', ext: 'go' },
];

describe.each(EXTRACTORS)('Contract: $name Extractor', async ({ module, ext }) => {
  const { parseFile } = await import(module);
  
  const CONTRACT = {
    input: { filePath: `test.${ext}`, code: "export const x = 1" },
    output: {
      required: ['filePath', 'fileName', 'imports', 'exports', 'definitions'],
      types: {
        filePath: 'string',
        imports: 'array',
        exports: 'array',
        definitions: 'array',
      },
    },
  };
  
  it('MUST return all required fields', () => {
    const result = parseFile(CONTRACT.input.filePath, CONTRACT.input.code);
    
    CONTRACT.output.required.forEach(field => {
      expect(result).toHaveProperty(field);
    });
  });
  
  it('MUST return correct types', () => {
    const result = parseFile(CONTRACT.input.filePath, CONTRACT.input.code);
    
    Object.entries(CONTRACT.output.types).forEach(([field, type]) => {
      if (type === 'array') {
        expect(Array.isArray(result[field])).toBe(true);
      } else {
        expect(typeof result[field]).toBe(type);
      }
    });
  });
});
```

---

### Patrón 4: Snapshot Testing

**Cuándo usar**: Outputs complejos que no cambian frecuentemente.

```javascript
// tests/unit/layer-a/graph/snapshot.test.js
import { buildSystemMap } from '#layer-a/graph/index.js';

describe('Graph Builder Snapshots', () => {
  it('produces consistent output for complex project', () => {
    const project = loadFixture('complex-project');
    const result = buildSystemMap(project.files, project.imports);
    
    // Guarda snapshot en __snapshots__/
    expect(result).toMatchSnapshot();
  });
});
```

---

### Patrón 5: Property-Based Testing

**Cuándo usar**: Generar 100s de casos edge automáticamente.

```javascript
// tests/property/graph.properties.test.js
import { fc } from 'fast-check';
import { detectCycles } from '#layer-a/graph/index.js';

describe('Graph Properties', () => {
  it('never creates cycles in acyclic graphs', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string()), // Archivos aleatorios
        (files) => {
          const acyclicGraph = buildAcyclic(files);
          expect(detectCycles(acyclicGraph)).toHaveLength(0);
        }
      )
    );
  });
});
```

---

## 🔄 ESTRATEGIA DE CI/CD

### Pipeline por Sistema (Paralelo)

```yaml
# .github/workflows/ci.yml
name: CI - Multi-System Parallel

on: [push, pull_request]

jobs:
  # ============================================
  # LAYER A CORE (Crítico - Rápido)
  # ============================================
  layer-a-core:
    name: Layer A Core
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx vitest run tests/unit/layer-a-core --reporter=verbose
      
  # ============================================
  # LAYER A EXTRACTORS (Por lenguaje - Paralelo)
  # ============================================
  layer-a-extractors:
    name: Extractor - ${{ matrix.extractor }}
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        extractor: [javascript, typescript]
        # Futuro: [python, go, rust, java]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx vitest run tests/unit/layer-a/extractors/${{ matrix.extractor }}
      
  # ============================================
  # CONTRACT TESTS (Obligatorio)
  # ============================================
  contracts:
    name: Contract Tests
    runs-on: ubuntu-latest
    needs: [layer-a-core]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx vitest run tests/contracts --reporter=verbose
      
  # ============================================
  # INTEGRATION TESTS (Después de unit)
  # ============================================
  integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: [layer-a-core, layer-a-extractors, contracts]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx vitest run tests/integration --reporter=verbose
      
  # ============================================
  # E2E TESTS (Solo en main/staging)
  # ============================================
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
    needs: [integration]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:e2e
      
  # ============================================
  # PERFORMANCE (Solo en main)
  # ============================================
  performance:
    name: Performance Benchmarks
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: [integration]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:performance
      - run: npm run perf:compare  # Compara con baseline
```

### Tiempos Esperados

| Job | Tiempo | Cuándo corre |
|-----|--------|--------------|
| Layer A Core | 2 min | Siempre |
| Layer A Extractors | 2 min cada uno | Siempre (paralelo) |
| Contract Tests | 1 min | Después de core |
| Integration | 5 min | Después de unit |
| E2E | 8 min | Solo main/staging |
| Performance | 10 min | Solo main |
| **TOTAL (wall time)** | **~10 min** | Paralelo |

---

## 📊 COBERTURA Y CALIDAD

### Niveles de Cobertura por Componente

| Componente | Cobertura Mínima | Tipo de Test Principal |
|------------|------------------|------------------------|
| **Parser Core** | 95% | Unit + Contract |
| **Extractores** | 80% | Contract + Snapshot |
| **Graph Algorithms** | 90% | Unit + Property |
| **Scanner** | 85% | Unit + Integration |
| **MCP Tools** | 75% | Integration + E2E |
| **Orchestrator** | 70% | Integration |

### Calidad de Tests

Todo test debe ser:
1. **Independiente**: No depende de otros tests
2. **Determinístico**: Siempre mismo resultado
3. **Rápido**: < 100ms ideal, < 1s máximo
4. **Legible**: Nombre describe el comportamiento
5. **Mantenible**: Fácil de actualizar si cambia la API

---

## 🚀 IMPLEMENTACIÓN

### Fase 1: Fundamentos (Hoy)
- [x] Decidir arquitectura (✅ Opción B)
- [ ] Crear estructura de carpetas
- [ ] Configurar Vitest con múltiples configs
- [ ] Crear factories básicas

### Fase 2: Migración Layer A Core (Hoy + Mañana)
- [ ] Refactorizar tests monolíticos a parametrizados
- [ ] Crear contract tests para extractores
- [ ] Mover fixtures a carpeta compartida
- [ ] Validar CI/CD paralelo

### Fase 3: Documentación y Estándares (Mañana)
- [ ] Completar este documento
- [ ] Crear template para nuevos tests
- [ ] Guía de contribución (CONTRIBUTING.md)
- [ ] Checklist de calidad de tests

### Fase 4: Próximas Capas (Futuro)
- [ ] Aplicar misma arquitectura a Layer B
- [ ] Aplicar misma arquitectura a Layer C
- [ ] Automatizar generación de tests para nuevos lenguajes

---

## 📝 TEMPLATES

### Template: Nuevo Extractor

```javascript
// tests/unit/layer-a/extractors/[lenguaje]-extractor.test.js
import { describe } from 'vitest';
import { createExtractorSuite } from '../../factories/extractor.factory.js';
import { parseFile } from '#layer-a/parser/index.js';

createExtractorSuite({
  name: '[Lenguaje]',
  extensions: ['ext1', 'ext2'],
  parseFunction: (code, ext) => parseFile(`test.${ext}`, code),
  fixtures: {
    empty: '',
    ext1: {
      withImports: '[código de import]',
      withExports: '[código de export]',
    },
  },
});
```

### Template: Nuevo Test Unitario

```javascript
// tests/unit/[sistema]/[componente].test.js
import { describe, it, expect } from 'vitest';
import { functionToTest } from '#system/module.js';

describe('[Sistema] - [Componente]', () => {
  
  describe('[functionToTest]', () => {
    
    it('should [comportamiento esperado] when [condición]', () => {
      // Arrange
      const input = {};
      
      // Act
      const result = functionToTest(input);
      
      // Assert
      expect(result).toBe(expected);
    });
    
    it('should throw when [condición de error]', () => {
      expect(() => functionToTest(invalidInput)).toThrow();
    });
    
  });
  
});
```

---

## ✅ CHECKLIST DE CALIDAD

Antes de mergear tests, verificar:

- [ ] Tests son independientes (no comparten estado)
- [ ] Nombres descriptivos (`should X when Y`)
- [ ] Usan factories si es código repetido
- [ ] Tienen assertions específicos (no genéricos)
- [ ] Cubren casos de error, no solo éxito
- [ ] Ejecutan rápido (< 1s cada uno)
- [ ] Pasan en CI local antes de push

---

## 🤝 CONTRIBUCIÓN

### Para agregar un nuevo lenguaje:

1. Crear extractor en `src/layer-a/extractors/`
2. Agregar a `EXTRACTORS` en `tests/contracts/`
3. Crear fixtures en `tests/fixtures/[lenguaje]/`
4. Tests automáticos se ejecutan vía contracts

### Para agregar un nuevo sistema:

1. Crear carpeta en `tests/unit/[sistema]/`
2. Seguir patrones establecidos (factories, parametrized)
3. Agregar job en `.github/workflows/ci.yml`
4. Actualizar este documento

---

## 📚 RECURSOS

- [Vitest Docs](https://vitest.dev/)
- [Testing Patterns](https://martinfowler.com/testing/)
- [Contract Testing](https://pact.io/)
- [Property-Based Testing](https://github.com/dubzzz/fast-check)

---

**Versión**: 1.0.0  
**Última actualización**: 2026-02-14  
**Estado**: ✅ Oficial - En Implementación

**Este documento es la fuente de verdad para testing en OmnySys.**
