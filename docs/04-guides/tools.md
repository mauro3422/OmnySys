# Guía de Herramientas MCP

**Versión**: v0.9.61  
**Total**: **29 herramientas** implementadas  
**Última actualización**: 2026-02-25  
**Estado**: ✅ **100% Estático, 0% LLM**

---

## Índice Rápido

| Categoría | Herramientas | Cantidad |
|-----------|--------------|----------|
| **Impacto** | `get_impact_map`, `analyze_change`, `trace_variable_impact`, `trace_data_journey`, `explain_connection`, `analyze_signature_change` | 6 |
| **Análisis de Código** | `get_call_graph`, `explain_value_flow`, `get_function_details`, `get_molecule_summary`, `find_symbol_instances` | 5 |
| **Métricas y Salud** | `get_risk_assessment`, `get_health_metrics`, `detect_patterns`, `get_async_analysis`, `detect_race_conditions` | 5 |
| **Sociedad de Átomos** | `get_atom_society`, `get_atom_history`, `get_removed_atoms` | 3 |
| **Búsqueda y Sistema** | `search_files`, `get_server_status`, `restart_server`, `get_atom_schema` | 4 |
| **Editor Atómico** | `atomic_edit`, `atomic_write` | 2 |
| **Refactoring y Validación** | `suggest_refactoring`, `validate_imports` | 2 |
| **Testing** | `generate_tests`, `generate_batch_tests` | 2 |
| **TOTAL** | | **29** |

---

## Nota Importante

**Todas las herramientas son 100% ESTÁTICAS**. No usan LLM. Los resultados son determinísticos: misma entrada → misma salida.

---

## Herramientas de Impacto

### `get_impact_map`

**Descripción**: Returns a complete impact map for a file. Muestra qué archivos se ven afectados si cambias un archivo.

**Parámetros**:
- `filePath` (string, required): Ruta del archivo
- `autoAnalyzeMissing` (boolean, default: false): Si true, enqueue on-demand analysis cuando el archivo no está indexado
- `autoAnalyzeTimeoutMs` (number, default: 60000): Timeout para on-demand analysis
- `offset` (number, default: 0): Skip first N items (pagination)
- `limit` (number, default: 10): Max items per array

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/get_impact_map \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/app.js"}'
```

**Retorna**:
```json
{
  "file": "src/app.js",
  "imports": {
    "total": 5,
    "internal": ["src/utils.js", "src/config.js"],
    "external": ["lodash", "express"]
  },
  "exports": ["main", "init"],
  "definitions": [
    {"name": "main", "type": "function", "line": 10},
    {"name": "init", "type": "function", "line": 50}
  ],
  "directlyAffects": ["src/utils.js", "src/config.js"],
  "transitiveAffects": ["src/api.js", "src/routes.js"],
  "totalAffected": 15,
  "semanticConnections": [
    {"type": "localStorage", "via": "app-state"},
    {"type": "eventListener", "via": "app:init"}
  ],
  "riskLevel": "medium",
  "riskScore": 0.5
}
```

---

### `analyze_change`

**Descripción**: Analiza el impacto de cambiar un símbolo específico (función, variable).

**Parámetros**:
- `filePath` (string, required): Ruta del archivo
- `symbolName` (string, required): Nombre del símbolo
- `autoAnalyzeMissing` (boolean, default: false)
- `autoAnalyzeTimeoutMs` (number, default: 60000)

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/analyze_change \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/utils.js", "symbolName": "processOrder"}'
```

**Retorna**:
```json
{
  "symbol": "processOrder",
  "filePath": "src/utils.js",
  "directDependents": [
    {"file": "src/api.js", "function": "handleRequest"},
    {"file": "src/controllers.js", "function": "processUser"}
  ],
  "transitiveDependents": [
    {"file": "src/routes.js", "function": "setupRoutes"}
  ],
  "totalAffected": 5,
  "riskLevel": "medium",
  "breakingChanges": [],
  "recommendations": [
    "Update tests in src/utils.test.js",
    "Check error handling in callers"
  ]
}
```

---

### `trace_variable_impact`

**Descripción**: Traces how a variable propagates through the call graph using weighted influence propagation (like PageRank).

**Parámetros**:
- `filePath` (string, required)
- `symbolName` (string, required)
- `variableName` (string, required)
- `maxDepth` (number, default: 3)

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/trace_variable_impact \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "src/utils.js",
    "symbolName": "processOrder",
    "variableName": "config"
  }'
