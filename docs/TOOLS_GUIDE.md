# OmnySys - Guía de Herramientas MCP

## 🎯 Introducción

OmnySys expone **9 herramientas MCP** vía HTTP en `http://localhost:9999`. Estas herramientas permiten a las IAs entender el contexto completo del código antes de hacer cambios.

**Arquitectura**: Las herramientas consultan las 3 capas:
- **Layer A**: Datos estáticos (imports, exports, grafo)
- **Layer B**: Análisis semántico (arquetipos, LLM insights)
- **Layer C**: Cache unificado + almacenamiento

---

## 🛠️ Las 9 Herramientas

### **1. `get_impact_map`** - Mapa de Impacto Completo

**Endpoint**: `POST /tools/get_impact_map`

**Descripción**: Devuelve TODOS los archivos afectados si modificas un archivo específico. Considera dependencias directas, transitivas y conexiones semánticas.

**Parámetros**:
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

**Cuándo usar**: 
- ✅ Antes de editar CUALQUIER archivo
- ✅ Para estimar el scope de un cambio
- ✅ Para identificar god-objects (archivos con muchos dependents)

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/get_impact_map \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/core/orchestrator.js"}'
```

---

### **2. `get_call_graph`** - Grafo de Llamadas 🧠

**Endpoint**: `POST /tools/get_call_graph`

**Descripción**: Encuentra TODOS los sitios donde se llama una función/clase específica. Muestra quién llama, dónde y en qué contexto.

**Parámetros**:
```json
{
  "filePath": "string",       // Archivo donde se define el símbolo
  "symbolName": "string",     // Nombre de función/clase/variable
  "includeContext": true      // Opcional: incluir código de contexto
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

**Cuándo usar**:
- ✅ Refactorizando una función pública
- ✅ Antes de cambiar la firma de una función
- ✅ Entendiendo cómo se usa un utility

---

### **3. `analyze_change`** - Análisis de Cambio

**Endpoint**: `POST /tools/analyze_change`

**Descripción**: Evalúa el impacto específico de modificar un símbolo (función, clase, variable) dentro de un archivo.

**Parámetros**:
```json
{
  "filePath": "string",    // Archivo contenedor
  "symbolName": "string"   // Nombre del símbolo a cambiar
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
  "recommendation": "⚠️ MEDIUM RISK - Multiple direct dependents. Consider backward compatibility.",
  "currentSignature": "async analyzeAndWait(filePath, timeout = 60000)",
  "archetypeInfo": {
    "detected": "god-object",
    "responsibilities": ["queue management", "file analysis", "LLM coordination"]
  }
}
```

**Cuándo usar**:
- ✅ Antes de modificar una función específica
- ✅ Evaluando si un cambio es seguro
- ✅ Planeando refactorización incremental

---

### **4. `analyze_signature_change`** - Análisis de Firma 🔬

**Endpoint**: `POST /tools/analyze_signature_change`

**Descripción**: Predice breaking changes si modificas los parámetros de una función. Identifica todos los call sites que se romperían.

**Parámetros**:
```json
{
  "filePath": "string",       // Archivo con la función
  "symbolName": "string",     // Nombre de la función
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
    "⚠️ 1 breaking change detected",
    "Consider keeping backward compatibility with parameter overloading",
    "Migration path: Update 1 call site in src/layer-c-memory/mcp/core/server-class.js"
  ]
}
```

**Cuándo usar**:
- ✅ Antes de cambiar la API de una función
- ✅ Evaluando costo de migración
- ✅ Planeando deprecación gradual

---

### **5. `explain_value_flow`** - Flujo de Valores 🌊

**Endpoint**: `POST /tools/explain_value_flow`

**Descripción**: Muestra el flujo completo de datos: inputs → procesamiento → outputs → consumidores. Ideal para entender pipelines de datos.

**Parámetros**:
```json
{
  "filePath": "string",     // Archivo con el símbolo
  "symbolName": "string",   // Nombre de función/variable
  "maxDepth": 2             // Opcional: profundidad de análisis (default: 2)
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
  "flow": "filePath → analyzeAndWait → analysisResult → consumers",
  "dataPipeline": {
    "readsFrom": ["filesystem", ".omnysysdata/"],
    "writesTo": ["queue", "cache"],
    "transformations": ["static-analysis", "llm-enrichment"]
  }
}
```

**Cuándo usar**:
- ✅ Entendiendo data pipelines
- ✅ Depurando flujo de datos
- ✅ Documentando arquitectura de datos

---

### **6. `explain_connection`** - Explicar Conexión 🔗

**Endpoint**: `POST /tools/explain_connection`

**Descripción**: Explica POR QUÉ dos archivos están conectados. Revela el tipo de conexión y dirección del acoplamiento.

**Parámetros**:
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

**Cuándo usar**:
- ✅ Entendiendo arquitectura del sistema
- ✅ Identificando acoplamientos fuertes
- ✅ Planificando separación de concerns

---

### **7. `get_risk_assessment`** - Evaluación de Riesgo ⚠️

**Endpoint**: `POST /tools/get_risk_assessment`

**Descripción**: Analiza TODO el proyecto y retorna archivos de alto riesgo basándose en arquetipos detectados.

**Parámetros**:
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

**Cuándo usar**:
- ✅ Priorizando trabajo de refactoring
- ✅ Identificando deuda técnica
- ✅ Planificando sprints de arquitectura

---

### **8. `search_files`** - Búsqueda de Archivos 📁

**Endpoint**: `POST /tools/search_files`

**Descripción**: Busca archivos por patrón de nombre. Usa el índice de Layer A (rápido, no escanea disco).

**Parámetros**:
```json
{
  "pattern": "string"  // Patrón de búsqueda
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

**Cuándo usar**:
- ✅ Navegando el codebase
- ✅ Encontrando implementaciones
- ✅ Buscando tests relacionados

---

### **9. `get_server_status`** - Estado del Servidor 📊

**Endpoint**: `POST /tools/get_server_status`

**Descripción**: Retorna el estado completo del sistema OmnySys.

**Parámetros**: `{}` (ninguno)

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

**Cuándo usar**:
- ✅ Diagnóstico del sistema
- ✅ Verificando que todo está corriendo
- ✅ Monitoreo

---

## 🎓 Flujos de Trabajo Recomendados

### Flujo 1: Antes de editar un archivo

```javascript
// 1. Ver impacto completo
const impact = await get_impact_map({ filePath: "src/core/orchestrator.js" });
// Result: 8 archivos afectados

// 2. Ver quién usa qué función específica
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

// Decisión: "El cambio afecta 8 archivos, incluyendo CLI principal.
// Voy a hacerlo en partes pequeñas."
```

### Flujo 2: Refactorización de API

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
// Result: Inputs → analyzeAndWait → analysisResult → 3 consumers

// Decisión: "Necesito actualizar 2 call sites antes de cambiar la firma.
// Los consumers dependen del resultado, mantendré compatibilidad."
```

### Flujo 3: Auditoría de arquitectura

```javascript
// 1. Obtener riesgos del proyecto
const risks = await get_risk_assessment({ minSeverity: "medium" });
// Result: 3 god-objects, 15 orphans

// 2. Analizar el god-object más crítico
const impact = await get_impact_map({ filePath: risks.highRiskFiles[0].file });

// Decisión: "El archivo orchestrator.js tiene 23 dependents.
// Debería dividirlo en 3 módulos: Queue, Analyzer, Coordinator."
```

---

## 📡 Uso Directo vía HTTP

Todas las herramientas están disponibles vía HTTP:

```bash
# Ver herramientas disponibles
curl http://localhost:9999/tools

# Ejecutar herramienta
curl -X POST http://localhost:9999/tools/get_impact_map \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/core/orchestrator.js"}' | jq

# Formato MCP estándar
curl -X POST http://localhost:9999/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "get_impact_map",
    "arguments": {"filePath": "src/core/orchestrator.js"}
  }' | jq
```

---

## 🎨 Consejos para IAs

### Cuándo usar cada herramienta:

| Situación | Herramienta recomendada | Por qué |
|-----------|------------------------|---------|
| "Voy a editar X.js" | `get_impact_map` | Ver scope completo |
| "Quiero cambiar esta función" | `get_call_graph` + `analyze_change` | Impacto específico |
| "Esta función tiene muchos parámetros" | `analyze_signature_change` | Breaking changes |
| "No entiendo cómo fluyen los datos" | `explain_value_flow` | Data pipeline |
| "¿Por qué estos archivos están conectados?" | `explain_connection` | Arquitectura |
| "¿Qué debería refactorizar primero?" | `get_risk_assessment` | Priorización |
| "Busco el archivo de configuración" | `search_files` | Navegación |
| "¿Está todo funcionando?" | `get_server_status` | Diagnóstico |

### Anti-patrones a evitar:

❌ **No** uses las herramientas para cada archivo pequeño (overhead)
✅ **Sí** úsalas para archivos críticos, god-objects, y antes de cambios grandes

❌ **No** ignores el `riskLevel` (low/medium/high/critical)
✅ **Sí** ten más cuidado con archivos "high" o "critical"

❌ **No** asumas que un archivo es seguro solo porque tiene pocos dependents
✅ **Sí** revisa también `transitiveAffects` (efecto dominó)

---

**OmnySys - Una herramienta a la vez, visión de caja completa.**
