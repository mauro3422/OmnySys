# Plan de Implementacion v0.6 — Nuevos Metadatos, Arquetipos y Optimizacion LLM

**Version**: v0.6.0
**Fecha**: 2026-02-06
**Objetivo**: Agregar nuevos extractores de metadata, nuevos arquetipos, nuevas conexiones cross-file, y optimizar el uso de LLM para no gastar recursos en conexiones que la metadata ya resuelve.

**IMPORTANTE para la IA que ejecute este plan**: Lee CADA seccion completa antes de tocar codigo. Cada tarea tiene archivos exactos, logica exacta, y tests esperados. No improvises — segui la especificacion.

---

## FASE 0: Optimizar LLM Gate (NO gastar LLM al pedo)

### Problema
Hoy, si un archivo tiene el arquetipo `event-hub` (porque tiene eventos), el sistema lo manda al LLM. Pero si Layer A ya cruzo esos eventos entre archivos con confidence 1.0, el LLM no agrega nada. Estamos gastando recursos.

### Solucion
Agregar un check en el Gate 2 (`analysis-decider.js`): si las conexiones estaticas ya cubren el caso, NO activar LLM.

### Archivo a modificar
`src/layer-b-semantic/llm-analyzer/analysis-decider.js`

### Logica actual (lineas ~22-57)
```javascript
// Hoy: si tiene eventos -> needsLLM = true (SIEMPRE)
if (semanticAnalysis.events && semanticAnalysis.events.length > 0) {
  return true;
}
```

### Logica nueva
```javascript
// NUEVO: solo activar LLM si las conexiones estaticas NO cubren el caso
needsLLMAnalysis(semanticAnalysis, fileAnalysis) {
  // 1. Huerfano sin explicacion -> SI LLM
  if (isOrphanWithNoConnections(fileAnalysis)) return true;

  // 2. Dynamic imports -> SI LLM (no se puede resolver estaticamente)
  if (hasDynamicCode(semanticAnalysis)) return true;

  // 3. Eventos: solo si hay eventos que NO fueron cruzados estaticamente
  if (hasUnresolvedEvents(fileAnalysis)) return true;

  // 4. Shared state: solo si hay state que NO fue cruzado estaticamente
  if (hasUnresolvedSharedState(fileAnalysis)) return true;

  // 5. Conexiones de baja confianza -> SI LLM
  if (hasLowConfidenceConnections(fileAnalysis)) return true;

  return false;
}
```

### Funciones helper a crear (en el mismo archivo)
```javascript
function isOrphanWithNoConnections(fileAnalysis) {
  const hasImports = (fileAnalysis.imports || []).length > 0;
  const hasUsedBy = (fileAnalysis.usedBy || []).length > 0;
  const hasSemanticConnections = (fileAnalysis.semanticConnections || []).length > 0;
  return !hasImports && !hasUsedBy && !hasSemanticConnections;
}

function hasDynamicCode(semanticAnalysis) {
  return semanticAnalysis.hasDynamicImports ||
         semanticAnalysis.hasEval ||
         (semanticAnalysis.dynamicImports && semanticAnalysis.dynamicImports.length > 0);
}

function hasUnresolvedEvents(fileAnalysis) {
  const eventNames = fileAnalysis.semanticAnalysis?.events?.all || [];
  const resolvedEvents = (fileAnalysis.semanticConnections || [])
    .filter(c => c.type === 'eventListener' && c.confidence >= 1.0)
    .map(c => c.event || c.via);
  // Si hay eventos que NO tienen conexion estatica resuelta
  return eventNames.some(e => !resolvedEvents.includes(e.event));
}

function hasUnresolvedSharedState(fileAnalysis) {
  const storageKeys = fileAnalysis.semanticAnalysis?.localStorage?.all || [];
  const globalAccess = fileAnalysis.semanticAnalysis?.globals?.all || [];
  const resolvedConnections = (fileAnalysis.semanticConnections || [])
    .filter(c => (c.type === 'localStorage' || c.type === 'globalVariable') && c.confidence >= 1.0);

  const resolvedKeys = resolvedConnections.map(c => c.key || c.property || c.via);
  const unresolvedStorage = storageKeys.some(s => !resolvedKeys.includes(s.key));
  const unresolvedGlobals = globalAccess.some(g => !resolvedKeys.includes(g.property));
  return unresolvedStorage || unresolvedGlobals;
}

function hasLowConfidenceConnections(fileAnalysis) {
  return (fileAnalysis.semanticConnections || []).some(c => c.confidence < 0.7);
}
```

