# 📘 The Great Semantic Consolidation - Roadmap Completo

**Fecha:** 2026-03-07  
**Versión:** v1.0  
**Estado:** EN PROGRESO (10% completado)  
**Health Score Actual:** 63/100 (Grade D)  
**Target Health Score:** 90+/100 (Grade A)

---

## 📊 RESUMEN EJECUTIVO

### **Objetivo Principal**
Eliminar **100+ duplicados conceptuales** y **26 duplicados estructurales** creados por "AI Tunnel Vision", e implementar guards preventivos para asegurar la salud del proyecto hacia v1.0.

### **Métricas Actuales**
| Métrica | Valor Actual | Target v1.0 |
|---------|-------------|-------------|
| Health Score | 63/100 (D) | **90+/100 (A)** |
| Duplicados Estructurales | 26 grupos, 183 instancias | **< 5 grupos** |
| Duplicados Conceptuales | 50 grupos, 2,862 implementaciones | **< 10 grupos** |
| Pipeline Integrity | 63/100 (5/8 checks) | **100/100** |
| `getLineNumber()` instances | 16+ | **1** |
| `safeArray()` instances | 3 | **1** |
| `toNumber()` instances | 4 | **1** |

---

## 🚨 HALLAZGOS CRÍTICOS DE AUDITORÍA

### **1. Top 5 Duplicados Estructurales (DNA)**

| # | Función | Instancias | Ubicación Canónica Sugerida | Urgency |
|---|---------|------------|---------------------------|---------|
| 1 | `safeArray` | 3 | `src/core/file-watcher/guards/circular-guard.js` | 🔴 HIGH |
| 2 | `toNumber` | 4 | `src/shared/compiler/signal-coverage.js` | 🔴 HIGH |
| 3 | `getLineNumber` | 16+ | `src/layer-a-static/extractors/state-management/utils.js` | 🔴 CRITICAL |
| 4 | `isLikelyParserNoiseUnusedInput` | 2 | `src/core/file-watcher/guards/integrity-guard.js` | 🟡 MEDIUM |
| 5 | `getFileFromRelationEntry` | 2 | `src/core/file-watcher/guards/impact-wave.js` | 🟡 MEDIUM |

### **2. Top 5 Duplicados Conceptuales**

| Fingerprint | Implementaciones | Archivos Afectados | Risk |
|-------------|------------------|-------------------|------|
| `process:core:map_callback` | **416** | 395 | 🔴 CRITICAL |
| `process:core:describe_arg1` | **305** | 305 | 🔴 CRITICAL |
| `process:core:each_callback` | **284** | 229 | 🔴 CRITICAL |
| `process:core:it_arg1` | **274** | 274 | 🔴 CRITICAL |
| `process:core:some_callback` | **202** | 202 | 🔴 CRITICAL |

### **3. Sociedades de Código Identificadas**

#### **Society 1: Extractor Utils (Foundation)**
```
Funciones a canonizar:
├── safeArray()           → 3 duplicados
├── toNumber()            → 4 duplicados  
├── getLineNumber()       → 16+ duplicados (CRÍTICO)
├── normalizePath()       → 5 duplicados
├── extractImports()      → 5 duplicados
└── extractExports()      → 14 duplicados
```

**Ubicación canónica sugerida:** `src/shared/compiler/conformance-utils.js`

#### **Society 2: Conformance Guards (Structure)**
```
Familia detect...ConformanceFromSource:
├── detectTestabilityConformanceFromSource()       → 6 duplicados estructurales
├── detectAsyncErrorConformanceFromSource()        → conceptual duplicate
├── detectCanonicalExtensionConformanceFromSource()-> conceptual duplicate
├── detectCentralityCoverageConformanceFromSource()-> conceptual duplicate
├── detectMetadataPropagationConformanceFromSource()-> conceptual duplicate
├── detectSemanticSurfaceGranularityConformance... → conceptual duplicate
├── detectServiceBoundaryConformanceFromSource()   → conceptual duplicate
└── detectSharedStateHotspotConformanceFromSource()-> conceptual duplicate
```

**Patrón detectado:** Template-copy-paste debt en `src/shared/compiler/`

#### **Society 3: System Logic (Core)**
```
"Full Scan" logic disperso:
├── looksLikeManualTestabilityScan()     → 5 duplicados conceptuales
├── looksLikeManualPipelineOrphanScan()  → relacionado
├── looksLikeManualTopologyScan()        → relacionado
├── fullScan()                           → relacionado
└── performFullSystemScan()              → relacionado
```

