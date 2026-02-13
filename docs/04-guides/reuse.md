# Reuso de Componentes OmnySys

**Versión**: v0.7.1  
**Estado**: Guía práctica  
**Prerequisitos**: Haber leído [principles.md](../01-core/principles.md)

---

## Visión General

OmnySys está diseñado con **arquitectura fractal y autónoma**: sus propios componentes pueden analizarse y mejorarse a sí mismos, pero también pueden **extraerse y reusarse** en otros proyectos.

**Arquitectura A→B→C**:
- **Layer A**: Análisis estático (AST) - 100% reusable
- **Layer B**: Enriquecimiento semántico (LLM) - adaptable
- **Layer C**: Exposición MCP (APIs) - reusable

---

## Componentes Reutilizables

### 1. Sistema de Análisis Molecular ⭐⭐⭐

**Qué hace**: Modela código como átomos (funciones), moléculas (archivos) y electrones (datos).

**Archivos reutilizables**:
```
src/layer-a-static/
├── indexer.js                 # Extracción AST
├── molecular-extractor.js     # Análisis molecular
├── queries/                   # APIs de consulta
│   ├── project-query.js
│   ├── file-query.js
│   └── dependency-query.js
└── apis/                      # APIs especializadas
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

---

### 2. Tunnel Vision Detector ⭐⭐⭐

**Qué hace**: Detecta cuando modificas una función pero no consideras sus dependientes.

**Archivo reusable**:
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

---

### 3. MCP Server + Tools ⭐⭐⭐

**Qué hace**: Expone herramientas de análisis a cualquier IA (Claude, OpenCode, etc.).

**Archivos reutilizables**:
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

---

### 4. Sistema de Queries ⭐⭐

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

---

### 5. Derivation Engine ⭐⭐

**Qué hace**: Calcula propiedades derivadas desde datos atómicos.

**Ejemplo**:
```javascript
// Calcular complejidad de archivo desde funciones
function deriveFileComplexity(atoms) {
  return atoms.reduce((sum, atom) => sum + atom.complexity, 0);
}
```

---

## Guía de Implementación Paso a Paso

### Paso 1: Estructura Base

```
mi-proyecto/
├── src/
│   ├── extractors/      # De OmnySys Layer A
│   ├── queries/         # De OmnySys Layer A
│   └── mcp/             # De OmnySys Layer C (opcional)
├── shadow/              # Metadata cache
└── omny.config.js       # Configuración
```

### Paso 2: Configuración mínima

```javascript
// omny.config.js
export default {
  // Qué extraer
  extractors: [
    'ast-functions',
    'imports-exports',
    'data-flow'
  ],
  
  // Qué ignorar
  ignore: ['node_modules', '*.test.js', 'dist/'],
  
  // MCP (opcional)
  mcp: {
    enabled: true,
    port: 3000
  }
};
```

### Paso 3: Integración en tu flujo

```javascript
// En tu build/ci/git hook
import { runAnalysis } from './extractors/indexer.js';

// Analizar antes de commit
await runAnalysis('./src');

// Verificar tunnel vision
tunnelVisionCheck('./src', changedFiles);
```

---

## Casos de Uso Comunes

### Caso 1: Proyecto Legacy (Sin tests)

**Problema**: Código antiguo, nadie sabe qué se rompe si tocas X.

**Solución**:
```javascript
// Analizar todo
await analyzeProject('./legacy-code');

// Antes de editar
const impact = await analyzeImpact('./legacy-code', 'src/payment.js');
console.log(`⚠️ ${impact.affectedFiles.length} archivos podrían romperse`);
```

### Caso 2: Microservicios

**Problema**: 50 repos, cada uno con patrones diferentes.

**Solución**:
```javascript
// Análisis cross-repo
for (const repo of repos) {
  await analyzeProject(repo);
  const patterns = await detectPatterns(repo);
  console.log(`${repo}: ${patterns.join(', ')}`);
}
```

### Caso 3: Onboarding Rápido

**Problema**: Nuevo dev tarda 2 semanas en entender el codebase.

**Solución**:
```javascript
// Generar mapa del proyecto
const map = await generateProjectMap('./src');

// "Archivos críticos"
console.log(map.hotspots);

// "Dónde empezar"
console.log(map.entryPoints);
```

---

## Checklist de Reuso

- [ ] ¿Necesitas análisis estático? → Usa Layer A
- [ ] ¿Necesitas IA para enriquecer? → Usa Layer B
- [ ] ¿Necesitas exponer a Claude/Cursor? → Usa Layer C
- [ ] ¿Solo necesitas queries? → Copia `queries/` y adapta
- [ ] ¿Necesitas todo? → Fork del repo y modifica

---

## Notas de Implementación

### Requisitos mínimos

- Node.js 18+
- RAM: 512MB para proyectos < 1000 archivos
- Disco: ~10MB por 1000 archivos de metadata

### Performance

| Operación | Tiempo (1000 archivos) |
|-----------|------------------------|
| Indexado inicial | 30-60s |
| Query simple | <10ms |
| Análisis de impacto | <100ms |
| Re-indexado incremental | 1-5s |

---

## Referencias

- [Arquitectura 3 Capas](../02-architecture/layer-a-b.md)
- [MCP Integration Guide](../MCP_SETUP.md)
- [Data Flow System](../02-architecture/data-flow/README.md)

---

**Documento consolidado desde**: `EXTRAPOLACION_OMNYSYS.md`  
**Enfoque**: Reuso práctico de componentes
