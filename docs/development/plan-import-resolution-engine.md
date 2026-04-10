# Plan: Import Resolution Engine para Folderization

## Contexto e Historia

### Folderizaciones realizadas: 5
| # | Familia | Archivos | Resultado |
|---|---------|----------|-----------|
| 1 | `persistence/` | 2 | ✅ Exitosa |
| 2 | `graph-builder/` | 2 | ✅ Exitosa |
| 3 | `restart-runtime/` | 2 | ✅ Exitosa (requirió fix manual de `mcp-http-server.js`) |
| 4 | `move-orchestrator/` | 2 | ✅ Exitosa |
| 5 | `websocket-server/` | 2 | ⚠️ Rompió el server, requirió múltiples fixes manuales |

### Bugs encontrados y fixeados: 8
| # | Bug | Fix aplicado |
|---|-----|-------------|
| 1 | `buildActualMoveMap` matcheaba archivos incorrectos por token similarity | Eliminado del merge |
| 2 | Referencia huérfana `actualMoveMap` en `internalRenameMap` | Eliminada |
| 3 | Regex `rewriteIntraFamilyImports` solo matcheaba `./` imports | Expandido a `../` |
| 4 | Imports relativos externos no se recalculaban | Agregada `rewriteRelativeImportsForNewLocation()` (no funciona correctamente) |
| 5 | Carpeta con prefijo redundante (`compiler/compiler-metrics-snapshot/`) | Strip directory context prefix en `scoreCandidateGroup` |
| 6 | Archivos con prefijo redundante (`compiler-metrics-snapshot-helpers.js`) | `normalizeMemberBasename()` en `buildMoveTarget` |
| 7 | `history`/`snapshot` faltaban en `FOLDERIZATION_SUFFIXES` | Agregados |
| 8 | Imports externos no reescritos tras move (e.g. `mcp-http-server.js` → `restart-runtime.js`) | Fix manual en cada caso |

## El Problema Raíz

### Qué pasa hoy

```
1. folderize_family() genera plan con moveTargets
2. MoveOrchestrator mueve archivos físicamente
3. MoveOrchestrator reescribe ALGUNOS imports internos (rewriteMovedFileReferences)
4. folderize rewriter intenta reescribir imports restantes
5. rewriteRelativeImportsForNewLocation() falla:
   - Lee el archivo DESPUÉS de que fue movido
   - Los imports relativos apuntan a paths que ya no existen
   - resolveImportToAbsolute() calcula desde la ubicación rota
6. Server crashea con ERR_MODULE_NOT_FOUND
7. Fix manual requerido para cada import roto
```

### Ejemplo concreto

```
ANTES: src/core/websocket/server/websocket-server.js
  import '../../constants.js'     → src/core/websocket/constants.js ✅
  import '../connection-handler.js' → src/core/websocket/connection-handler.js ✅

DESPUÉS: src/core/websocket/server/websocket-server/websocket-server.js
  import '../../constants.js'     → src/core/websocket/server/constants.js ❌ NO EXISTE
  import '../connection-handler.js' → src/core/websocket/server/connection-handler.js ❌ NO EXISTE

DEBERÍA SER:
  import '../../../constants.js'     → src/core/websocket/constants.js ✅
  import '../../connection-handler.js' → src/core/websocket/connection-handler.js ✅
```

### Por qué falla `rewriteRelativeImportsForNewLocation()`

1. **Timing incorrecto**: Lee el archivo DESPUÉS de moverlo, cuando los imports ya están rotos
2. **Dependencia de filesystem**: Usa `fs.access()` para verificar si existe un path — pero el path calculado desde la nueva ubicación no existe
3. **Comparación de paths falla**: `normalizeComparablePath` quita extensiones y normaliza separators, pero los paths en `moveTargets` vs los paths reales del archivo no matchean

## Lo que YA tenemos (`src/layer-graph/`)

| Componente | Qué hace | Limitación |
|------------|----------|------------|
| `SystemMap` | Mapa de archivos, imports, dependencias | Estático, se construye en Layer A |
| `ExportIndex` | Índice de exports por archivo | No recalcula al mover archivos |
| `FunctionLinks` | Links who-calls-whom | No maneja import paths |
| `ImpactAnalyzer` | Mapa de impacto | Solo lee, no reescribe |
| `Resolvers` | Resolución de símbolos | No transaccional |

**El gap**: El grafo actual es **solo-lectura**. Folderize necesita un sistema **transaccional** que calcule imports nuevos ANTES de aplicar moves.

## Plan: Import Resolution Engine

### Fase 1: Pre-computation Graph (antes de mover)

**Objetivo**: Construir un mapa completo de imports relativos ANTES de cualquier move.

