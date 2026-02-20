# MCP Tools - Documentación Completa

**Versión**: v0.9.44  
**Fecha**: 2026-02-20  
**Total Tools**: 23 implementadas

---

## Índice Rápido

| # | Tool | Categoría | Auto-Analysis |
|---|------|-----------|---------------|
| 1 | `get_impact_map` | Impacto | ✅ Sí |
| 2 | `analyze_change` | Impacto | ✅ Sí |
| 3 | `trace_variable_impact` | Impacto | ✅ Sí |
| 4 | `explain_connection` | Impacto | ✅ Sí |
| 5 | `analyze_signature_change` | Impacto | ✅ Sí |
| 6 | `get_call_graph` | Código | ✅ Sí |
| 7 | `explain_value_flow` | Código | ✅ Sí |
| 8 | `get_function_details` | Código | ✅ Sí |
| 9 | `get_molecule_summary` | Código | ✅ Sí |
| 10 | `get_risk_assessment` | Métricas | ❌ No |
| 11 | `get_health_metrics` | Métricas | ❌ No |
| 12 | `detect_patterns` | Métricas | ❌ No |
| 13 | `get_async_analysis` | Métricas | ❌ No |
| 14 | `get_atom_society` | Sociedad | ❌ No |
| 15 | `get_atom_history` | Sociedad | ✅ Sí |
| 16 | `get_removed_atoms` | Sociedad | ❌ No |
| 17 | `search_files` | Sistema | ❌ No |
| 18 | `get_server_status` | Sistema | ❌ No |
| 19 | `restart_server` | Sistema | ❌ No |
| 20 | `atomic_edit` | Editor | ✅ Sí |
| 21 | `atomic_write` | Editor | ✅ Sí |
| 22 | `suggest_refactoring` | Refactoring | ✅ Sí |
| 23 | `validate_imports` | Validación | ❌ No |

---

## Entry Point

```bash
node src/layer-c-memory/mcp-server.js <project-path> [flags]
```

### Flags Disponibles

| Flag | Descripción |
|------|-------------|
| `--skip-llm` | Desactivar IA (solo análisis estático) |
| `--verbose` | Modo detallado con logging extendido |
| `--debug-terminal` | Muestra terminal de debug con logs |

### Ejemplos

```bash
# Análisis completo
node src/layer-c-memory/mcp-server.js ./mi-proyecto

# Sin LLM (más rápido)
node src/layer-c-memory/mcp-server.js --skip-llm ./mi-proyecto

# Modo debug
node src/layer-c-memory/mcp-server.js --debug-terminal ./mi-proyecto
```

---

## Arquitectura del Servidor

