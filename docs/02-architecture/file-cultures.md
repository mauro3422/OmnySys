# Culturas de Archivos - Clasificación Estática

**Versión**: v0.9.61  
**Creado**: 2026-02-19  
**Última actualización**: 2026-02-25  
**Estado**: ✅ **100% Estático, 0% LLM** - Implementado en SQLite

---

## La Idea Central

> **Los archivos no son todos iguales. Cada uno tiene un "rol" en la sociedad del código, determinable estáticamente sin necesidad de LLM.**

Siguiendo la analogía de la física del software:
- **Átomos** = Funciones (la unidad básica de ejecución)
- **Electrones/Protones** = Variables, parámetros, líneas de código (partículas subatómicas)
- **Moléculas** = Archivos (cajas que contienen átomos)
- **Culturas** = Roles sociales de los archivos en el ecosistema

---

## Implementación REAL

**Código**: `src/layer-a-static/analysis/file-culture-classifier.js`

```javascript
// classifyFileCulture(fileNode)
export function classifyFileCulture(fileNode) {
  const filePath = fileNode.filePath || fileNode.path || '';
  const functions = fileNode.functions || fileNode.atoms || fileNode.definitions || [];
  const classes = fileNode.classes || [];
  const exports = fileNode.exports || [];
  const objectExports = fileNode.objectExports || [];
  const constantExports = fileNode.constantExports || [];
  
  const atomCount = functions.length;
  const hasParticles = objectExports.length > 0 || constantExports.length > 0;
  const exportCount = exports.length;
  
  // 1. THE ENTRY POINT (CLI/Server/Main)
  if (isEntryPoint(filePath)) {
    return {
      culture: 'entrypoint',
      role: 'System entry point (CLI, server, main)',
      atoms: atomCount,
      symbol: '🚀'
    };
  }
  
  // 2. THE AUDITOR (Tests)
  if (isTestFile(filePath)) {
    return {
      culture: 'auditor',
      role: 'Observes and validates production atoms',
      atoms: atomCount,
      symbol: '🔍'
    };
  }
  
  // 3. THE GATEKEEPER (Barrel Files)
  if (atomCount === 0 && exportCount > 0 && filePath.endsWith('index.js')) {
    return {
      culture: 'gatekeeper',
      role: 'Organizes module exports',
      exportsCount: exportCount,
      symbol: '🏛️'
    };
  }
  
  // 4. THE LAWS (Config/Constants)
  if (atomCount === 0 && classes.length === 0 && (hasParticles || exportCount > 0)) {
    return {
      culture: 'laws',
      role: 'Defines constants/templates that condition the system',
      particles: [...objectExports, ...constantExports],
      exports: exportCount,
      symbol: '⚖️'
    };
  }
  
  // 5. THE SCRIPT (Automation)
  if (isScriptFile(filePath) && atomCount > 0) {
    return {
      culture: 'script',
      role: 'Automates maintenance tasks',
      atoms: atomCount,
      symbol: '🛠️'
    };
  }
  
  // 6. THE CITIZEN (Worker/Logic)
  if (atomCount > 0) {
    return {
      culture: 'citizen',
      role: 'Productive business logic',
      atoms: atomCount,
      symbol: '👷'
    };
  }
  
  // Unknown
  return {
    culture: 'unknown',
    role: 'Unclassified',
    symbol: '❓'
  };
}
```

---

## Las 7 Culturas

### 1. 🚀 Entrypoint (System Entry)

**Definición**: Archivos de entrada del sistema (CLI, server, main).

**Reglas de Detección**:
```javascript
function isEntryPoint(filePath) {
  // Root level entry points
  const rootEntryPoints = [
    'main.js', 'main.mjs', 'index.js', 'server.js', 'app.js',
    'omny.js', 'omnysystem.js', 'cli.js'
  ];
  
  // Check if it's a root level file
  const fileName = filePath.split('/').pop();
  const isRootFile = !filePath.includes('/') || 
                     filePath.indexOf('/') === filePath.lastIndexOf('/');
  
  if (isRootFile && rootEntryPoints.includes(fileName)) {
    return true;
  }
  
  // Common entry point patterns
  if (/^src\/(cli|server|app|main|index)\.js$/.test(filePath)) {
    return true;
  }
  
  // bin/ directory files
  if (/^bin\//.test(filePath)) {
    return true;
  }
  
  return false;
}
```

**Ejemplos**:
- `main.js`
- `server.js`
- `src/cli/index.js`
- `bin/setup.js`