**Archivos involucrados:**
- `scripts/audit-full-scan.js`
- `scripts/audit-full-scan/analyzer.js`
- `src/shared/compiler/policy-conformance.js`

#### **Society 4: NavigationEngine / File Resolution**
```
Unificación requerida en resolución de archivos/símbolos:
└── detectOrphanModule() → 2 duplicados
    ├── src/layer-b-semantic/metadata-contract/detectors/architectural-patterns.js
    └── src/shared/architecture-utils.js
```

---

## ✅ MEJORAS IMPLEMENTADAS

### **FASE 0: Preventive Gatekeeper - Cross-File Duplicate Guard**

#### **Implementado en:**
1. ✅ `src/layer-c-memory/mcp/tools/atomic-edit/atomic-writer-tool.js`
2. ✅ `src/layer-c-memory/mcp/tools/atomic-edit/atomic-editor-tool.js`

#### **Funcionalidad:**
- **Validación PREVENTIVA** antes de escribir/editar
- **Consulta el grafo completo** usando `query_graph('instances')`
- **Detecta duplicados en OTROS archivos** (cross-file)
- **Dos modos:**
  - `failOnDuplicate: true` → BLOQUEA la escritura
  - `failOnDuplicate: false` → Solo warning (default)

---

### **FASE 1: Fix del Resolvedor de Imports (2026-03-07)** 🔧

#### **Problema Detectado:**
El resolvedor de imports en `atomic_edit` y `atomic_write` estaba fallando al validar rutas relativas. El error era:
```
BROKEN_IMPORTS: "../../../../shared/utils/line-utils.js" 
Intentado: C:\Dev\OmnySystem\shared\utils\line-utils.js (INCORRECTO)
Debería: C:\Dev\OmnySystem\src\shared\utils\line-utils.js
```

#### **Causa Raíz:**
La función `checkImportExists()` en `src/layer-c-memory/mcp/tools/atomic-edit/validators.js` no estaba convirtiendo `sourceFile` a ruta absoluta antes de resolver el import.

#### **Solución Aplicada:**
```javascript
// ANTES (buggy):
const target = path.resolve(path.dirname(sourceFile), importPath);

// DESPUÉS (fixed):
const absoluteSourceFile = path.isAbsolute(sourceFile) 
  ? sourceFile 
  : path.join(projectPath, sourceFile);

const target = path.resolve(path.dirname(absoluteSourceFile), importPath);
```

#### **Archivo Modificado:**
- ✅ `src/layer-c-memory/mcp/tools/atomic-edit/validators.js` (líneas 16-34)

#### **Impacto:**
- ✅ Ahora `atomic_edit` y `atomic_write` pueden validar correctamente imports relativos
- ✅ El guard de duplicados cross-file funciona correctamente
- ✅ Se pueden eliminar duplicados de funciones de forma segura

---

### **FASE 2: Canonización de `getLineNumber()` - COMPLETADA** ✅

#### **Resultado Final:**
- ✅ **Archivo canónico:** `src/shared/utils/line-utils.js`
- ✅ **Fix de imports aplicado:** `validators.js` (FASE 1)
- ✅ **Duplicados eliminados:** 3 archivos refactorizados

#### **Instancias Refactorizadas (5 → 1 + 1 especializada):**
| Archivo | Callers | Estado | Acción |
|---------|---------|--------|--------|
| `src/shared/utils/line-utils.js` | - | ✅ CANÓNICO | Implementación base |
| `src/layer-a-static/extractors/state-management/utils.js` | 12 | ✅ MIGRADO | Import agregado (línea 10) |
| `src/layer-a-static/extractors/utils.js` | 1 | ✅ MIGRADO | Import agregado (línea 9) |
| `src/layer-a-static/extractors/static/utils.js` | 4 | ✅ MIGRADO | Import agregado (línea 10) |
| `src/layer-a-static/extractors/static/route-extractor.js` | 2 | ⚠️ ESPECIALIZADA | Implementación optimizada (búsqueda binaria) |

#### **Cambios Aplicados:**

**1. `state-management/utils.js`:**
```diff
+ import { getLineNumber } from '../../../shared/utils/line-utils.js';

- export function getLineNumber(code, position) {
-   const lines = code.substring(0, position).split('\n');
-   return lines.length;
- }
```

