# Layer Graph

**Versión**: 1.0.0  
**Estado**: Activo  
**Responsabilidad**: Sistema de grafos de dependencias y conexiones del sistema

---

## Qué es Layer Graph

Layer Graph es la **capa dedicada al sistema de grafos** de OmnySys. Maneja toda la lógica de:

- **Construcción**: Build del grafo de dependencias desde archivos parseados
- **Análisis**: Algoritmos para detectar ciclos, calcular impacto, transitivas
- **Consulta**: Queries para obtener información del grafo
- **Persistencia**: Serialización y versionado del grafo

---

## Estructura

```
src/layer-graph/
├── index.js                    # API pública unificada
│
├── core/                       # Núcleo del grafo
│   └── types.js                # SSOT: SystemMap, FileNode, Dependency, etc.
│
├── algorithms/                 # Algoritmos de análisis
│   ├── cycle-detector.js       # Detección de ciclos (DFS)
│   ├── impact-analyzer.js      # Análisis de impacto de cambios
│   └── transitive-deps.js      # Dependencias transitivas
│
├── builders/                   # Constructores de grafos
│   ├── system-map.js           # Build principal del SystemMap
│   ├── export-index.js         # Índice de exports + re-exports
│   ├── function-links.js       # Enlaces entre funciones
│   ├── system-graph-builder.js # Grafo de módulos
│   └── call-graph.js           # Call graph extractor
│
├── query/                      # Consultas al grafo
│   ├── dependency-query.js     # Queries de dependencias
│   ├── impact-query.js         # Queries de impacto
│   └── call-graph-analyzer.js  # Análisis de call sites
│
├── resolvers/                  # Resolución de símbolos
│   └── function-resolver.js    # Resolver funciones entre archivos
│
├── persistence/                # Persistencia del grafo
│   └── index.js                # Serialize, deserialize, delta
│
└── utils/                      # Utilidades
    ├── path-utils.js           # Normalización de paths
    └── counters.js             # Contadores de métricas
```

---

## API Pública

### Builders

```javascript
import { 
  buildSystemMap,      // Build principal
  buildExportIndex,    // Índice de exports
  buildFunctionLinks,  // Enlaces entre funciones
  buildSystemGraph,    // Grafo de módulos
  extractCallGraph     // Call graph desde código
} from '#layer-graph/index.js';

// Uso
const systemMap = buildSystemMap(parsedFiles, resolvedImports);
```

### Algorithms

```javascript
import { 
  detectCycles,                    // Detectar ciclos
  calculateTransitiveDependencies, // Deps transitivas
  calculateTransitiveDependents,   // Dependientes transitivos
  getImpactMap,                    // Impacto de un archivo
  findHighImpactFiles,             // Archivos de alto impacto
  RISK_LEVELS                      // Constantes de riesgo
} from '#layer-graph/index.js';

// Uso
const cycles = detectCycles(systemMap.files);
const impact = getImpactMap(filePath, systemMap.files);
```

### Query

```javascript
import { 
  getDependencyGraph,      // Grafo de dependencias
  getTransitiveDependents, // Dependientes transitivos
  queryImpact,             // Query de impacto
  findCallSites            // Call sites de un símbolo
} from '#layer-graph/index.js';

// Uso
const deps = await getDependencyGraph(rootPath, filePath, 2);
const callSites = await findCallSites(projectPath, targetFile, symbolName);
```

### Types (SSOT)

```javascript
import { 
  createEmptySystemMap,  // SystemMap vacío
  createFileNode,        // Nodo de archivo
  createDependency,      // Dependencia
  createFunctionLink,    // Enlace de función
  createImpactInfo       // Info de impacto
} from '#layer-graph/index.js';
```

---

## Uso con Namespaces

```javascript
import { algorithms, builders, query, utils } from '#layer-graph/index.js';

// Algorithms
const cycles = algorithms.detectCycles(files);
const impact = algorithms.getImpactMap(filePath, files);

// Builders
const systemMap = builders.systemMap.buildSystemMap(files, imports);

// Query
const deps = await query.getDependencyGraph(root, file, depth);

// Utils
const normalized = utils.path.normalizePath('some\\path');
```

---

## Tipos de Datos Principales

### SystemMap

```javascript
{
  files: { [path]: FileNode },     // Nodos de archivo
  dependencies: Dependency[],      // Aristas
  functions: { [path]: Function[] },
  function_links: FunctionLink[],
  exportIndex: { [path]: { [name]: ExportInfo } },
  unresolvedImports: { [path]: UnresolvedImport[] },
  typeDefinitions: { [path]: TypeDef[] },
  metadata: {
    totalFiles: number,
    totalDependencies: number,
    cyclesDetected: string[][],
    ...
  }
}
```

### FileNode

```javascript
{
  path: string,              // Path normalizado
  displayPath: string,       // Path legible
  exports: Export[],
  imports: Import[],
  usedBy: string[],          // Quién me importa
  dependsOn: string[],       // A quién importo
  transitiveDepends: string[],
  transitiveDependents: string[]
}
```

---

## Integración con otras Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Layer Graph                                  │
│         "El cerebro matemático del sistema"                    │
│                                                                 │
│    buildSystemMap() → detectCycles() → getImpactMap()          │
│                                                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌───────────┐    ┌───────────┐    ┌───────────┐
    │ Layer A   │    │ Layer B   │    │ Layer C   │
    │ (Static)  │    │ (Semantic)│    │ (Memory)  │
    │           │    │           │    │           │
    │ Usa graph │    │ Usa graph │    │ Expone    │
    │ para      │    │ para      │    │ graph via │
    │ analizar  │    │ derivar   │    │ MCP tools │
    └───────────┘    └───────────┘    └───────────┘
```

---

## Futuro

### v1.1 - Graph ML

```javascript
// Embeddings de nodos
graph.ml.embed();

// Predicción de conexiones
graph.ml.predictConnections();

// Detección de anomalías
graph.ml.anomalyDetection();
```

### v1.2 - Visualización

```javascript
// Exportar para D3.js
graph.viz.toD3();

// Diagramas Mermaid
graph.viz.toMermaid();

// Layout automático
graph.viz.layout();
```

### v1.3 - Graph DB

```javascript
// Persistir en SQLite
graph.db.connect('sqlite://graph.db');

// Queries estilo Cypher
graph.db.query('MATCH (f:File)-[:IMPORTS]->(g) RETURN f');
```

---

## Mantenimiento

- **SSOT**: `core/types.js` es la única fuente de verdad para estructuras
- **API**: Todos los exports públicos van por `index.js`
- **Tests**: `tests/unit/layer-graph/`
- **Imports**: Usar alias `#layer-graph/` en todo el proyecto
