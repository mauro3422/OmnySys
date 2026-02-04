
# CogniSystem - Arquitectura Técnica

**Versión**: v0.4.5 - MCP Unified Entry Point  
**Última actualización**: 2026-02-03

## Visión General

CogniSystem es un **motor de contexto multi-capa** que actúa como memoria externa para IAs que modifican código. Resuelve el problema de "visión de túnel" mediante tres capas que trabajan en conjunto:

1. **Capa A (Estática)**: Análisis determinista y rápido
2. **Capa B (Semántica)**: Análisis inteligente con IA local
3. **Capa C (Memoria)**: Persistencia y servicio de consulta

**Innovación clave (v0.4.5)**: El **MCP Server es el entry point único**. Un solo comando inicia todo el sistema incluyendo el Orchestrator como componente interno.

---

## Arquitectura Unificada (v0.4.5+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    MCP SERVER (Entry Point Único)                          │
│              node src/layer-c-memory/mcp-server.js /proyecto               │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      LAYER C: MEMORY                                │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  MCP TOOLS (Interfaz para la IA)                            │   │   │
│  │  │                                                             │   │   │
│  │  │  • get_impact_map(filePath)     → "¿Qué se ve afectado?"   │   │   │
│  │  │  • analyze_change(file, symbol) → "Impacto del cambio"     │   │   │
│  │  │  • explain_connection(a, b)     → "¿Por qué conectados?"   │   │   │
│  │  │  • get_risk_assessment()        → "Riesgos del proyecto"   │   │   │
│  │  │  • search_files(pattern)        → "Buscar archivos"        │   │   │
│  │  │  • get_server_status()          → "Estado del sistema"     │   │   │
│  │  │                                                             │   │   │
│  │  │  Auto-análisis: Si no existe, encola CRITICAL y espera     │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  UNIFIED CACHE MANAGER                                      │   │   │
│  │  │                                                             │   │   │
│  │  │  • RAM Cache (metadata, connections, assessments)          │   │   │
│  │  │  • Static Analysis Cache (disco)                           │   │   │
│  │  │  • LLM Cache (disco)                                       │   │   │
│  │  │  • Cascade invalidation on critical changes                │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  STORAGE (Persistent)                                       │   │   │
│  │  │                                                             │   │   │
│  │  │  .OmnySystemData/                                          │   │   │
│  │  │  ├── index.json              (metadata general)            │   │   │
│  │  │  ├── files/*.json            (análisis por archivo)        │   │   │
│  │  │  ├── connections/*.json      (conexiones semánticas)       │   │   │
│  │  │  ├── risks/*.json            (evaluaciones de riesgo)      │   │   │
│  │  │  └── unified-cache/         (caché unificado)             │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ORCHESTRATOR (Componente Interno)               │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  ANALYSIS QUEUE                                             │   │   │
│  │  │                                                             │   │   │
│  │  │  Prioridades: CRITICAL > HIGH > MEDIUM > LOW               │   │   │
│  │  │  • CRITICAL: Archivo solicitado por IA                     │   │   │
│  │  │  • HIGH: Archivos modificados recientemente                │   │   │
│  │  │  • MEDIUM: Dependencias de archivos en cola                │   │   │
│  │  │  • LOW: Análisis de background                             │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  ANALYSIS WORKER                                            │   │   │
│  │  │                                                             │   │   │
│  │  │  • Procesa archivos con LLM                                │   │   │
│  │  │  • Pausable/resumable                                      │   │   │
│  │  │  • Rollback de caché en error                              │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  FILE WATCHER                                               │   │   │
│  │  │                                                             │   │   │
│  │  │  • Detecta cambios en tiempo real                          │   │   │
│  │  │  • BatchProcessor agrupa cambios                           │   │   │
│  │  │  • Auto-encola modificaciones                              │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  STATE MANAGER                                              │   │   │
│  │  │                                                             │   │   │
│  │  │  • Persiste estado del orchestrator                        │   │   │
│  │  │  • Atomic writes (temp + rename)                           │   │   │
│  │  │  • Recuperación de estado tras crash                       │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  WEBSOCKET MANAGER                                          │   │   │
│  │  │                                                             │   │   │
│  │  │  • Notificaciones en tiempo real                           │   │   │
│  │  │  • VS Code Bridge se conecta aquí                          │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER B: SEMANTIC (La Mente)                    │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  LLM ANALYZER                                               │   │   │
│  │  │                                                             │   │   │
│  │  │  • Qwen2.5-Coder-7B (local)                                │   │   │
│  │  │  • Detecta conexiones no obvias                            │   │   │
│  │  │  • Validación de respuestas (JSON schemas)                 │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  STATIC EXTRACTORS (80% de casos)                           │   │   │
│  │  │                                                             │   │   │
│  │  │  • Shared State Detector (window.*, global.*)              │   │   │
│  │  │  • Event Pattern Detector (emitters/listeners)             │   │   │
│  │  │  • Side Effects Detector                                   │   │   │
│  │  │  • CSS-in-JS, TypeScript, Redux/Context extractors         │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  SEMANTIC ENRICHER                                          │   │   │
│  │  │                                                             │   │   │
│  │  │  • Combina static + LLM results                            │   │   │
│  │  │  • Genera enhanced-system-map.json                         │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER A: STATIC (El Cuerpo)                     │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  PROJECT SCANNER                                            │   │   │
│  │  │                                                             │   │   │
│  │  │  • Recorre filesystem                                      │   │   │
│  │  │  • Filtra node_modules, .git, dist                         │   │   │
│  │  │  • Soporta JS, TS, JSX, TSX                                │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  AST PARSER (@babel/parser)                                 │   │   │
│  │  │                                                             │   │   │
│  │  │  • Extrae imports, exports, llamadas                       │   │   │
│  │  │  • Detecta definiciones (clases, funciones)                │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  DEPENDENCY GRAPH BUILDER                                   │   │   │
│  │  │                                                             │   │   │
│  │  │  • Construye grafo file → file                             │   │   │
│  │  │  • Detecta ciclos                                          │   │   │
│  │  │  • Calcula métricas (inDegree, outDegree)                  │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  ANALYZERS (Tier 1-3)                                       │   │   │
│  │  │                                                             │   │   │
│  │  │  Tier 1: Hotspots, Orphan files, Circular deps             │   │   │
│  │  │  Tier 2: Coupling, Reachability, Side effects              │   │   │
│  │  │  Tier 3: Risk scoring, Broken connections                  │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ⬆️ Source Code
                                    │
                              User's Project
```

---

## Flujo de Inicialización (v0.4.5)

```
Usuario (IA) ejecuta:
node src/layer-c-memory/mcp-server.js /ruta/proyecto

         │
         ▼
┌─────────────────────────────────────┐
│  MCP Server.initialize()            │
├─────────────────────────────────────┤
│                                     │
│  STEP 0: Initialize Orchestrator    │
│    → queue, worker, fileWatcher     │
│    → stateManager, webSocket        │
│    ✓ Orchestrator ready             │
│                                     │
│  STEP 1: AI Server Setup            │
│    → Auto-start LLM if needed       │
│    ✓ LLM ready                      │
│                                     │
│  STEP 2: Data Structure             │
│    → Create omnysysdata/            │
│    ✓ Structure ready                │
│                                     │
│  STEP 3: Load Data                  │
│    → Load existing analysis         │
│    ✓ Data loaded                    │
│                                     │
│  STEP 4: Unified Cache              │
│    → Initialize cache manager       │
│    → Cache metadata, connections    │
│    ✓ Cache ready                    │
│                                     │
│  STEP 5: Background Indexing        │
│    → If no data: start indexing     │
│    → Runs in background             │
│    ✓ Indexing started               │
│                                     │
│  STEP 6: Tools Ready                │
│    ✓ get_impact_map()               │
│    ✓ analyze_change()               │
│    ✓ explain_connection()           │
│    ✓ get_risk_assessment()          │
│    ✓ search_files()                 │
│    ✓ get_server_status()            │
│                                     │
│  ✅ MCP Server Ready!               │
└─────────────────────────────────────┘
```

---

## Flujo de Auto-Análisis

```
IA llama: get_impact_map("CameraState.js")

         │
         ▼
┌─────────────────────────────────────┐
│  ¿Archivo analizado?                │
└─────────────────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
   SÍ         NO
    │         │
    ▼         ▼
┌───────┐  ┌─────────────────────────┐
│       │  │ 🚨 File not analyzed    │
│Return │  │ ⏳ Queue as CRITICAL    │
│cached │  │                         │
│data   │  │ Orchestrator:           │
│       │  │   queue.enqueue()       │
│       │  │   worker.analyze()      │
│       │  │   await result          │
│       │  │                         │
│       │  │ ✅ Analysis completed   │
│       │  │                         │
│       │  │ Build & return          │
│       │  │ impact map              │
└───────┘  └─────────────────────────┘
```

---

## Arquitectura de Tres Capas (Detalle)

---

## Capa A: Rastreador Estático

### Responsabilidad
Extraer relaciones técnicas obvias entre archivos mediante análisis sintáctico.

### Componentes

#### 1. Project Scanner
**Input**: Ruta del proyecto
**Output**: Lista de archivos a analizar

**Funcionalidad**:
- Recorre el filesystem recursivamente
- Filtra: `node_modules/`, `.git/`, `dist/`, `build/`
- Aplica whitelist: `.js`, `.ts`, `.jsx`, `.tsx` (extensible)
- Detecta tipo de proyecto: Node.js, React, Vue, etc.

**Stack**:
```javascript
const glob = require('fast-glob');

async function scanProject(rootPath) {
  const files = await glob(['**/*.{js,ts,jsx,tsx}'], {
    cwd: rootPath,
    ignore: ['node_modules/**', 'dist/**', 'build/**']
  });
  return files;
}
```

#### 2. AST Parser
**Input**: Contenido de un archivo
**Output**: Árbol sintáctico abstracto

**Funcionalidad**:
- Parsea código JS/TS a AST
- Extrae:
  - `import`/`require` statements → dependencias
  - `export` declarations → API pública
  - Llamadas a funciones → uso de dependencias
  - Definiciones de clases/funciones → símbolos exportables

**Stack**:
```javascript
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

