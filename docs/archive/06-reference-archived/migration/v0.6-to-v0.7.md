# Guía de Migración: v0.6 → v0.7

**De**: v0.6.2 (última versión estable)
**A**: v0.7.1 (versión actual)
**Breaking Changes**: ❌ Ninguno (100% backwards compatible)
**Deprecations**: ⚠️ 16 archivos deprecated

---

## 🎯 Resumen Ejecutivo

La migración de v0.6 a v0.7 es **totalmente backwards compatible**. No hay breaking changes en la API pública. Todos los archivos deprecated tienen wrappers de compatibilidad que funcionan correctamente.

### Cambios Principales

1. **Refactorización SOLID/SSOT** - Reducción del 69% en líneas de código
2. **Arquitectura Fractal** - Patrón A→B→C aplicado consistentemente
3. **Nuevas Features** - Shadow Registry, Data Flow v2, 5 extractores nuevos
4. **Logger System** - 475+ console.log migrados a sistema centralizado
5. **Meta-Validator** - Sistema de validación de 4 capas

---

## ✅ No Breaking Changes

### APIs Públicas Sin Cambios

| API | Estado | Notas |
|-----|--------|-------|
| MCP Tools (14 tools) | ✅ Sin cambios | Mismos nombres, inputs, outputs |
| Orchestrator API | ✅ Sin cambios | Métodos públicos preservados |
| FileWatcher API | ✅ Sin cambios | Eventos y callbacks iguales |
| Cache API | ✅ Sin cambios | get/set/invalidate sin cambios |
| CLI Commands | ✅ Sin cambios | npm start/stop/status iguales |

### Formatos de Datos Sin Cambios

| Formato | Estado | Notas |
|---------|--------|-------|
| Atom Structure | ✅ Extendido | Nuevos campos opcionales, compatibles |
| Molecule Structure | ✅ Extendido | Nuevos campos opcionales |
| Connection Format | ✅ Extendido | Nuevos campos opcionales |
| Cache Keys | ✅ Sin cambios | Mismas keys |

---

## ⚠️ Archivos Deprecated (16 Total)

### Categoría 1: Re-exports Redundantes

| Archivo Deprecated | Reemplazo | Motivo |
|--------------------|-----------|--------|
| `src/layer-a-static/extractors/static-extractors.js` | `src/layer-a-static/extractors/metadata/index.js` | Re-export innecesario |
| `src/layer-b-semantic/metadata-extractors.js` | `src/layer-a-static/extractors/metadata/index.js` | Layer incorrecto |
| `src/layer-b-semantic/advanced-extractors.js` | `src/layer-a-static/extractors/metadata/index.js` | Layer incorrecto |

**Migración**:
```javascript
// ❌ Deprecated
import { extractJSDoc } from './layer-a-static/extractors/static-extractors.js';

// ✅ Correcto
import { extractJSDocContracts } from './layer-a-static/extractors/metadata/index.js';
```

---

### Categoría 2: Funcionalidad Movida a Metadata Extractors

| Archivo Deprecated | Reemplazo | Motivo |
|--------------------|-----------|--------|
| `src/layer-b-semantic/metadata-contract.js` | `src/layer-b-semantic/metadata-contract/index.js` | Modularizado |
| `src/layer-b-semantic/typescript-extractor.js` | `src/layer-a-static/extractors/metadata/jsdoc-contracts.js` | Consolidado |

**Migración**:
```javascript
// ❌ Deprecated
import { extractTypeScript } from './layer-b-semantic/typescript-extractor.js';

// ✅ Correcto
import { extractJSDocContracts } from './layer-a-static/extractors/metadata/jsdoc-contracts.js';
```

---

### Categoría 3: Análisis Movido a Otros Módulos

| Archivo Deprecated | Reemplazo | Motivo |
|--------------------|-----------|--------|
| `src/layer-a-static/extractors/function-analyzer.js` | `src/shared/analysis/function-analyzer.js` | Compartido entre capas |
| `src/layer-b-semantic/function-analyzer.js` | `src/shared/analysis/function-analyzer.js` | Consolidado |
| `src/layer-a-static/extractors/pattern-matchers.js` | `src/shared/analysis/pattern-matchers.js` | Compartido |
| `src/layer-b-semantic/pattern-matchers.js` | `src/shared/analysis/pattern-matchers.js` | Consolidado |

**Migración**:
```javascript
// ❌ Deprecated (ambos)
import { analyzeFunction } from './layer-a-static/extractors/function-analyzer.js';
import { analyzeFunction } from './layer-b-semantic/function-analyzer.js';

// ✅ Correcto (SSOT)
import { analyzeFunction } from './shared/analysis/function-analyzer.js';
```

