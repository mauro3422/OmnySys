# Testing Guide Enterprise - OmnySys

**Versión**: 2.0.0  
**Última actualización**: 2026-02-17  
**Estado**: Layer A - ✅ COMPLETADO (Meta-Factory Implementado)

---

## 🎯 Filosofía: "Del Todo al Átomo"

> **"Testeamos desde lo más grande hasta lo más chico, como el propio sistema OmnySys"**

### Principios Fundamentales:

1. **Agrupar por Patrones, no por Archivos**
   - ❌ NO: 600 archivos de test (1 por función)
   - ✅ SÍ: 20 grupos de test (por patrón de comportamiento)

2. **Meta-Factory Pattern**
   - Tests generados automáticamente desde contratos
   - Un solo punto de configuración
   - Consistencia garantizada

3. **Cobertura Inteligente**
   - 100% de funciones críticas
   - Contratos para validar interfaces
   - Tests funcionales reales (no mocks)

---

## 🏗️ Arquitectura de Tests Enterprise

### Nivel 1: Meta-Factory (Contratos Automáticos)

```javascript
// tests/factories/test-suite-generator/index.js
export function createAnalysisTestSuite(config) {
  const {
    module,           // 'analyses/tier1'
    exports,          // { findHotspots, findOrphanFiles }
    analyzeFn,        // Función principal a testear
    expectedFields,   // { total: 'number', files: 'array' }
    contractOptions: {
      exportNames,         // ['findHotspots', 'findOrphanFiles']
      expectedSafeResult   // { total: 0, files: [] }
    }
  } = config;

  // Genera automáticamente:
  // ✅ Export Contract - Verifica que exports existen
  // ✅ Structure Contract - Verifica campos requeridos  
  // ✅ Error Handling Contract - Verifica null-safety
  // ✅ Return Structure Contract - Verifica tipos de retorno
}
```

### Nivel 2: Agrupación por Patrones

```
tests/unit/layer-a/
├── analyses/
│   ├── analyses-group1.test.js      ← { total, items/array }
│   ├── analyses-group2.test.js      ← { total, byFile/object }
│   ├── analyses-group3.test.js      ← Detectores/Clasificadores
│   └── functional-tests.test.js     ← Tests reales con datos
│
├── extractors/
│   ├── extractors-group1.test.js    ← Atomic (funciones/métodos)
│   ├── extractors-group2.test.js    ← Communication (eventos)
│   ├── extractors-group3.test.js    ← CSS-in-JS
│   ├── extractors-group4.test.js    ← Data-Flow
│   └── extractors-group5.test.js    ← Metadata
│
├── pipeline/                         ← Flujos completos
├── graph/                            ← Graph system
├── module-system/                    ← Module analysis
├── storage/                          ← Storage manager
└── [Otras áreas funcionales]
```

### Nivel 3: Tests de Integración

```
tests/integration/
├── layer-a/
│   ├── analyzer-flow.test.js        ← Flujos end-to-end
│   └── integration-contracts.test.js ← Contratos entre módulos
└── [Futuro: layer-b/, layer-c/]
```

---

## 📋 Estrategia de Agrupación por Patrones

### Grupo 1: { total, items }
Funciones que retornan un contador + array de items

```javascript
// analyses-group1.test.js
import { 
  findHotspots,      // → { total, functions, criticalCount }
  findOrphanFiles    // → { total, files, deadCodeCount }
} from '#layer-a/analyses/tier1/index.js';

createAnalysisTestSuite({
  module: 'analyses/group1',
  exports: { findHotspots, findOrphanFiles },
  analyzeFn: findHotspots,
  expectedFields: { 
    total: 'number', 
    items: 'array'  // functions | files
  },
  contractOptions: {
    exportNames: ['findHotspots', 'findOrphanFiles'],
    expectedSafeResult: { total: 0, items: [] }
  }
});
```

### Grupo 2: { total, byFile }
Funciones que agrupan resultados por archivo

```javascript
// analyses-group2.test.js
import { 
  findUnusedExports,   // → { totalUnused, byFile }
  analyzeCoupling      // → { total, coupledFiles }
} from '#layer-a/analyses/tier1/index.js';

createAnalysisTestSuite({
  module: 'analyses/group2',
  exports: { findUnusedExports, analyzeCoupling },
  analyzeFn: findUnusedExports,
  expectedFields: { 
    total: 'number', 
    byFile: 'object'  // Agrupado por archivo
  },
  contractOptions: {
    expectedSafeResult: { total: 0, byFile: {} }
  }
});
```

