# Guía de Herramientas MCP

**Versión**: v0.9.44
**Total**: 23 herramientas implementadas
**Última actualización**: 2026-02-20

---

## Índice Rápido

| Categoría | Herramientas | Cantidad |
|-----------|--------------|----------|
| **Impacto** | `get_impact_map`, `analyze_change`, `trace_variable_impact`, `explain_connection`, `analyze_signature_change` | 5 |
| **Análisis de Código** | `get_call_graph`, `explain_value_flow`, `get_function_details`, `get_molecule_summary` | 4 |
| **Métricas y Salud** | `get_risk_assessment`, `get_health_metrics`, `detect_patterns`, `get_async_analysis` | 4 |
| **Sociedad de Átomos** | `get_atom_society`, `get_atom_history`, `get_removed_atoms` | 3 |
| **Búsqueda y Sistema** | `search_files`, `get_server_status`, `restart_server` | 3 |
| **Editor Atómico** | `atomic_edit`, `atomic_write` | 2 |
| **Refactoring y Validación** | `suggest_refactoring`, `validate_imports` | 2 |
| **TOTAL** | | **23** |

---

## Nota Importante sobre Nombres

Las herramientas en el código usan **camelCase** (ej: `getFunctionDetails`), pero cuando se llaman vía HTTP/MCP, se pueden usar en **camelCase** o **snake_case** (ej: `get_function_details`). El servidor acepta ambos formatos.

---

## Herramientas Atómicas (Funciones)

### `getFunctionDetails`

**Descripción**: Metadata completa de una función (átomo).

**Parámetros**:
- `filePath` (string): Ruta del archivo
- `functionName` (string): Nombre de la función

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/getFunctionDetails \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "src/utils.js",
    "functionName": "processOrder"
  }'
```

**Retorna**:
```json
{
  "atom": {
    "id": "src/utils.js::processOrder",
    "name": "processOrder",
    "type": "atom",
    "line": 42,
    "linesOfCode": 15,
    "complexity": 5,
    "isExported": true,
    "isAsync": false
  },
  "archetype": {
    "type": "read-transform-persist",
    "severity": 3
  },
  "sideEffects": {
    "hasNetworkCalls": false,
    "hasDomManipulation": false,
    "hasStorageAccess": false,
    "hasLogging": true,
    "networkEndpoints": []
  },
  "callGraph": {
    "calls": 3,
    "externalCalls": 1,
    "calledBy": 5,
    "callers": ["src/api.js::handleRequest", "src/controllers.js::processUser"]
  },
  "quality": {
    "hasErrorHandling": true,
    "hasNestedLoops": false,
    "hasBlockingOps": false
  }
}
```

---

### `getAtomicFunctions`

**Descripción**: Lista todas las funciones de un archivo, agrupadas por arquetipo y visibilidad.

**Parámetros**:
- `filePath` (string): Ruta del archivo

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/getAtomicFunctions \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/api.js"}'
```

**Retorna**:
```json
{
  "filePath": "src/api.js",
  "summary": {
    "total": 8,
    "exported": 3,
    "internal": 5,
    "archetypes": ["utility", "hot-path", "dead-function"]
  },
  "byArchetype": {
    "utility": [{ "name": "formatDate", "line": 10, "complexity": 2, "calledBy": 12 }],
    "hot-path": [{ "name": "processRequest", "line": 45, "complexity": 8, "calledBy": 15 }]
  },
  "exported": [...],
  "internal": [...],
  "insights": {
    "deadCode": [],
    "hotPaths": [{ "name": "processRequest", "calledBy": 15 }],
    "fragile": [],
    "godFunctions": []
  }
}
```

---

### `analyzeFunctionChange`

**Descripción**: Analiza el impacto de modificar una función específica.

**Parámetros**:
- `filePath` (string): Ruta del archivo
- `functionName` (string): Nombre de la función

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/analyzeFunctionChange \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "src/utils.js",
    "functionName": "processOrder"
  }'
```

**Retorna**:
```json
{
  "function": "processOrder",
  "file": "src/utils.js",
  "atomId": "src/utils.js::processOrder",
  "directImpact": {
    "callers": ["src/api.js::handleRequest"],
    "callerCount": 5,
    "isExported": true
  },
  "dependencies": {
    "calls": ["validateOrder", "calculateTotal"],
    "externalCalls": ["db.orders.save"],
    "internalCalls": ["validateOrder"]
  },
  "risk": {
    "level": "high",
    "archetype": "hot-path",
    "severity": 7,
    "reason": "Function is called from multiple places"
  },
  "recommendation": "Changes will affect multiple callers - test thoroughly"
}
```

---

## Herramientas Moléculares (Archivos)

### `getImpactMap` ⭐

**Descripción**: Mapa de archivos afectados si modificas uno. Herramienta más importante para evitar "visión de túnel".

**Parámetros**:
- `filePath` (string): Ruta del archivo a analizar

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/getImpactMap \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/core/orchestrator.js"}'
```

