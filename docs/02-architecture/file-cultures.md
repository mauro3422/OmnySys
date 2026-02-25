# Culturas de Archivos - Clasificación Estática

**Versión**: 1.1.0  
**Creado**: 2026-02-19  
**Última actualización**: 2026-02-24  
**Estado**: ✅ Implementado en SQLite

---

## La Idea Central

> **Los archivos no son todos iguales. Cada uno tiene un "rol" en la sociedad del código, determinable estáticamente sin necesidad de LLM.**

Siguiendo la analogía de la física del software:
- **Átomos** = Funciones (la unidad básica de ejecución)
- **Electrones/Protones** = Variables, parámetros, líneas de código (partículas subatómicas dentro de cada átomo)
- **Moléculas** = Archivos (cajas que contienen átomos)
- **Culturas** = Roles sociales de los archivos en el ecosistema

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

## The 5 File Cultures

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CODE SOCIETY                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  🏛️ THE GATEKEEPER (Facade/Gateway/Barrel)                            │
│     → Organizes exports, contains no atoms (functions)                 │
│     → Rule: atoms=0 ∧ exports>0 ∧ filename=index.js                    │
│                                                                         │
│  ⚖️ THE LAWS (Config/Constants)                                       │
│     → Defines particles (constants) that condition the system          │
│     → Rule: atoms=0 ∧ (objectExports>0 ∨ constantExports>0)            │
│     → NO atoms, only loose particles                                   │
│                                                                         │
│  🔍 THE AUDITOR (Observer/Test)                                        │
│     → Observes and validates atoms from other files                    │
│     → Rule: filepath.match(/\.test\.|\.spec\.|tests?\//)               │
│     → Has atoms that DON'T go to production                            │
│                                                                         │
│  🛠️ THE SCRIPT (Automation/Utility)                                   │
│     → Automates tasks, runs processes                                  │
│     → Rule: filepath.startsWith(scripts/) ∧ atoms>0                    │
│     → Automation atoms                                                 │
│                                                                         │
│  👷 THE CITIZEN (Worker/Logic)                                         │
│     → Handles real business logic                                      │
│     → Rule: atoms>0 ∧ doesn't match any of the above                   │
│     → Productive system atoms                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Detalle de Cada Cultura

### 🏛️ EL ADUANERO (Barrel File)

**Definición**: Archivos que solo re-exportan otros módulos. Son la "aduana" del sistema. No contienen átomos (funciones), solo organizan el tráfico.

**Reglas de Detección**:
```javascript
{
  atoms: 0,           // Sin funciones
  classes: 0,         // Sin clases
  exports: { $gt: 0 }, // Tiene exports
  filename: 'index.js',
  hasReExports: true
}
```

**Ejemplos en OmnySys**:
```
src/layer-a-static/index.js         → Exporta todo el layer A
src/layer-c-memory/mcp/tools/index.js → Exporta todas las tools
src/core/cache/index.js             → Exporta cache y helpers
```

**Valor para el LLM**:
- NO necesita leerlos para entender lógica (no tienen átomos)
- SÍ necesita conocerlos para resolver imports
- Son "hubs" de conectividad

**Métricas en OmnySys**: ~216 archivos (~12%)

---

### ⚖️ LAS LEYES FÍSICAS (Config/Constants)

**Definición**: Archivos que definen constantes, configuraciones, o diccionarios. **NO tienen átomos** (funciones), solo **partículas sueltas** (constantes exportadas). Son las "leyes" que condicionan el comportamiento del sistema.

**Reglas de Detección**:
```javascript
{
  atoms: 0,           // Sin funciones = sin átomos
  classes: 0,
  objectExports: { $gt: 0 },  // Tiene partículas (constantes)
  // O también:
  constantExports: { $gt: 0 }
}
```

**Ejemplos en OmnySys**:
```
src/config/limits.js    → { BATCH_SIZE: 20, MAX_FILES: 1000 }
src/config/paths.js     → { DATA_DIR: '.omnysysdata' }
```

**Partículas que contiene**:
```javascript
{
  objectExports: [
    { name: 'BATCH_SIZE', value: 20, type: 'number' },
    { name: 'MAX_FILES', value: 1000, type: 'number' },
    { name: 'TIMEOUTS', value: {...}, type: 'object' }
  ]
}
```

**Valor para el LLM**:
- CRÍTICO: El LLM NO debe inventar configuraciones que ya existen
- Ejemplo: Si existe `BATCH_SIZE: 20`, el LLM debe usarlo, no crear `batchSize: 50`
- Conexión: Via imports → qué átomos usan estas partículas

**Métricas en OmnySys**: ~50 archivos de config/constants

---

### 🔍 EL AUDITOR (Test)

**Definición**: Archivos que contienen átomos (funciones) de testing. Sus átomos observan y validan otros átomos del sistema.

**Reglas de Detección**:
```javascript
{
  filepath: {
    $or: [
      { $regex: /\.test\.js$/ },
      { $regex: /\.spec\.js$/ },
      { $regex: /^tests?\// },
      { $regex: /\/tests?\// }
    ]
  },
  atoms: { $gt: 0 }  // Tiene funciones de test
}
```

**Ejemplos en OmnySys**:
```
tests/unit/layer-a-static/parser.test.js
tests/integration/smoke.test.js
src/layer-a-static/__tests__/extractor.test.js
```

**Conexiones importantes**:
- Via imports → qué átomos (funciones) está auditando
- Los tests VALIDAN átomos ciudadanos

**Valor para el LLM**:
- Entender QUÉ se está testeando = entender contratos
- Si un test llama a `validateUser()`, sabemos que esa función existe y su contrato
- Los tests documentan comportamiento esperado

**Métricas en OmnySys**: ~293 archivos de test

---

### 🛠️ EL SCRIPT (Automation)

**Definición**: Archivos que contienen átomos de automatización. No son parte del runtime del sistema, pero lo mantienen.

**Reglas de Detección**:
```javascript
{
  filepath: { $regex: /^scripts?\// },
  atoms: { $gt: 0 }  // Tiene funciones de automation
}
```

**Ejemplos en OmnySys**:
```
scripts/audit-atoms-correct.js   → Función main() de auditoría
scripts/detect-broken-imports.js → Función detect() 
scripts/migrate-all-tests.js     → Función migrate()
```

**Conexiones importantes**:
- Via imports → pueden usar átomos del sistema (ciudadanos)
- Operan sobre el proyecto, no son parte del producto

**Valor para el LLM**:
- Entender tareas de mantenimiento disponibles
- Saber qué automatizaciones existen
- NO ejecutar en producción sin cuidado

**Métricas en OmnySys**: ~20 archivos de scripts

---

### 👷 EL CIUDADANO (Worker/Logic)

**Definición**: Archivos que contienen átomos productivos. Son la "clase media" del sistema que hace el trabajo real.

**Reglas de Detección**:
```javascript
{
  atoms: { $gt: 0 },  // Tiene funciones
  // NO cumple ninguna de las anteriores
  NOT: { auditor: true, aduanero: true, leyes: true, script: true }
}
```

**Ejemplos en OmnySys**:
```
src/layer-a-static/parser/index.js   → parseFile(), parseProject()
src/core/cache/singleton.js          → getCache(), initCache()
src/layer-c-memory/mcp/tools/status.js → execute(), formatResponse()
```

**Sub-clasificación por Átomos**:
Los ciudadanos pueden contener diferentes TIPOS de átomos:

| Tipo de Átomo | Característica | Ejemplo |
|---------------|----------------|---------|
| **Handler** | Recibe request, retorna response | `handleGetStatus()` |
| **Processor** | Transforma datos | `parseFile()` |
| **Validator** | Verifica condiciones | `validateConfig()` |
| **Coordinator** | Orquesta otros átomos | `runAnalysis()` |
| **Utility** | Función helper genérica | `formatPath()` |

**Métricas en OmnySys**: ~1,100 archivos ciudadanos

---

## Implementación del Clasificador

### Código

```javascript
// src/layer-a-static/analysis/file-culture-classifier.js

/**
 * Clasifica un archivo en una "cultura" basándose en reglas estáticas
 * @param {Object} fileNode - Nodo del archivo con metadata
 * @returns {Object} - Cultura y metadatos de clasificación
 */
export function classifyFileCulture(fileNode) {
  const { 
    filePath, 
    functions = [], 
    classes = [],
    exports = [],
    objectExports = [],
    constantExports = []
  } = fileNode;
  
  const atomCount = functions.length;
  const hasParticles = objectExports.length > 0 || constantExports.length > 0;
  
  // EL AUDITOR (Tests)
  if (isTestFile(filePath)) {
    return {
      culture: 'auditor',
      role: 'Observa y valida átomos de producción',
      atoms: atomCount,
      audits: getAuditedFiles(fileNode)  // Via imports
    };
  }
  
  // EL ADUANERO (Barrel Files)
  if (atomCount === 0 && exports.length > 0 && filePath.endsWith('index.js')) {
    return {
      culture: 'aduanero',
      role: 'Organiza exports del módulo',
      exportsCount: exports.length,
      reExports: getReExportedFiles(fileNode)
    };
  }
  
  // LAS LEYES FÍSICAS (Config/Constants)
  if (atomCount === 0 && hasParticles) {
    return {
      culture: 'leyes',
      role: 'Define constantes que condicionan el sistema',
      particles: [...objectExports, ...constantExports],
      usedBy: getConstantConsumers(fileNode)  // Quién importa estas constantes
    };
  }
  
  // EL SCRIPT (Automation)
  if (filePath.startsWith('scripts/') && atomCount > 0) {
    return {
      culture: 'script',
      role: 'Automatiza tareas de mantenimiento',
      atoms: atomCount,
      mainFunction: findMainFunction(functions)
    };
  }
  
  // EL CIUDADANO (Worker/Logic)
  if (atomCount > 0) {
    return {
      culture: 'ciudadano',
      role: 'Lógica de negocio productiva',
      atoms: atomCount,
      atomTypes: classifyAtomTypes(functions)
    };
  }
  
  // Sin clasificar (ej: archivos vacíos, assets)
  return {
    culture: 'desconocido',
    role: 'Sin clasificar',
    note: 'Archivo sin átomos ni partículas significativas'
  };
}

function isTestFile(filePath) {
  return /\.(test|spec)\.js$/.test(filePath) || 
         /^tests?\//.test(filePath) ||
         /\/tests?\//.test(filePath);
}
```

---

## Flujo de Clasificación

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PIPELINE DE CLASIFICACIÓN                            │
└─────────────────────────────────────────────────────────────────────────┘

     ARCHIVO (Molécula)
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ¿Tiene ÁTOMOS (funciones)?                                             │
│                                                                         │
│  ├── NO → ¿Es index.js con exports? → ADUANERO                         │
│  │        ¿Tiene objectExports/constantExports? → LEYES FÍSICAS        │
│  │        Ninguno → DESCONOCIDO                                         │
│  │                                                                      │
│  └── SÍ → ¿Está en tests/? → AUDITOR                                   │
│           ¿Está en scripts/? → SCRIPT                                   │
│           Ninguno → CIUDADANO                                           │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  OUTPUT: { culture, role, atoms, connections }                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Métricas Esperadas en OmnySys

| Cultura | Cantidad | Porcentaje | Átomos |
|---------|----------|------------|--------|
| Ciudadano | ~1,100 | 64% | ~5,000 |
| Auditor | ~293 | 17% | ~1,500 |
| Aduanero | ~216 | 12% | 0 |
| Leyes | ~50 | 3% | 0 |
| Script | ~20 | 1% | ~100 |
| Desconocido | ~46 | 3% | 0 |

---

## Valor para el LLM

### Sin Clasificación (Antes)
```
LLM: "Veo un archivo config/limits.js..."
LLM: "¿Qué hago con esto? ¿Tiene funciones?"
LLM: "No sé si es importante..."
```

### Con Clasificación (Después)
```
LLM: "Veo config/limits.js → Cultura: LEYES FÍSICAS"
LLM: "Contiene: BATCH_SIZE=20, MAX_FILES=1000"
LLM: "Usado por: parser.js, indexer.js"
LLM: "Acción: Usar estas constantes, NO inventar nuevas"
```

---

## Próximos Pasos

1. **Implementar clasificador** en pipeline de Layer A
2. **Agregar campo `culture`** a cada fileNode
3. **Crear linkage** Config→Usage (qué átomos usan cada constante)
4. **Exponer via MCP** para consultas del LLM

---

## Referencias

- [philosophy.md](../01-core/philosophy.md) - Física del Software
- [code-physics.md](./code-physics.md) - Sociedades de Átomos
- [data-by-layer.md](./data-by-layer.md) - Datos disponibles por layer