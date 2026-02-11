# 🚀 EXTRAPOLACIÓN OMNYSYS - Guía de Implementación

**Fecha**: 2026-02-11  
**Versión**: 3.0  
**Estado**: Lista para producción  

---

## 🎯 Visión General

OmnySys es un sistema de **análisis molecular de código** que usa MCP (Model Context Protocol) para exponer herramientas de análisis a IAs. Su arquitectura es **fractal y autónoma**: puede analizarse y mejorarse a sí mismo.

**Arquitectura A→B→C**:
- **Layer A**: Análisis estático (AST)
- **Layer B**: Enriquecimiento semántico (LLM)
- **Layer C**: Exposición MCP (APIs)

---

## 📦 Componentes Reutilizables

### 1. **Sistema de Análisis Molecular** ⭐⭐⭐

**Qué hace**: Modela el código como átomos (funciones), moléculas (archivos) y electrones (datos).

**Files reutilizables**:
```
src/layer-a-static/
├── indexer.js                 # Extracción AST
├── molecular-extractor.js     # Análisis molecular
├── queries/                   # APIs de consulta
│   ├── project-query.js
│   ├── file-query.js
│   └── dependency-query.js
└── apis/                      # 🆕 APIs especializadas
    ├── project-api.js
    ├── file-api.js
    └── [etc]
```

**Adaptación a otros proyectos**:
```javascript
// 1. Instalar parser
npm install @babel/parser @babel/traverse

// 2. Adaptar extractores
// - Cambiar reglas de extracción
// - Agregar lenguajes nuevos (Python, Go, etc.)

// 3. Reutilizar queries
import { getFileAnalysis } from './layer-a-static/query/apis/file-api.js';
```

### 2. **Tunnel Vision Detector** ⭐⭐⭐

**Qué hace**: Detecta cuando modificas una función pero no sus dependientes.

**Files reutilizables**:
```
src/core/tunnel-vision-detector.js
```

**Uso en cualquier proyecto**:
```javascript
import { detectTunnelVision } from './tunnel-vision-detector.js';

// Detectar si cambiar fetchData rompe algo
const result = await detectTunnelVision(
  '/mi-proyecto',
  'src/api.js',
  'fetchData'
);

if (result) {
  console.log('⚠️ TUNNEL VISION DETECTADO!');
  console.log(`Afecta ${result.callers.unmodified} archivos`);
}
```

**Requisitos**: Sistema de átomos (funciones) con campo `calledBy`.

### 3. **MCP Server + Tools** ⭐⭐⭐

**Qué hace**: Expone herramientas de análisis a cualquier IA (Claude, OpenCode, etc.).

**Files reutilizables**:
```
src/layer-c-memory/mcp/
├── core/
│   └── server-class.js        # Servidor MCP
└── tools/
    ├── impact-map.js          # Análisis de impacto
    ├── analyze-change.js      # Predicción de cambios
    ├── get-call-graph.js      # Grafo de llamadas
    └── [etc]
```

**Setup mínimo**:
```javascript
// 1. Instalar MCP SDK
npm install @modelcontextprotocol/sdk

// 2. Crear servidor
import { OmnySysMCPServer } from './mcp/core/server-class.js';

const server = new OmnySysMCPServer('/ruta/proyecto');
await server.run();
```

### 4. **Sistema de Queries** ⭐⭐

**Qué hace**: Abstracción de acceso a datos con cache integrado.

**Patrón aplicable**:
```javascript
// queries/api-query.js
export async function getApiEndpoints(projectPath) {
  const files = await getAnalyzedFiles(projectPath);
  const endpoints = [];
  
  for (const file of files) {
    const analysis = await getFileAnalysis(projectPath, file);
    if (analysis.exports?.some(e => e.isEndpoint)) {
      endpoints.push(...analysis.exports);
    }
  }
  
  return endpoints;
}
```

### 5. **Derivation Engine** ⭐⭐

**Qué hace**: Calcula propiedades derivadas desde datos atómicos.

**Ejemplo**:
```javascript
// Calcular complejidad de archivo desde funciones
function deriveFileComplexity(atoms) {
  return atoms.reduce((sum, atom) => sum + atom.complexity, 0);
}
```

---

## 🛠️ Guía de Implementación Paso a Paso

### Paso 1: Estructura Base

```
mi-proyecto/
├── src/
│   ├── layer-a-static/       # Análisis estático
│   │   ├── indexer.js
│   │   ├── queries/
│   │   └── storage/
│   ├── layer-c-memory/       # MCP Server
│   │   └── mcp/
│   │       ├── core/
│   │       └── tools/
│   └── core/                 # Lógica de negocio
│       └── tunnel-vision-detector.js
├── .omnysysdata/             # Datos del sistema
└── package.json
```

### Paso 2: Adaptar Extractor

**Para JavaScript/TypeScript** (ya funciona):
- Usar `@babel/parser`
- Configurar plugins: `jsx`, `typescript`, `dynamicImport`

**Para Python**:
```python
# Adaptar molecular-extractor.py
import ast

def extract_functions(source_code):
    tree = ast.parse(source_code)
    functions = []
    
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            functions.append({
                'name': node.name,
                'line': node.lineno,
                'complexity': calculate_complexity(node)
            })
    
    return functions
```

**Para Go**:
```go
// Adaptar usando go/ast
import "go/ast"
import "go/parser"
```

### Paso 3: Definir Tools MCP