---

### Categoría 4: Extractores Específicos Consolidados

| Archivo Deprecated | Reemplazo | Motivo |
|--------------------|-----------|--------|
| `src/layer-a-static/extractors/redux-context-extractor.js` | `src/layer-a-static/extractors/metadata/side-effects.js` | Caso especial de side effects |
| `src/layer-a-static/analyses/tier3/event-pattern-detector.js` | `src/layer-a-static/extractors/metadata/temporal-patterns.js` | Consolidado |

**Migración**:
```javascript
// ❌ Deprecated
import { extractReduxContext } from './extractors/redux-context-extractor.js';

// ✅ Correcto (ahora parte de side-effects)
import { extractSideEffects } from './extractors/metadata/side-effects.js';
const sideEffects = extractSideEffects(ast);
// sideEffects.types.stateManagement incluye Redux
```

---

### Categoría 5: Data Flow v1 → v2

| Archivo Deprecated | Reemplazo | Motivo |
|--------------------|-----------|--------|
| `src/layer-a-static/extractors/data-flow/index.js` | `src/layer-a-static/extractors/data-flow-v2/core/index.js` | Reemplazo completo |

**Migración**:
```javascript
// ❌ Deprecated (v1)
import { extractDataFlow } from './extractors/data-flow/index.js';

// ✅ Correcto (v2)
import { extractDataFlow } from './extractors/data-flow-v2/core/index.js';

// API similar, output mucho más rico
const result = await extractDataFlow(ast, code, functionName, filePath);
// result.real → formato humano
// result.standardized → formato ML
// result.graph → grafo completo
```

---

### Categoría 6: Race Detector (Compatibilidad Total)

| Archivo Deprecated | Reemplazo | Motivo |
|--------------------|-----------|--------|
| `src/layer-a-static/race-detector/index.js` (clase vieja) | Usa `RaceDetectionPipeline` | Refactorizado |

**Migración**:
```javascript
// ❌ Deprecated (pero funciona via wrapper)
import { RaceConditionDetector } from './race-detector/index.js';
const detector = new RaceConditionDetector();

// ✅ Correcto (nuevo, pero el viejo sigue funcionando)
import { RaceDetectionPipeline } from './race-detector/index.js';
const pipeline = new RaceDetectionPipeline();

// Nota: RaceConditionDetector hereda de RaceDetectionPipeline
// → No hay breaking changes, solo naming
```

---

### Categoría 7: Otros Deprecated

| Archivo Deprecated | Reemplazo | Motivo |
|--------------------|-----------|--------|
| `src/layer-b-semantic/project-structure-analyzer.js` | `src/layer-a-static/module-system/` | Movido a Layer A |
| `src/layer-b-semantic/llm-response-validator.js` | `src/layer-b-semantic/llm-analyzer/response-validator.js` | Modularizado |
| `src/core/unified-server/tools.js` | `src/layer-c-memory/mcp/tools/index.js` | Ubicación correcta |
| `src/core/unified-cache-manager/constants.js` | `src/config/change-types.js` | SSOT en config |
| `src/config/change-types.js` (parcial) | Merged con otros configs | Consolidado |

---

## 🆕 Nuevas Features (v0.7.1)

### 1. Shadow Registry

**Estado**: ✅ Implementado (v0.7.1)
**Ubicación**: `src/layer-c-memory/shadow-registry/`

**Qué es**: Sistema de preservación de átomos eliminados con DNA fingerprinting.

**Cómo usar**:
```javascript
import { ShadowRegistry } from './layer-c-memory/shadow-registry/index.js';

const registry = new ShadowRegistry();

// Crear shadow al eliminar átomo
await registry.createShadow(atom, 'deleted');

// Buscar similares
const similar = await registry.findSimilar(newAtom.dna, 0.85);
// → [{ shadow, similarity: 0.92 }, ...]

// Obtener lineage
const lineage = await registry.getLineage(shadowId);
// → { parent, children, generation }
```

---

### 2. Data Flow v2

**Estado**: ✅ Implementado (v0.7.1)
**Ubicación**: `src/layer-a-static/extractors/data-flow-v2/`

**Qué es**: Sistema completo de extracción de flujo de datos con 12 archivos modulares.