**2. `extractors/utils.js`:**
```diff
+ import { getLineNumber } from '../../shared/utils/line-utils.js';

- export function getLineNumber(code, position) {
-   const lines = code.substring(0, position).split('\n');
-   return lines.length;
- }
```

**3. `static/utils.js`:**
```diff
+ import { getLineNumber } from '../../../shared/utils/line-utils.js';

- export function getLineNumber(code, position) {
-   const lines = code.substring(0, position).split('\n');
-   return lines.length;
- }
```

#### **Validación:**
- ✅ `mcp_omnysystem_validate_imports`: Todos los imports están limpios (CLEAN)
- ✅ No hay imports rotos
- ✅ No hay imports sin usar

#### **Nota sobre `route-extractor.js`:**
Este archivo mantiene su propia implementación de `getLineNumber()` porque:
1. Usa **búsqueda binaria** O(log N) en lugar de O(N)
2. Depende de `computeNewlinePositions()` para uso intensivo
3. Es una optimización válida para extracción masiva de rutas

#### **Lecciones Aprendidas:**
1. ✅ El `move_file` tool mueve TODO el archivo, no solo una función
2. ✅ Es mejor crear el archivo canónico nuevo y luego editar los imports
3. ✅ El resolvedor de imports necesita rutas absolutas para funcionar en Windows
4. ✅ Las implementaciones especializadas (optimizadas) pueden coexistir con el canónico

#### **Métricas de Impacto:**
- **Líneas eliminadas:** ~15 líneas de código duplicado
- **Archivos beneficiados:** 3 archivos con imports centralizados
- **Mantenibilidad:** Una sola implementación que mantener

#### **Código Agregado (~60 líneas):**

**atomic-writer-tool.js (líneas 73-117):**
```javascript
// DUPLICATE GUARD CROSS-FILE (NUEVO - FASE 17)
const newExports = extractExportsFromCode(content);
if (newExports.length > 0) {
    const crossFileDuplicates = [];

    for (const exportItem of newExports) {
        // Skip low-signal names
        if (exportItem.name.length < 3 || /^[a-z]$/.test(exportItem.name)) {
            continue;
        }

        try {
            const existing = await query_graph(
                { queryType: 'instances', symbolName: exportItem.name },
                this.context
            );

            if (existing?.success && existing?.data?.totalInstances > 0) {
                const otherFiles = existing.data.instances.filter(
                    inst => !inst.file_path.endsWith(filePath)
                );

                if (otherFiles.length > 0) {
                    crossFileDuplicates.push({
                        symbol: exportItem.name,
                        type: exportItem.type,
                        existingInstances: otherFiles.length,
                        existingFiles: otherFiles.map(f => f.file_path),
                        existingLocations: otherFiles.map(f => ({
                            file: f.file_path,
                            line: f.line_start
                        }))
                    });
                }
            }
        } catch (error) {
            this.logger.debug(`[CrossFileGuard] Skip ${exportItem.name}: ${error.message}`);
        }
    }

    if (crossFileDuplicates.length > 0) {
        if (failOnDuplicate) {
            return this.formatError('DUPLICATE_SYMBOL_CROSS_FILE', msg, {
                suggestion: 'Consider reusing existing implementation or rename symbol',
                duplicates: crossFileDuplicates,
                canonicalLocations: crossFileDuplicates.map(d => ({
                    symbol: d.symbol,
                    recommendedFile: d.existingFiles[0],
                    reason: 'First existing instance (canonical candidate)'
                }))
            });
        } else {
            this.logger.warn(`${msg}: ${crossFileDuplicates.map(d => d.symbol).join(', ')}`);
        }
    }
}
```

#### **Respuesta MCP Ahora Incluye:**
```json
{
  "success": true,
  "data": {
    "file": "src/foo.js",
    "warnings": [
      "[CrossFileDuplicateGuard] 2 symbol(s) already exist in other file(s): getLineNumber, safeArray"
    ],
    "crossFileDuplicates": [
      {
        "symbol": "getLineNumber",
        "type": "function",
        "existingInstances": 4,
        "existingFiles": ["src/a.js", "src/b.js", "src/c.js", "src/d.js"],
        "existingLocations": [...]
      }
    ]
  }
}
```

---

## 📋 FASES DE CONSOLIDACIÓN

### **FASE 1: Canonización Crítica (Semana 1-2)** ⏳ **PENDIENTE**