### Grupo 3: Detectores/Clasificadores
Funciones de detección y clasificación

```javascript
// analyses-group3.test.js
import {
  findCircularFunctionDeps,   // → { total, cycles }
  findDeepDependencyChains,   // → { totalDeepChains, chains }
  classifyFunctionCycle       // → { category, severity }
} from '#layer-a/analyses/tier1/index.js';

createAnalysisTestSuite({
  module: 'analyses/group3',
  exports: { findCircularFunctionDeps, findDeepDependencyChains, classifyFunctionCycle },
  analyzeFn: findCircularFunctionDeps,
  expectedFields: { 
    total: 'number', 
    cycles: 'array',
    category: 'string'  // Para clasificadores
  },
  contractOptions: {
    expectedSafeResult: { total: 0, cycles: [], category: 'SIMPLE' }
  }
});
```

---

## 🔄 Flujo de Trabajo: Layer A como Ejemplo

### Paso 1: Análisis del Área
```bash
# Identificar todas las funciones del área
ls src/layer-a-static/extractors/static/*.js

# Agrupar por patrón de retorno:
# - { events: [] } → extractors-group2 (communication)
# - { globals: [] } → extractors-group2 (communication)  
# - { routes: [] } → extractors-group2 (communication)
```

### Paso 2: Crear Test Grupal
```javascript
// extractors-group2.test.js
import { describe } from 'vitest';
import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import * as communication from '#layer-a/extractors/communication/index.js';

describe('Extractors - Communication', () => {
  createAnalysisTestSuite({
    module: 'extractors/communication',
    exports: communication,  // Exporta TODO
    analyzeFn: Object.values(communication)[0],
    expectedFields: { 
      events: 'array',
      globals: 'array',
      routes: 'array'
    },
    contractOptions: {
      exportNames: Object.keys(communication),
      expectedSafeResult: { events: [], globals: [], routes: [] }
    },
    specificTests: [
      {
        name: 'all communication extractors work',
        fn: () => {
          expect(Object.keys(communication).length).toBeGreaterThan(0);
        }
      }
    ]
  });
});
```

### Paso 3: Ejecutar y Verificar
```bash
# Tests unitarios
npm run test:layer-a:core

# Validación de sintaxis
npm run validate

# Si pasa todo:
git add .
git commit -m "test: agregar tests grupales para [área]"
git push origin main
```

---

## ✅ Layer A - Estado Completado

### Cobertura Implementada:

| Área | Archivos de Test | Tests | Estado |
|------|-----------------|-------|--------|
| **Analyses** | 6 grupos | 50+ | ✅ |
| **Extractors** | 6 grupos | 40+ | ✅ |
| **Parser** | 1 grupo | 15+ | ✅ |
| **Graph** | 1 grupo | 10+ | ✅ |
| **Module System** | 1 grupo | 10+ | ✅ |
| **Storage** | Pendiente | - | ⏳ |
| **Query** | Pendiente | - | ⏳ |
| **Race Detector** | Pendiente | - | ⏳ |
| **Pipeline** | Pendiente | - | ⏳ |

### Total Layer A:
- **86 archivos** de test
- **268 tests** pasando
- **0 errores** de sintaxis
- **Meta-Factory** implementado

---

## 🚀 Aplicar a Otras Capas

### Patrón para Layer B (Semantic):

```
tests/unit/layer-b-semantic/
├── semantic-analysis/
│   ├── semantic-group1.test.js    ← Análisis LLM
│   ├── semantic-group2.test.js    ← Context classification
│   └── semantic-group3.test.js    ← Archetype detection
└── [Otras áreas]
```

### Patrón para Layer C (Memory):

```
tests/unit/layer-c-memory/
├── mcp/
│   ├── mcp-group1.test.js         ← Tools (agrupadas por tipo)
│   ├── mcp-group2.test.js         ← Server lifecycle
│   └── mcp-group3.test.js         ← Request/Response
├── storage/
│   └── storage-group.test.js      ← Shadow registry, cache
└── [Otras áreas]
```

---

## 📝 Comandos de Testing

### Desarrollo Local:
```bash
# Instalar sin iniciar servicios
npm ci --ignore-scripts

# Tests de Layer A
npm run test:layer-a:core

# Tests de integración
npm run test:integration

# Validación de sintaxis (OBLIGATORIO antes de push)
npm run validate

# Coverage (opcional)
npm run test:coverage
```

### Pre-Push Checklist:
```bash
npm ci --ignore-scripts && \
npm run test:layer-a:core && \
npm run test:integration && \
npm run validate && \
echo "✅ Listo para push"
```