**Cómo usar**:
```javascript
import { extractDataFlow } from './extractors/data-flow-v2/core/index.js';

const result = await extractDataFlow(ast, code, functionName, filePath);

// 3 formatos disponibles
console.log(result.real);           // Nombres originales
console.log(result.standardized);   // Tokenizado para ML
console.log(result.graph);          // Grafo completo

// Metadata
console.log(result._meta.confidence);      // 0.85
console.log(result._meta.stats.hasSideEffects);  // true
```

**Ver**: `docs/architecture/DATA_FLOW_V2.md`

---

### 3. Connection Enricher

**Estado**: ✅ Implementado (v0.7.1)
**Ubicación**: `src/layer-a-static/pipeline/enhancers/connection-enricher.js`

**Qué es**: Post-procesador de conexiones que agrega pesos, type compatibility, error propagation.

**Cómo usar**:
```javascript
import { ConnectionEnricher } from './pipeline/enhancers/connection-enricher.js';

const enricher = new ConnectionEnricher(projectPath);
const enrichedConnections = await enricher.enrich(filePath, atoms, connections);

// Conexiones ahora tienen:
// - weight: 0.85
// - typeCompatibility: { compatible: true, score: 0.95 }
// - temporalConstraints: { order: 'A-before-B' }
// - errorPropagation: { unhandled: false }
// - vibrationScore: 0.72 (desde Shadow Registry)
```

---

### 4. 5 Nuevos Metadata Extractors

**Estado**: ✅ Implementados (v0.7.1)
**Ubicación**: `src/layer-a-static/extractors/metadata/`

1. **dna-extractor.js** - Fingerprint único del átomo
2. **temporal-connections.js** - Orden de ejecución, lifecycle
3. **type-contracts.js** - Validación de tipos JSDoc/runtime
4. **error-flow.js** - Mapeo completo throws→catches
5. **performance-impact.js** - Score de impacto 0-10

**Cómo usar**:
```javascript
import * as metadata from './extractors/metadata/index.js';

// Automáticamente ejecutados en pipeline
// Accesibles en atom:
const atom = await getAtom('src/utils.js', 'myFunction');

console.log(atom.dna);                    // DNA fingerprint
console.log(atom.temporalConnections);    // Temporal patterns
console.log(atom.typeContracts);          // Type validation
console.log(atom.errorFlow);              // Error mapping
console.log(atom.performanceImpact);      // Performance score
```

**Ver**: `docs/architecture/METADATA_EXTRACTORS.md`

---

### 5. Logger System

**Estado**: ✅ Implementado (v0.7.1)
**Ubicación**: `src/utils/logger.js`

**Qué es**: Sistema de logging jerárquico, 475+ console.log migrados.

**Cómo usar**:
```javascript
import { getLogger } from './utils/logger.js';

const logger = getLogger('my-module:component');

logger.debug('Debug info', { extra: 'data' });
logger.info('Info message', { context: 'value' });
logger.warn('Warning', { issue: 'detail' });
logger.error('Error occurred', error, { file: 'test.js' });

// Output:
// [INFO] [my-module:component] Info message { context: 'value' }
```

---

### 6. Meta-Validator (4 Capas)

**Estado**: 🟡 Parcial (75%)
**Ubicación**: `scripts/validate-full.js`

**Qué es**: Sistema de validación automática del proyecto.

**Cómo usar**:
```bash
# Validar proyecto
node scripts/validate-full.js .

# Con auto-fix
node scripts/validate-full.js . --auto-fix

# Output JSON
node scripts/validate-full.js . --json

# Guardar reporte
node scripts/validate-full.js . --save --verbose
```

**Capas**:
1. ✅ Source Validation - File existence, exports, imports
2. ⚠️ Derivation Validation - Pendiente formato molecular completo
3. ✅ Semantic Validation - Data flow coherence
4. ⏳ Cross-Metadata - Pendiente

---

### 7. Module System Phase 3

**Estado**: 🟡 Parcial
**Ubicación**: `src/layer-a-static/module-system/`

**Qué es**: Análisis de módulos completos (boundaries, cohesion).

**Integración**: Integrado en pipeline, pero no completamente expuesto en MCP.

---

## 🔧 Cómo Migrar Código

### Paso 1: Actualizar Imports

```javascript
// Si usabas deprecated imports, actualizar:

// ❌ Viejo
import { extractJSDoc } from './layer-a-static/extractors/static-extractors.js';
import { extractTypeScript } from './layer-b-semantic/typescript-extractor.js';

// ✅ Nuevo
import { extractJSDocContracts } from './layer-a-static/extractors/metadata/index.js';
```

### Paso 2: Usar Nuevos Extractors (Opcional)