#### **1.1 Consolidar `getLineNumber()` - 16 duplicados → 1**

**CANONICAL TARGET:** `src/shared/utils/line-utils.js`

```javascript
/**
 * Obtiene el número de línea para una posición en el código
 * @param {string} code - Código fuente completo
 * @param {number} position - Posición del carácter (0-indexed)
 * @returns {number} Número de línea (1-indexed)
 */
export function getLineNumber(code, position) {
  if (!code || position < 0 || position > code.length) {
    return 1;
  }
  
  let line = 1;
  for (let i = 0; i < position && i < code.length; i++) {
    if (code[i] === '\n') {
      line++;
    }
  }
  return line;
}
```

**Archivos a actualizar (16):**
1. `src/layer-a-static/extractors/utils.js` ✅ (canónico)
2. `src/layer-a-static/extractors/typescript/utils/line-utils.js`
3. `src/layer-a-static/extractors/static/utils.js`
4. `src/layer-a-static/extractors/state-management/utils.js`
5. `src/layer-a-static/pipeline/phases/registration-detector.js`
6. `src/layer-a-static/extractors/css-in-js-extractor/parsers/theme-parser.js`
7. `src/layer-a-static/extractors/css-in-js-extractor/parsers/styled-parser.js`
8. `src/layer-a-static/extractors/css-in-js-extractor/parsers/global-style-parser.js`
9. `src/layer-graph/builders/call-graph.js`
10. `src/shared/analysis/function-analyzer/detectors/global-access-detector.js`
11. + 6 más...

**Estrategia:**
1. Crear `src/shared/utils/line-utils.js` con implementación canónica
2. Usar `mcp_omnysystem_query_graph(queryType='instances', symbolName='getLineNumber')` para listar todos
3. Reemplazar imports en cada archivo
4. Eliminar implementaciones duplicadas
5. Testear con `mcp_omnysystem_generate_tests`

---

#### **1.2 Consolidar `safeArray()` - 3 duplicados → 1**

**CANONICAL TARGET:** `src/shared/compiler/core-utils.js`

```javascript
/**
 * Convierte un valor a array de forma segura
 * @param {*} value - Valor a convertir
 * @returns {Array} Array (vacío si no es array)
 */
export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}
```

**Archivos a actualizar:**
1. `src/core/file-watcher/guards/circular-guard.js` ✅ (canónico)
2. `src/core/file-watcher/guards/impact-wave.js`
3. `src/core/file-watcher/handlers/file-handlers.js`

---

#### **1.3 Consolidar `toNumber()` - 4 duplicados → 1**

**CANONICAL TARGET:** `src/shared/compiler/core-utils.js`

```javascript
/**
 * Convierte un valor a número de forma segura
 * @param {*} value - Valor a convertir
 * @returns {number} Número (0 si NaN)
 */
export function toNumber(value) {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}
```

**Archivos a actualizar:**
1. `src/shared/compiler/signal-coverage.js` ✅ (canónico)
2. `src/shared/compiler/metadata-surface-parity.js`
3. `src/shared/compiler/system-map-persistence.js`
4. `src/shared/compiler/semantic-surface-granularity.js`

---

### **FASE 2: Consolidación de Compiler Layer (Semana 3-4)**

#### **2.1 Merge Conformance + Reporting Pairs**

| Par de Archivos | Acción | Archivo Resultante |
|----------------|--------|-------------------|
| `semantic-purity-conformance.js` + `semantic-purity-reporting.js` | Merge | `semantic-purity-manager.js` |
| `testability-conformance.js` + `testability-reporting.js` | Merge | `testability-manager.js` |
| `shared-state-hotspot-conformance.js` + `shared-state-reporting.js` | Merge | `shared-state-manager.js` |

#### **2.2 Consolidar Live-Row Handling (5 files → 1)**

**Archivos actuales (fragmentación 5-way):**
```
├── live-row-drift.js
├── live-row-reconciliation.js
├── live-row-remediation.js
├── live-row-sync.js
└── live-row-cleanup.js
```

**→ CONSOLIDAR EN:** `src/shared/compiler/live-row-manager.js`

#### **2.3 Consolidar Pipeline Orphans (3 files → 1)**

**Archivos actuales (fragmentación 3-way):**
```
├── pipeline-orphans.js
├── pipeline-orphan-remediation.js
└── pipeline-orphan-reporting.js
```

**→ CONSOLIDAR EN:** `src/shared/compiler/pipeline-orphan-manager.js`

