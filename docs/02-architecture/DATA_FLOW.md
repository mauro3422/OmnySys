# Flujo de Datos - OmnySys

**Versión**: v0.9.61  
**Última actualización**: 2026-02-25  
**Estado**: ✅ SQLite + Bulk Operations + CalledBy Linkage + File Cultures

---

## Visión General del Sistema Real

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO DE DATOS COMPLETO                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   [Código Fuente]                                                            │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  INDEXER.JS - Orquestador Principal                                 │   │
│   │  ───────────────────────────────────────────────────────────────    │   │
│   │  1. Cache init + loadProjectInfo (paralelo)                         │   │
│   │  2. scanProjectFiles                                                  │   │
│   │  3. parseFiles                                                        │   │
│   │  4. extractAndSaveAtoms (AtomExtractionPhase)                        │   │
│   │  5. buildCalledByLinks (cross-file linkage)                          │   │
│   │  6. resolveImports + ensureDataDir (paralelo)                        │   │
│   │  7. normalizePaths                                                    │   │
│   │  8. buildSystemGraph                                                  │   │
│   │  9. enrichWithCulture (ZERO LLM)                                      │   │
│   │  10. generateAnalysisReport + enhanceSystemMap (paralelo)            │   │
│   │  11. saveEnhancedSystemMap (SQLite bulk)                             │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  STORAGE: SQLite Database (.omnysysdata/omnysys.db)                 │   │
│   │  ───────────────────────────────────────────────────────────────    │   │
│   │  TABLAS PRINCIPALES:                                                 │   │
│   │  • atoms → 13,485 funciones con 50+ campos de metadata              │   │
│   │  • atom_relations → Grafo de llamadas entre átomos                  │   │
│   │  • files → Metadatos por archivo                                    │   │
│   │  • system_files → System Map extendido                              │   │
│   │  • file_dependencies → Dependencias entre archivos                  │   │
│   │  • semantic_connections → Conexiones semánticas (localStorage, etc) │   │
│   │  • risk_assessments → Evaluación de riesgo por archivo              │   │
│   │  • modules → Agrupación lógica                                      │   │
│   │                                                                      │   │
│   │  CONFIGURACIÓN OPTIMIZADA:                                           │   │
│   │  • journal_mode = WAL (Write-Ahead Logging)                         │   │
│   │  • cache_size = 64MB                                                 │   │
│   │  • page_size = 4096 bytes                                            │   │
│   │  • busy_timeout = 5000ms                                             │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  LAYER C: Memory / MCP Server (28-30 tools)                         │   │
│   │  ───────────────────────────────────────────────────────────────    │   │
│   │  Query APIs → Derivation Engine → MCP Tools                         │   │
│   │                                                                      │   │
│   │  CATEGORÍAS DE HERRAMIENTAS:                                        │   │
│   │  • Impacto: get_impact_map, analyze_change, trace_variable_impact   │   │
│   │  • Código: get_call_graph, get_function_details, get_molecule_summary│  │
│   │  • Métricas: get_risk_assessment, get_health_metrics, detect_patterns│  │
│   │  • Sociedad: get_atom_society, get_atom_history, get_removed_atoms  │   │
│   │  • Sistema: search_files, get_server_status, restart_server         │   │
│   │  • Editor: atomic_edit, atomic_write                                │   │
│   │  • Refactoring: suggest_refactoring, validate_imports               │   │
│   │  • Testing: generate_tests, generate_batch_tests                    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                     │
│        ▼                                                                     │
│   [Claude / OpenCode / Qwen - IAs]                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pipeline Detallado de Indexer.js

### **Paso 1: Inicialización Paralela** (1.5s startup)

```javascript
// src/layer-a-static/indexer.js:78-82
const [cacheManager] = await Promise.all([
  getCacheManager(absoluteRootPath),
  loadProjectInfo(absoluteRootPath, verbose)
]);
```

**Qué hace**:
- Inicializa cache singleton (evita re-análisis de archivos no cambiados)
- Carga info del proyecto (package.json, tsconfig, etc.)
- **Tiempo**: ~200-300ms

---

### **Paso 2: Escaneo de Archivos**

```javascript
// src/layer-a-static/indexer.js:85
const { relativeFiles, files } = await scanProjectFiles(absoluteRootPath, verbose);
```

