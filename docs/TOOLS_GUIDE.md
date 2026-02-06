# OmnySys - Documentación de Herramientas MCP

## 🎯 **Visión General**

OmnySys es un motor de contexto multi-capa que proporciona **visión de caja completa** del código a las IAs. En lugar de ver archivos individuales (visión de túnel), las IAs pueden entender:

- Qué archivos se ven afectados por un cambio
- Quién llama a qué funciones y dónde
- El flujo de datos entre componentes
- Riesgos y dependencias ocultas

## 🛠️ **Herramientas Disponibles (9 total)**

### **1. `get_impact_map`** - Mapa de Impacto
**Uso**: Entender qué se rompe si modificas un archivo

```javascript
// Ejemplo:
get_impact_map({
  filePath: "src/core/orchestrator.js"
})

// Retorna:
{
  file: "src/core/orchestrator.js",
  directlyAffects: ["src/cli/commands/consolidate.js", "src/layer-c-memory/mcp/core/server-class.js"],
  transitiveAffects: ["src/cli/index.js", "src/layer-c-memory/mcp-server.js", ...],
  totalAffected: 8,
  riskLevel: "low",
  exports: ["initialize", "analyzeAndWait", ...]
}
```

**Cuándo usar**: Antes de editar cualquier archivo importante

---

### **2. `analyze_change`** - Análisis de Cambio
**Uso**: Evaluar el impacto de modificar un símbolo específico

```javascript
// Ejemplo:
analyze_change({
  filePath: "src/core/orchestrator.js",
  symbolName: "analyzeAndWait"
})

// Retorna:
{
  symbol: "analyzeAndWait",
  file: "src/core/orchestrator.js",
  symbolType: "function",
  directDependents: ["src/layer-c-memory/mcp/core/server-class.js"],
  transitiveDependents: [...],
  totalAffected: 5,
  riskLevel: "medium",
  recommendation: "⚠️ MEDIUM RISK - Many direct dependents"
}
```

**Cuándo usar**: Cuando quieres refactorizar una función específica

---

### **3. `explain_connection`** - Explicar Conexión
**Uso**: Entender por qué dos archivos están relacionados

```javascript
// Ejemplo:
explain_connection({
  fileA: "src/core/orchestrator.js",
  fileB: "src/layer-c-memory/mcp/core/server-class.js"
})

// Retorna:
{
  fileA: "src/core/orchestrator.js",
  fileB: "src/layer-c-memory/mcp/core/server-class.js",
  connectionType: "direct",
  direction: "A imports B",
  sharedSymbols: ["Orchestrator", "analyzeAndWait"],
  semanticConnections: [...]
}
```

**Cuándo usar**: Para entender arquitecturas complejas

---

### **4. `get_risk_assessment`** - Evaluación de Riesgo
**Uso**: Obtener riesgos de todo el proyecto

```javascript
// Ejemplo:
get_risk_assessment({
  minSeverity: "medium"  // Opcional: low, medium, high, critical
})

// Retorna:
{
  totalFiles: 433,
  riskLevel: "medium",
  highRiskFiles: ["src/core/orchestrator.js", "src/ai/llm-client.js"],
  warnings: [...],
  recommendations: [...]
}
```

**Cuándo usar**: Para priorizar trabajo de refactoring

---

### **5. `search_files`** - Búsqueda de Archivos
**Uso**: Encontrar archivos rápidamente

```javascript
// Ejemplo:
search_files({
  pattern: "orchestrator"
})

// Retorna:
{
  found: 12,
  files: [
    "src/core/orchestrator.js",
    "src/core/orchestrator/index.js",
    "src/core/orchestrator/queueing.js",
    ...
  ]
}
```

**Cuándo usar**: Para navegar el codebase

---

### **6. `get_server_status`** - Estado del Servidor
**Uso**: Verificar que OmnySys está funcionando

```javascript
// Ejemplo:
get_server_status({})

// Retorna:
{
  initialized: true,
  project: "C:\\Dev\\OmnySystem",
  timestamp: "2026-02-06T23:45:00.000Z",
  metadata: {
    totalFiles: 433,
    totalFunctions: 943,
    lastAnalyzed: "2026-02-06T23:30:00.000Z"
  }
}
```

**Cuándo usar**: Para diagnóstico

---

### **7. `get_call_graph`** - 🧠 Grafo de Llamadas
**Uso**: Ver TODOS los sitios donde se llama una función

