# Capa C: Memoria Persistente

## Responsabilidad

Mantener el grafo enriquecido en memoria/disco y servir consultas rápidas a las IAs mediante un servidor MCP.

Esta es la capa que las IAs interactúan directamente.

---

## Arquitectura

```
┌─────────────────────────────────────┐
│      MCP Server (query-server.js)  │  ← IA consulta aquí
│  Expone: get_impact_map, etc.      │
└─────────────────────────────────────┘
                 ⬇️
┌─────────────────────────────────────┐
│    Query Interface (query-api.js)  │
│  Lógica de negocio de consultas    │
└─────────────────────────────────────┘
                 ⬇️
┌─────────────────────────────────────┐
│    Storage Engine (storage.js)     │
│  JSON o SQLite                      │
└─────────────────────────────────────┘
                 ⬆️
┌─────────────────────────────────────┐
│    File Watcher (watcher.js)       │
│  Auto-actualiza cuando cambia código│
└─────────────────────────────────────┘
```

---

## Componentes a Implementar

### 1. `storage.js`
**Propósito**: Persistir y cargar el grafo enriquecido

**Funcionalidad**:
- Guardar `enhanced-system-map.json` en disco
- Cargarlo en memoria al iniciar
- Opcionalmente: Migrar a SQLite para queries rápidas

**API**:
```javascript
class Storage {
  async load(filePath);        // Cargar grafo de disco
  async save(graph, filePath); // Guardar grafo a disco
  async query(queryFn);        // Ejecutar query en memoria
}
```

**Opción A: JSON (MVP)**
```javascript
// Ventaja: Simple, legible
// Desventaja: Todo en memoria, lento para proyectos grandes
const graph = JSON.parse(fs.readFileSync('enhanced-system-map.json'));
```

**Opción B: SQLite (Escalable)**
```javascript
// Ventaja: Queries rápidas con índices, escalable
// Desventaja: Más complejo

CREATE TABLE files (...);
CREATE TABLE dependencies (...);
CREATE INDEX idx_from ON dependencies(from_file);
```

**Decisión**: Empezar con JSON, migrar a SQLite si es necesario

---

### 2. `query-api.js`
**Propósito**: API de consultas sobre el grafo

**Funcionalidad**:
```javascript
class QueryAPI {
  // Obtener mapa de impacto de un archivo
  getImpactMap(filePath) {
    return {
      directDependents: string[],
      indirectDependents: string[],
      semanticConnections: string[],
      riskLevel: 'low' | 'medium' | 'high'
    };
  }

  // Obtener todos los archivos que usan un símbolo
  getSymbolUsage(symbolName) {
    return {
      definedIn: string,
      usedBy: string[]
    };
  }

  // Buscar archivos por tipo de conexión
  getFilesByConnection(type: 'event' | 'state' | 'storage') {
    return string[];
  }

  // Obtener archivos de alto riesgo
  getHighRiskFiles() {
    return string[];
  }

  // Explicar por qué dos archivos están conectados
  explainConnection(fileA, fileB) {
    return {
      type: string,
      path: string[],
      reasoning: string
    };
  }
}
```

---

### 3. `query-server.js`
**Propósito**: Servidor MCP que expone las queries a IAs

**Funcionalidad**:
- Implementar protocolo MCP
- Exponer herramientas para IAs
- Manejar requests y responses

**Herramientas Expuestas**:

#### Tool 1: `get_impact_map`
```json
{
  "name": "get_impact_map",
  "description": "Get all files that could be affected by editing a specific file",
  "inputSchema": {
    "type": "object",
    "properties": {
      "file_path": {
        "type": "string",
        "description": "Path to the file you're about to edit"
      }
    },
    "required": ["file_path"]
  }
}
```

**Ejemplo de uso**:
```javascript
// IA ejecuta:
const result = await callTool('get_impact_map', { file_path: 'src/CameraState.js' });

// Respuesta:
{
  "directDependents": ["RenderEngine.js", "Input.js"],
  "indirectDependents": ["Main.js"],
  "semanticConnections": ["Minimap.js (shared state: camera position)"],
  "riskLevel": "high",
  "recommendation": "Review 4 files before editing: RenderEngine.js, Input.js, Main.js, Minimap.js"
}
```

#### Tool 2: `analyze_change`
```json
{
  "name": "analyze_change",
  "description": "Analyze impact of changing a specific function or class",
  "inputSchema": {
    "type": "object",
    "properties": {
      "file_path": { "type": "string" },
      "symbol_name": { "type": "string" }
    }
  }
}
```

#### Tool 3: `explain_connection`
```json
{
  "name": "explain_connection",
  "description": "Explain why two files are connected",
  "inputSchema": {
    "type": "object",
    "properties": {
      "file_a": { "type": "string" },
      "file_b": { "type": "string" }
    }
  }
}
```

**Stack Técnico**:
- `@modelcontextprotocol/sdk` - SDK oficial de MCP
- Node.js para el servidor
- JSON-RPC para comunicación

---

### 4. `watcher.js`
**Propósito**: Auto-actualizar el grafo cuando el código cambia

**Funcionalidad**:
- Monitorear archivos del proyecto
- Detectar cambios
- Regenerar partes del grafo afectadas

