---
⚠️  DOCUMENTO ARCHIVADO - Ver nueva ubicación
---
Este documento ha sido consolidado en la nueva estructura de documentación.

📍 Nueva ubicación: Ver docs/archive/consolidated/README.md para el mapa completo

🚀 Usar en su lugar:
- docs/01-core/ (fundamentos)
- docs/02-architecture/ (sistemas)
- docs/04-guides/ (guías prácticas)

---
Documento original (mantenido para referencia histórica):
# OmnySys - GuÃ­a de Herramientas MCP

## ðŸŽ¯ IntroducciÃ³n

OmnySys expone **14 herramientas MCP** vÃ­a HTTP en `http://localhost:9999`. Estas herramientas permiten a las IAs entender el contexto completo del cÃ³digo antes de hacer cambios, ahora con **precisiÃ³n atÃ³mica** (a nivel funciÃ³n).

**Arquitectura Fractal**: Las herramientas consultan las 3 capas en mÃºltiples escalas:
- **Layer A (Ãtomos)**: Funciones individuales, calls, complexity
- **Layer A (MolÃ©culas)**: Archivos como composiciÃ³n de Ã¡tomos
- **Layer B (DetecciÃ³n)**: Arquetipos con confidence scoring
- **Layer C (Respuesta)**: Cache atÃ³mico + decisiones LLM

**Confidence-Based Bypass**: 90% de consultas se resuelven sin LLM gracias al sistema de confianza basado en evidencia metadata.

---

## ðŸ› ï¸ Las 14 Herramientas

### Herramientas AtÃ³micas (Nuevas en v0.6.0)

Estas herramientas operan a nivel **funciÃ³n** (Ã¡tomo) para precisiÃ³n quirÃºrgica:

- `get_function_details` - Metadata completa de una funciÃ³n
- `get_molecule_summary` - Resumen molecular con insights derivados
- `get_atomic_functions` - Lista funciones de un archivo

### Herramientas MolÃ©culares (Archivo)

Estas herramientas operan a nivel **archivo** (molÃ©cula):

- `get_impact_map` - Mapa de archivos afectados
- `get_call_graph` - Grafo de llamadas
- `analyze_change` - AnÃ¡lisis de cambio de sÃ­mbolo
- `analyze_signature_change` - Breaking changes de API
- `explain_value_flow` - Flujo de datos
- `explain_connection` - ConexiÃ³n entre archivos

### Herramientas de Sistema

- `get_risk_assessment` - EvaluaciÃ³n de riesgo del proyecto
- `search_files` - BÃºsqueda de archivos
- `get_server_status` - Estado del sistema
- `restart_server` - Reinicia el servidor OmnySys
- `get_tunnel_vision_stats` - EstadÃ­sticas de detecciÃ³n de visiÃ³n tÃºnel

### **1. `get_impact_map`** - Mapa de Impacto Completo

**Endpoint**: `POST /tools/get_impact_map`

**DescripciÃ³n**: Devuelve TODOS los archivos afectados si modificas un archivo especÃ­fico. Considera dependencias directas, transitivas y conexiones semÃ¡nticas.

**ParÃ¡metros**:
```json
{
  "filePath": "string"  // Ruta relativa al archivo
}
```

**Respuesta**:
```json
{
  "file": "src/core/orchestrator.js",
  "directlyAffects": ["src/cli/commands/consolidate.js", "src/layer-c-memory/mcp/core/server-class.js"],
  "transitiveAffects": ["src/cli/index.js", "src/layer-c-memory/mcp-server.js", "..."],
  "semanticConnections": [
    {
      "type": "eventListener",
      "event": "job:progress",
      "targetFile": "src/core/unified-server/initialization/orchestrator-init.js"
    }
  ],
  "totalAffected": 8,
  "riskLevel": "low|medium|high|critical",
  "subsystem": "core|ui|api|...",
  "exports": ["initialize", "analyzeAndWait", "..."]
}
```