**Qué hace**:
- Escanea directorio recursivamente
- Filtra por extensiones (.js, .ts, .jsx, .tsx, .mjs, .cjs)
- Excluye node_modules, .git, dist, build
- **Output**: Array de archivos con paths relativos y absolutos

---

### **Paso 3: Parseo con Babel**

```javascript
// src/layer-a-static/indexer.js:91
const parsedFiles = await parseFiles(files, verbose);
```

**Qué extrae**:
```javascript
{
  imports: [],      // ESM, CommonJS, dynamic imports
  exports: [],      // Named, default, re-exports
  definitions: [],  // Funciones y clases
  calls: [],        // Llamadas a funciones
  functions: [],    // Info detallada (id, name, params, isExported)
  source: string    // Código fuente (se libera después para ahorrar memoria)
}
```

**Configuración Babel**:
- @babel/parser con plugins para TypeScript, JSX, decorators
- Tokens: false (ahorra memoria)
- Comments: true (para JSDoc extraction)

---

### **Paso 4: Extracción de Átomos (AtomExtractionPhase)**

```javascript
// src/layer-a-static/indexer.js:103-107
const totalAtomsExtracted = await extractAndSaveAtoms(
  parsedFiles, absoluteRootPath, verbose
);
```

**Sub-pasos**:

1. **AtomExtractionPhase.execute()** por archivo:
   ```javascript
   // src/layer-a-static/pipeline/phases/atom-extraction/AtomExtractionPhase.js
   async execute(context) {
     const atoms = extractAtoms(context.fileInfo, context.code);
     buildCallGraph(atoms);  // Intra-file calls
     recalculateArchetypes(atoms);
     recalculatePurposes(atoms);
     context.atoms = atoms;
   }
   ```

2. **Enrichment en cascada**:
   ```javascript
   // Primero: purpose + archetype
   const purposeEnriched = atoms.map(atom => enrichAtomPurpose(atom));
   
   // Luego: vectores matemáticos
   const enrichedAtoms = purposeEnriched.map(atom => enrichAtomVectors(atom));
   ```

3. **Bulk Insert a SQLite**:
   ```javascript
   // src/layer-a-static/indexer.js:256-260
   const repo = getRepository(absoluteRootPath);
   repo.saveManyBulk(allExtractedAtoms, 500);  // Batch de 500
   ```

**Metadata extraída por átomo**:
| Campo | Descripción | Coverage |
|-------|-------------|----------|
| `id` | `file::functionName` | 100% |
| `complexity` | Complejidad ciclomática | 100% |
| `dataFlow` | Grafo de flujo de datos | 100% |
| `dna` | Hash estructural + fingerprint | 99.7% |
| `archetype` | hot-path, utility, god-function... | 99.7% |
| `purpose` | API_EXPORT, INTERNAL_HELPER, DEAD_CODE... | 100% |
| `calledBy` | IDs que llaman a este átomo | 44.7% |
| `calls` | Llamadas que hace | 66.3% |
| `typeContracts` | Tipos inferidos | 99.7% |
| `performance` | bigO, nestedLoops, heavyCalls | 99.7% |
| `temporal` | asyncPatterns, timers, events | ~100% |
| `errorFlow` | catches, throws, propagation | ~100% |
| `callerPattern` | Patrón de callers detectado | 100% |
| `cohesionScore` | Cohesión interna | 100% |
| `ageDays` | Antigüedad del archivo | 100% |

---

### **Paso 5: Cross-File CalledBy Linkage**

```javascript
// src/layer-a-static/indexer.js:113
await buildCalledByLinks(parsedFiles, absoluteRootPath, verbose);
```

**6 Sub-pasos de linkage**:

1. **Function calledBy** (`linkFunctionCalledBy`):
   ```javascript
   // Busca llamadas cross-file por nombre
   // Ej: fileA.js::import { foo } → fileB.js::export function foo
   ```

2. **Variable reference calledBy** (`linkVariableCalledBy`):
   ```javascript
   // Detecta referencias a variables/constants exportadas
   // Usa imports para saber qué buscar
   // +384 calledBy links agregados (v0.9.18)
   ```

3. **Mixin/namespace imports** (`linkMixinNamespaceCalledBy`):
   ```javascript
   // Resuelve import * as Utils y Utils.func()
   // También this.* en contextos de clase
   ```