#### **2.4 Consolidar Dead Code (3 files → 1)**

**Archivos actuales (fragmentación 3-way):**
```
├── dead-code-heuristics.js
├── dead-code-remediation.js
└── dead-code-reporting.js
```

**→ CONSOLIDAR EN:** `src/shared/compiler/dead-code-manager.js`

---

### **FASE 3: Sistema de Detect*ConformanceFromSource (Semana 5)**

#### **3.1 Base Class Unification**

**CANONICAL TARGET:** `src/shared/compiler/conformance-base.js`

```javascript
/**
 * Clase base para detectores de conformidad
 * Implementa Template Method Pattern para estandarizar detección
 */
export class ConformanceDetector {
  constructor(policyArea) {
    this.policyArea = policyArea;
  }

  /**
   * Método plantilla - no override
   */
  detectFromSource(code, filePath) {
    const context = this.extractContext(code, filePath);
    const violations = this.findViolations(context);
    return this.buildReport(violations);
  }

  /**
   * Override en subclases
   */
  extractContext(code, filePath) { /* ... */ }
  
  /**
   * Override en subclases
   */
  findViolations(context) { /* ... */ }
  
  /**
   * Estándar - no override
   */
  buildReport(violations) {
    return {
      policyArea: this.policyArea,
      violations,
      timestamp: Date.now()
    };
  }
}
```

#### **3.2 Migrar 8 Detectores Específicos**

```javascript
// Refactor de:
detectTestabilityConformanceFromSource()
detectAsyncErrorConformanceFromSource()
detectCanonicalExtensionConformanceFromSource()
detectCentralityCoverageConformanceFromSource()
detectMetadataPropagationConformanceFromSource()
detectSemanticSurfaceGranularityConformanceFromSource()
detectServiceBoundaryConformanceFromSource()
detectSharedStateHotspotConformanceFromSource()

// A:
class TestabilityDetector extends ConformanceDetector { 
  constructor() { super('testability'); }
  extractContext(code) { /* ... */ }
  findViolations(context) { /* ... */ }
}

class AsyncErrorDetector extends ConformanceDetector { ... }
class CanonicalExtensionDetector extends ConformanceDetector { ... }
// etc...
```

---

### **FASE 4: Limpieza de Pipeline Orphans (Semana 6)**

#### **4.1 Revisar 4 Pipeline Orphans**

| Atom | File | Complexity | Acción Recomendada |
|------|------|------------|-------------------|
| `Phase2Indexer` | `src/core/orchestrator/phase2-indexer.js` | 60 | ⚠️ Review - exported sin callers |
| `LockAnalyzer` | `src/layer-a-static/race-detector/.../LockAnalyzer.js` | 30 | 🔴 Delete or connect |
| `TimingAnalyzer` | `src/layer-a-static/race-detector/.../TimingAnalyzer.js` | 18 | 🔴 Delete or connect |
| `SqlAnalyzer` | `src/layer-a-static/parser/extractors/sql-analyzer.js` | 15 | ⚠️ Review - low complexity |

**Acciones:**
```bash
# 1. Verificar si tienen callers reales
mcp_omnysystem_query_graph(queryType='instances', symbolName='Phase2Indexer')

# 2. Si no tienen callers → eliminar
# 3. Si tienen callers → conectar al pipeline
```

---

### **FASE 5: Guard System Enhancement (Semana 7)**

#### **5.1 Implementar Preventive Gatekeeper en atomic_write/atomic_edit** ✅ **COMPLETADO**

Ver sección "Mejoras Implementadas" más arriba.

---

## 🛠️ HERRAMIENTAS MCP PARA CONSOLIDACIÓN

### **Tools de Lectura/Consulta**

| Tool | Uso en Consolidación |
|------|---------------------|
| `mcp_omnysystem_query_graph` | Listar todas las instancias de un símbolo duplicado |
| `mcp_omnysystem_traverse_graph` | Ver impacto de eliminar un símbolo |
| `mcp_omnysystem_aggregate_metrics` | Obtener lista de duplicados (`aggregationType: 'duplicates'`) |
| `mcp_omnysystem_get_atom_history` | Ver historial de cambios de un símbolo |

### **Tools de Escritura/Refactoring**