function parseFile(code) {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });

  const imports = [];
  const exports = [];
  const calls = [];

  traverse(ast, {
    ImportDeclaration(path) {
      imports.push({
        source: path.node.source.value,
        specifiers: path.node.specifiers.map(s => s.local.name)
      });
    },
    ExportNamedDeclaration(path) {
      // Extract export info
    },
    CallExpression(path) {
      // Extract function calls
    }
  });

  return { imports, exports, calls };
}
```

#### 3. Dependency Graph Builder
**Input**: Resultados del parser de todos los archivos
**Output**: Grafo de dependencias en formato JSON

**Estructura del Grafo**:
```typescript
interface SystemMap {
  files: {
    [filePath: string]: FileNode;
  };
  dependencies: Dependency[];
}

interface FileNode {
  path: string;
  exports: string[];           // Símbolos que exporta
  imports: ImportStatement[];  // Qué importa y de dónde
  usedBy: string[];            // Archivos que lo importan
  calls: string[];             // Funciones que llama
  type: 'module' | 'component' | 'utility' | 'config';
}

interface ImportStatement {
  source: string;      // Archivo del que importa
  specifiers: string[]; // Qué símbolos importa
}

interface Dependency {
  from: string;  // Archivo que importa
  to: string;    // Archivo importado
  type: 'import' | 'dynamic' | 'require';
  symbols: string[]; // Qué símbolos específicos usa
}
```

**Algoritmo**:
1. Para cada archivo, extraer imports y exports
2. Resolver rutas relativas (`./utils` → `src/utils.js`)
3. Construir mapa bidireccional: A importa B → B es usado por A
4. Detectar ciclos (opcional: advertir sobre dependencias circulares)

---

## Capa B: Enlazador Semántico

### Responsabilidad
Encontrar conexiones que el análisis estático no puede detectar.

### Tipos de Conexiones Semánticas

#### 1. Estado Compartido
**Ejemplo**:
```javascript
// store.js
export const globalState = { camera: { x: 0, y: 0 } };