---

### 2. 🔍 Auditor (Tests)

**Definición**: Archivos de test que observan y validan código de producción.

**Reglas de Detección**:
```javascript
function isTestFile(filePath) {
  return /\.(test|spec)\.js$/.test(filePath) ||
         /^tests?\//.test(filePath) ||
         /\/tests?\//.test(filePath) ||
         /__tests__/.test(filePath);
}
```

**Ejemplos**:
- `src/utils.test.js`
- `tests/unit/layer-c/mcp/tools.test.js`
- `test-cases/scenario-1-simple-import/test.js`

---

### 3. 🏛️ Gatekeeper (Barrel Files)

**Definición**: Archivos que solo re-exportan otros módulos. No contienen átomos (funciones), solo organizan el tráfico.

**Reglas de Detección**:
```javascript
// Gatekeeper si:
// - atoms = 0 (sin funciones)
// - exports > 0 (tiene exports)
// - filename = index.js
if (atomCount === 0 && exportCount > 0 && filePath.endsWith('index.js')) {
  return { culture: 'gatekeeper', ... };
}
```

**Ejemplos**:
- `src/utils/index.js`
- `src/layer-a-static/extractors/metadata/index.js`

---

### 4. ⚖️ Laws (Config/Constants)

**Definición**: Archivos que definen constantes, configuraciones, templates, schemas, definiciones de tipos. Exportan partículas sueltas (constantes) SIN funciones.

**Reglas de Detección**:
```javascript
// Laws si:
// - atoms = 0 (sin funciones)
// - classes = 0 (sin clases)
// - hasParticles > 0 (tiene constantes exportadas)
if (atomCount === 0 && classes.length === 0 && 
    (hasParticles || exportCount > 0)) {
  return { culture: 'laws', ... };
}
```

**Ejemplos**:
- `src/config/constants.js`
- `src/shared/types.js`
- `src/core/constants.js`

---

### 5. 🛠️ Script (Automation)

**Definición**: Scripts de automatización para tareas de mantenimiento.

**Reglas de Detección**:
```javascript
function isScriptFile(filePath) {
  return /^scripts?\//.test(filePath);
}

// Script si:
// - filePath starts with scripts/
// - atoms > 0 (tiene funciones)
if (isScriptFile(filePath) && atomCount > 0) {
  return { culture: 'script', ... };
}
```

**Ejemplos**:
- `scripts/analyze-dead-code-atoms.js`
- `scripts/enrich-atom-purpose.js`
- `scripts/validate-graph-system.js`

---

### 6. 👷 Citizen (Worker/Logic)

**Definición**: Archivos de lógica de negocio que hacen el trabajo real. Contienen átomos (funciones) productivas.

**Reglas de Detección**:
```javascript
// Citizen si:
// - atoms > 0 (tiene funciones)
// - NO matchea otros patrones
if (atomCount > 0) {
  return { culture: 'citizen', ... };
}
```

**Ejemplos**:
- `src/core/orchestrator.js`
- `src/layer-a-static/pipeline/indexer.js`
- `src/services/llm-service/index.js`

---

### 7. ❓ Unknown

**Definición**: Archivos sin clasificar (vacíos, assets, estilos, etc.).

**Reglas de Detección**:
```javascript
// Unknown si:
// - No matchea ningún otro patrón
return {
  culture: 'unknown',
  role: 'Unclassified',
  note: 'File without atoms or significant particles'
};
```

**Ejemplos**:
- `.eslintrc.js`
- `package.json`
- `README.md`

---

## Jerarquía de Partículas

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         JERARQUÍA DEL CÓDIGO                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  UNIVERSO (Sistema/Proyecto)                                           │
│     └── Contiene GALAXIAS (Módulos/Features)                           │
│                                                                         │
│  GALAXIA (Módulo)                                                       │
│     └── Contiene MOLÉCULAS (Archivos)                                  │
│                                                                         │
│  MOLÉCULA (Archivo)                                                     │
│     ├── Contiene ÁTOMOS (Funciones)                                    │
│     └── Puede tener PARTÍCULAS SUELTAS (exports de constantes)         │
│                                                                         │
│  ÁTOMO (Función) ⭐ UNIDAD BÁSICA                                       │
│     ├── ELECTRONES: Variables locales, parámetros                      │
│     ├── PROTONES: Líneas de código, statements                         │
│     └── METADATOS: calls, calledBy, dataFlow, DNA, archetype...       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Enriquecimiento del System Map