**CuÃ¡ndo usar**: 
- âœ… Antes de editar CUALQUIER archivo
- âœ… Para estimar el scope de un cambio
- âœ… Para identificar god-objects (archivos con muchos dependents)

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/get_impact_map \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/core/orchestrator.js"}'
```

---

### **2. `get_call_graph`** - Grafo de Llamadas ðŸ§ 

**Endpoint**: `POST /tools/get_call_graph`

**DescripciÃ³n**: Encuentra TODOS los sitios donde se llama una funciÃ³n/clase especÃ­fica. Muestra quiÃ©n llama, dÃ³nde y en quÃ© contexto.

**ParÃ¡metros**:
```json
{
  "filePath": "string",       // Archivo donde se define el sÃ­mbolo
  "symbolName": "string",     // Nombre de funciÃ³n/clase/variable
  "includeContext": true      // Opcional: incluir cÃ³digo de contexto
}
```

**Respuesta**:
```json
{
  "symbol": "analyzeAndWait",
  "definedIn": "src/core/orchestrator.js",
  "exportType": "function",
  "summary": {
    "totalCallSites": 5,
    "uniqueFiles": 3,
    "isWidelyUsed": false,
    "isIsolated": false
  },
  "callSites": [
    {
      "file": "src/layer-c-memory/mcp/core/server-class.js",
      "line": 45,
      "column": 12,
      "code": "await this.orchestrator.analyzeAndWait(filePath)",
      "context": "async _analyzeFile(filePath) {\n  const result = await this.orchestrator.analyzeAndWait(filePath);\n  return result;\n}",
      "type": "await_call"
    }
  ],
  "byFile": {
    "src/layer-c-memory/mcp/core/server-class.js": 2,
    "src/cli/commands/consolidate.js": 3
  },
  "impact": {
    "level": "medium",
    "description": "Used in 3 files, refactoring requires careful review"
  }
}
```

**CuÃ¡ndo usar**:
- âœ… Refactorizando una funciÃ³n pÃºblica
- âœ… Antes de cambiar la firma de una funciÃ³n
- âœ… Entendiendo cÃ³mo se usa un utility

---

### **3. `analyze_change`** - AnÃ¡lisis de Cambio

**Endpoint**: `POST /tools/analyze_change`

**DescripciÃ³n**: EvalÃºa el impacto especÃ­fico de modificar un sÃ­mbolo (funciÃ³n, clase, variable) dentro de un archivo.

**ParÃ¡metros**:
```json
{
  "filePath": "string",    // Archivo contenedor
  "symbolName": "string"   // Nombre del sÃ­mbolo a cambiar
}
```

**Respuesta**:
```json
{
  "symbol": "analyzeAndWait",
  "file": "src/core/orchestrator.js",
  "symbolType": "function",
  "directDependents": ["src/layer-c-memory/mcp/core/server-class.js"],
  "transitiveDependents": ["src/cli/commands/consolidate.js"],
  "totalAffected": 5,
  "riskLevel": "medium",
  "recommendation": "âš ï¸ MEDIUM RISK - Multiple direct dependents. Consider backward compatibility.",
  "currentSignature": "async analyzeAndWait(filePath, timeout = 60000)",
  "archetypeInfo": {
    "detected": "god-object",
    "responsibilities": ["queue management", "file analysis", "LLM coordination"]
  }
}
```

**CuÃ¡ndo usar**:
- âœ… Antes de modificar una funciÃ³n especÃ­fica
- âœ… Evaluando si un cambio es seguro
- âœ… Planeando refactorizaciÃ³n incremental

---

### **4. `analyze_signature_change`** - AnÃ¡lisis de Firma ðŸ”¬

**Endpoint**: `POST /tools/analyze_signature_change`

**DescripciÃ³n**: Predice breaking changes si modificas los parÃ¡metros de una funciÃ³n. Identifica todos los call sites que se romperÃ­an.

**ParÃ¡metros**:
```json
{
  "filePath": "string",       // Archivo con la funciÃ³n
  "symbolName": "string",     // Nombre de la funciÃ³n
  "newSignature": "string"    // Opcional: nueva firma a evaluar
}
```

**Respuesta**:
```json
{
  "currentSignature": "analyzeAndWait(filePath, timeout = 60000)",
  "newSignature": "analyzeAndWait(filePath, options = {})",
  "usages": [
    {
      "location": "src/layer-c-memory/mcp/core/server-class.js:45",
      "code": "await this.orchestrator.analyzeAndWait(filePath, 60000)",
      "args": ["filePath", "60000"]
    }
  ],
  "breakingChanges": [
    {
      "location": "src/layer-c-memory/mcp/core/server-class.js:45",
      "issue": "Uses positional argument for timeout",
      "currentCall": "analyzeAndWait(filePath, 60000)",
      "wouldBreak": true,
      "suggestion": "Update to: analyzeAndWait(filePath, { timeout: 60000 })"
    }
  ],
  "compatible": false,
  "recommendations": [
    "âš ï¸ 1 breaking change detected",
    "Consider keeping backward compatibility with parameter overloading",
    "Migration path: Update 1 call site in src/layer-c-memory/mcp/core/server-class.js"
  ]
}
```

**CuÃ¡ndo usar**:
- âœ… Antes de cambiar la API de una funciÃ³n
- âœ… Evaluando costo de migraciÃ³n
- âœ… Planeando deprecaciÃ³n gradual

---

### **5. `explain_value_flow`** - Flujo de Valores ðŸŒŠ

**Endpoint**: `POST /tools/explain_value_flow`

**DescripciÃ³n**: Muestra el flujo completo de datos: inputs â†’ procesamiento â†’ outputs â†’ consumidores. Ideal para entender pipelines de datos.

**ParÃ¡metros**:
```json
{
  "filePath": "string",     // Archivo con el sÃ­mbolo
  "symbolName": "string",   // Nombre de funciÃ³n/variable
  "maxDepth": 2             // Opcional: profundidad de anÃ¡lisis (default: 2)
}
```

**Respuesta**:
```json
{
  "symbol": "analyzeAndWait",
  "file": "src/core/orchestrator.js",
  "type": "function",
  "inputs": [
    { "name": "filePath", "type": "string", "optional": false },
    { "name": "timeout", "type": "number", "optional": true }
  ],
  "outputs": [
    { "statement": "return analysisResult", "type": "object" }
  ],
  "dependencies": ["getFileAnalysis", "LLMClient", "Queue"],
  "consumers": [
    { "file": "src/layer-c-memory/mcp/core/server-class.js", "line": 45 },
    { "file": "src/cli/commands/consolidate.js", "line": 23 }
  ],
  "flow": "filePath â†’ analyzeAndWait â†’ analysisResult â†’ consumers",
  "dataPipeline": {
    "readsFrom": ["filesystem", ".omnysysdata/"],
    "writesTo": ["queue", "cache"],
    "transformations": ["static-analysis", "llm-enrichment"]
  }
}
```

**CuÃ¡ndo usar**:
- âœ… Entendiendo data pipelines
- âœ… Depurando flujo de datos
- âœ… Documentando arquitectura de datos

---

### **6. `explain_connection`** - Explicar ConexiÃ³n ðŸ”—

**Endpoint**: `POST /tools/explain_connection`

**DescripciÃ³n**: Explica POR QUÃ‰ dos archivos estÃ¡n conectados. Revela el tipo de conexiÃ³n y direcciÃ³n del acoplamiento.

**ParÃ¡metros**:
```json
{
  "fileA": "string",  // Primer archivo
  "fileB": "string"   // Segundo archivo
}
```

**Respuesta**:
```json
{
  "fileA": "src/core/orchestrator.js",
  "fileB": "src/layer-c-memory/mcp/core/server-class.js",
  "connectionType": "direct-dependency",
  "direction": "B depends on A",
  "sharedSymbols": ["Orchestrator", "analyzeAndWait"],
  "connectionDetails": {
    "type": "import",
    "symbols": ["Orchestrator"],
    "importPath": "../../../core/orchestrator.js"
  },
  "semanticConnections": [
    {
      "type": "event",
      "eventName": "job:progress",
      "description": "Orchestrator emite, ServerClass escucha"
    }
  ],
  "coupling": {
    "strength": "strong",
    "description": "ServerClass cannot function without Orchestrator"
  }
}
```

**CuÃ¡ndo usar**:
- âœ… Entendiendo arquitectura del sistema
- âœ… Identificando acoplamientos fuertes
- âœ… Planificando separaciÃ³n de concerns

---

### **7. `get_risk_assessment`** - EvaluaciÃ³n de Riesgo âš ï¸

**Endpoint**: `POST /tools/get_risk_assessment`

**DescripciÃ³n**: Analiza TODO el proyecto y retorna archivos de alto riesgo basÃ¡ndose en arquetipos detectados.

**ParÃ¡metros**:
```json
{
  "minSeverity": "medium"  // Opcional: low, medium, high, critical
}
```

**Respuesta**:
```json
{
  "totalFiles": 431,
  "riskLevel": "medium",
  "summary": {
    "critical": 3,
    "high": 12,
    "medium": 45,
    "low": 371
  },
  "highRiskFiles": [
    {
      "file": "src/core/orchestrator.js",
      "risk": "high",
      "archetype": "god-object",
      "reason": "23 dependents, high blast radius",
      "recommendation": "Split into smaller modules"
    }
  ],
  "archetypeBreakdown": {
    "god-object": 3,
    "orphan-module": 15,
    "dynamic-importer": 8,
    "state-manager": 12
  },
  "recommendations": [
    "3 god-objects detected - consider refactoring",
    "15 orphan modules - potential dead code",
    "8 dynamic importers - runtime dependencies need documentation"
  ]
}
```

**CuÃ¡ndo usar**:
- âœ… Priorizando trabajo de refactoring
- âœ… Identificando deuda tÃ©cnica
- âœ… Planificando sprints de arquitectura

---

### **8. `search_files`** - BÃºsqueda de Archivos ðŸ“

**Endpoint**: `POST /tools/search_files`

**DescripciÃ³n**: Busca archivos por patrÃ³n de nombre. Usa el Ã­ndice de Layer A (rÃ¡pido, no escanea disco).

**ParÃ¡metros**:
```json
{
  "pattern": "string"  // PatrÃ³n de bÃºsqueda
}
```

**Respuesta**:
```json
{
  "found": 12,
  "files": [
    "src/core/orchestrator.js",
    "src/core/orchestrator/index.js",
    "src/core/orchestrator/queueing.js",
    "src/core/orchestrator/worker.js",
    "..."
  ],
  "duration": "15ms"
}
```

**CuÃ¡ndo usar**:
- âœ… Navegando el codebase
- âœ… Encontrando implementaciones
- âœ… Buscando tests relacionados

---

### **9. `get_server_status`** - Estado del Servidor ðŸ“Š

**Endpoint**: `POST /tools/get_server_status`

**DescripciÃ³n**: Retorna el estado completo del sistema OmnySys.

**ParÃ¡metros**: `{}` (ninguno)

**Respuesta**:
```json
{
  "initialized": true,
  "project": "C:\\Dev\\OmnySys",
  "timestamp": "2026-02-06T23:45:00.000Z",
  "version": "0.5.3",
  "metadata": {
    "totalFiles": 431,
    "totalFunctions": 943,
    "lastAnalyzed": "2026-02-06T23:30:00.000Z"
  },
  "services": {
    "llm": { "status": "running", "port": 8000, "model": "LFM2.5-Instruct" },
    "mcp": { "status": "running", "port": 9999, "tools": 9 }
  },
  "orchestrator": {
    "status": "ready",
    "queueSize": 0,
    "workerStatus": "idle"
  }
}
```

**CuÃ¡ndo usar**:
- âœ… DiagnÃ³stico del sistema
- âœ… Verificando que todo estÃ¡ corriendo
- âœ… Monitoreo

---

### **10. `get_atomic_functions`** - Lista de Funciones AtÃ³micas

**Endpoint**: `POST /tools/get_atomic_functions`

**DescripciÃ³n**: Retorna la lista de todas las funciones (Ã¡tomos) definidas en un archivo especÃ­fico.

**ParÃ¡metros**:
```json
{
  "filePath": "string"  // Ruta del archivo
}
```

**Respuesta**:
```json
{
  "file": "src/core/orchestrator.js",
  "functions": [
    {
      "name": "analyzeAndWait",
      "type": "async-function",
      "exported": true,
      "complexity": 28,
      "archetype": "hot-path"
    },
    {
      "name": "processQueue",
      "type": "function",
      "exported": false,
      "complexity": 12,
      "archetype": "private-utility"
    }
  ],
  "totalFunctions": 2
}
```

**CuÃ¡ndo usar**:
- âœ… Navegando funciones de un archivo
- âœ… Identificando funciones pÃºblicas vs privadas
- âœ… Overview rÃ¡pido de un mÃ³dulo

---

### **11. `restart_server`** - Reiniciar Servidor

**Endpoint**: `POST /tools/restart_server`

**DescripciÃ³n**: Reinicia el servidor OmnySys para recargar cÃ³digo actualizado y refrescar el anÃ¡lisis.

**ParÃ¡metros**: `{}` (ninguno)

**Respuesta**:
```json
{
  "status": "restarting",
  "message": "Server restart initiated. Re-analyzing project...",
  "estimatedTime": "30s"
}
```

**CuÃ¡ndo usar**:
- âœ… DespuÃ©s de cambios significativos en el cÃ³digo
- âœ… Cuando el cachÃ© estÃ¡ desincronizado
- âœ… Para forzar re-anÃ¡lisis completo

---

### **12. `get_tunnel_vision_stats`** - EstadÃ­sticas de VisiÃ³n TÃºnel

**Endpoint**: `POST /tools/get_tunnel_vision_stats`

**DescripciÃ³n**: Retorna estadÃ­sticas sobre detecciÃ³n y prevenciÃ³n de visiÃ³n tÃºnel durante el anÃ¡lisis.

**ParÃ¡metros**: `{}` (ninguno)

**Respuesta**:
```json
{
  "totalAnalyses": 1543,
  "tunnelVisionPrevented": 127,
  "preventionRate": "8.2%",
  "mostCommonPatterns": [
    {
      "pattern": "god-object-missed-connections",
      "count": 45,
      "description": "Conexiones semÃ¡nticas no detectadas en god-objects"
    },
    {
      "pattern": "transitive-dependency-blindspot",
      "count": 38,
      "description": "Dependencias transitivas ignoradas"
    }
  ],
  "byArchetype": {
    "god-object": 45,
    "orphan-module": 32,
    "network-hub": 25
  }
}
```

**CuÃ¡ndo usar**:
- âœ… Evaluando efectividad del sistema
- âœ… Identificando patrones comunes de error
- âœ… Mejorando configuraciÃ³n del anÃ¡lisis

---

## ðŸŽ“ Flujos de Trabajo Recomendados

### Flujo 1: Antes de editar un archivo

```javascript
// 1. Ver impacto completo
const impact = await get_impact_map({ filePath: "src/core/orchestrator.js" });
// Result: 8 archivos afectados