### Test esperado
- Archivo con `emit('save')` donde otro archivo tiene `on('save')` y la conexion ya existe con confidence 1.0 --> `needsLLM = false`
- Archivo con `emit(variable)` donde el nombre del evento es dinamico --> `needsLLM = true`
- Archivo con `localStorage.setItem('token')` sin otro archivo que lea 'token' --> `needsLLM = true` (no cruzado)
- Archivo huerfano sin conexiones --> `needsLLM = true`

---

## FASE 1: Nuevo Extractor — Shared String Literals (Rutas API)

### Problema
File A tiene `fetch("/api/users")`, File B tiene `app.get("/api/users", handler)`. No hay import entre ellos, pero estan acoplados por ruta API. El sistema no ve este cable.

### Archivos a crear

#### 1.1 Extractor: `src/layer-a-static/extractors/static/route-extractor.js`

```javascript
// Regex patterns para detectar rutas API en codigo
const ROUTE_PATTERNS = {
  // Express/Koa/Fastify server routes
  serverRoutes: [
    /\.(get|post|put|patch|delete|all|use)\s*\(\s*['"`](\/[^'"`]*?)['"`]/g,
    /router\.(get|post|put|patch|delete|all)\s*\(\s*['"`](\/[^'"`]*?)['"`]/g,
  ],
  // Fetch/axios client calls
  clientCalls: [
    /fetch\s*\(\s*['"`](\/[^'"`]*?)['"`]/g,
    /fetch\s*\(\s*`([^`]*\/api\/[^`]*?)`/g,
    /axios\.(get|post|put|patch|delete)\s*\(\s*['"`](\/[^'"`]*?)['"`]/g,
    /\.request\s*\(\s*\{[^}]*url\s*:\s*['"`](\/[^'"`]*?)['"`]/g,
  ]
};

export function extractRoutes(filePath, code) {
  const routes = { server: [], client: [], all: [] };

  for (const pattern of ROUTE_PATTERNS.serverRoutes) {
    // Reset lastIndex para cada archivo
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const method = match[1].toUpperCase();
      const route = match[2];
      const line = code.substring(0, match.index).split('\n').length;
      routes.server.push({ method, route, line, type: 'server' });
      routes.all.push({ route, line, type: 'server', method });
    }
  }

  for (const pattern of ROUTE_PATTERNS.clientCalls) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const route = match[2] || match[1]; // Depende del grupo de captura
      const line = code.substring(0, match.index).split('\n').length;
      routes.client.push({ route, line, type: 'client' });
      routes.all.push({ route, line, type: 'client' });
    }
  }

  return routes;
}
```

#### 1.2 Cross-referencer: `src/layer-a-static/extractors/static/route-connections.js`

```javascript
// Mismo patron que storage-connections.js, events-connections.js, globals-connections.js
export function detectRouteConnections(fileResults) {
  const connections = [];
  const files = Object.keys(fileResults);

  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const fileA = files[i];
      const fileB = files[j];
      const routesA = fileResults[fileA].routes || { all: [] };
      const routesB = fileResults[fileB].routes || { all: [] };

      // Normalizar rutas (quitar params): /api/users/:id -> /api/users/:param
      const normalize = (route) => route.replace(/:[^/]+/g, ':param');

      const routeSetA = new Set(routesA.all.map(r => normalize(r.route)));
      const commonRoutes = routesB.all
        .filter(r => routeSetA.has(normalize(r.route)));

      for (const routeB of commonRoutes) {
        const routeA = routesA.all.find(r => normalize(r.route) === normalize(routeB.route));

        // Determinar direction: server->client o ambos
        const isServerA = routeA.type === 'server';
        const isServerB = routeB.type === 'server';
        let direction;
        if (isServerA && !isServerB) direction = `${fileA} serves, ${fileB} consumes`;
        else if (!isServerA && isServerB) direction = `${fileB} serves, ${fileA} consumes`;
        else direction = 'both access';

        connections.push({
          id: `route-${fileA}-${fileB}-${routeB.route}`,
          sourceFile: isServerA ? fileA : fileB, // Server es source
          targetFile: isServerA ? fileB : fileA,
          type: 'shared-route',
          via: 'route',
          route: routeB.route,
          direction,
          confidence: 1.0, // Deteccion estatica = confianza total
          detectedBy: 'route-extractor',
          reason: `Both files reference route "${routeB.route}"`
        });
      }
    }
  }

  return connections;
}
```

#### 1.3 Integrar en index.js

**Archivo**: `src/layer-a-static/extractors/static/index.js`

Agregar en `extractSemanticFromFile()`:
```javascript
import { extractRoutes } from './route-extractor.js';
// ...
fileResults[filePath].routes = extractRoutes(filePath, code);
```

Agregar en `detectAllSemanticConnections()`:
```javascript
import { detectRouteConnections } from './route-connections.js';
// ...
const routeConnections = detectRouteConnections(fileResults);
// Agregar a all[]
```

#### 1.4 Agregar a metadata contract

**Archivo**: `src/layer-b-semantic/metadata-contract/constants.js`

Agregar campo `routeStrings` al OPTIONAL_FIELDS:
```javascript
routeStrings: { type: 'array', limit: 10, description: 'API routes used in the file' }
```

**Archivo**: `src/layer-b-semantic/metadata-contract/builders/prompt-builder.js`

Agregar en buildPromptMetadata():
```javascript
routeStrings: (fileAnalysis.routes?.all || []).map(r => r.route).slice(0, 10),
hasRoutes: (fileAnalysis.routes?.all || []).length > 0,
```

#### 1.5 Constants

**Archivo**: `src/layer-a-static/extractors/static/constants.js`

Agregar ROUTE_PATTERNS (los regex definidos arriba) y CONNECTION_TYPE `'shared-route'`.

### Test esperado
- File A: `app.get("/api/users", handler)`, File B: `fetch("/api/users")` --> Conexion `shared-route` con confidence 1.0, direction "A serves, B consumes"
- File A: `router.post("/api/auth/login")`, File B: `axios.post("/api/auth/login")` --> Conexion detectada
- File A: `fetch("/api/users/:id")`, File B: `app.get("/api/users/:id")` --> Normaliza params, detecta conexion

---

## FASE 2: Nuevo Extractor — Environment Variable Coupling

### Problema
Ya extraemos `envVars[]` por archivo pero NO cruzamos entre archivos. Dos archivos que leen `process.env.DB_HOST` estan acoplados.

### Archivos a crear

#### 2.1 Cross-referencer: `src/layer-a-static/extractors/static/env-connections.js`

```javascript
// Mismo patron que las demas *-connections.js
export function detectEnvConnections(fileResults) {
  const connections = [];
  const files = Object.keys(fileResults);

  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const fileA = files[i];
      const fileB = files[j];
      const envA = fileResults[fileA].envVars || [];
      const envB = fileResults[fileB].envVars || [];

      const envSetA = new Set(envA.map(e => e.name || e));
      const commonEnv = envB.filter(e => envSetA.has(e.name || e));

      for (const env of commonEnv) {
        const envName = env.name || env;
        connections.push({
          id: `env-${fileA}-${fileB}-${envName}`,
          sourceFile: fileA,
          targetFile: fileB,
          type: 'shared-env',
          via: 'env-variable',
          envVar: envName,
          direction: 'both read',
          confidence: 1.0,
          detectedBy: 'env-extractor',
          reason: `Both files read process.env.${envName}`
        });
      }
    }
  }

  return connections;
}
```

#### 2.2 Integrar en index.js

**Archivo**: `src/layer-a-static/extractors/static/index.js`

```javascript
import { detectEnvConnections } from './env-connections.js';
// En detectAllSemanticConnections():
const envConnections = detectEnvConnections(fileResults);
// Agregar a all[]
```

**Nota**: El extractor de envVars ya existe en los metadata extractors. Solo falta el cross-reference.

#### 2.3 Constants

**Archivo**: `src/layer-a-static/extractors/static/constants.js`

Agregar CONNECTION_TYPE `'shared-env'`.

### Test esperado
- File A: `process.env.DB_HOST`, File B: `process.env.DB_HOST` --> Conexion `shared-env` con confidence 1.0
- File A: `process.env.PORT`, File B: `process.env.API_KEY` --> Sin conexion (env vars diferentes)

---

## FASE 3: Nuevo Extractor — Co-located File Groups

### Problema
`Button.js`, `Button.test.js`, `Button.module.css`, `Button.stories.js` son una unidad. Si tocas Button.js, el test probablemente necesita actualizarse. El sistema no detecta esta relacion.

### Archivos a crear

#### 3.1 Extractor: `src/layer-a-static/extractors/static/colocation-extractor.js`

```javascript
import path from 'path';

