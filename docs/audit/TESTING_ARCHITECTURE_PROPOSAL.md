# 🏗️ ARQUITECTURA DE TESTING A LARGO PLAZO

**Fecha**: 2026-02-14  
**Propuesta**: Sistema de Testing Escalable para OmnySys

---

## 🚨 EL PROBLEMA ACTUAL

Los tests actuales son **monolíticos**:

```
tests/unit/layer-a/parser/parser.test.js (15 tests)
tests/unit/layer-a/scanner.test.js (10 tests)
tests/unit/layer-a/graph/graph.test.js (13 tests)
```

### ¿Por qué esto NO escala?

| Escenario | Problema |
|-----------|----------|
| **+10 lenguajes** | 10x tests = 500+ tests en archivos gigantes |
| **+50 extractores** | Tests duplicados, mantenimiento imposible |
| **Cambio en API** | Editar 50 archivos de tests |
| **CI lento** | 30 minutos corriendo todo |
| **Debugging** | Encontrar qué falló = buscar aguja en pajar |

**Realidad**: A los 3 meses, nadie quiere tocar los tests.

---

## ✅ SOLUCIÓN: ARQUITECTURA DE TESTING POR CAPAS

### Nivel 1: Tests Parametrizados (Smart Tests)

**Idea**: Un test que prueba MUCHOS casos automáticamente.

```javascript
// ❌ ANTES: Tests repetitivos
it('should parse JS imports', () => { ... });
it('should parse TS imports', () => { ... });
it('should parse JSX imports', () => { ... });

// ✅ DESPUÉS: Test parametrizado
describe.each([
  ['JavaScript', 'js', `import { x } from './y'`],
  ['TypeScript', 'ts', `import { x } from './y'`],
  ['JSX', 'jsx', `import React from 'react'`],
])('Parser - %s', (name, ext, code) => {
  it('should parse imports', () => {
    const result = parseFile(`/test/file.${ext}`, code);
    expect(result.imports).toHaveLength(1);
  });
});
```

**Ventaja**: Agregar un lenguaje = agregar 1 línea, no 10 tests.

---

### Nivel 2: Test Factories (Generación Automática)

**Idea**: Funciones que generan tests basados en configuración.

```javascript
// tests/factories/extractor-factory.js
export function createExtractorTests(extractorConfig) {
  const { name, extensions, testCases } = extractorConfig;
  
  return describe(`Extractor: ${name}`, () => {
    describe.each(extensions)('Extension: %s', (ext) => {
      it('should extract imports', async () => {
        const code = testCases[ext].import;
        const result = await extract(code, ext);
        expect(result.imports).toBeDefined();
      });
      
      it('should extract exports', async () => {
        const code = testCases[ext].export;
        const result = await extract(code, ext);
        expect(result.exports).toBeDefined();
      });
    });
  });
}

// Uso para cada lenguaje:
createExtractorTests({
  name: 'JavaScript',
  extensions: ['js', 'mjs'],
  testCases: { ... }
});

createExtractorTests({
  name: 'Python',
  extensions: ['py'],
  testCases: { ... }
});
```

**Ventaja**: Un extractor nuevo = 1 objeto de config, no 20 tests.

---

### Nivel 3: Contract Tests (Tests de Contrato)

**Idea**: Tests que verifican que TODOS los extractores cumplen el mismo contrato.

```javascript
// tests/contracts/extractor-contract.test.js
const extractors = [
  { name: 'JS', module: '#layer-a/parser/javascript' },
  { name: 'TS', module: '#layer-a/parser/typescript' },
  { name: 'Python', module: '#layer-a/parser/python' },
];

describe.each(extractors)('Contract: $name Extractor', ({ module }) => {
  it('MUST return imports array', async () => {
    const extractor = await import(module);
    const result = extractor.parse('import x from "y"');
    expect(result).toHaveProperty('imports');
    expect(Array.isArray(result.imports)).toBe(true);
  });
  
  it('MUST return exports array', async () => {
    const result = extractor.parse('export const x = 1');
    expect(result).toHaveProperty('exports');
    expect(Array.isArray(result.exports)).toBe(true);
  });
  
  it('MUST return file metadata', async () => {
    const result = extractor.parse('');
    expect(result).toHaveProperty('filePath');
    expect(result).toHaveProperty('fileName');
  });
});
```