4. **Class instantiation** (`resolveClassInstantiationCalledBy`):
   ```javascript
   // Detecta new ClassName() y rastrea métodos
   // Ej: const obj = new Foo(); obj.bar() → Foo.bar.calledBy++
   ```

5. **Export object references** (`linkExportObjectReferences`):
   ```javascript
   // export const handlers = { func1, func2 }
   // handlers.func1 → calledBy linkage
   ```

6. **Caller Pattern Detection** (`enrichWithCallerPattern`):
   ```javascript
   // Detecta patrones como:
   // - direct-caller: llamado directamente
   // - event-caller: llamado vía evento
   // - lifecycle-caller: llamado en lifecycle hook
   ```

**Bulk Update final**:
```javascript
// src/layer-a-static/indexer.js:388-395
const repo = getRepository(absoluteRootPath);
repo.saveManyBulk(Array.from(modifiedAtoms), 500);
```

---

### **Paso 6: File Culture Classification** (ZERO LLM)

```javascript
// src/layer-a-static/indexer.js:149-153
enrichWithCulture(systemMap);
```

**Culturas detectadas**:

| Cultura | Descripción | Detector |
|---------|-------------|----------|
| **🏛️ Laws** | Configuración, constantes, tipos | `file.includes('/config/') || atom.name === 'CONSTANT'` |
| **👮 Gatekeepers** | Validadores, auth, middlewares | `archetype === 'validator' || file.includes('/middleware/')` |
| **👨‍💼 Citizens** | Componentes UI, lógica de negocio | `archetype === 'standard' && hasSideEffects` |
| **🔍 Auditors** | Tests, análisis, reporting | `file.includes('/test/') || archetype === 'analyzer'` |
| **🚪 EntryPoints** | CLI, routes, main files | `archetype === 'entry-point' || file.includes('/cli/')` |
| **📜 Scripts** | Scripts de build, migración | `file.startsWith('scripts/')` |

**Estadísticas típicas**:
```javascript
{
  citizen: 800,      // 43%
  auditor: 400,      // 22%
  gatekeeper: 200,   // 11%
  laws: 150,         // 8%
  entrypoint: 50,    // 3%
  script: 100,       // 5%
  unknown: 150       // 8%
}
```

---

### **Paso 7: Análisis de Calidad + Enhanced System Map** (Paralelo)

```javascript
// src/layer-a-static/indexer.js:163-168
const [analysisReport, enhancedSystemMap] = await Promise.all([
  generateAnalysisReport(systemMap, atomsIndex),
  generateEnhancedSystemMap(absoluteRootPath, parsedFiles, systemMap, verbose, skipLLM)
]);
```

**Analysis Report**:
- God functions detectadas
- Dead code
- Duplicados
- Circular dependencies
- Risk hotspots

**Enhanced System Map**:
- Conexiones semánticas (localStorage, events, globals)
- Risk assessment por archivo
- LLM insights (si skipLLM=false)

---

### **Paso 8: Guardado a SQLite**

```javascript
// src/layer-a-static/indexer.js:171
await saveEnhancedSystemMap(enhancedSystemMap, verbose, absoluteRootPath);
```

**Qué guarda**:
1. **atoms** → Todos los átomos enriquecidos
2. **atom_relations** → Todas las llamadas entre átomos
3. **files** → Metadatos por archivo
4. **system_files** → System Map extendido
5. **file_dependencies** → Dependencias entre archivos
6. **semantic_connections** → Conexiones semánticas
7. **risk_assessments** → Evaluación de riesgo
8. **modules** → Agrupación lógica

**Performance**:
- Bulk insert de ~13,000 átomos: ~2-3 segundos
- Relaciones: ~500ms
- Total save: ~4-5 segundos

---

## SQLite: Configuración y Optimización

### **Configuración** (connection.js)

```javascript
{
  journal_mode: 'WAL',        // Write-Ahead Logging
  cache_size: 64000,          // 64MB cache
  synchronous: 'NORMAL',      // Balance safety/performance
  temp_store: 'MEMORY',       // Temp tables en RAM
  page_size: 4096,            // Páginas de 4KB
  foreign_keys: 'ON',         // Integridad referencial
  busy_timeout: 5000          // 5s timeout
}
```