// Patrones de archivos co-locados
const COLOCATION_PATTERNS = [
  { suffix: '.test', type: 'test-companion' },
  { suffix: '.spec', type: 'test-companion' },
  { suffix: '.stories', type: 'storybook' },
  { suffix: '.module.css', type: 'css-module' },
  { suffix: '.module.scss', type: 'css-module' },
  { suffix: '.styles', type: 'style-file' },
  { suffix: '.mock', type: 'mock-file' },
  { suffix: '.fixture', type: 'test-fixture' },
];

// Directorios patron
const DIR_PATTERNS = [
  { dir: '__tests__', type: 'test-companion' },
  { dir: '__mocks__', type: 'mock-file' },
  { dir: '__fixtures__', type: 'test-fixture' },
  { dir: '__stories__', type: 'storybook' },
];

export function detectColocatedFiles(allFilePaths) {
  const connections = [];
  const fileSet = new Set(allFilePaths);

  for (const filePath of allFilePaths) {
    const parsed = path.parse(filePath);
    const baseName = parsed.name.replace(/\.(test|spec|stories|mock|fixture|styles|module)$/, '');
    const dir = parsed.dir;
    const ext = parsed.ext;

    // Buscar archivos hermanos por suffix
    for (const pattern of COLOCATION_PATTERNS) {
      const candidate = path.join(dir, `${baseName}${pattern.suffix}${ext}`);
      if (candidate !== filePath && fileSet.has(candidate)) {
        connections.push({
          id: `colocation-${filePath}-${candidate}`,
          sourceFile: filePath, // El archivo fuente
          targetFile: candidate, // El archivo co-locado
          type: 'colocated',
          via: 'naming-convention',
          colocationType: pattern.type,
          direction: `${baseName}${ext} <-> ${path.basename(candidate)}`,
          confidence: 1.0,
          detectedBy: 'colocation-extractor',
          reason: `Co-located files: ${path.basename(filePath)} and ${path.basename(candidate)}`
        });
      }
    }

    // Buscar en directorios patron (__tests__/Button.js para Button.js)
    for (const pattern of DIR_PATTERNS) {
      const candidate = path.join(dir, pattern.dir, `${parsed.name}${ext}`);
      if (candidate !== filePath && fileSet.has(candidate)) {
        connections.push({
          id: `colocation-${filePath}-${candidate}`,
          sourceFile: filePath,
          targetFile: candidate,
          type: 'colocated',
          via: 'directory-convention',
          colocationType: pattern.type,
          direction: `${path.basename(filePath)} <-> ${pattern.dir}/${path.basename(candidate)}`,
          confidence: 1.0,
          detectedBy: 'colocation-extractor',
          reason: `Co-located: ${path.basename(filePath)} has companion in ${pattern.dir}/`
        });
      }
    }
  }

  return connections;
}
```

#### 3.2 Integrar en index.js

**Archivo**: `src/layer-a-static/extractors/static/index.js`

```javascript
import { detectColocatedFiles } from './colocation-extractor.js';
// En detectAllSemanticConnections():
const allFilePaths = Object.keys(fileResults);
const colocationConnections = detectColocatedFiles(allFilePaths);
// Agregar a all[]
```

#### 3.3 Metadata

**Archivo**: `src/layer-b-semantic/metadata-contract/constants.js`

Agregar campo:
```javascript
colocatedFiles: { type: 'array', limit: 5, description: 'Co-located companions (test, stories, css)' }
```

**Archivo**: `src/layer-b-semantic/metadata-contract/builders/prompt-builder.js`

```javascript
colocatedFiles: (fileAnalysis.colocatedFiles || []).slice(0, 5),
hasTestCompanion: (fileAnalysis.colocatedFiles || []).some(c => c.type === 'test-companion'),
```

#### 3.4 Constants

**Archivo**: `src/layer-a-static/extractors/static/constants.js`

Agregar CONNECTION_TYPE `'colocated'`.

### Nota importante
Este extractor NO necesita leer contenido de archivos, solo paths. Es O(n) en vez de O(n^2).

### Test esperado
- `src/Button.js` existe y `src/Button.test.js` existe --> Conexion `colocated`, type `test-companion`
- `src/utils.js` existe y `src/__tests__/utils.js` existe --> Conexion `colocated`, type `test-companion`
- `src/Card.js` existe y `src/Card.stories.js` existe --> Conexion `colocated`, type `storybook`

---

## FASE 4: Nuevos Arquetipos (3)

### 4.1 Arquetipo: `facade`

**Que detecta**: Archivos que solo re-exportan de otros modulos (index.js). Son puntos de agregacion.

**Test de la caja**: Al levantar un facade, ves cables a todos los modulos internos que re-exporta Y a todos los consumidores externos.

**Archivo**: `src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js`

Agregar al ARCHETYPE_REGISTRY:
```javascript
{
  type: 'facade',
  severity: 4,
  detector: (metadata) => {
    // Re-exporta mucho pero define poco propio
    const hasReExports = (metadata.reExportCount || 0) >= 3;
    const isMainlyReExporter = (metadata.exportCount || 0) > 0 &&
                                (metadata.functionCount || 0) <= 1;
    const isIndexFile = (metadata.filePath || '').endsWith('index.js') ||
                        (metadata.filePath || '').endsWith('index.ts');
    return hasReExports || (isIndexFile && isMainlyReExporter && (metadata.exportCount || 0) >= 3);
  },
  mergeKey: 'facadeAnalysis',
  expectedFields: ['reExportedModules', 'aggregationScope'],
  promptTemplate: `Analyze this facade file that re-exports from internal modules.
File: {filePath}
Exports: {exportCount}, Functions: {functionCount}
Dependents: {dependentCount}

{fileContent}

Return JSON:
{
  "reExportedModules": ["list of internal modules re-exported"],
  "aggregationScope": "what this facade aggregates",
  "blastRadius": "description of impact if this facade changes"
}`,
  responseSchema: {
    reExportedModules: { type: 'array' },
    aggregationScope: { type: 'string' },
    blastRadius: { type: 'string' }
  }
}
```

**LLM necesario?** DEBATIBLE. Las re-exports ya se ven en el AST. Pero el LLM puede describir el "scope" del facade. **Severity 4 = LOW priority**, solo se procesa si hay LLM disponible.

**Metadata adicional necesaria**: `reExportCount` (contar re-exports en el parser).

**Archivo a modificar**: `src/layer-b-semantic/metadata-contract/builders/prompt-builder.js`
```javascript
reExportCount: (fileAnalysis.exports || []).filter(e => e.source).length,
```

### 4.2 Arquetipo: `config-hub`

**Que detecta**: Archivos que exportan solo constantes/configuracion consumida por muchos. Son "radioactivos": un cambio irradia a todos.

**Test de la caja**: Cables a todos los que consumen la config.

**Archivo**: `src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js`

```javascript
{
  type: 'config-hub',
  severity: 5,
  detector: (metadata) => {
    const exportsMany = (metadata.exportCount || 0) >= 5;
    const hasManyDependents = (metadata.dependentCount || 0) >= 5;
    const fewFunctions = (metadata.functionCount || 0) <= 2;
    // Muchos exports, muchos dependents, pocas funciones = probablemente config
    return exportsMany && hasManyDependents && fewFunctions;
  },
  mergeKey: 'configHubAnalysis',
  expectedFields: ['configKeys', 'consumers', 'riskLevel'],
  promptTemplate: `Analyze this configuration file that many other files depend on.
File: {filePath}
Exports: {exportCount}, Functions: {functionCount}
Dependents: {dependentCount}

{fileContent}

Return JSON:
{
  "configKeys": ["list of exported config keys/constants"],
  "consumers": ["what types of modules consume this config"],
  "riskLevel": "low|medium|high|critical"
}`,
  responseSchema: {
    configKeys: { type: 'array' },
    consumers: { type: 'array' },
    riskLevel: { type: 'string' }
  }
}
```

**LLM necesario?** SI, pero solo para entender QUE configura. Las conexiones (quien lo importa) ya las tiene Layer A.

### 4.3 Arquetipo: `entry-point`

**Que detecta**: Archivos que son inicio de ejecucion (main.js, app.js, server.js). Importan mucho, nadie los importa.

**Test de la caja**: Es la raiz del arbol. Todos los cables salen de aca.

**Archivo**: `src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js`

```javascript
{
  type: 'entry-point',
  severity: 3,
  detector: (metadata) => {
    const importsMuch = (metadata.importCount || 0) >= 5;
    const nobodyImportsIt = (metadata.dependentCount || 0) === 0;
    // Importa mucho pero nadie lo importa = entry point
    return importsMuch && nobodyImportsIt;
  },
  mergeKey: 'entryPointAnalysis',
  expectedFields: ['bootSequence', 'servicesInitialized'],
  promptTemplate: `Analyze this entry point file. It imports many modules but nothing imports it.
File: {filePath}
Imports: {importCount}, Dependents: {dependentCount}

{fileContent}

Return JSON:
{
  "bootSequence": ["ordered list of what this file initializes"],
  "servicesInitialized": ["services/modules this starts"]
}`,
  responseSchema: {
    bootSequence: { type: 'array' },
    servicesInitialized: { type: 'array' }
  }
}
```

**LLM necesario?** BAJO. Layer A ya sabe las conexiones. LLM solo describe el flujo de inicio. **Severity 3 = LOW priority.**

### 4.4 Registrar arquetipos en detectores

**Archivo**: `src/layer-b-semantic/metadata-contract/detectors/architectural-patterns.js`

Agregar funciones:
```javascript
export function detectFacade(metadata) {
  const reExportCount = metadata.reExportCount || 0;
  const functionCount = metadata.functionCount || 0;
  const exportCount = metadata.exportCount || 0;
  const isIndex = (metadata.filePath || '').endsWith('index.js');
  return reExportCount >= 3 || (isIndex && functionCount <= 1 && exportCount >= 3);
}