```

---

### `trace_data_journey`

**Descripción**: Traces the deterministic journey of a variable/parameter across cross-file call chains.

**Parámetros**:
- `filePath` (string, required)
- `symbolName` (string, required)
- `variableName` (string, required)
- `maxDepth` (number, default: 5)

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/trace_data_journey \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "src/utils.js",
    "symbolName": "processOrder",
    "variableName": "order"
  }'
```

---

### `explain_connection`

**Descripción**: Explains why two files are connected.

**Parámetros**:
- `fileA` (string, required)
- `fileB` (string, required)

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/explain_connection \
  -H "Content-Type: application/json" \
  -d '{
    "fileA": "src/app.js",
    "fileB": "src/utils.js"
  }'
```

---

### `analyze_signature_change`

**Descripción**: Predicts breaking changes if you modify a function signature.

**Parámetros**:
- `filePath` (string, required)
- `symbolName` (string, required)
- `newSignature` (string, optional): New signature to analyze

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/analyze_signature_change \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "src/utils.js",
    "symbolName": "processOrder",
    "newSignature": "processOrder(order, userId, options)"
  }'
```

---

## Herramientas de Análisis de Código

### `get_call_graph`

**Descripción**: Shows ALL call sites of a symbol - who calls what, where, and how.

**Parámetros**:
- `filePath` (string, required)
- `symbolName` (string, required)
- `includeContext` (boolean, default: true)
- `offset` (number, default: 0)
- `limit` (number, default: 10)

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/get_call_graph \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "src/utils.js",
    "symbolName": "processOrder"
  }'
```

---

### `explain_value_flow`

**Descripción**: Shows data flow: inputs → symbol → outputs → consumers.

**Parámetros**:
- `filePath` (string, required)
- `symbolName` (string, required)
- `maxDepth` (number, default: 2)

---

### `get_function_details`

**Descripción**: Gets COMPLETE atomic information about a function including performance, async analysis, error flow, data flow, DNA, and recommendations.

**Parámetros**:
- `filePath` (string, required)
- `functionName` (string, required)
- `includeTransformations` (boolean, default: false)

---

### `get_molecule_summary`

**Descripción**: Gets molecular summary of a file - all functions with their archetypes and insights, organized by archetype and visibility.

**Parámetros**:
- `filePath` (string, required)

---

### `find_symbol_instances`

**Descripción**: Finds all instances of a symbol (function/variable) in the project, detects duplicates, determines which one is actually used.

**Parámetros**:
- `symbolName` (string, required)
- `includeSimilar` (boolean, default: false)
- `autoDetect` (boolean, default: false)

---

## Herramientas de Métricas

### `get_risk_assessment`

**Descripción**: Returns a risk assessment of the entire project.

**Parámetros**:
- `minSeverity` (string, default: "medium", enum: ["low", "medium", "high", "critical"])
- `offset` (number, default: 0)
- `limit` (number, default: 10)

---

### `get_health_metrics`

**Descripción**: Calculates code health metrics: entropy, cohesion, health distribution, and recommendations.

**Parámetros**:
- `filePath` (string, optional): Filter by file path
- `includeDetails` (boolean, default: false)
- `offset` (number, default: 0)
- `limit` (number, default: 10)

---

### `detect_patterns`

**Descripción**: Detecta patrones de código: duplicados, código similar, god functions, fragile network calls, dead code, complexity hotspots, circular dependencies, test coverage gaps, y architectural debt.

**Parámetros**:
- `patternType` (string, default: "all", enum: ["all", "duplicates", "complexity", "archetype", "god-functions", "fragile-network", "circular", "test-coverage", "architectural-debt"])
- `minOccurrences` (number, default: 2)
- `offset` (number, default: 0)
- `limit` (number, default: 10)

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/detect_patterns \
  -H "Content-Type: application/json" \
  -d '{"patternType": "dead-code"}'
```

---

### `get_async_analysis`

**Descripción**: Deep async analysis with actionable recommendations: waterfall detection, parallelization opportunities, Promise.all suggestions.

**Parámetros**:
- `filePath` (string, optional)
- `minSequentialAwaits` (number, default: 3)
- `riskLevel` (string, default: "all", enum: ["all", "high", "medium", "low"])
- `includeRecommendations` (boolean, default: true)
- `offset` (number, default: 0)
- `limit` (number, default: 10)

---

### `detect_race_conditions`

**Descripción**: Phase 4: Detects race conditions in async code. Finds WW (write-write), RW (read-write), and IE (init-error) races.

**Parámetros**:
- `filePath` (string, optional)
- `minSeverity` (string, default: "low", enum: ["low", "medium", "high", "critical"])
- `limit` (number, default: 20)