---

## 🏭 Nivel 4: Tests Funcionales por Patrones (Nuevo)

> **Extensión del Meta-Factory para tests que ejecutan código real**

### Problema Detectado
Los tests de contrato verifican que las funciones **existan**, pero no ejecutan la lógica real:
- Coverage actual: **~10%** (sólo estructura)
- Necesitamos: **~80%** (lógica real ejecutada)

### Solución: FunctionalTestFactory

```javascript
// tests/factories/functional-test.factory.js
export function createFunctionalTestSuite({
  pattern,           // 'cycle-classification', 'file-grouped', etc.
  functions,         // [findCircularFunctionDeps, findCircularImports]
  fixtures,          // Datos de prueba del patrón
  mocks,            // { fs: mockFs, path: mockPath }
  assertions        // Validaciones específicas del patrón
}) {
  // Genera automáticamente tests funcionales:
  // ✅ Happy path (caso exitoso)
  // ✅ Edge cases (vacío, null, extremos)
  // ✅ Error handling (excepciones, errores)
  // ✅ Verificación de estructura de retorno
}
```

### 12 Patrones de Retorno Identificados

| Patrón | Estructura | Ejemplo | Prioridad |
|--------|------------|---------|-----------|
| **Pattern A** | `{ total, items[] }` | `findHotspots()` → `{ total, functions, criticalCount }` | 🔴 P3 |
| **Pattern B** | `{ total, byFile: {} }` | `findUnusedExports()` → `{ totalUnused, byFile }` | 🔴 P2 |
| **Pattern C** | `{ total, files[], subsetCount }` | `findOrphanFiles()` → `{ total, files, deadCodeCount }` | 🟡 Sec |
| **Pattern D** | `{ totalX, maxY, items[], recommendation }` | `findDeepDependencyChains()` | 🟡 Sec |
| **Pattern E** | `{ total, cycles[], classifications[] }` | `findCircularFunctionDeps()` | 🔴 P1 |
| **Pattern F** | `{ score, grade, breakdown: {} }` | `calculateQualityMetrics()` | 🟡 Sec |
| **Pattern G** | `string (path)` / `{ paths }` | `saveMetadata()`, `saveFileAnalysis()` | 🔴 P4 |
| **Pattern H** | `{ data[], metadata }` / `[]` | `extractTypeScriptDefinitions()` | 🔴 P5 |
| **Pattern I** | `object \| null \| throws` | `getFileAnalysis()`, `loadMolecule()` | 🟡 Sec |
| **Pattern J** | `{ nodes[], edges[] }` | `getDependencyGraph()` | 🟡 Sec |
| **Pattern K** | `string[]` | `getFileDependencies()` | 🟡 Sec |
| **Pattern L** | `{ report: { summary }, scores }` | `getRiskAssessment()` | 🟡 Sec |

### Ejemplo: Pattern E (Cycle/Classification)

```javascript
// tests/functional/patterns/cycle-classification.functional.test.js
import { createFunctionalTestSuite } from '#test-factories/functional-test.factory';
import { 
  findCircularFunctionDeps,
  findCircularImports 
} from '#layer-a/analyses/tier1/index.js';
import { cycleFixtures } from '../fixtures/patterns/cycle.fixtures.js';
import { mockRegistry } from '../../mocks/registry.js';

describe('Pattern E: Cycle/Classification', () => {
  createFunctionalTestSuite({
    pattern: 'cycle-classification',
    functions: [findCircularFunctionDeps, findCircularImports],
    fixtures: cycleFixtures,  // { validSystemMap, noCycles, mutualRecursion }
    mocks: {
      fs: mockRegistry.fs.successfulWrite(),
      path: mockRegistry.path.posix
    },
    assertions: {
      // Validaciones automáticas para TODAS las funciones del patrón:
      mustHaveTotal: true,
      mustHaveCycles: true,
      mustHaveClassifications: true,
      mustClassifySeverity: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      mustHandleEmpty: true,  // systemMap vacío → { total: 0, ... }
      mustDetectMutualRecursion: true
    }
  });
});
```

**Tests generados automáticamente:**
1. ✅ Con ciclos reales → verifica estructura completa
2. ✅ Sin ciclos → verifica `{ total: 0, cycles: [] }`
3. ✅ Recursión mutua → detecta correctamente
4. ✅ Clasificación automática → severidad correcta
5. ✅ systemMap null → retorna defaults seguros

### Arquitectura de Fixtures