export function detectConfigHub(metadata) {
  const exportCount = metadata.exportCount || 0;
  const dependentCount = (metadata.dependentCount || 0) + (metadata.semanticDependentCount || 0);
  const functionCount = metadata.functionCount || 0;
  return exportCount >= 5 && dependentCount >= 5 && functionCount <= 2;
}

export function detectEntryPoint(metadata) {
  const importCount = metadata.importCount || 0;
  const dependentCount = (metadata.dependentCount || 0) + (metadata.semanticDependentCount || 0);
  return importCount >= 5 && dependentCount === 0;
}
```

### 4.5 Actualizar docs

**Archivo**: `docs/ARCHETYPE_SYSTEM.md`

Agregar los 3 nuevos arquetipos a la tabla "Arquetipos Actuales" y al "Test de la Caja".

**Archivo**: `docs/ARCHETYPE_DEVELOPMENT_GUIDE.md`

Actualizar con ejemplos de los nuevos arquetipos.

---

## FASE 5: Actualizar Validators

Cada nuevo archetype necesita un validator para las respuestas LLM.

### Archivo: `src/layer-b-semantic/validators/`

Crear (o agregar a validators existentes):

```javascript
// facade-validator.js
export function validateFacadeResponse(response) {
  return {
    isValid: Array.isArray(response.reExportedModules),
    cleaned: {
      reExportedModules: response.reExportedModules || [],
      aggregationScope: response.aggregationScope || 'unknown',
      blastRadius: response.blastRadius || 'unknown'
    }
  };
}