```javascript
// Opcionalmente, usar nuevos extractors

import { extractDNA } from './layer-a-static/extractors/metadata/dna-extractor.js';
import { extractErrorFlow } from './layer-a-static/extractors/metadata/error-flow.js';
import { extractPerformanceImpact } from './layer-a-static/extractors/metadata/performance-impact.js';

// Ejecutar
const dna = extractDNA(atom);
const errorFlow = extractErrorFlow(ast);
const perfImpact = extractPerformanceImpact(ast);
```

### Paso 3: Actualizar Data Flow (Si usabas v1)

```javascript
// ❌ Viejo (v1)
import { extractDataFlow } from './extractors/data-flow/index.js';
const flow = extractDataFlow(ast);
// { inputs: [...], outputs: [...] }

// ✅ Nuevo (v2)
import { extractDataFlow } from './extractors/data-flow-v2/core/index.js';
const result = await extractDataFlow(ast, code, functionName, filePath);
// { real: {...}, standardized: {...}, graph: {...} }

// Compatibilidad: usar result.real para output similar a v1
const flow = result.real;
```

### Paso 4: Actualizar Logger (Opcional pero Recomendado)

```javascript
// ❌ Viejo
console.log('Processing file:', file);
console.error('Error:', error);

// ✅ Nuevo
import { getLogger } from './utils/logger.js';
const logger = getLogger('my-module');

logger.info('Processing file', { file });
logger.error('Error occurred', error);
```

---

## 🚨 Warnings y Cuidados

### 1. Deprecated Files Seguirán Funcionando

Los 16 archivos deprecated tienen wrappers de compatibilidad. **No hay urgencia** en actualizar código existente.

```javascript
// Este código sigue funcionando perfectamente
import { RaceConditionDetector } from './race-detector/index.js';
const detector = new RaceConditionDetector();

// RaceConditionDetector hereda de RaceDetectionPipeline
// → 100% compatible
```

### 2. Formato Molecular Completo (Pendiente)

El Meta-Validator espera formato molecular completo (con `atoms`, `totalComplexity`, etc.) que vendrá en futuras versiones.

**No afecta funcionalidad**, solo validaciones avanzadas.

### 3. Invariant Detector (Stub Parcial)

`src/layer-a-static/extractors/data-flow-v2/analyzers/invariant-detector.js:335` tiene stub.

**Funcionalidad básica operativa**, invariantes avanzados en v0.7.2.

---

## 📊 Comparación v0.6.2 vs v0.7.1

| Feature | v0.6.2 | v0.7.1 | Mejora |
|---------|--------|--------|--------|
| **Metadata Extractors** | 13 | 18 | +38% |
| **Connection Types** | 4 | 8 | +100% |
| **Data Flow** | v1 (básico) | v2 (completo) | +1000% |
| **Shadow Registry** | ❌ | ✅ | New |
| **Logger System** | ❌ | ✅ 475+ logs | New |
| **Meta-Validator** | ❌ | 🟡 75% | New |
| **Race Detector** | 50% | 100% | +50% |
| **Test Coverage** | ~15% | ~20% | +33% |
| **Code Lines (monoliths)** | 1,936 | 601 | -69% |
| **Deprecated Files** | 0 | 16 | Warning |
| **Breaking Changes** | - | 0 | ✅ |

---

## 🎯 Recomendaciones

### Para Proyectos Nuevos

✅ Usar nuevos imports directamente
✅ Usar Data Flow v2
✅ Usar Logger System
✅ Aprovechar nuevos extractors

### Para Proyectos Existentes

🟡 Actualizar imports cuando sea conveniente (no urgente)
🟡 Considerar Data Flow v2 si usabas v1
🟡 Logger System opcional pero recomendado
✅ Todo sigue funcionando sin cambios

---

## 📚 Referencias

- **Changelog v0.7.1**: `changelog/v0.7.1.md`
- **Changelog v0.7.0**: `changelog/v0.7.0.md`
- **Technical Status**: `docs/TECHNICAL_STATUS.md`
- **Data Flow v2**: `docs/architecture/DATA_FLOW_V2.md`
- **Metadata Extractors**: `docs/architecture/METADATA_EXTRACTORS.md`

---

## 🆘 Soporte

**Issues conocidos**: Ver `docs/TECHNICAL_STATUS.md` sección "Known Issues"

**Preguntas**: Abrir issue en GitHub

**Migración asistida**: Disponible via Claude Code con tools MCP

---

**Última actualización**: 2026-02-09
**Versión del documento**: 1.0.0
**Compatibilidad**: 100% backwards compatible