// 2. Ver quiÃ©n usa quÃ© funciÃ³n especÃ­fica
const calls = await get_call_graph({ 
  filePath: "src/core/orchestrator.js", 
  symbolName: "analyzeAndWait" 
});
// Result: 5 call sites en 3 archivos

// 3. Evaluar si es seguro cambiar
const change = await analyze_change({ 
  filePath: "src/core/orchestrator.js", 
  symbolName: "analyzeAndWait" 
});
// Result: MEDIUM RISK

// DecisiÃ³n: "El cambio afecta 8 archivos, incluyendo CLI principal.
// Voy a hacerlo en partes pequeÃ±as."
```

### Flujo 2: RefactorizaciÃ³n de API

```javascript
// 1. Analizar breaking changes
const signature = await analyze_signature_change({
  filePath: "src/core/orchestrator.js",
  symbolName: "analyzeAndWait",
  newSignature: "analyzeAndWait(filePath, options = {})"
});
// Result: 2 breaking changes detectados

// 2. Ver flujo de datos
const flow = await explain_value_flow({
  filePath: "src/core/orchestrator.js",
  symbolName: "analyzeAndWait"
});
// Result: Inputs â†’ analyzeAndWait â†’ analysisResult â†’ 3 consumers

// DecisiÃ³n: "Necesito actualizar 2 call sites antes de cambiar la firma.
// Los consumers dependen del resultado, mantendrÃ© compatibilidad."
```

### Flujo 3: AuditorÃ­a de arquitectura

```javascript
// 1. Obtener riesgos del proyecto
const risks = await get_risk_assessment({ minSeverity: "medium" });
// Result: 3 god-objects, 15 orphans