**Ventaja**: Agregar un lenguaje = automáticamente testeado contra contrato.

---

### Nivel 4: Integration Tests por Capas

**Estrategia**: No todo necesita test unitario. Algunas cosas son mejor integration.

```
┌─────────────────────────────────────────────────────┐
│  LAYER A CORE (Parser/Scanner/Graph)               │
│  ├── Unit Tests: Sí (lógica compleja)              │
│  └── Integration: Pipeline end-to-end              │
├─────────────────────────────────────────────────────┤
│  LAYER A EXTRACTORS (JS, TS, Python, etc.)         │
│  ├── Contract Tests: Sí (todos deben cumplir)      │
│  ├── Unit Tests: Solo lógica específica            │
│  └── Snapshot Tests: Outputs esperados             │
├─────────────────────────────────────────────────────┤
│  LAYER B SEMANTIC (LLM Analysis)                   │
│  ├── Integration Tests: Con mocks de LLM           │
│  └── E2E Tests: Flujo completo                     │
├─────────────────────────────────────────────────────┤
│  LAYER C MEMORY (MCP Tools)                        │
│  └── E2E Tests: Tests reales contra servidor       │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 CI/CD PROFESIONAL PROPUESTO

### Estrategia de Ejecución

```yaml
# .github/workflows/ci.yml (Mejorado)
name: CI - Smart Testing

on: [push, pull_request]

jobs:
  # 1. Tests Rápidos (2-3 min)
  quick-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Unit Tests - Layer A Core
        run: npm run test:layer-a:core
      
      - name: Contract Tests
        run: npm run test:contracts
  
  # 2. Tests por Sistema (Paralelo)
  layer-a-extractors:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        extractor: [js, ts, python, go, rust]
    steps:
      - name: Test ${{ matrix.extractor }} Extractor
        run: npm run test:extractor:${{ matrix.extractor }}
  
  # 3. Tests de Integración (Solo en main)
  integration-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Full Integration Suite
        run: npm run test:integration
      
      - name: E2E Tests
        run: npm run test:e2e
  
  # 4. Performance Regression
  performance:
    runs-on: ubuntu-latest
    steps:
      - name: Performance Tests
        run: npm run test:performance
      
      - name: Compare with baseline
        run: npm run perf:compare
```

**Resultado**: 
- Push normal: 3 minutos (solo críticos)
- PR a main: 10 minutos (todos los sistemas en paralelo)
- Merge: 15 minutos (integration + performance)

---

## 🏗️ ESTRUCTURA DE CARPETAS PROPUESTA

```
tests/
├── README.md                    # Guía de testing
├── config/
│   └── vitest.config.js         # Config centralizada
│
├── contracts/                   # Tests de contrato (obligatorios)
│   ├── extractor-contract.test.js
│   ├── graph-contract.test.js
│   └── mcp-tool-contract.test.js
│
├── fixtures/                    # Datos de prueba compartidos
│   ├── javascript/
│   │   ├── simple-import.js
│   │   ├── complex-module.js
│   │   └── edge-cases.js
│   ├── typescript/
│   │   └── interfaces.ts
│   └── python/
│       └── imports.py
│
├── factories/                   # Generadores de tests
│   ├── extractor-factory.js
│   ├── graph-algorithm-factory.js
│   └── e2e-scenario-factory.js
│
├── unit/                        # Tests unitarios (lógica compleja)
│   ├── layer-a-core/           # ✅ Ya tenemos esto
│   │   ├── parser/
│   │   ├── scanner/
│   │   └── graph/
│   │
│   └── shared/                 # Utilidades compartidas
│       ├── logger.test.js
│       └── error-handler.test.js
│
├── integration/                 # Tests de integración
│   ├── layer-a-pipeline.test.js
│   ├── layer-b-llm.test.js
│   └── mcp-server.test.js
│
├── e2e/                        # End-to-end
│   ├── scenarios/
│   │   ├── analyze-project.test.js
│   │   ├── detect-cycles.test.js
│   │   └── full-workflow.test.js
│   └── helpers/
│       └── test-project-setup.js
│
└── performance/                # Tests de rendimiento
    ├── parser-benchmark.test.js
    ├── graph-large-project.test.js
    └── memory-usage.test.js