**Retorna**:
```json
{
  "file": "src/core/orchestrator.js",
  "directlyAffects": ["src/cli/commands/consolidate.js", "src/api/server.js"],
  "transitiveAffects": ["src/cli/index.js", "src/index.js"],
  "semanticConnections": [
    { "type": "eventListener", "event": "job:progress" },
    { "type": "sharedState", "key": "analysisQueue" }
  ],
  "totalAffected": 8,
  "riskLevel": "high",
  "subsystem": "core"
}
```

**Cuándo usar**:
- ✅ Antes de editar CUALQUIER archivo
- ✅ Para estimar scope de cambio
- ✅ Para identificar god-objects

---

### `analyzeChange`

**Descripción**: Análisis de impacto de cambiar un símbolo (export) específico.

**Parámetros**:
- `filePath` (string): Ruta del archivo
- `symbolName` (string): Nombre del símbolo (función/clase exportada)

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/analyzeChange \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "src/api.js",
    "symbolName": "processOrder"
  }'
```

**Retorna**:
```json
{
  "symbol": "processOrder",
  "file": "src/api.js",
  "symbolType": "FunctionDeclaration",
  "directDependents": ["src/controllers/order.js"],
  "transitiveDependents": ["src/routes.js", "src/app.js"],
  "riskLevel": "critical",
  "recommendation": "⚠️ HIGH RISK - This change affects many files"
}
```

---

### `explainConnection`

**Descripción**: Explica cómo dos archivos están conectados (si es que lo están).

**Parámetros**:
- `fileA` (string): Ruta del primer archivo
- `fileB` (string): Ruta del segundo archivo

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/explainConnection \
  -H "Content-Type: application/json" \
  -d '{
    "fileA": "src/api.js",
    "fileB": "src/db.js"
  }'
```

---

### `getMoleculeSummary`

**Descripción**: Resumen molecular de un archivo con insights derivados.

**Parámetros**:
- `filePath` (string): Ruta del archivo

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/getMoleculeSummary \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/core/orchestrator.js"}'
```

**Retorna**:
```json
{
  "filePath": "src/core/orchestrator.js",
  "atomsAvailable": true,
  "molecule": {
    "archetype": { "type": "god-object", "severity": 9 },
    "complexity": "high",
    "cohesion": 0.75
  },
  "stats": {
    "totalAtoms": 12,
    "deadAtoms": 1,
    "hotPathAtoms": 3,
    "fragileNetworkAtoms": 2
  },
  "atoms": [...],
  "insights": {
    "hasDeadCode": true,
    "hasHotPaths": true,
    "hasFragileNetwork": true,
    "riskLevel": "high"
  }
}
```

---

## Herramientas de Sistema

### `getFullStatus`

**Descripción**: Estado completo del servidor y sistema.

**Ejemplo**:
```bash
curl http://localhost:9999/tools/getFullStatus
```

**Retorna**:
```json
{
  "server": {
    "version": "2.0.0",
    "initialized": true,
    "uptime": 3600,
    "ports": { "http": 9999, "mcp": 9998 }
  },
  "orchestrator": {
    "status": "running",
    "currentJob": null,
    "queue": { "size": 0, "active": 0 },
    "stats": { "processed": 150, "errors": 2 }
  },
  "project": {
    "path": "/path/to/project",
    "totalFiles": 618,
    "totalFunctions": 2450
  },
  "cache": {
    "memory": { "size": 245, "hitRate": 0.94 },
    "disk": { "files": 618 }
  }
}
```

---

### `getFilesStatus`

**Descripción**: Lista todos los archivos analizados con su estado de riesgo.

**Ejemplo**:
```bash
curl http://localhost:9999/tools/getFilesStatus
```

**Retorna**:
```json
{
  "files": [
    {
      "path": "src/core/orchestrator.js",
      "analyzed": true,
      "riskScore": 85,
      "riskSeverity": "high",
      "exports": 12,
      "imports": 8,
      "subsystem": "core"
    }
  ],
  "total": 618
}
```

---

### `getFileTool`

**Descripción**: Obtiene información detallada de un archivo específico.

**Parámetros**:
- `filePath` (string): Ruta del archivo

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/getFileTool \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/api.js"}'
```

---

### `getRisk`

**Descripción**: Obtiene evaluación de riesgo del proyecto o un archivo específico.

**Parámetros**:
- `filePath` (string, opcional): Si se omite, evalúa todo el proyecto

**Ejemplo**:
```bash
# Riesgo de todo el proyecto
curl http://localhost:9999/tools/getRisk

# Riesgo de archivo específico
curl -X POST http://localhost:9999/tools/getRisk \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/core/orchestrator.js"}'
```

---

### `searchFiles`

**Descripción**: Busca archivos por patrón en el nombre.

**Parámetros**:
- `pattern` (string): Patrón a buscar

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/searchFiles \
  -H "Content-Type: application/json" \
  -d '{"pattern": "controller"}'
```

---

### `restartServer`

**Descripción**: Reinicia el servidor MCP.

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/restartServer
```

---

### `clearAnalysisCache`

**Descripción**: Limpia la caché de análisis y fuerza re-análisis.

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/clearAnalysisCache
```

---

## Debugging

### Ver logs

```bash
# Logs del servidor
tail -f logs/mcp-server.log