// 2. Analizar el god-object mÃ¡s crÃ­tico
const impact = await get_impact_map({ filePath: risks.highRiskFiles[0].file });

// DecisiÃ³n: "El archivo orchestrator.js tiene 23 dependents.
// DeberÃ­a dividirlo en 3 mÃ³dulos: Queue, Analyzer, Coordinator."
```

---

## ðŸ“¡ Uso Directo vÃ­a HTTP

Todas las herramientas estÃ¡n disponibles vÃ­a HTTP:

```bash
# Ver herramientas disponibles
curl http://localhost:9999/tools

# Ejecutar herramienta
curl -X POST http://localhost:9999/tools/get_impact_map \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/core/orchestrator.js"}' | jq

# Formato MCP estÃ¡ndar
curl -X POST http://localhost:9999/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "get_impact_map",
    "arguments": {"filePath": "src/core/orchestrator.js"}
  }' | jq
```

---

## ðŸŽ¨ Consejos para IAs

### CuÃ¡ndo usar cada herramienta:

| SituaciÃ³n | Herramienta recomendada | Por quÃ© |
|-----------|------------------------|---------|
| "Voy a editar X.js" | `get_impact_map` | Ver scope completo |
| "Quiero cambiar esta funciÃ³n" | `get_call_graph` + `analyze_change` | Impacto especÃ­fico |
| "Esta funciÃ³n tiene muchos parÃ¡metros" | `analyze_signature_change` | Breaking changes |
| "No entiendo cÃ³mo fluyen los datos" | `explain_value_flow` | Data pipeline |
| "Â¿Por quÃ© estos archivos estÃ¡n conectados?" | `explain_connection` | Arquitectura |
| "Â¿QuÃ© deberÃ­a refactorizar primero?" | `get_risk_assessment` | PriorizaciÃ³n |
| "Busco el archivo de configuraciÃ³n" | `search_files` | NavegaciÃ³n |
| "Â¿EstÃ¡ todo funcionando?" | `get_server_status` | DiagnÃ³stico |
| "Lista todas las funciones de este archivo" | `get_atomic_functions` | NavegaciÃ³n atÃ³mica |
| "Necesito recargar el anÃ¡lisis" | `restart_server` | Mantenimiento |
| "Â¿QuÃ© tan efectivo es el sistema?" | `get_tunnel_vision_stats` | MÃ©tricas |

### Anti-patrones a evitar:

âŒ **No** uses las herramientas para cada archivo pequeÃ±o (overhead)
âœ… **SÃ­** Ãºsalas para archivos crÃ­ticos, god-objects, y antes de cambios grandes

âŒ **No** ignores el `riskLevel` (low/medium/high/critical)
âœ… **SÃ­** ten mÃ¡s cuidado con archivos "high" o "critical"

âŒ **No** asumas que un archivo es seguro solo porque tiene pocos dependents
âœ… **SÃ­** revisa tambiÃ©n `transitiveAffects` (efecto dominÃ³)

---

---

## ðŸ“Š Nuevas Herramientas en v0.7.1

### Tool #13: `restart_server`
Reinicia el servidor OmnySys para recargar cÃ³digo actualizado y refrescar el anÃ¡lisis completo del proyecto.

### Tool #14: `get_tunnel_vision_stats`
Retorna estadÃ­sticas detalladas sobre la detecciÃ³n y prevenciÃ³n de visiÃ³n tÃºnel, ayudando a evaluar la efectividad del sistema.

---

**OmnySys v0.7.1 - 14 herramientas para visiÃ³n completa del cÃ³digo.**