### **Índices para Queries Rápidas**

```sql
CREATE INDEX idx_atoms_importance ON atoms(importance_score DESC);
CREATE INDEX idx_atoms_propagation ON atoms(propagation_score DESC);
CREATE INDEX idx_atoms_complexity ON atoms(complexity DESC);
CREATE INDEX idx_atoms_file ON atoms(file_path);
CREATE INDEX idx_relations_caller ON atom_relations(caller_id);
CREATE INDEX idx_relations_callee ON atom_relations(callee_id);
```

### **Feature Flags**

```bash
# Usar SQLite (default)
OMNY_SQLITE=true

# Forzar JSON legacy (no recomendado)
OMNY_SQLITE=false

# Dual write (migración)
OMNY_DUAL_WRITE=true
```

---

## MCP Tools: Flujo de una Query Típica

```
Usuario: "¿Qué pasa si cambio get_impact_map?"
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│  analyze_change(filePath, symbolName)                          │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  1. getFileAnalysis(projectPath, filePath)                    │
│     └─ Lee .omnysysdata/files/{filePath}.json                 │
│                                                                │
│  2. Buscar símbolo en exports                                 │
│     └─ Si no existe → error                                   │
│                                                                │
│  3. get_impact_map(filePath)                                  │
│     ├─ getFileAnalysis() → imports, exports, usedBy           │
│     ├─ getFileDependents() → archivos que usan este           │
│     └─ Calcular transitivos → BFS sobre dependientes          │
│                                                                │
│  4. Retornar:                                                  │
│     {                                                          │
│       symbol: "get_impact_map",                               │
│       directDependents: [...],                               │
│       transitiveDependents: [...],                           │
│       totalAffected: N,                                        │
│       riskLevel: "medium"                                     │
│     }                                                          │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

---

## Métricas Reales del Sistema (v0.9.61)

| Métrica | Valor |
|---------|-------|
| **Archivos analizados** | 1,860 |
| **Átomos extraídos** | 13,485 |
| **Herramientas MCP** | 28-30 |
| **Coverage calledBy** | 44.7% |
| **Culture coverage** | 99.5% |
| **Health Score** | 99/100 (Grade A) |
| **Test Coverage** | 79% |
| **God Functions** | 193 (complejidad > 15) |
| **Dead Code** | 42 casos (85% menos falsos positivos) |
| **Duplicados** | 118 exactos, 694 contextuales |
| **Deuda Arquitectónica** | 15 archivos críticos |
| **Base de datos** | SQLite (WAL mode) |
| **Tablas** | 10 |
| **Índices** | 6+ |

---

## Optimizaciones de Memoria

### **Memory Cleanup** (v0.9.61)

```javascript
// src/layer-a-static/indexer.js:118-125
for (const parsedFile of Object.values(parsedFiles)) {
  if (parsedFile.source) {
    freedMemory += parsedFile.source.length;
    parsedFile.source = null;  // Liberar fuente después de extraer átomos
  }
}
// ~50-100MB liberados
```

### **Bulk Operations**

```javascript
// En lugar de guardar átomo por átomo:
await saveAtom(atom);  // ❌ Lento, 13,000 queries

// Se acumulan y guardan en bulk:
repo.saveManyBulk(allExtractedAtoms, 500);  // ✅ Rápido, 27 batches
```

---

## Próximas Mejías

### **Migración a Tree-sitter** (Q2 2026)

**Por qué**:
- Mejor detección de `isExported` para arrow functions
- Análisis de tipos TypeScript más preciso
- Performance mejorado en proyectos grandes

**Beneficios**:
- Parsing incremental (más rápido)
- Mejor manejo de errores de sintaxis
- Soporte nativo para más lenguajes
- AST más rico y preciso

**Impacto en MCP Tools**: Las herramientas MCP seguirán funcionando igual, pero con mayor precisión en la detección de patrones y menos falsos positivos.

---

## Referencias

- [INDEX.md](./INDEX.md) - Índice de documentación
- [core.md](./core.md) - Arquitectura unificada
- [code-physics.md](./code-physics.md) - Física del software
- [ISSUES_AND_IMPROVEMENTS.md](./ISSUES_AND_IMPROVEMENTS.md) - Issues conocidos