```javascript
// src/layer-c-memory/mcp/tools/mi-tool.js

export async function mi_tool(args, context) {
  const { parametro } = args;
  const { projectPath } = context;
  
  // Tu lógica aquí
  const resultado = await analizar(projectPath, parametro);
  
  return {
    success: true,
    data: resultado
  };
}

// Registrar en src/layer-c-memory/mcp/tools/index.js
export const toolDefinitions = [
  {
    name: 'mi_tool',
    description: 'Hace algo útil',
    inputSchema: {
      type: 'object',
      properties: {
        parametro: { type: 'string' }
      },
      required: ['parametro']
    }
  }
];
```

### Paso 4: Configurar Cliente MCP

**Para Claude Desktop**:
```json
// claude_desktop_config.json
{
  "mcpServers": {
    "omnysys": {
      "command": "node",
      "args": [
        "/ruta/a/mi-proyecto/src/layer-c-memory/mcp-server.js",
        "/ruta/al/codigo/a/analizar"
      ]
    }
  }
}
```

**Para OpenCode**:
```json
// settings.json
{
  "mcp.servers": [{
    "name": "omnysys",
    "command": "node src/layer-c-memory/mcp-server.js"
  }]
}
```

---

## 🧪 Casos de Uso

### Caso 1: Code Review Automatizado

```javascript
// Tool: analyze_pr.js
export async function analyze_pr(args, context) {
  const { filesChanged } = args;
  const issues = [];
  
  for (const file of filesChanged) {
    // Detectar tunnel vision
    const tv = await detectTunnelVision(context.projectPath, file);
    if (tv) {
      issues.push({
        type: 'tunnel-vision',
        file,
        severity: tv.severity,
        message: `Afecta ${tv.callers.unmodified} archivos`
      });
    }
    
    // Detectar complejidad
    const analysis = await getFileAnalysis(context.projectPath, file);
    if (analysis.stats?.complexity > 20) {
      issues.push({
        type: 'high-complexity',
        file,
        message: 'Complejidad muy alta'
      });
    }
  }
  
  return { issues };
}
```

### Caso 2: Documentación Automática

```javascript
// Tool: generate_docs.js
export async function generate_docs(args, context) {
  const { filePath } = args;
  
  const analysis = await getFileAnalysis(context.projectPath, filePath);
  const molecule = await getMoleculeSummary(context.projectPath, filePath);
  
  return {
    markdown: `
## ${path.basename(filePath)}

### Funciones
${molecule.atoms.map(a => `- **${a.name}**: ${a.archetype}`).join('\n')}

### Dependencias
- Importa: ${analysis.imports?.length || 0} módulos
- Usado por: ${analysis.usedBy?.length || 0} archivos

### Riesgo
${molecule.insights.riskLevel}
    `.trim()
  };
}
```

### Caso 3: Refactoring Asistido

```javascript
// Tool: suggest_refactor.js
export async function suggest_refactor(args, context) {
  const { filePath } = args;
  
  const molecule = await getMoleculeSummary(context.projectPath, filePath);
  
  const suggestions = [];
  
  if (molecule.insights.hasDeadCode) {
    suggestions.push('Eliminar funciones no usadas');
  }
  
  if (molecule.insights.hasGodFunctions) {
    suggestions.push('Dividir funciones muy grandes');
  }
  
  // Análisis de impacto
  const impact = await get_impact_map({ filePath }, context);
  
  return {
    suggestions,
    impact: {
      filesAffected: impact.totalAffected,
      riskLevel: impact.riskLevel
    }
  };
}
```

---

## 🔌 Integraciones

### VS Code Extension

```typescript
// src/extension.ts
import * as vscode from 'vscode';
import { OmnySysMCPServer } from './mcp/core/server-class.js';

export function activate(context: vscode.ExtensionContext) {
  const server = new OmnySysMCPServer(vscode.workspace.rootPath);
  
  // Comando: Analizar archivo actual
  vscode.commands.registerCommand('omnysys.analyzeFile', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    
    const result = await server.tools.get_impact_map({
      filePath: editor.document.fileName
    });
    
    vscode.window.showInformationMessage(
      `Este archivo afecta a ${result.totalAffected} otros archivos`
    );
  });
}
```

### GitHub Action

```yaml
# .github/workflows/omnysys.yml
name: OmnySys Analysis
on: [pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Run OmnySys Analysis
        run: |
          npm install
          node src/layer-c-memory/mcp-server.js . &
          sleep 5
          node scripts/analyze-pr.js
```

---

## 📊 Roadmap de Extrapolación

### Fase 1: Core (Listo)
- ✅ Sistema de análisis molecular
- ✅ Tunnel Vision Detector
- ✅ MCP Server base

### Fase 2: Lenguajes (En progreso)
- 🟡 JavaScript/TypeScript (100%)
- 🟡 Python (adaptable)
- 🟡 Go (adaptable)
- 🔴 Rust (pendiente)
- 🔴 Java (pendiente)

### Fase 3: Integraciones (Planificado)
- 🔴 GitHub App
- 🔴 VS Code Extension
- 🔴 JetBrains Plugin
- 🔴 CLI Standalone

### Fase 4: IA Avanzada (Investigación)
- 🔴 Sugerencias automáticas de refactor
- 🔴 Predicción de bugs
- 🔴 Generación de tests

---

## 🎯 Conclusión

OmnySys es **arquitectura**, no solo código. Sus principios aplican a cualquier proyecto:

1. **Molecularidad**: Funciones como unidad primaria
2. **Fractalidad**: Mismo patrón en múltiples escalas
3. **Autoconocimiento**: El sistema se analiza a sí mismo
4. **Prevención**: Detecta problemas antes de que ocurran

**Para extrapolar**: Copia la estructura, adapta los extractores, reutiliza las herramientas.

---

**¿Empezamos a usar esto en otros proyectos?** 🚀