// config-hub-validator.js
export function validateConfigHubResponse(response) {
  return {
    isValid: Array.isArray(response.configKeys),
    cleaned: {
      configKeys: response.configKeys || [],
      consumers: response.consumers || [],
      riskLevel: response.riskLevel || 'medium'
    }
  };
}

// entry-point-validator.js
export function validateEntryPointResponse(response) {
  return {
    isValid: Array.isArray(response.bootSequence),
    cleaned: {
      bootSequence: response.bootSequence || [],
      servicesInitialized: response.servicesInitialized || []
    }
  };
}
```

Registrar validators en `src/layer-b-semantic/validators/index.js` (o donde se registren los existentes).

---

## FASE 6: Test Cases

### Crear escenario de test: `test-cases/scenario-new-extractors/`

Estructura:
```
test-cases/scenario-new-extractors/
  api-server.js      # Define routes: app.get("/api/users"), app.post("/api/auth")
  api-client.js      # Consume routes: fetch("/api/users"), axios.post("/api/auth")
  config.js          # Exports: DB_HOST, API_KEY, PORT (5+ exports, 0 functions)
  main.js            # Entry point: imports 5+ modules, no one imports it
  utils/index.js     # Facade: re-exports from 3+ internal modules
  utils/string.js    # Internal: string utilities
  utils/date.js      # Internal: date utilities
  utils/math.js      # Internal: math utilities
  Button.js          # Component
  Button.test.js     # Test companion
  Button.stories.js  # Storybook companion
  env-reader-a.js    # Reads process.env.DB_HOST
  env-reader-b.js    # Also reads process.env.DB_HOST