```javascript
// tests/fixtures/patterns/cycle.fixtures.js
export const cycleFixtures = {
  // Datos de entrada
  validSystemMap: {
    files: {
      'src/a.js': { 
        atoms: [{ name: 'funcA', calls: ['funcB'] }]
      },
      'src/b.js': {
        atoms: [{ name: 'funcB', calls: ['funcA'] }]  // Ciclo!
      }
    }
  },
  
  noCycles: {
    files: {
      'src/a.js': { atoms: [{ name: 'funcA', calls: ['funcC'] }] },
      'src/b.js': { atoms: [{ name: 'funcB', calls: [] }] }
    }
  },
  
  // Resultados esperados
  expected: {
    withCycles: {
      total: 1,
      cycles: [[{ file: 'src/a.js', function: 'funcA' }, ...]],
      classifications: [{
        severity: 'HIGH',
        category: 'MUTUAL_RECURSION',
        explanation: expect.any(String),
        autoIgnore: false
      }],
      problematicCount: 1
    },
    withoutCycles: {
      total: 0,
      cycles: [],
      classifications: [],
      problematicCount: 0
    }
  }
};
```

### Plan de Implementación (5 Fases)

#### Fase 1: Pattern E - Cycle/Classification 🔴
**Target**: +15% coverage (25% total)
- Funciones: `findCircularFunctionDeps`, `findCircularImports`
- Tests: Detección de ciclos, clasificación, recursión mutua

#### Fase 2: Pattern B - File-Grouped 🔴
**Target**: +15% coverage (40% total)
- Funciones: `findUnusedExports`, `findUnusedImports`
- Tests: Agrupación por archivo, cálculo de totales

#### Fase 3: Pattern A - List Results 🔴
**Target**: +15% coverage (55% total)
- Funciones: `findHotspots`, `detectSideEffectMarkers`
- Tests: Listas ordenadas, sub-conteos (criticalCount)

#### Fase 4: Pattern G - Storage 🔴
**Target**: +20% coverage (75% total)
- Funciones: `saveMetadata`, `saveFileAnalysis`, `saveConnections`
- Tests: Mock de filesystem, creación de directorios, errores

#### Fase 5: Pattern H - Extraction 🔴
**Target**: +15% coverage (90% total)
- Funciones: `extractTypeScriptDefinitions`, `detectAllSemanticConnections`
- Tests: Código real, extracción de definiciones

**Resultado**: **~90% coverage** (excede meta de 80%)

### Ventajas del Enfoque

1. **Escalable**: Un factory por patrón cubre múltiples funciones
2. **Mantenible**: Cambios en el patrón → un solo lugar
3. **Consistente**: Todos los tests del patrón verifican lo mismo
4. **Rápido**: No 1x1, tests generados automáticamente
5. **Multi-lenguaje**: Patrones son agnósticos (Python/Java reutilizan)

---

## 🎯 Metas de Coverage

### Layer A - Evolución:
| Fase | Coverage | Tests | Estado |
|------|----------|-------|--------|
| Contratos | ~10% | 285 | ✅ Completado |
| Funcional P1-P3 | ~55% | +100 | 🔄 En progreso |
| Funcional P4-P5 | ~90% | +80 | ⏳ Pendiente |

### Meta Global:
- **v0.8.0**: 50% coverage (todas las capas)
- **v0.9.0**: 80% coverage (críticos)
- **v1.0.0**: 90%+ coverage (producción)

---

## 💡 Lecciones Aprendidas

### ❌ Errores Comunes:
1. **Tests 1x1** → 600 archivos, imposible mantener
2. **Sin contratos** → No detecta cambios de API
3. **Sin null-safety** → Crashea en edge cases
4. **Sin validación local** → Push roto en CI

### ✅ Buenas Prácticas:
1. **Meta-Factory** → Tests consistentes, un solo cambio
2. **Agrupar por patrón** ~20 archivos vs 600
3. **Contratos automáticos** → Detectan breaking changes
4. **Validar local primero** → `npm run validate` antes de push

---

## 📚 Referencias

- **Meta-Factory**: `tests/factories/test-suite-generator/`
- **Ejemplo Layer A**: `tests/unit/layer-a-analysis/`
- **Integration Tests**: `tests/integration/layer-a/`
- **Estado Actual**: `LAYER_A_STATUS.md`

---

**Sistema de Testing Enterprise implementado.**  
**Layer A es el ejemplo para las demás capas.**  
**"Del todo al átomo" - Testeamos sistemáticamente.**

---

*Documento v2.0 - Sistema Meta-Factory + Agrupación por Patrones*