```javascript
// Ejemplo:
get_call_graph({
  filePath: "src/layer-c-memory/mcp/tools/lib/ast-analyzer.js",
  symbolName: "findCallSites",
  includeContext: true
})

// Retorna:
{
  symbol: "findCallSites",
  definedIn: "src/layer-c-memory/mcp/tools/lib/ast-analyzer.js",
  summary: {
    totalCallSites: 3,
    uniqueFiles: 2,
    isWidelyUsed: false
  },
  callSites: [
    {
      file: "src/layer-c-memory/mcp/tools/get-call-graph.js",
      line: 15,
      code: "const result = await findCallSites(...)",
      context: "..."
    }
  ],
  impact: {
    level: "medium",
    description: "Used in 2 files"
  }
}
```

**Cuándo usar**: Para entender el impacto real de cambiar una función

---

### **8. `analyze_signature_change`** - 🧠 Análisis de Firma
**Uso**: Predecir breaking changes al modificar parámetros

```javascript
// Ejemplo:
analyze_signature_change({
  filePath: "src/core/orchestrator.js",
  symbolName: "analyzeAndWait",
  newSignature: "analyzeAndWait(filePath, priority, options)"
})

// Retorna:
{
  currentSignature: "analyzeAndWait(filePath, timeout)",
  newSignature: "analyzeAndWait(filePath, priority, options)",
  usages: [
    { file: "src/layer-c-memory/mcp/core/server-class.js", line: 45, code: "..." }
  ],
  breakingChanges: [
    {
      location: "src/layer-c-memory/mcp/core/server-class.js:45",
      issue: "Uses removed parameter 'timeout'",
      suggestion: "Update to new signature"
    }
  ],
  recommendations: [
    "⚠️ 1 breaking change detected",
    "Consider deprecation path"
  ]
}
```

**Cuándo usar**: Antes de cambiar la firma de una función pública

---

### **9. `explain_value_flow`** - 🧠 Flujo de Valores
**Uso**: Entender inputs → proceso → outputs → consumidores

```javascript
// Ejemplo:
explain_value_flow({
  filePath: "src/core/orchestrator.js",
  symbolName: "analyzeAndWait",
  maxDepth: 2
})

// Retorna:
{
  symbol: "analyzeAndWait",
  file: "src/core/orchestrator.js",
  type: "function",
  inputs: [
    { name: "filePath", type: "string", optional: false },
    { name: "timeout", type: "number", optional: true }
  ],
  outputs: [
    { statement: "return analysisResult", type: "object" }
  ],
  dependencies: ["getFileAnalysis", "orchestrator"],
  consumers: [
    { file: "src/layer-c-memory/mcp/core/server-class.js", line: 45 }
  ],
  flow: "filePath → analyzeAndWait → analysisResult → consumers"
}
```

**Cuándo usar**: Para entender pipelines de datos completos

## 🎯 **Flujo de Trabajo Recomendado**

### **Antes de editar un archivo:**
1. `get_impact_map` → Ver qué se rompe
2. `get_call_graph` → Ver quién usa qué
3. `analyze_change` → Evaluar riesgo

### **Al refactorizar:**
1. `analyze_signature_change` → Predecir breaking changes
2. `explain_value_flow` → Entender data flow
3. `explain_connection` → Ver relaciones entre archivos

### **Para navegar:**
1. `search_files` → Encontrar archivos
2. `get_risk_assessment` → Priorizar trabajo

## 📡 **Endpoints HTTP**

OmnySys expone un servidor HTTP MCP en `http://localhost:9999`:

```bash
# Listar herramientas
curl http://localhost:9999/tools

# Ejecutar herramienta
curl -X POST http://localhost:9999/tools/get_impact_map \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/core/orchestrator.js"}'

# Estado del servidor
curl http://localhost:9999/health
```

## 🚀 **Inicio Rápido**

```bash
# Instalar
git clone https://github.com/mauro3422/OmnySys.git
cd OmnySys
npm install
npm run install:all  # Inicia LLM + MCP automáticamente

# Verificar
npm status

# Usar herramientas
npm tools
```

## 💡 **Ejemplo Completo**

**Escenario**: Quieres refactorizar `src/core/orchestrator.js`

**Paso 1**: Analizar impacto
```javascript
const impact = await get_impact_map({
  filePath: "src/core/orchestrator.js"
});
// Result: 8 archivos afectados
```

**Paso 2**: Ver quién usa qué función
```javascript
const calls = await get_call_graph({
  filePath: "src/core/orchestrator.js",
  symbolName: "analyzeAndWait"
});
// Result: Usado en 5 lugares
```

**Paso 3**: Evaluar cambio de firma
```javascript
const breaking = await analyze_signature_change({
  filePath: "src/core/orchestrator.js",
  symbolName: "analyzeAndWait",
  newSignature: "analyzeAndWait(filePath, options)"
});
// Result: 2 breaking changes detectados
```

**Decisión**: El cambio afecta mucho, mejor hacerlo en partes pequeñas.

---

**OmnySys - Previene la visión de túnel, una herramienta a la vez.**