// CameraController.js
import { globalState } from './store';
globalState.camera.x = 10; // Modifica estado

// Minimap.js
import { globalState } from './store';
console.log(globalState.camera.x); // Lee estado
```

**Detección**:
- Buscar objetos exportados que sean mutables
- Rastrear archivos que importan esos objetos
- Marcar como "conectados por estado compartido"

#### 2. Sistema de Eventos
**Ejemplo**:
```javascript
// Button.js
eventBus.emit('user:click', { target: 'save' });

// Analytics.js
eventBus.on('user:click', trackEvent);

// Logger.js
eventBus.on('user:click', logAction);
```

**Detección**:
- Pattern matching: `emit`, `on`, `addEventListener`, `dispatch`
- Extraer nombres de eventos
- Agrupar archivos por eventos compartidos

#### 3. Configuración Global
**Ejemplo**:
```javascript
// config.js
export const DEBUG_MODE = true;

// Logger.js
if (DEBUG_MODE) console.log(...);

// Renderer.js
if (DEBUG_MODE) drawDebugInfo();
```

**Detección**:
- Identificar archivos de configuración (`config.js`, `.env`)
- Rastrear usos de esas constantes en otros archivos

#### 4. Side Effects Ocultos
**Ejemplo**:
```javascript
// api.js
export function login() {
  localStorage.setItem('token', ...);
}