```

### Resultados esperados

| Par de archivos | Conexion esperada | Tipo | Confidence |
|----------------|-------------------|------|------------|
| api-server.js <-> api-client.js | "/api/users", "/api/auth" | shared-route | 1.0 |
| env-reader-a.js <-> env-reader-b.js | DB_HOST | shared-env | 1.0 |
| Button.js <-> Button.test.js | naming convention | colocated (test-companion) | 1.0 |
| Button.js <-> Button.stories.js | naming convention | colocated (storybook) | 1.0 |
| config.js | Archetype: config-hub | - | - |
| main.js | Archetype: entry-point | - | - |
| utils/index.js | Archetype: facade | - | - |

---

## ORDEN DE EJECUCION

| # | Fase | Prioridad | Riesgo | Dependencias |
|---|------|-----------|--------|--------------|
| 0 | Optimizar LLM Gate | CRITICA | Bajo | Ninguna |
| 1 | Shared Route Extractor | Alta | Bajo | Fase 0 |
| 2 | Env Variable Coupling | Alta | Muy bajo | Ninguna (ya existen envVars) |
| 3 | Co-located Files | Alta | Muy bajo | Ninguna (solo usa paths) |
| 4 | Nuevos Arquetipos | Media | Bajo | Fases 1-3 (para reExportCount) |
| 5 | Validators | Media | Bajo | Fase 4 |
| 6 | Test Cases | Alta | Nulo | Fases 1-5 |

**Recomendacion**: Ejecutar en orden 0 -> 2 -> 3 -> 1 -> 4 -> 5 -> 6. Las fases 2 y 3 son las mas faciles y de mayor impacto.

---

## ARCHIVOS EXISTENTES CRITICOS (leer antes de tocar)

| Archivo | Que hace | Por que importa |
|---------|----------|-----------------|
| `src/layer-a-static/extractors/static/index.js` | Orquesta TODOS los extractores y cross-references | Aca se integran los nuevos extractores |
| `src/layer-a-static/extractors/static/constants.js` | Regex patterns y connection types | Aca se agregan nuevos patterns |
| `src/layer-a-static/extractors/static/storage-connections.js` | Ejemplo de cross-referencer existente | COPIAR este patron para los nuevos |
| `src/layer-b-semantic/metadata-contract/constants.js` | Campos de metadata y umbrales | Agregar nuevos campos |
| `src/layer-b-semantic/metadata-contract/builders/prompt-builder.js` | Transforma metadata a formato estandar | Agregar nuevos campos |
| `src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js` | Registro de arquetipos (SSOT) | Agregar nuevos arquetipos |
| `src/layer-b-semantic/llm-analyzer/analysis-decider.js` | Decide si un archivo necesita LLM | Modificar para optimizar (Fase 0) |

---

## MODELO A USAR

Recomiendo **Sonnet** para ejecutar este plan. Haiku podria fallar en las partes que requieren entender la logica de cross-reference. Sonnet puede seguir patrones existentes (copiar storage-connections.js para hacer route-connections.js) sin problemas.

---

## DOCUMENTOS DE REFERENCIA

- `docs/ARCHETYPE_SYSTEM.md` — Test de la caja, regla LLM vs No-LLM
- `docs/ARCHETYPE_DEVELOPMENT_GUIDE.md` — Como crear nuevos arquetipos
- `docs/ARCHITECTURE_LAYER_A_B.md` — Pipeline completo Layer A + Orchestrator
- `docs/metadata-prompt-system.md` — Flujo metadata -> prompt -> LLM

---

*Plan creado: 2026-02-06*
*Para ejecutar: usar Claude Sonnet con acceso completo al codebase*