| Tool | Uso en Consolidación |
|------|---------------------|
| `mcp_omnysystem_atomic_write` | Crear archivo canónico nuevo |
| `mcp_omnysystem_atomic_edit` | Actualizar imports en archivos existentes |
| `mcp_omnysystem_move_file` | Mover archivo a ubicación canónica |
| `mcp_omnysystem_fix_imports` | Reparar imports rotos automáticamente |
| `mcp_omnysystem_execute_solid_split` | Dividir funciones grandes antes de consolidar |

### **Tools de Validación**

| Tool | Uso en Consolidación |
|------|---------------------|
| `mcp_omnysystem_validate_imports` | Verificar que no haya imports rotos |
| `mcp_omnysystem_generate_tests` | Generar tests para funciones canonizadas |
| `mcp_omnysystem_check_pipeline_integrity` | Verificar integridad post-cambios |

---

## 📖 FLUJO DE TRABAJO RECOMENDADO

### **Para Cada Función a Canonizar:**

```bash
# 1. Identificar todas las instancias
mcp_omnysystem_query_graph(
  queryType='instances',
  symbolName='getLineNumber',
  autoDetect=true
)

# 2. Analizar impacto
mcp_omnysystem_traverse_graph(
  traverseType='impact_map',
  filePath='src/layer-a-static/extractors/utils.js',
  symbolName='getLineNumber'
)

# 3. Crear archivo canónico
mcp_omnysystem_atomic_write(
  filePath='src/shared/utils/line-utils.js',
  content='export function getLineNumber(code, position) {...}',
  failOnDuplicate=true
)

# 4. Actualizar imports en cada archivo
mcp_omnysystem_atomic_edit(
  filePath='src/layer-a-static/extractors/typescript/utils/line-utils.js',
  oldString="function getLineNumber(code, position) {...}",
  newString="import { getLineNumber } from '../../../utils/line-utils.js';",
  autoFix=true
)

# 5. Validar imports
mcp_omnysystem_validate_imports(
  filePath='src/layer-a-static/extractors/typescript/utils/line-utils.js'
)

# 6. Generar tests
mcp_omnysystem_generate_tests(
  filePath='src/shared/utils/line-utils.js',
  functionName='getLineNumber',
  action='generate'
)

# 7. Verificar integridad
mcp_omnysystem_check_pipeline_integrity(fullCheck=false)
```

---

## 🎯 MÉTRICAS DE ÉXITO (Post-Remediación)

| Métrica | Actual | Target v1.0 | Estado |
|---------|--------|-------------|--------|
| Health Score | 63/100 (D) | **90+/100 (A)** | 🔴 |
| Structural Duplicates | 26 grupos | **< 5** | 🔴 |
| Conceptual Duplicates | 50 grupos | **< 10** | 🔴 |
| Pipeline Integrity | 63/100 | **100/100** | 🔴 |
| `getLineNumber()` instances | 16+ | **1** | 🔴 |
| `safeArray()` instances | 3 | **1** | 🔴 |
| `toNumber()` instances | 4 | **1** | 🔴 |
| detect*ConformanceFromSource | 9 duplicados | **1 base class** | 🔴 |
| Preventive Gatekeeper | ✅ Implementado | **Activo** | ✅ |

---

## ⚠️ RIESGOS Y MITIGACIONES

### **Riesgo 0: delete-ghosts.js elimina archivos críticos** ⚠️ **OCURRIÓ (2026-03-07)**
**Incidente:** El script `delete-ghosts.js` eliminó archivos que NO eran fantasmas:
- `src/core/cache/manager/storage.js` ❌
- `src/layer-c-memory/mcp/tools/generate-tests/analyze-for-tests.js` ❌
- `src/core/file-watcher/batch-processor.js` ❌
- `src/core/file-watcher/handlers.js` ❌
- `src/core/file-watcher/lifecycle.js` ❌