```

---

## 📊 ESTRATEGIA DE COBERTURA

### No todo necesita 100% coverage

| Componente | Tipo de Test | Coverage Target |
|------------|--------------|-----------------|
| **Parser Core** | Unit + Contract | 95% |
| **Extractores** | Contract + Snapshot | 80% |
| **Graph Algoritmos** | Unit + Property | 90% |
| **MCP Tools** | Integration + E2E | 70% |
| **Orchestrator** | Integration | 75% |

**Property Testing**: Genera 100 casos aleatorios automáticamente.

```javascript
// Ejemplo: Property Test
import { fc } from 'fast-check';

it('should never create cycles in acyclic graphs', () => {
  fc.assert(
    fc.property(
      fc.array(fc.string()), // Archivos aleatorios
      (files) => {
        const graph = buildAcyclicGraph(files);
        expect(detectCycles(graph)).toHaveLength(0);
      }
    )
  );
});
```

---

## 🚀 IMPLEMENTACIÓN GRADUAL

### Fase 1: Refactorizar Tests Actuales (1 día)
- [ ] Convertir tests monolíticos a parametrizados
- [ ] Crear `tests/factories/extractor-factory.js`
- [ ] Mover fixtures a `tests/fixtures/`

### Fase 2: Contract Tests (1 día)
- [ ] Definir contratos de Layer A
- [ ] Implementar tests de contrato
- [ ] Integrar en CI

### Fase 3: CI/CD Profesional (1 día)
- [ ] Configurar matrices de testing
- [ ] Tests paralelos por sistema
- [ ] Performance benchmarks

### Fase 4: Multi-lenguaje (Futuro)
- [ ] Agregar extractores como plugins
- [ ] Tests de contrato automáticos
- [ ] Snapshots de outputs esperados

---

## 💡 VENTAJAS DE ESTA ARQUITECTURA

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Agregar lenguaje** | 50 tests nuevos | 1 archivo de config |
| **Cambio de API** | Editar 50 archivos | Editar 1 contrato |
| **CI tiempo** | 30 minutos | 3-15 minutos escalable |
| **Debugging** | Buscar en 50 archivos | Reporte automatizado |
| **Onboarding** | "Lee estos tests" | "Mira estas factories" |
| **Mantenimiento** | Pesadilla | Sostenible |

---

## 🤔 ¿CUÁNDO IMPLEMENTAMOS ESTO?

**Mi recomendación**: **AHORA**, antes de seguir auditando más sistemas.

**Razón**: Estamos en 50 tests, aún manejable. A los 500 tests será un dolor de cabeza refactorizar.

**Plan**:
1. Hoy: Refactorizar los 50 tests actuales a la nueva arquitectura
2. Mañana: Seguimos auditando con la nueva estructura
3. Futuro: Agregar lenguajes es trivial

---

## ❓ PREGUNTAS CLAVE PARA VOS

1. **¿Queremos soportar otros lenguajes?** (Python, Go, Rust, etc.)
   - Si es sí: Necesitamos esta arquitectura YA.

2. **¿Queremos que otros devs/contribuidores puedan agregar extractores?**
   - Si es sí: Necesitamos contract tests y factories.

3. **¿El CI necesita ser rápido?**
   - Si es sí: Necesitamos tests paralelos y categorizados.

4. **¿Queremos detectar regressions de performance?**
   - Si es sí: Necesitamos benchmarks automatizados.

---

**¿Te parece bien implementar esta arquitectura AHORA antes de seguir?**  
Es una inversión de 1-2 días que nos ahorra semanas en el futuro.