# Logs de análisis
tail -f logs/analysis.log
```

### Verificar tool específica

```bash
# Test rápido de una tool
curl -s http://localhost:9999/tools/getFullStatus | jq
```

---

## Herramientas Avanzadas (Nuevas en v0.9.44)

### `get_async_analysis`

**Descripción**: Análisis profundo de async/await con detección de waterfalls y recomendaciones de optimización.

**Parámetros**:
- `filePath` (string, opcional): Filtrar por archivo específico
- `riskLevel` (string): 'all', 'high', 'medium', 'low'
- `minSequentialAwaits` (number): Mínimo de awaits seguidos para flaggear (default: 3)

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/get_async_analysis \
  -H "Content-Type: application/json" \
  -d '{"riskLevel": "high"}'
```

**Retorna**:
```json
{
  "summary": {
    "totalAtoms": 5828,
    "asyncAtoms": 872,
    "withIssues": 218,
    "highRisk": 40
  },
  "issues": [
    {
      "atom": "src/core/orchestrator.js::processBatch",
      "type": "waterfall_awaits",
      "risk": "high",
      "description": "18 sequential awaits detected",
      "suggestion": "Consider Promise.all for independent ops"
    }
  ]
}
```

---

### `detect_patterns`

**Descripción**: Detecta patrones de código: duplicados, similar code, god functions, código muerto.

**Parámetros**:
- `patternType` (enum): 'all', 'duplicates', 'complexity', 'god-functions', 'fragile-network'
- `minOccurrences` (number): Mínimo de ocurrencias (default: 2)

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/detect_patterns \
  -H "Content-Type: application/json" \
  -d '{"patternType": "god-functions"}'
```

**Retorna**:
```json
{
  "summary": {
    "exactDuplicates": 437,
    "similarPatterns": 121,
    "potentialSavingsLOC": 19301
  },
  "godFunctions": [
    {
      "name": "checkLogic",
      "file": "src/cli/commands/check.js",
      "complexity": 72,
      "linesOfCode": 240
    }
  ]
}
```

---

### `get_atom_society`

**Descripción**: Detecta "sociedades" de átomos: chains (cadenas), clusters (grupos), hubs (altamente conectados), orphans (huérfanos).

**Parámetros**:
- `filePath` (string, opcional): Filtrar por archivo
- `minCallers` (number): Mínimo callers para ser hub (default: 5)

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/get_atom_society \
  -H "Content-Type: application/json" \
  -d '{"minCallers": 10}'
```

**Retorna**:
```json
{
  "summary": {
    "totalAtoms": 5828,
    "chainCount": 15,
    "clusterCount": 10,
    "hubCount": 20,
    "orphanCount": 20
  },
  "insights": {
    "mostConnected": {
      "name": "has",
      "callers": 224
    },
    "longestChain": {
      "entry": "invalidateCache",
      "depth": 5
    }
  },
  "chains": [...],
  "clusters": [...],
  "hubs": [...],
  "orphans": [...]
}
```

---

### `get_atom_history`

**Descripción**: Obtiene historial Git de un átomo específico (commits, autores, blame).

**Parámetros**:
- `filePath` (string): Ruta del archivo
- `functionName` (string): Nombre de la función
- `maxCommits` (number): Máximo commits (default: 10)

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/get_atom_history \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "src/core/orchestrator.js",
    "functionName": "processJob"
  }'
```

---

### `get_removed_atoms`

**Descripción**: Muestra átomos eliminados del código (útil para detectar duplicación accidental).

**Parámetros**:
- `filePath` (string, opcional): Filtrar por archivo
- `minComplexity` (number): Solo átomos con complexity >= N
- `minCallers` (number): Solo átomos con N+ callers cuando se eliminaron

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/get_removed_atoms \
  -H "Content-Type: application/json" \
  -d '{"minCallers": 5}'
```

---

### `atomic_edit`

**Descripción**: Edita archivos con validación atómica. Valida sintaxis ANTES de guardar, propaga vibración a dependientes, invalida cachés automáticamente.

**Parámetros**:
- `filePath` (string): Archivo a editar
- `oldString` (string): Texto a reemplazar
- `newString` (string): Nuevo texto

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/atomic_edit \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "src/utils.js",
    "oldString": "function old() { return 1; }",
    "newString": "function new() { return 2; }"
  }'
```

**Retorna**:
```json
{
  "success": true,
  "impact": {
    "affectedFiles": 3,
    "changedSymbols": ["old"],
    "severity": "medium"
  }
}
```

---

### `atomic_write`

**Descripción**: Escribe archivos nuevos con validación atómica. Valida sintaxis antes de escribir e indexa inmediatamente.

**Parámetros**:
- `filePath` (string): Ruta del nuevo archivo
- `content` (string): Contenido completo

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/atomic_write \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "src/new-module.js",
    "content": "export function helper() { return true; }"
  }'
```

---

## Referencias

- [mcp-integration.md](./mcp-integration.md) - Integrar con IDEs
- [../03-orchestrator/README.md](../03-orchestrator/README.md) - Cómo funciona internamente
- Código fuente: `src/core/unified-server/tools/`