```text
┌─────────────────────────────────────────────────────────────┐
│                    Tu IA (Claude, OpenCode)                 │
│                         ↕ MCP Protocol                      │
├─────────────────────────────────────────────────────────────┤
│  mcp-server.js (Proxy)                                      │
│  ├─ Mantiene stdio vivo                                     │
│  ├─ Spawnea workers                                         │
│  └─ Permite reinicios sin perder conexión                   │
├─────────────────────────────────────────────────────────────┤
│  Pipeline de Inicialización (7 Steps)                       │
│  1. InstanceDetectionStep                                   │
│  2. LayerAAnalysisStep    ← Análisis estático               │
│  3. CacheInitStep                                           │
│  4. LLMSetupStep          ← LLM en background               │
│  5. OrchestratorInitStep                                    │
│  6. McpSetupStep                                            │
│  7. ReadyStep                                               │
├─────────────────────────────────────────────────────────────┤
│  21 Tools MCP                                               │
│  ├─ Auto-análisis on-demand                                 │
│  ├─ Paginación recursiva                                    │
│  └─ Hot-reload                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Herramientas por Categoría

### 1. Impacto y Análisis de Cambios

#### `get_impact_map`

**Descripción**: Retorna mapa completo de impacto para un archivo: dependencias, dependientes, riesgos asociados.

**Parámetros**:
```json
{
  "filePath": "string",      // Requerido - Ruta al archivo
  "limit": 10,               // Opcional - Items por página
  "offset": 0                // Opcional - Offset paginación
}
```

**Retorna**:
```json
{
  "file": "src/core/orchestrator.js",
  "imports": {
    "total": 12,
    "internal": [{"source": "../cache", "names": ["get"]}],
    "external": ["express", "ws"]
  },
  "exports": ["orchestrator", "createQueue"],
  "directlyAffects": ["src/api/server.js", "src/cli/commands.js"],
  "transitiveAffects": ["src/routes.js"],
  "totalAffected": 8,
  "riskLevel": "high",
  "semanticConnections": [...]
}
```

**Cuándo usar**: ✅ Antes de editar CUALQUIER archivo

---

#### `analyze_change`

**Descripción**: Analiza el impacto de modificar un símbolo específico.

**Parámetros**:
```json
{
  "filePath": "string",      // Requerido
  "symbolName": "string"     // Requerido - Función/clase/variable
}
```

**Retorna**:
```json
{
  "symbol": "processOrder",
  "file": "src/api.js",
  "symbolType": "FunctionDeclaration",
  "directDependents": ["src/controllers/order.js"],
  "transitiveDependents": ["src/routes.js", "src/app.js"],
  "totalAffected": 8,
  "riskLevel": "critical",
  "recommendation": "⚠️ HIGH RISK - This change affects many files"
}
```

---

#### `trace_variable_impact`

**Descripción**: Traza cómo una variable se propaga por el grafo de llamadas (weighted influence propagation como PageRank).

**Parámetros**:
```json
{
  "filePath": "string",      // Requerido - Archivo donde origina
  "symbolName": "string",    // Requerido - Función contenedora
  "variableName": "string",  // Requerido - Variable a trazar
  "maxDepth": 3              // Opcional - Profundidad máxima
}
```

**Ejemplo**: Trazar `parsedFiles` desde `indexProject` para ver qué funciones se ven afectadas si cambia esa estructura.

---

#### `explain_connection`

**Descripción**: Explica por qué dos archivos están conectados (imports, eventos compartidos, mixins, etc.).

**Parámetros**:
```json
{
  "fileA": "string",         // Requerido
  "fileB": "string"          // Requerido
}
```

**Retorna**:
```json
{
  "fileA": "src/api.js",
  "fileB": "src/db.js",
  "connected": true,
  "connectionCount": 3,
  "connections": [
    {"type": "import", "direction": "src/api.js → imports → src/db.js"},
    {"type": "shared-event", "event": "data:updated"},
    {"type": "shared-dependency", "sharedModules": ["src/models.js"]}
  ]
}
```

---

#### `analyze_signature_change`

**Descripción**: Predice breaking changes si modificas la firma de una función.

**Parámetros**:
```json
{
  "filePath": "string",       // Requerido
  "symbolName": "string",     // Requerido
  "newSignature": "string"    // Opcional - Nueva firma a analizar
}
```

**Ejemplo**: `analyze_signature_change({"filePath": "src/api.js", "symbolName": "createUser", "newSignature": "createUser(userData, options)"})`

---

### 2. Análisis de Código

#### `get_call_graph`

**Descripción**: Muestra TODOS los call sites de un símbolo: quién llama qué, dónde y cómo.

**Parámetros**:
```json
{
  "filePath": "string",       // Requerido
  "symbolName": "string",     // Requerido
  "includeContext": true,     // Opcional - Incluir código
  "limit": 10,
  "offset": 0
}
```

---

#### `explain_value_flow`

**Descripción**: Muestra flujo de datos: inputs → símbolo → outputs → consumers.

**Parámetros**:
```json
{
  "filePath": "string",
  "symbolName": "string",
  "maxDepth": 2               // Profundidad de dependencias
}
```

---

#### `get_function_details`

**Descripción**: Metadata COMPLETA de una función: performance, async, error flow, data flow, DNA, recomendaciones.

**Parámetros**:
```json
{
  "filePath": "string",
  "functionName": "string",
  "includeTransformations": false  // Opcional - Incluir transformaciones detalladas
}
```

**Retorna**:
```json
{
  "atom": {
    "name": "processOrder",
    "complexity": 5,
    "linesOfCode": 15,
    "isAsync": true,
    "isExported": true
  },
  "archetype": "read-transform-persist",
  "performance": {
    "complexity": {"cyclomatic": 5, "bigO": "O(n)"},
    "expensiveOps": {"nestedLoops": 0, "recursion": false}
  },
  "asyncAnalysis": {
    "patterns": {"hasAwait": true, "hasPromiseAll": false},
    "sequentialOperations": [...]
  },
  "errorFlow": {
    "throws": [...],
    "catches": [...],
    "unhandledCalls": [...]
  },
  "dataFlow": {
    "inputs": [...],
    "outputs": [...],
    "transformationCount": 3
  },
  "dna": {
    "structuralHash": "abc123",
    "patternHash": "def456",
    "flowType": "async-transform"
  },
  "derived": {
    "fragilityScore": 0.3,
    "testabilityScore": 0.8,
    "changeRisk": 0.5
  }
}
```

---

#### `get_molecule_summary`

**Descripción**: Resumen molecular de un archivo: todas las funciones organizadas por arquetipo y visibilidad.

**Parámetros**:
```json
{
  "filePath": "string"
}
```

**Retorna**:
```json
{
  "file": "src/core/orchestrator.js",
  "archetype": {"type": "orchestrator", "confidence": 0.95},
  "stats": {
    "totalAtoms": 12,
    "byArchetype": {
      "orchestrator": 3,
      "handler": 4,
      "utility": 2
    },
    "byVisibility": {
      "exported": 5,
      "internal": 7
    }
  }
}
```

---

### 3. Métricas y Salud

#### `get_risk_assessment`

**Descripción**: Evaluación de riesgos de todo el proyecto.

**Parámetros**:
```json
{
  "minSeverity": "medium",    // Opcional: low, medium, high, critical
  "limit": 10,
  "offset": 0
}
```

---

#### `get_health_metrics`

**Descripción**: Métricas de salud del código: entropía, cohesión, distribución de calidad.

**Parámetros**:
```json
{
  "filePath": "string",       // Opcional - filtrar por archivo
  "includeDetails": false,    // Opcional - métricas detalladas
  "limit": 10,
  "offset": 0
}
```

**Retorna**:
```json
{
  "summary": {
    "totalAtoms": 5828,
    "overallScore": 99,
    "grade": "A",
    "averageComplexity": "3.3"
  },
  "healthDistribution": {
    "A": 5725, "B": 57, "C": 22, "D": 16, "F": 8
  },
  "entropy": {"raw": "1.73", "normalized": 0},
  "cohesion": {"average": "0.50"},
  "unhealthyAtoms": [...]
}
```

---

#### `detect_patterns`

**Descripción**: Detecta patrones de código: duplicados (via DNA hash), similar code (via pattern hash), god functions, código muerto.

**Parámetros**:
```json
{
  "patternType": "all",       // all, duplicates, complexity, god-functions, fragile-network
  "minOccurrences": 2,
  "limit": 10,
  "offset": 0
}
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
    {"name": "checkLogic", "complexity": 72, "linesOfCode": 240}
  ],
  "deadCode": [...],
  "unusedExports": [...]
}
```

---

#### `get_async_analysis`

**Descripción**: Análisis profundo de async con recomendaciones accionables: detección de waterfalls, oportunidades de parallelización.

**Parámetros**:
```json
{
  "filePath": "string",       // Opcional - filtrar por archivo
  "riskLevel": "all",         // all, high, medium, low
  "minSequentialAwaits": 3,   // Mínimo de awaits seguidos para flaggear
  "includeRecommendations": true,
  "limit": 10,
  "offset": 0
}
```

**Retorna**:
```json
{
  "summary": {
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
      "suggestion": "Consider Promise.all for independent operations"
    }
  ],
  "recommendations": [...]
}
```

---

### 4. Sociedad de Átomos

#### `get_atom_society`

**Descripción**: Detecta "sociedades" de átomos: chains (cadenas de llamadas), clusters (mutuamente conectados), hubs (altamente conectados), orphans (no usados).

**Parámetros**:
```json
{
  "filePath": "string",       // Opcional
  "minCallers": 5,            // Mínimo callers para ser hub
  "maxChains": 10,            // Máximo chains a retornar
  "limit": 10,
  "offset": 0
}
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
    "mostConnected": {"name": "has", "callers": 224},
    "longestChain": {"entry": "invalidateCache", "depth": 5}
  },
  "chains": [...],
  "clusters": [...],
  "hubs": [...],
  "orphans": [...]
}
```

---

#### `get_atom_history`

**Descripción**: Historial Git de un átomo: commits, autores, blame info.

**Parámetros**:
```json
{
  "filePath": "string",
  "functionName": "string",
  "maxCommits": 10,
  "includeDiff": false,
  "limit": 10,
  "offset": 0
}
```

---

#### `get_removed_atoms`

**Descripción**: Muestra átomos eliminados del código. Útil para detectar duplicación antes de re-implementar algo que ya existió.

**Parámetros**:
```json
{
  "filePath": "string",       // Opcional
  "minComplexity": 0,         // Solo con complexity >= N
  "minCallers": 0,            // Solo con N+ callers cuando se eliminaron
  "limit": 50
}
```

---

### 5. Búsqueda y Sistema

#### `search_files`

**Descripción**: Busca archivos en el proyecto por patrón.

**Parámetros**:
```json
{
  "pattern": "string",        // Patrón glob o substring
  "limit": 10,
  "offset": 0
}
```

**Retorna**:
```json
{
  "pattern": "orchestrator",
  "found": 15,
  "files": ["src/core/orchestrator.js"],
  "symbolFiles": [{"path": "src/utils.js", "symbols": ["createOrchestrator"]}],
  "totalIndexed": 1760
}
```

---

#### `get_server_status`

**Descripción**: Estado completo del servidor OmnySys.

**Parámetros**: `{}` (ninguno)

**Retorna**:
```json
{
  "initialized": true,
  "project": "/path/to/project",
  "orchestrator": {
    "isRunning": true,
    "queueSize": 0
  },
  "metadata": {
    "totalFiles": 1760,
    "totalFunctions": 6174
  }
}
```

---

#### `restart_server`

**Descripción**: Reinicia el servidor OmnySys para cargar código actualizado. Mantiene conexión stdio viva.

**Parámetros**:
```json
{
  "clearCache": false         // Limpiar caché antes de reiniciar
}
```

---

### 6. Editor Atómico

#### `atomic_edit`

**Descripción**: Edita un archivo con validación atómica. Valida sintaxis ANTES de guardar, propaga vibración a dependientes, invalida cachés automáticamente.

**Parámetros**:
```json
{
  "filePath": "string",
  "oldString": "string",      // Texto exacto a reemplazar
  "newString": "string"       // Nuevo texto
}
```

**Retorna**:
```json
{
  "success": true,
  "impact": {
    "affectedFiles": 3,
    "changedSymbols": ["oldFunction"],
    "severity": "medium"
  },
  "validation": {
    "syntaxValid": true
  }
}
```

**Errores**:
- `SYNTAX_ERROR`: Si el nuevo código tiene errores de sintaxis

---

#### `atomic_write`

**Descripción**: Escribe un archivo nuevo con validación atómica. Valida sintaxis antes de escribir e indexa inmediatamente.

**Parámetros**:
```json
{
  "filePath": "string",
  "content": "string"         // Contenido completo del archivo
}
```

---

## Auto-Análisis

Las tools marcadas con ✅ **Auto-Analysis** pueden analizar archivos on-demand:

```text
1. Tool recibe request
2. Verifica si archivo está analizado
3. Si NO está analizado:
   a. Agrega a cola como CRITICAL
   b. Espera análisis (timeout: 60s)
   c. Continúa con respuesta