---

## Herramientas de Sociedad de Átomos

### `get_atom_society`

**Descripción**: Detects atom societies: chains (A→B→C), clusters (mutually connected), hubs (highly connected), and orphans (unused).

**Parámetros**:
- `filePath` (string, optional)
- `minCallers` (number, default: 5)
- `maxChains` (number, default: 10)
- `offset` (number, default: 0)
- `limit` (number, default: 10)

---

### `get_atom_history`

**Descripción**: Gets git history for an atom/function: commits, authors, blame info, and recent changes.

**Parámetros**:
- `filePath` (string, required)
- `functionName` (string, required)
- `includeDiff` (boolean, default: false)
- `maxCommits` (number, default: 10)
- `offset` (number, default: 0)
- `limit` (number, default: 10)

---

### `get_removed_atoms`

**Descripción**: Shows history of atoms (functions) removed from source files.

**Parámetros**:
- `filePath` (string, optional)
- `minCallers` (number, default: 0)
- `minComplexity` (number, default: 0)
- `offset` (number, default: 0)
- `limit` (number, default: 10)

---

## Herramientas de Sistema

### `search_files`

**Descripción**: Search for files in the project by pattern.

**Parámetros**:
- `pattern` (string, required)
- `offset` (number, default: 0)
- `limit` (number, default: 10)

---

### `get_server_status`

**Descripción**: Returns the complete status of the OmnySys server.

**Parámetros**: None

**Ejemplo**:
```bash
curl http://localhost:9999/tools/get_server_status
```

---

### `restart_server`

**Descripción**: Restarts the OmnySys server to load updated code.

**Parámetros**:
- `clearCache` (boolean, default: false)
- `reanalyze` (boolean, default: false)

---

### `get_atom_schema`

**Descripción**: Inspects the live atom index and returns a dynamic schema of available metadata fields.

**Parámetros**:
- `atomType` (string, optional)
- `focusField` (string, optional)
- `sampleSize` (number, default: 3)

---

## Editor Atómico

### `atomic_edit`

**Descripción**: Edits a file with atomic validation - validates syntax, propagates vibration to dependents, and prevents breaking changes.

**Parámetros**:
- `filePath` (string, required)
- `oldString` (string, required)
- `newString` (string, required)

---

### `atomic_write`

**Descripción**: Writes a new file with atomic validation - validates syntax before writing and immediately indexes the atom.

**Parámetros**:
- `filePath` (string, required)
- `content` (string, required)

---

## Refactoring y Validación

### `suggest_refactoring`

**Descripción**: Analyzes code and suggests specific refactoring improvements.

**Parámetros**:
- `filePath` (string, optional)
- `severity` (string, default: "all", enum: ["all", "high", "medium", "low"])
- `offset` (number, default: 0)
- `limit` (number, default: 10)

---

### `validate_imports`

**Descripción**: Validates imports in files: detects broken imports, unused imports, circular dependencies, and non-existent modules.

**Parámetros**:
- `filePath` (string, optional)
- `checkBroken` (boolean, default: true)
- `checkUnused` (boolean, default: true)
- `checkCircular` (boolean, default: false)
- `checkFileExistence` (boolean, default: false)
- `excludePaths` (array, optional)
- `offset` (number, default: 0)
- `limit` (number, default: 10)

---

## Testing

### `generate_tests`

**Descripción**: Analyzes functions/classes and suggests tests.

**Parámetros**:
- `filePath` (string, required)
- `functionName` (string, optional)
- `className` (string, optional)
- `action` (string, default: "analyze", enum: ["analyze", "generate"])
- `options` (object, optional)

---

### `generate_batch_tests`

**Descripción**: Generates tests for multiple functions without test coverage in batch.

**Parámetros**:
- `dryRun` (boolean, default: true)
- `outputPath` (string, default: "tests/generated")
- `limit` (number, default: 10)
- `sortBy` (string, default: "risk", enum: ["risk", "complexity", "fragility", "name"])
- `minComplexity` (number, default: 5)

---

## Referencias

- [quickstart.md](./quickstart.md) - Quick start guide
- [DATA_FLOW.md](../02-architecture/DATA_FLOW.md) - Flujo de datos detallado
- [core.md](../02-architecture/core.md) - Arquitectura unificada

---

**Última actualización**: 2026-02-25 (v0.9.61)  
**Estado**: ✅ 100% Estático, 0% LLM  
**Próximo**: 🚧 Migración a Tree-sitter (Q2 2026)