**Síntomas:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Dev\OmnySystem\src\core\cache\manager\storage.js'
MCP entra en loop de restarts infinitos (#41, #42, #43...)
```

**Solución:**
```bash
# Restaurar archivos críticos desde git
git restore src/core/cache/manager/storage.js
git restore src/layer-c-memory/mcp/tools/generate-tests/analyze-for-tests.js
git restore src/core/file-watcher/batch-processor.js
git restore src/core/file-watcher/handlers.js
git restore src/core/file-watcher/lifecycle.js

# Verificar estado
git status --short

# Reiniciar MCP
mcp_omnysystem_restart_server(clearCache: true)
```

**Mitigación Futura:**
- ✅ Agregar validación en `delete-ghosts.js` para NO eliminar archivos importados
- ✅ Usar `mcp_omnysystem_validate_imports` antes de eliminar cualquier archivo
- ✅ Backup automático antes de ejecutar scripts de limpieza

---

### **Riesgo 1: Romper imports durante consolidación**
**Mitigación:**
- Usar `mcp_omnysystem_atomic_edit` con `autoFix: true`
- Validar con `mcp_omnysystem_validate_imports` después de cada cambio
- Testear con `mcp_omnysystem_generate_batch_tests`

### **Riesgo 2: Duplicados aumentando más rápido que resolución**
**Mitigación:**
- ✅ Preventive Gatekeeper activo (FASE 0 completada)
- Usar `failOnDuplicate: true` en writes intencionales
- Revisar warnings del File Watcher después de cada edición

### **Riesgo 3: Pipeline Orphans eliminados por error**
**Mitigación:**
- Verificar callers con `mcp_omnysystem_query_graph` antes de eliminar
- Revisar `called_by_json` en la DB
- Backup de archivos antes de eliminar

---

## 📝 NOTAS DE IMPLEMENTACIÓN

### **Lecciones Aprendidas (FASE 0)**

1. ✅ **Cross-File Duplicate Guard funciona** - Detecta duplicados en tiempo real
2. ⚠️ **Ironía detectada** - El código del guard mismo creó duplicados conceptuales (copié el mismo patrón en 2 archivos)
3. ✅ **File Watcher Guards notifican** - El sistema de eventos funciona correctamente
4. ⚠️ **MCP notificaciones son unidireccionales** - El usuario debe revisar warnings manualmente

### **Decisiones de Diseño**

1. **No se implementó MCP Push Notification** - El File Watcher ya notifica vía eventos
2. **Cross-File Guard es no-bloqueante por default** - `failOnDuplicate: false` es el default para no bloquear flujo
3. **Skip low-signal names** - Nombres de 1-2 caracteres no se validan (ruido)

---

## 🔄 PRÓXIMOS PASOS INMEDIATOS

### **Después de Reiniciar Sesión:**

1. ✅ **Verificar que Preventive Gatekeeper funciona**
   ```bash
   # Testear con un duplicado intencional
   mcp_omnysystem_atomic_write(
     filePath='src/test-duplicate.js',
     content='export function getLineNumber() { return 1; }',
     failOnDuplicate=true
   )
   # → Debería fallar con DUPLICATE_SYMBOL_CROSS_FILE
   ```

2. ⏳ **Proceder con FASE 1** - Consolidar `getLineNumber()`
   - Crear `src/shared/utils/line-utils.js`
   - Actualizar 16 archivos
   - Eliminar 15 implementaciones duplicadas

3. ⏳ **Continuar con FASE 2-5** según roadmap

---

## 📚 RECURSOS ADICIONALES

### **Archivos de Referencia**

- `CONSOLIDATION_ROADMAP.md` - Este documento
- `AGENTS.md` - Guía para agentes de IA
- `ARCHITECTURE.md` - Arquitectura del sistema
- `LAYER_A_STATUS.md` - Estado de Layer A

### **Scripts Útiles**

```bash
# Re-análisis completo
node main.js --force-reanalysis

# Limpieza de lifecycle
node scripts/lifecycle-cleanup.js

# Limpieza de DB
node scripts/db-cleanup.js

# Eliminar sesiones fantasma
node delete-ghosts.js
```

### **Comandos MCP Útiles**

```javascript
// Ver duplicados actuales
mcp_omnysystem_aggregate_metrics(aggregationType: 'duplicates')

// Ver estado del pipeline
mcp_omnysystem_check_pipeline_integrity(fullCheck: true)

// Ver reporte de deuda técnica
mcp_omnysystem_get_technical_debt_report()

// Buscar instancias de un símbolo
mcp_omnysystem_query_graph(queryType: 'instances', symbolName: 'getLineNumber', autoDetect: true)
```

---

## 📞 CONTACTO Y SOPORTE

**Para dudas sobre este roadmap:**
1. Revisar `AGENTS.md` para guías de implementación
2. Usar `mcp_omnysystem_suggest_refactoring` para sugerencias
3. Consultar `mcp_omnysystem_suggest_architecture` para decisiones arquitectónicas

---

**Última Actualización:** 2026-03-07T20:45:00.000Z  
**Próxima Revisión:** Después de FASE 1 completada