**Código REAL**: `enrichWithCulture(systemMap)`

```javascript
export function enrichWithCulture(systemMap) {
  if (!systemMap?.files) return systemMap;
  
  const { cultures, stats } = classifyAllFiles(systemMap);
  
  // Agregar cultura a cada archivo
  for (const [filePath, classification] of Object.entries(cultures)) {
    if (systemMap.files[filePath]) {
      systemMap.files[filePath].culture = classification.culture;
      systemMap.files[filePath].cultureRole = classification.role;
    }
  }
  
  // Agregar stats a metadata
  if (!systemMap.metadata) systemMap.metadata = {};
  systemMap.metadata.cultureStats = stats;
  
  return systemMap;
}
```

---

## Estadísticas Típicas (v0.9.61)

```
┌─────────────────────────────────────────────────────────────┐
│  Culture Stats — v0.9.61                                   │
├─────────────────────────────────────────────────────────────┤
│  citizen:        800 (43%)  - Lógica de negocio            │
│  auditor:        400 (22%)  - Tests                        │
│  gatekeeper:     200 (11%)  - Barrel files                 │
│  laws:           150 (8%)   - Config/Constants             │
│  script:         100 (5%)   - Scripts                      │
│  entrypoint:      50 (3%)   - Entry points                │
│  unknown:        150 (8%)   - Sin clasificar              │
└─────────────────────────────────────────────────────────────┘
```

---

## Constantes Exportadas

```javascript
// CULTURES constants
export const CULTURES = {
  ENTRYPOINT: 'entrypoint',
  GATEKEEPER: 'gatekeeper',
  LAWS: 'laws',
  AUDITOR: 'auditor',
  SCRIPT: 'script',
  CITIZEN: 'citizen',
  UNKNOWN: 'unknown'
};

// CULTURE_DESCRIPTIONS
export const CULTURE_DESCRIPTIONS = {
  entrypoint: {
    name: 'EntryPoint',
    description: 'System entry points (CLI, server, main files)',
    pattern: 'root level: main.js, cli.js, server.js, app.js'
  },
  gatekeeper: {
    name: 'Gatekeeper',
    description: 'Barrel files that organize exports without containing logic',
    pattern: 'atoms=0 AND exports>0 AND filename=index.js'
  },
  laws: {
    name: 'Laws',
    description: 'Config/constant files that define system constraints',
    pattern: 'atoms=0 AND (objectExports>0 OR constantExports>0)'
  },
  auditor: {
    name: 'Auditor',
    description: 'Test files that validate production code',
    pattern: 'filepath matches /.test.|.spec.|tests?//'
  },
  script: {
    name: 'Script',
    description: 'Automation scripts for maintenance tasks',
    pattern: 'filepath starts with scripts/ AND atoms>0'
  },
  citizen: {
    name: 'Citizen',
    description: 'Business logic files that do the real work',
    pattern: 'atoms>0 AND not matching other patterns'
  },
  unknown: {
    name: 'Unknown',
    description: 'Unclassified files (empty, assets, etc.)',
    pattern: 'no atoms or particles'
  }
};
```

---

## Uso en Layer A

**Pipeline REAL**: `src/layer-a-static/indexer.js`

```javascript
// Paso 8: Clasificar culturas (ZERO LLM)
const timerCulture = startTimer('10. Classify cultures');
if (verbose) logger.info('🏷️  Classifying file cultures...');

enrichWithCulture(systemMap);

if (verbose) {
  const stats = systemMap.metadata?.cultureStats || {};
  logger.info(`  ✓ Citizens: ${stats.citizen || 0}`);
  logger.info(`  ✓ Auditors: ${stats.auditor || 0}`);
  logger.info(`  ✓ Gatekeepers: ${stats.gatekeeper || 0}`);
  logger.info(`  ✓ Laws: ${stats.laws || 0}`);
  logger.info(`  ✓ Scripts: ${stats.script || 0}`);
  logger.info(`  ✓ Entrypoints: ${stats.entrypoint || 0}`);
  logger.info(`  ✓ Unknown: ${stats.unknown || 0}`);
}

timerCulture.end(verbose);
```

---

**Última actualización**: 2026-02-25 (v0.9.61)  
**Estado**: ✅ **100% Estático, 0% LLM** - Implementado en `file-culture-classifier.js`  
**Próximo**: 🚧 Tree-sitter integration (Q2 2026)