4. Retorna datos completos
```

**Ventaja**: No necesitas pre-analizar todo. La tool se encarga.

---

## Paginación

Todas las tools con arrays implementan paginación recursiva automática:

```json
{
  "data": [...],
  "_pagination": {
    "offset": 0,
    "limit": 10,
    "fields": {
      "data": {
        "total": 100,
        "returned": 10,
        "hasMore": true,
        "nextOffset": 10
      }
    }
  }
}
```

**Uso**: Para obtener más resultados, repite la llamada con `offset: 10`, `offset: 20`, etc.

---

## Hot-Reload

El servidor detecta cambios en el código fuente de las tools y se recarga automáticamente sin perder la conexión MCP.

```text
1. Guardas cambio en src/layer-c-memory/mcp/tools/*.js
2. HotReloadManager detecta cambio
3. Selecciona estrategia (tool, pipeline, handler, etc.)
4. Recarga módulo específico
5. Sistema continúa funcionando
```

---

## Flujo Completo por Capas

```text
MCP Server (stdio)
    │
    ▼
Layer C - Memory/Query
    │ cache RAM ←──┐
    │              │
    ▼              │
Layer Graph - Graph System
    │ SystemMap, ImpactMap, CallGraph
    │
    ▼
Layer B - Semantic Analysis (LLM opcional)
    │ Archetypes, LLM Insights (20% archivos)
    │
    ▼
Layer A - Static Analysis
    │ AST Parser, Extractors, Cross-Reference
    │
    ▼
.omnysysdata/ (persistencia)
    ├── index.json
    ├── files/*.json
    ├── atoms/*.json
    └── connections/*.json
```

---

## Cuándo Usar la IA (Layer B)

La IA se activa automáticamente cuando se detectan estos patrones:

- **Archivos huérfanos**: Sin imports ni calledBy detectados
- **Imports dinámicos**: `import()`, `require()` dinámico, `eval()`
- **Eventos ambiguos**: Nombres genéricos o shared state
- **Conexiones de baja confianza**: confidence < 0.8
- **Side effects sospechosos**: Modificaciones de estado global

**Bypass**: Si el confidence es >= 0.8, NO se necesita LLM.

---

## Performance Esperado

| Proyecto | Archivos | Layer A | Layer B (20%) | Total |
|----------|----------|---------|---------------|-------|
| Pequeño | 10 | 5-10s | 10-20s | 15-30s |
| Medio | 50 | 20-30s | 30-60s | 50-90s |
| Grande | 100 | 40-60s | 60-120s | 100-180s |

Nota: Tiempos asumen GPU disponible para LLM server.

---

## Troubleshooting

### "File not analyzed"
Las tools con auto-análisis encolan automáticamente. Espera 30-60s y reintenta.

### "Out of memory"
- Modelo usa ~1.2GB VRAM
- Usa `--skip-llm` para modo sin IA
- Aumenta memoria: `node --max-old-space-size=8192`

### Server no responde
```bash
# Verificar estado
curl http://localhost:9999/status

# Reiniciar
npm run mcp /ruta/al/proyecto
```

---

### 22. `suggest_refactoring`

**Descripción**: Analiza código y sugiere mejoras específicas de refactoring: extraer funciones, renombrar variables, agregar manejo de errores, optimizar performance, dividir archivos grandes, y mejorar cohesión.

**Parámetros**:
```json
{
  "filePath": "string",       // Opcional - filtrar por archivo
  "severity": "string",       // Opcional: 'all', 'high', 'medium', 'low'
  "limit": 20                 // Opcional - máximo sugerencias
}
```

**Retorna**:
```json
{
  "summary": {
    "totalSuggestions": 15,
    "bySeverity": { "high": 2, "medium": 5, "low": 8 },
    "byType": { "extract_function": 3, "rename": 5, "add_error_handling": 2 }
  },
  "suggestions": [
    {
      "type": "extract_function",
      "severity": "medium",
      "target": "src/utils.js::processData",
      "name": "processData",
      "file": "src/utils.js",
      "line": 45,
      "currentLOC": 85,
      "suggestion": "Extract 3 logical blocks into separate functions",
      "benefit": "Reduce complexity from 12 to ~4 per function",
      "priority": 55
    }
  ],
  "topRecommendations": [...]
}
```

**Tipos de sugerencias**:
- `extract_function` - Funciones muy largas (>80 LOC)
- `extract_helper` - Código duplicado internamente
- `rename` / `rename_parameter` - Nombres poco claros
- `add_error_handling` - Funciones async sin try/catch
- `handle_promises` - Promesas sin await ni .catch()
- `optimize_loops` - Nested loops con O(n²) o peor
- `add_memoization` - Funciones recursivas
- `split_file` - Archivos >300 LOC
- `improve_cohesion` - Funciones mezclando concerns

---

### 23. `validate_imports`

**Descripción**: Valida imports de archivos: detecta imports rotos, no usados, y dependencias circulares.

**Parámetros**:
```json
{
  "filePath": "string",       // Opcional - validar archivo específico
  "checkUnused": true,        // Verificar imports no usados
  "checkBroken": true,        // Verificar imports rotos
  "checkCircular": false      // Verificar ciclos de dependencias
}
```

**Retorna**:
```json
{
  "summary": {
    "filesChecked": 50,
    "filesWithIssues": 12,
    "totalBroken": 3,
    "totalUnused": 24,
    "totalCircular": 2
  },
  "files": [
    {
      "file": "src/api.js",
      "broken": [
        { "import": "../missing-file", "line": 5, "reason": "File not found" }
      ],
      "unused": [
        { "import": "lodash", "source": "lodash", "reason": "Imported but never used" }
      ],
      "circular": [
        { "file": "src/utils.js", "type": "import-cycle", "severity": "medium" }
      ]
    }
  ],
  "quickFixes": [
    {
      "file": "src/api.js",
      "action": "remove_unused_imports",
      "count": 5,
      "imports": ["lodash", "unusedUtil"],
      "autoFixable": true
    }
  ]
}
```

---

## Referencias

- [Guía de Integración MCP](./mcp-integration.md)
- [Índice de Documentación](../../INDEX.md)
- [Arquitectura Core](../../02-architecture/core.md)

---

**Este documento es contrato**. Las 21 tools MCP deben adherirse a estas firmas.