**API**:
```javascript
class FileWatcher {
  constructor(projectPath, storage, indexer) {}

  start() {
    // Inicia el watcher
  }

  stop() {
    // Detiene el watcher
  }

  onFileChanged(filePath) {
    // Re-indexa archivo modificado + dependientes
  }
}
```

**Estrategia de Actualización**:
```javascript
// Cuando src/fileB.js cambia:
1. Re-parsear fileB.js (Capa A)
2. Re-analizar semánticamente fileB.js (Capa B)
3. Actualizar dependientes directos (archivos que importan B)
4. Regenerar conexiones semánticas afectadas
5. Guardar grafo actualizado
```

**Stack Técnico**:
- `chokidar` - File watcher robusto
- Debouncing para evitar re-indexar por cada keystroke

---

### 5. `cli.js`
**Propósito**: Interfaz de línea de comandos

**Comandos**:
```bash
# Inicializar OmnySys en un proyecto
omnysys init

# Regenerar grafo manualmente
omnysys reindex

# Iniciar servidor MCP
omnysys serve

# Consultar desde CLI (debug)
omnysys query impact src/CameraState.js

# Ver estadísticas del grafo
omnysys stats
```

**Implementación**:
```javascript
#!/usr/bin/env node
const { Command } = require('commander');

const program = new Command();

program
  .command('init')
  .description('Initialize OmnySys in current project')
  .action(async () => {
    // 1. Ejecutar Capa A
    // 2. Ejecutar Capa B
    // 3. Iniciar watcher
    // 4. Iniciar servidor MCP
  });

program
  .command('serve')
  .description('Start MCP server')
  .action(async () => {
    const server = new MCPServer();
    server.start();
  });

program.parse();
```

---

## Flujo de Trabajo Completo

### Instalación Inicial

```bash
# 1. Usuario instala OmnySys
npm install -g omnysys

# 2. Inicializa en su proyecto
cd my-project
omnysys init
```

**Proceso de `init`**:
1. Escanea el proyecto (Capa A)
2. Genera `system-map.json`
3. Analiza semánticamente (Capa B)
4. Genera `enhanced-system-map.json`
5. Inicia file watcher (background)
6. Inicia servidor MCP (background)
7. Imprime: "✅ OmnySys ready. MCP server running on port 3000"

---

### Uso Normal (IA edita código)

**Escenario**: IA quiere editar un archivo

```
1. IA: "Voy a modificar CameraState.js"

2. [Hook automático] Llama a MCP tool: get_impact_map("CameraState.js")

3. Servidor MCP:
   - Carga grafo de memoria
   - Ejecuta query
   - Retorna resultados

4. IA recibe:
   {
     "directDependents": ["RenderEngine.js"],
     "semanticConnections": ["Minimap.js (shared camera state)"],
     "riskLevel": "high"
   }

5. IA: "Entendido, voy a leer RenderEngine y Minimap también"

6. [IA hace las ediciones]

7. File watcher detecta cambios → Re-indexa automáticamente
```

---

## Integración con Claude Code

**Opción A: Hook de Pre-Edición**

Crear un hook que se ejecute antes de cada edición:

```javascript
// En configuración de Claude Code
{
  "hooks": {
    "pre-edit": "omnysys query impact $FILE"
  }
}
```

**Opción B: Skill Personalizado**

Crear un skill que la IA pueda invocar manualmente:

```bash
# IA ejecuta:
/omnysys-check CameraState.js
```

**Opción C: Servidor MCP (Recomendado)**

Registrar OmnySys como servidor MCP disponible:

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "omnysys": {
      "command": "omnysys",
      "args": ["serve"]
    }
  }
}
```

---

## Casos de Prueba

**Validar con**:
- Todos los test-cases previos
- Simular ediciones y verificar advertencias
- Performance: queries en < 100ms

**Criterio de éxito**:
- Servidor MCP funciona correctamente
- IA puede consultar el grafo
- File watcher actualiza el grafo automáticamente

---

## Performance

**Objetivos**:
- Carga inicial del grafo: < 1 segundo
- Query individual: < 100ms
- Re-indexación de 1 archivo: < 500ms

**Optimizaciones**:
- Mantener grafo en memoria (no leer de disco cada vez)
- Índices para búsquedas rápidas
- Actualización incremental (no regenerar todo)

---

## Configuración

**Archivo**: `.omnysys.json` en la raíz del proyecto

```json
{
  "include": ["src/**/*.js", "src/**/*.ts"],
  "exclude": ["node_modules", "dist", "build"],
  "mcpPort": 3000,
  "autoReindex": true,
  "riskThresholds": {
    "low": 2,
    "medium": 5,
    "high": 10
  },
  "enableLLM": false,
  "llmModel": "qwen2.5-coder:7b"
}
```

---

## Siguientes Pasos

1. Implementar `storage.js` (JSON simple)
2. Implementar `query-api.js` (lógica de consultas)
3. Implementar `query-server.js` (servidor MCP)
4. Implementar `watcher.js` (auto-actualización)
5. Implementar `cli.js` (interfaz de usuario)
6. Validar integración completa con test-cases

**Estado actual**: Por implementar (estructura creada)
