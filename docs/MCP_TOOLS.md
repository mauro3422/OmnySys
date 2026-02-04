# MCP Tools - Documentación para IAs

**Versión**: v0.4.5  
**Última actualización**: 2026-02-03

---

## 📋 Overview

CogniSystem expone un conjunto de **MCP Tools** (Model Context Protocol Tools) que las IAs pueden usar para obtener contexto sobre el código antes de editarlo.

Estas tools son **funciones JavaScript** que el MCP Server expone. Cuando el protocolo MCP esté completamente implementado, se integrarán directamente con Claude y otras IAs compatibles.

---

## 🔧 Tools Disponibles

### 1. `get_impact_map(filePath)`

**Descripción**: Devuelve el mapa de impacto completo de un archivo - qué otros archivos se ven afectados si se modifica.

**Parámetros**:
| Nombre | Tipo | Descripción |
|--------|------|-------------|
| `filePath` | string | Ruta relativa del archivo (ej: "src/components/Camera.js") |

**Retorna**:
```typescript
{
  file: string;                    // Archivo consultado
  directlyAffects: string[];       // Archivos que importan este archivo
  transitiveAffects: string[];     // Dependencias transitivas
  semanticConnections: {           // Conexiones semánticas detectadas
    target: string;                // Archivo conectado
    type: string;                  // Tipo: "shared-state", "event", "side-effect"
    key?: string;                  // Clave compartida (ej: "cameraPosition")
  }[];
  totalAffected: number;           // Total de archivos afectados
  riskLevel: "low" | "medium" | "high" | "critical" | "unknown";
  subsystem?: string;              // Subsistema al que pertenece
}
```

**Comportamiento Auto-Análisis**:
- ✅ Si el archivo no está analizado, se encola automáticamente como **CRITICAL**
- ✅ Espera hasta 60 segundos por el análisis
- ✅ Si timeout, devuelve error con sugerencia de reintentar

**Ejemplo**:
```javascript
const impact = await get_impact_map("src/core/CameraState.js");

// Resultado:
{
  file: "src/core/CameraState.js",
  directlyAffects: [
    "src/render/RenderEngine.js",
    "src/input/InputManager.js"
  ],
  transitiveAffects: [
    "src/ui/MinimapUI.js",
    "src/effects/PostProcessing.js"
  ],
  semanticConnections: [
    {
      target: "src/ui/MinimapUI.js",
      type: "shared-state",
      key: "cameraPosition"
    },
    {
      target: "src/events/GlobalEvents.js",
      type: "event",
      key: "camera:moved"
    }
  ],
  totalAffected: 5,
  riskLevel: "high",
  subsystem: "core"
}
```

**Uso por la IA**:
```
User: "Voy a editar CameraState.js"

Claude: *llama get_impact_map*
→ Detecta 5 archivos afectados
→ Alerta al usuario del riesgo ALTO
→ Sugiere revisar todos los archivos relacionados
```

---

### 2. `analyze_change(filePath, symbolName)`

**Descripción**: Analiza el impacto específico de cambiar un símbolo (función, clase, variable) dentro de un archivo.

**Parámetros**:
| Nombre | Tipo | Descripción |
|--------|------|-------------|
| `filePath` | string | Ruta del archivo |
| `symbolName` | string | Nombre del símbolo a analizar |

**Retorna**:
```typescript
{
  symbol: string;                  // Nombre del símbolo
  file: string;                    // Archivo
  symbolType: "function" | "class" | "variable" | "constant";
  directDependents: string[];      // Archivos que usan este símbolo
  transitiveDependents: string[];  // Dependencias transitivas
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendation: string;          // Mensaje de recomendación
}
```

**Ejemplo**:
```javascript
const analysis = await analyze_change(
  "src/core/CameraState.js", 
  "updateCameraPosition"
);

// Resultado:
{
  symbol: "updateCameraPosition",
  file: "src/core/CameraState.js",
  symbolType: "function",
  directDependents: [
    "src/input/InputManager.js",
    "src/render/RenderEngine.js"
  ],
  transitiveDependents: [
    "src/ui/MinimapUI.js"
  ],
  riskLevel: "critical",
  recommendation: "⚠️ HIGH RISK - This change affects many files"
}
```