```js
// src/layer-graph/resolvers/import-resolution-engine.js

class ImportResolutionEngine {
  /**
   * Paso 1: Antes de mover, mapear TODOS los imports relativos
   */
  buildImportMapBeforeMove(moveTargets) {
    // Para cada archivo que se va a mover:
    //   1. Leer el archivo en su ubicación original
    //   2. Extraer TODOS los imports relativos (./ y ../)
    //   3. Resolver cada import a su path absoluto
    //   4. Guardar: { oldFilePath, importSource, resolvedTarget }
  }

  /**
   * Paso 2: Calcular nuevos paths relativos desde las nuevas ubicaciones
   */
  calculateNewRelativeImports(importMap, moveTargets) {
    // Para cada import mapeado:
    //   1. Determinar la NUEVA ubicación del archivo que importa
    //   2. Determinar si el archivo importado TAMBIÉN se movió
    //      - Si SÍ: usar el nuevo path del archivo importado
    //      - Si NO: usar el path original del archivo importado
    //   3. Calcular el nuevo path relativo desde la nueva ubicación
  }

  /**
   * Paso 3: Generar plan de rewrites
   */
  generateRewritePlan(importMap, moveTargets) {
    // Output: {
    //   filePath: 'src/core/websocket/server/websocket-server/websocket-server.js',
    //   rewrites: [
    //     { line: 11, old: '../../constants.js', new: '../../../constants.js' },
    //     { line: 12, old: '../connection-handler.js', new: '../../connection-handler.js' },
    //   ]
    // }
  }
}
```

### Fase 2: Atomic Execution (durante el move)

**Objetivo**: Mover archivos + reescribir imports en una sola transacción.

```js
// src/layer-c-memory/mcp/tools/folderize-family-plan-runner.js

async function runFolderizeMoveBatchWithResolution({ server, focusPlan, moveTargets, projectPath, moveContext }) {
  // 1. PRE-COMPUTE: Construir import map ANTES de mover
  const importMap = await importResolution.buildImportMapBeforeMove(moveTargets);
  
  // 2. CALCULATE: Calcular nuevos imports DESDE las nuevas ubicaciones
  const rewritePlan = await importResolution.calculateNewRelativeImports(importMap, moveTargets);
  
  // 3. MOVE: Mover TODOS los archivos (sin rewrite interno)
  const moveResults = await moveAllFiles(moveTargets, { skipSelfRewrite: true });
  
  // 4. REWRITE: Aplicar TODOS los rewrites de imports
  const rewriteResults = await applyRewrites(rewritePlan);
  
  // 5. VALIDATE: Verificar que todos los imports resuelven
  const validation = await validateAllImports(rewritePlan);
  
  return { moveResults, rewriteResults, validation };
}
```

### Fase 3: Validation Post-Move

**Objetivo**: Verificar que no hay imports rotos.

```js
async function validateAllImports(rewritePlan) {
  // Para cada archivo reescrito:
  //   1. Parsear el archivo
  //   2. Para cada import relativo:
  //      - Resolver el path
  //      - Verificar que el archivo existe
  //      - Verificar que el export existe
  //   3. Reportar errores si los hay
}
```

### Archivos a crear

| Archivo | Propósito |
|---------|-----------|
| `src/layer-graph/resolvers/import-resolution-engine.js` | Motor principal de resolución de imports |
| `src/layer-graph/resolvers/import-map-builder.js` | Construye mapa de imports antes del move |
| `src/layer-graph/resolvers/relative-path-calculator.js` | Calcula nuevos paths relativos |
| `src/layer-graph/resolvers/import-validator.js` | Valida imports post-move |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/layer-c-memory/mcp/tools/folderize-family-plan-runner.js` | Usar ImportResolutionEngine en vez de rewriter actual |
| `src/layer-c-memory/mcp/tools/folderize-family-import-rewriter.js` | Eliminar `rewriteRelativeImportsForNewLocation` (reemplazado) |
| `src/layer-c-memory/mcp/core/shared/move-orchestrator.js` | Mantener `skipSelfRewrite`, delegar al engine |
| `src/layer-graph/index.js` | Exportar nuevo engine |

## Roadmap

### Sprint 1: Import Map Builder (día 1-2)
- [ ] Crear `import-map-builder.js`
- [ ] Extraer imports relativos de archivos
- [ ] Resolver imports a paths absolutos
- [ ] Tests unitarios

### Sprint 2: Relative Path Calculator (día 3-4)
- [ ] Crear `relative-path-calculator.js`
- [ ] Calcular nuevos paths desde nuevas ubicaciones
- [ ] Manejar imports a archivos que también se movieron
- [ ] Tests unitarios

### Sprint 3: Import Validator (día 5)
- [ ] Crear `import-validator.js`
- [ ] Validar que imports resuelven a archivos existentes
- [ ] Validar que exports existen
- [ ] Tests unitarios

### Sprint 4: Integration con Folderize (día 6-7)
- [ ] Integrar engine en `folderize-family-plan-runner.js`
- [ ] Eliminar `rewriteRelativeImportsForNewLocation`
- [ ] Test end-to-end con folderización real
- [ ] Fix bugs encontrados

### Sprint 5: Cleanup y docs (día 8)
- [ ] Eliminar código muerto del rewriter viejo
- [ ] Actualizar AGENTS.md
- [ ] Documentar en CHANGELOG

## Principios de Diseño

1. **Pre-compute, no post-fix**: Calcular TODO antes de mover
2. **Atomicidad**: Move + rewrite en una sola transacción
3. **Fail-fast**: Si la validación falla, NO aplicar cambios
4. **Fuente de verdad**: El grafo (no el filesystem) para resolución de imports
5. **No depender de fs.access**: Usar el grafo como fuente de truth