// AuthGuard.js
const token = localStorage.getItem('token');
```

**Detección**:
- Pattern matching: `localStorage`, `sessionStorage`, `window.*`
- Marcar archivos que comparten el mismo storage key

### Implementación con IA Local

#### Prompt Template
```
Eres un analizador de código. Analiza este archivo y determina:

1. ¿Modifica algún estado global o compartido?
2. ¿Emite o escucha eventos?
3. ¿Depende de configuración externa?
4. ¿Tiene side effects (localStorage, DOM, etc.)?

Archivo: {filePath}
Código:
{code}

Contexto del proyecto:
{systemMap} (otros archivos y sus exports)

Responde en JSON:
{
  "sharedState": ["store.userState", "globalConfig.theme"],
  "events": {
    "emits": ["user:login", "data:update"],
    "listens": ["app:ready"]
  },
  "externalDeps": ["localStorage.token", "window.location"],
  "affectedBy": ["config.js", "store.js"],
  "affects": ["ui/Dashboard.js", "api/AuthService.js"]
}
```

#### Stack Técnico
```javascript
const { Ollama } = require('ollama');

async function analyzeSemanticConnections(filePath, code, systemMap) {
  const ollama = new Ollama();

  const prompt = buildPrompt(filePath, code, systemMap);

  const response = await ollama.chat({
    model: 'qwen2.5-coder:7b',
    messages: [{ role: 'user', content: prompt }],
    format: 'json'
  });

  return JSON.parse(response.message.content);
}
```

### Enriquecimiento del Grafo

**Output**: `enhanced-system-map.json`
```typescript
interface EnhancedFileNode extends FileNode {
  semanticConnections: {
    sharedState: string[];
    events: { emits: string[]; listens: string[] };
    externalDeps: string[];
    affectedBy: string[];
    affects: string[];
  };
  riskLevel: 'low' | 'medium' | 'high'; // Basado en cuántos archivos afecta
}
```

---

## Capa C: Memoria Persistente

### Responsabilidad
Mantener el grafo actualizado y servir consultas rápidas a las IAs.

### Componentes

#### 1. Storage Engine

**Opción A: JSON (MVP)**
- Simple y legible
- Suficiente para proyectos < 100 archivos
- Carga todo en memoria

**Opción B: SQLite (Escalable)**
- Queries rápidas con índices
- Escalable a miles de archivos
- Relaciones entre archivos como tabla

**Schema SQL**:
```sql
CREATE TABLE files (
  path TEXT PRIMARY KEY,
  type TEXT,
  exports TEXT, -- JSON array
  risk_level TEXT
);

CREATE TABLE dependencies (
  id INTEGER PRIMARY KEY,
  from_file TEXT,
  to_file TEXT,
  type TEXT, -- 'import', 'semantic', 'event'
  metadata TEXT, -- JSON con info adicional
  FOREIGN KEY (from_file) REFERENCES files(path),
  FOREIGN KEY (to_file) REFERENCES files(path)
);

CREATE INDEX idx_from ON dependencies(from_file);
CREATE INDEX idx_to ON dependencies(to_file);
```

#### 2. Query Interface

**Operaciones expuestas**:

```typescript
interface CogniSystemAPI {
  // Obtener mapa de impacto de un archivo
  getImpactMap(filePath: string): {
    directDependents: string[];
    indirectDependents: string[];
    semanticConnections: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };

  // Obtener todos los archivos relacionados con un símbolo
  getSymbolUsage(symbolName: string): {
    definedIn: string;
    usedBy: string[];
  };

  // Buscar archivos por tipo de conexión
  getFilesByConnection(connectionType: 'event' | 'state' | 'config'): string[];

  // Regenerar grafo de un archivo específico
  reindexFile(filePath: string): void;
}
```

#### 3. MCP Server

**Herramienta expuesta a IAs**:
```json
{
  "name": "cogni_system",
  "description": "Consulta el grafo de dependencias del proyecto antes de editar código",
  "tools": [
    {
      "name": "get_impact_map",
      "description": "Obtiene todos los archivos que podrían verse afectados al modificar un archivo",
      "inputSchema": {
        "type": "object",
        "properties": {
          "file_path": { "type": "string" }
        }
      }
    },
    {
      "name": "analyze_change",
      "description": "Analiza el impacto de modificar una función o clase específica",
      "inputSchema": {
        "type": "object",
        "properties": {
          "file_path": { "type": "string" },
          "symbol_name": { "type": "string" }
        }
      }
    }
  ]
}
```

#### 4. File Watcher (Auto-Update)

**Funcionalidad**:
- Detecta cambios en archivos del proyecto
- Determina si la modificación afecta el grafo
- Regenera solo la parte necesaria

**Stack**:
```javascript
const chokidar = require('chokidar');