---

### 3. `explain_connection(fileA, fileB)`

**Descripción**: Explica por qué dos archivos están conectados (vía imports, estado compartido, eventos, etc.)

**Parámetros**:
| Nombre | Tipo | Descripción |
|--------|------|-------------|
| `fileA` | string | Primer archivo |
| `fileB` | string | Segundo archivo |

**Retorna**:
```typescript
{
  fileA: string;
  fileB: string;
  connected: boolean;              // true si hay conexión
  reason?: string;                 // Explicación si no hay conexión
  connections?: {                  // Lista de conexiones (si hay)
    type: string;                  // Tipo de conexión
    property?: string;             // Propiedad compartida
    reason: string;                // Razón de la conexión
    severity: "low" | "medium" | "high";
  }[];
}
```

**Ejemplo**:
```javascript
const connection = await explain_connection(
  "src/core/CameraState.js",
  "src/ui/MinimapUI.js"
);

// Resultado:
{
  fileA: "src/core/CameraState.js",
  fileB: "src/ui/MinimapUI.js",
  connected: true,
  connections: [
    {
      type: "shared-state",
      property: "cameraPosition",
      reason: "MinimapUI lee cameraPosition desde CameraState",
      severity: "high"
    },
    {
      type: "event",
      property: "camera:moved",
      reason: "MinimapUI escucha eventos de movimiento de cámara",
      severity: "medium"
    }
  ]
}
```

---

### 4. `get_risk_assessment(minSeverity?)`

**Descripción**: Devuelve una evaluación de riesgos del proyecto completo.

**Parámetros**:
| Nombre | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `minSeverity` | string | "medium" | Severidad mínima: "low", "medium", "high", "critical" |

**Retorna**:
```typescript
{
  summary: {
    totalFiles: number;
    averageScore: number;            // 0-100
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  topRiskFiles: {
    file: string;
    severity: "medium" | "high" | "critical";
    score: number;
    reasons: string[];
  }[];
  recommendation: string;            // Recomendación general
}
```

**Ejemplo**:
```javascript
const risk = await get_risk_assessment("high");

// Resultado:
{
  summary: {
    totalFiles: 150,
    averageScore: 72.5,
    criticalCount: 3,
    highCount: 12,
    mediumCount: 28,
    lowCount: 107
  },
  topRiskFiles: [
    {
      file: "src/core/GodObject.js",
      severity: "critical",
      score: 95,
      reasons: ["Too many dependencies", "High coupling"]
    }
  ],
  recommendation: "🚨 Critical issues detected - Review high-risk files"
}
```

---

### 5. `search_files(pattern)`

**Descripción**: Busca archivos en el proyecto por patrón.

**Parámetros**:
| Nombre | Tipo | Descripción |
|--------|------|-------------|
| `pattern` | string | Patrón de búsqueda (soporta wildcards: "*Camera*", "*.test.js") |

**Retorna**:
```typescript
{
  pattern: string;
  found: number;                   // Total de coincidencias
  files: string[];                 // Primeros 20 resultados
}
```

**Ejemplo**:
```javascript
const results = await search_files("*Camera*");

// Resultado:
{
  pattern: "*Camera*",
  found: 5,
  files: [
    "src/core/CameraState.js",
    "src/render/CameraRenderer.js",
    "src/input/CameraControls.js",
    "src/ui/CameraSettings.js",
    "src/tests/Camera.test.js"
  ]
}
```

---

### 6. `get_server_status()`

**Descripción**: Devuelve el estado completo del servidor MCP y el Orchestrator.

**Parámetros**: Ninguno