const watcher = chokidar.watch('src/**/*.{js,ts}', {
  ignored: /node_modules/,
  persistent: true
});

watcher.on('change', async (filePath) => {
  console.log(`File changed: ${filePath}`);

  // Estrategia: Regenerar archivo modificado + sus dependientes directos
  await reindexFile(filePath);
  const dependents = await getDirectDependents(filePath);
  for (const dep of dependents) {
    await reindexFile(dep);
  }
});
```

---

## Flujo de Trabajo Completo

### Fase 1: Instalación (Primera vez)

```bash
# Usuario instala CogniSystem en su proyecto
npm install -g cogni-system
cd my-project
cogni-system init
```

**Proceso**:
1. Escanea el proyecto (Capa A)
2. Construye grafo estático
3. Ejecuta análisis semántico (Capa B) - puede tomar varios minutos
4. Guarda `system-map.json` y `enhanced-system-map.json`
5. Inicia servidor MCP en background

### Fase 2: Uso Normal (IA edita código)

**Escenario**: IA quiere editar `CameraState.js`

```
1. IA: "Voy a modificar la función updateCamera en CameraState.js"

2. Hook automático llama: get_impact_map("CameraState.js")

3. CogniSystem responde:
   {
     "directDependents": ["RenderEngine.js", "Input.js"],
     "semanticConnections": ["Minimap.js (shared state: camera position)"],
     "riskLevel": "high",
     "recommendation": "Revisa los 3 archivos antes de editar"
   }

4. IA: "Entendido, voy a leer RenderEngine, Input y Minimap primero"

5. IA hace las ediciones necesarias en los 4 archivos

6. File watcher detecta cambios → Regenera grafo automáticamente
```

### Fase 3: Actualización Incremental

**Cuando se modifica el código**:
- File watcher detecta el cambio
- Re-parsea solo el archivo modificado (rápido)
- Actualiza relaciones en el grafo
- Si la IA cambió imports/exports: analiza dependientes también

---

## Decisiones de Diseño

### 1. ¿Por qué tres capas y no solo una?

**Justificación**:
- Capa A sola: Rápida pero limitada (no ve conexiones semánticas)
- Capa B sola: Inteligente pero lenta (necesita IA para todo)
- Combinación: Lo mejor de ambos mundos

### 2. ¿Por qué IA local y no GPT-4?

**Justificación**:
- **Costo**: Analizar 100 archivos con GPT-4 = $$
- **Privacidad**: El código no sale del entorno local
- **Velocidad**: IA local puede correr en paralelo sin límites de rate

**Trade-off**: Precisión ligeramente menor, pero aceptable para este caso de uso

### 3. ¿Por qué pre-construir y no analizar on-demand?

**Justificación**:
- Editar código es frecuente, la IA necesita respuesta instantánea
- Pre-construir = costo de tiempo inicial, pero velocidad constante después
- On-demand = cada consulta es lenta

### 4. ¿Por qué MCP y no una librería?

**Justificación**:
- MCP es el estándar para herramientas de IAs
- Funciona con cualquier IA compatible (Claude, GPT, modelos locales)
- No requiere modificar el código de la IA

---

## Optimizaciones Futuras

### Performance
- **Análisis paralelo**: Procesar múltiples archivos a la vez
- **Caché inteligente**: No re-analizar archivos sin cambios
- **Análisis incremental**: Solo regenerar lo afectado

### Precisión
- **Fine-tuning del modelo**: Entrenar IA específicamente para este caso de uso
- **Heurísticas híbridas**: Combinar pattern matching + IA
- **Feedback loop**: Aprender de errores pasados

### Escalabilidad
- **Análisis diferido**: Capa B se ejecuta en background
- **Priorización**: Analizar archivos críticos primero
- **Distributed**: Múltiples máquinas analizan en paralelo

---

## Limitaciones Conocidas

### 1. Código Dinámico
**Problema**: `require(dynamicPath)` no se puede resolver estáticamente
**Solución parcial**: Detectar patterns comunes y advertir

### 2. Código Generado
**Problema**: Build tools que generan código (Webpack, etc.)
**Solución**: Analizar el código fuente, no el bundle

### 3. Side Effects Complejos
**Problema**: Modificaciones al DOM, llamadas a APIs externas
**Solución**: Heurísticas + documentación manual

### 4. Proyectos Enormes
**Problema**: 10,000+ archivos = análisis lento
**Solución**: Análisis incremental + priorización

---

## Próximos Pasos

Ver [ROADMAP.md](ROADMAP.md) para el plan de implementación detallado.

**Prioridad inmediata**: Construir MVP de Capa A con casos de prueba sintéticos.