**Retorna**:
```typescript
{
  initialized: boolean;            // Server inicializado
  orchestrator: {
    isRunning: boolean;            // Orchestrator activo
    isIndexing: boolean;           // Indexación en progreso
    indexingProgress: number;      // 0-100%
    currentJob: {                  // Job actual (si hay)
      filePath: string;
      priority: string;
      progress: number;
    } | null;
    queueSize: number;             // Tamaño de la cola
  };
  metadata: {
    totalFiles: number;            // Archivos analizados
    totalFunctions: number;        // Funciones detectadas
  };
  cache: {
    entryCount: number;            // Entradas en caché
    memoryUsage: string;           // Uso de memoria
  };
}
```

**Ejemplo**:
```javascript
const status = await get_server_status();

// Resultado:
{
  initialized: true,
  orchestrator: {
    isRunning: true,
    isIndexing: true,
    indexingProgress: 65,
    currentJob: {
      filePath: "src/effects/Particles.js",
      priority: "high",
      progress: 45
    },
    queueSize: 12
  },
  metadata: {
    totalFiles: 150,
    totalFunctions: 450
  },
  cache: {
    entryCount: 150,
    memoryUsage: "2.4 MB"
  }
}
```

---

## 🔄 Flujo de Auto-Análisis

Cuando una tool detecta que un archivo no está analizado:

```
┌─────────────────────────────────────────┐
│  IA llama: get_impact_map("Camera.js") │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  ¿Archivo analizado?                   │
└─────────────────────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
   SÍ         NO
    │         │
    ▼         ▼
┌───────┐  ┌─────────────────────────────┐
│Retornar│  │ 1️⃣ Encolar como CRITICAL  │
│datos  │  │ 2️⃣ Analizar con LLM        │
└───────┘  │ 3️⃣ Esperar resultado       │
           │ 4️⃣ Retornar a IA           │
           └─────────────────────────────┘
```

### Respuestas de Auto-Análisis

**Caso 1: Análisis completado (< 60 segundos)**
```javascript
// La tool espera y responde directamente:
{
  file: "Camera.js",
  directlyAffects: ["RenderEngine.js", "Input.js"],
  semanticConnections: [...],
  riskLevel: "high"
}
```

**Caso 2: Timeout (análisis en progreso)**
```javascript
// Si tarda más de 60 segundos:
{
  "status": "analyzing",
  "message": "Camera.js is being analyzed as CRITICAL priority",
  "estimatedTime": "30 seconds",
  "suggestion": "Please retry this query in 30 seconds"
}
```

**Caso 3: Error en análisis**
```javascript
{
  "status": "error",
  "error": "Analysis failed for Camera.js",
  "message": "LLM server unavailable. Please check server status."
}
```

---

## 💡 Mejores Prácticas para IAs

### 1. Siempre consultar antes de editar
```javascript
// ANTES de editar cualquier archivo:
const impact = await get_impact_map(targetFile);

// Revisar archivos afectados
for (const file of impact.directlyAffects) {
  await readFile(file);  // Leer contexto
}
```

### 2. Verificar estado del sistema
```javascript
// Si sospechas que el análisis no está completo:
const status = await get_server_status();

if (status.orchestrator.isIndexing) {
  console.log(`Indexing ${status.orchestrator.indexingProgress}% complete`);
}
```

### 3. Buscar archivos relacionados
```javascript
// Encontrar todos los archivos de cámara:
const cameraFiles = await search_files("*Camera*");

// Analizar cada uno:
for (const file of cameraFiles.files) {
  const impact = await get_impact_map(file);
  // ...
}
```

---

## 🔮 Próximas Tools (Roadmap)

| Tool | Descripción | Status |
|------|-------------|--------|
| `get_architecture_overview()` | Vista de alto nivel del proyecto | 🏗️ Planned |
| `suggest_refactoring(filePath)` | Sugerencias de mejora | 🏗️ Planned |
| `detect_code_smells()` | Detecta anti-patrones | 🏗️ Planned |
| `generate_dependency_graph()` | Genera grafo visual | 🏗️ Planned |

---

## 📚 Referencias

- [CogniSystem README](../README.md)
- [Arquitectura del Sistema](../ARCHITECTURE.md)
- [Changelog](../CHANGELOG.md)
