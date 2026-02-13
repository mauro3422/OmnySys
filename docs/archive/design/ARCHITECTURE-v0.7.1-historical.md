# OmnySys - Arquitectura Técnica

**Versión**: v0.7.1
**Última actualización**: 2026-02-09

---

## 🎯 Visión General

OmnySys es un **motor de contexto multi-capa y fractal** que actúa como memoria externa para IAs que modifican código. Resuelve el problema de "visión de túnel" mediante una arquitectura recursiva de tres capas que se aplica a múltiples escalas:

1. **Layer A (Estática)**: Análisis determinista y rápido (extracción de datos)
2. **Layer B (Semántica)**: Detección de patrones con confidence scoring
3. **Layer C (Decisión)**: LLM selectivo basado en confianza, no siempre

**Innovaciones clave**:
- **Arquitectura Molecular**: Funciones (átomos) como unidad primaria, archivos (moléculas) como derivación
- **Arquitectura Fractal**: El patrón A→B→C se repite en funciones, archivos y módulos
- **Confidence-Based Bypass**: 90% de archivos se analizan sin LLM
- **MCP Server**: Entry point único vía HTTP (puerto 9999)

---

## 🏗️ Arquitectura Fractal A→B→C

El sistema aplica el mismo patrón de tres capas en múltiples escalas:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ESCALA 1: FUNCIONES (Átomos)                             │
│                    src/layer-a-static/pipeline/molecular-extractor.js       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer A: Extrae funciones, calls, complejidad, side effects                │
│       ↓                                                                     │
│  Layer B: Detecta arquetipos atómicos (god-function, dead-code, etc)        │
│       ↓                                                                     │
│  Layer C: ¿Necesita LLM? Solo si metadata insuficiente (<2% de casos)       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │ DERIVA
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ESCALA 2: ARCHIVOS (Moléculas)                           │
│                    src/shared/derivation-engine.js                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer A: Compone átomos → exports, imports, grafo de dependencias          │
│       ↓                                                                     │
│  Layer B: Detecta arquetipos moleculares (network-hub, god-object, etc)     │
│       ↓                                                                     │
│  Layer C: ¿Necesita LLM? Solo si confidence < 0.8 (~10% de casos)           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │ DERIVA
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ESCALA 3: SISTEMA (MCP Server)                           │
│                    src/core/unified-server/tools.js                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer A: Query de datos con caché (atoms/, molecules/, files/)             │
│       ↓                                                                     │
│  Layer B: Agregación de resultados + insights                               │
│       ↓                                                                     │
│  Layer C: Respuesta a IA (Claude/OpenCode)                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧬 Arquitectura Molecular (v0.6.0)

### Conceptos Clave

| Concepto | Definición | Analogía |
|----------|------------|----------|
| **Átomo** | Función individual | Un átomo químico |
| **Molécula** | Archivo (composición de átomos) | H₂O = 2H + 1O |
| **Derivación** | Calcular propiedades desde componentes | Propiedades emergentes |

### Estructura de Almacenamiento (SSOT)

```
.omnysysdata/
├── atoms/                          ← SSOT: Metadata enriquecida
│   └── {file}/{function}.json      ← complexity, archetype, calledBy, etc.
├── molecules/                      ← Índice de átomos
│   └── {file}.molecule.json        ← Solo referencias: [atomId1, atomId2, ...]
└── files/                          ← Análisis base (metadata cruzada)
    └── {file}.json                 ← functionRefs + atomIds + semanticConnections
```

### Arquetipos Atómicos (7 tipos)

Detectados 100% estáticamente sin LLM:

| Arquetipo | Detección | Severidad |
|-----------|-----------|-----------|
| `god-function` | complexity > 20 && lines > 100 | 9 |
| `fragile-network` | fetch/axios sin try/catch | 8 |
| `hot-path` | isExported && calledBy.length > 5 | 7 |
| `dead-function` | !isExported && calledBy.length === 0 | 5 |
| `private-utility` | !isExported && calledBy.length > 0 | 3 |
| `utility` | !hasSideEffects && complexity < 5 | 2 |
| `standard` | Default | 1 |

### Reglas de Derivación

```javascript
// src/shared/derivation-engine.js
export const DerivationRules = {
  // Archetype molecular desde átomos
  moleculeArchetype: (atoms) => {
    const atomArchetypes = atoms.map(a => a.archetype?.type);
    
    // Si tiene fragile-network + múltiples llamadas de red
    if (atomArchetypes.includes('fragile-network') && 
        atoms.filter(a => a.hasNetworkCalls).length >= 2) {
      return { type: 'network-hub', severity: 8 };
    }
    
    // Si todos los átomos son privados
    if (atoms.length > 0 && atoms.every(a => !a.isExported)) {
      return { type: 'internal-module', severity: 3 };
    }
    
    // Si tiene god-function → probable god-object
    if (atomArchetypes.includes('god-function')) {
      return { type: 'god-object', severity: 10 };
    }
    
    return { type: 'standard', severity: 1 };
  },
  
  // Complejidad = suma de átomos
  moleculeComplexity: (atoms) => atoms.reduce((sum, a) => sum + (a.complexity || 0), 0),
  
  // Riesgo = máximo de átomos
  moleculeRisk: (atoms) => Math.max(...atoms.map(a => a.archetype?.severity || 0))
};
```

---

## 📊 Las 3 Capas en Detalle

### **Layer A - Análisis Estático** (Sin IA)

**Responsabilidad**: Extraer datos verificables del código fuente.

**Componentes**:
- **Molecular Extractor** (`molecular-extractor.js`): Extrae átomos desde AST
- **Metadata Extractors** (8 extractores): Side effects, call graph, temporal, performance
- **Storage Manager** (`storage-manager.js`): Guarda átomos y moléculas (SSOT)
- **Derivation Engine** (`derivation-engine.js`): Calcula propiedades moleculares

**Output**: Átomos individuales + moléculas derivadas en `.omnysysdata/`

**Metadata extraída** (57 campos):
- Static Graph: exports, dependents, imports
- Storage & State: localStorage keys, global state
- Events: emitters, listeners, event names
- Side Effects: network calls, DOM manipulation
- Call Graph: internal/external calls, depth
- Temporal: lifecycle hooks, cleanup patterns
- Performance: nested loops, complexity
- Historical: git churn, hotspot score

**NO necesita LLM** porque los datos son verificables estáticamente.

---

### **Layer B - Análisis Semántico** (Con confidence scoring)

**Responsabilidad**: Detectar patrones arquitectónicos usando metadata combinada.

**Sistema de Arquetipos** (15 tipos):

| Arquetipo | ¿Qué detecta? | ¿Necesita LLM? | Prioridad |
|-----------|---------------|----------------|-----------|
| `god-object` | Archivo con 20+ dependencias | Confidence-based | CRITICAL |
| `orphan-module` | Código muerto o cables ocultos | Confidence-based | HIGH |
| `dynamic-importer` | `import(variable)` | Siempre | HIGH |
| `state-manager` | Estado global (window, localStorage) | Confidence-based | HIGH |
| `event-hub` | Pub/sub patterns | Confidence-based | MEDIUM |
| `singleton` | Acoplamiento implícito | Confidence-based | MEDIUM |
| `network-hub` | Endpoints compartidos | Confidence-based | MEDIUM |
| `critical-bottleneck` | Hotspot + complejidad + acoplamiento | Confidence-based | CRITICAL |
| `api-event-bridge` | APIs + event coordination | Confidence-based | HIGH |
| `storage-sync-manager` | Multi-tab state sync | Confidence-based | HIGH |
| `facade` | Re-export patterns | Nunca | LOW |
| `config-hub` | Centralized configuration | Nunca | LOW |
| `entry-point` | Application bootstrap | Nunca | LOW |

**Regla de Oro (Confidence-Based)**:
```javascript
// Cálculo de confianza basado en evidencia
const { confidence, evidence } = calculateConfidence(metadata);

if (confidence >= 0.8) {
  // ✅ BYPASS: Evidencia suficiente, no necesita LLM
  return { archetype, confidence, evidence };
} else {
  // 🔍 LLM: Evidencia insuficiente, necesita análisis semántico
  return await analyzeWithLLM(metadata);
}
```

**Ejemplo de evidencia para god-object**:
```javascript
{
  confidence: 0.9,  // 0.3 + 0.3 + 0.3 + 0.0
  evidence: [
    'exports:23',           // +0.3
    'dependents:45',        // +0.3  
    'has-god-function',     // +0.3
    // Falta: semantic connections cross-referenced
  ]
}
```

---

### **Layer C - Memoria y Servicio MCP** (HTTP API)

**Responsabilidad**: Almacenar datos y exponer herramientas con caché inteligente.

**Componentes**:
- **Atomic Cache** (`atoms.js`): Caché de átomos individuales
- **Derivation Cache** (`derivation-engine.js`): Cache de derivaciones moleculares
- **Storage**: `.omnysysdata/` particionado
- **MCP HTTP Server**: Puerto 9999, 14 herramientas REST
- **Data Flow v2**: Sistema graph-based de flujo de datos (Fase 1)

**Invalidación de Caché**:
```javascript
// Antes (v0.5): Invalidar archivo completo
cache.invalidate(`file:${filePath}`);

// Ahora (v0.6): Invalidar solo átomo modificado
cache.invalidateAtom(`${filePath}::${functionName}`);

// La derivación se recalcula automáticamente
```

**14 Herramientas MCP**:

### Core Analysis (6 tools)
| Herramienta | Propósito | Escala |
|-------------|-----------|--------|
| `get_impact_map` | Mapa de archivos afectados | Molécula |
| `analyze_change` | Impacto de cambiar símbolo | Molécula |
| `explain_connection` | Conexión entre archivos | Molécula |
| `get_risk_assessment` | Riesgos del proyecto | Sistema |
| `search_files` | Búsqueda de archivos | Sistema |
| `get_server_status` | Estado del sistema | Sistema |

### Omniscience (3 tools)
| Herramienta | Propósito | Escala |
|-------------|-----------|--------|
| `get_call_graph` | Quién llama a qué función | Átomo/Molécula |
| `analyze_signature_change` | Breaking changes de API | Átomo |
| `explain_value_flow` | Flujo de datos | Átomo |

### Atomic/Molecular (3 tools)
| Herramienta | Propósito | Escala |
|-------------|-----------|--------|
| `get_function_details` | Información atómica completa | Átomo |
| `get_molecule_summary` | Resumen molecular con insights | Molécula |
| `get_atomic_functions` | Lista funciones de archivo | Átomo |

### Utilities (2 tools)
| Herramienta | Propósito | Escala |
|-------------|-----------|--------|
| `restart_server` | Reinicia servidor y recarga | Sistema |
| `get_tunnel_vision_stats` | Estadísticas de detección | Sistema |

---

## 🌊 Data Flow v2 (Graph-Based) - Nuevo en v0.7.1

**Fase 1 Completa**: Sistema de análisis de flujo de datos basado en grafos.

### Conceptos Clave

El Data Flow v2 analiza cómo los datos fluyen dentro de cada función (átomo):

```javascript
// Ejemplo: processOrder(order, discount)
{
  inputs: [
    { name: "order", type: "parameter", usages: ["order.items", "order.total"] },
    { name: "discount", type: "parameter", usages: ["discount.code"] }
  ],
  transformations: [
    { from: "order.items", to: "itemsTotal", operation: "calculation" },
    { from: ["itemsTotal", "discount"], to: "finalAmount", operation: "arithmetic" }
  ],
  outputs: [
    { type: "return", value: "finalAmount" },
    { type: "side_effect", target: "saveOrder", operation: "persistence" }
  ]
}
```

### 5 Nuevos Metadata Extractors

| Extractor | Propósito | Output |
|-----------|-----------|--------|
| `dna-extractor.js` | Identifica "ADN" de la función | Patterns, signatures, contracts |
| `error-flow.js` | Rastreo de error handling | Try/catch, error propagation |
| `performance-impact.js` | Análisis de performance | Loops, recursion, complexity |
| `temporal-connections.js` | Conexiones temporales | Lifecycle hooks, cleanup patterns |
| `type-contracts.js` | Contratos de tipos implícitos | Type inference, validations |

### Transform Registry

Sistema de 50+ patrones de transformación de datos:

```javascript
// Patrón: MAP
{ from: "items", to: "prices", operation: "map", transform: "item => item.price" }

// Patrón: REDUCE
{ from: "prices", to: "total", operation: "reduce", transform: "sum" }

// Patrón: FILTER
{ from: "users", to: "activeUsers", operation: "filter", transform: "user.active" }
```

### Beneficios

1. **Precisión Quirúrgica**: Análisis a nivel de variable, no solo función
2. **Detección de Dead Code**: Variables declaradas pero nunca usadas
3. **Input Validation**: Parámetros que no se usan
4. **Flow Coherence**: Score 0-100 de qué tan lógico es el flujo

---

## 🔄 Flujo de Inicialización

```bash
npm start

  ┌─────────────────────────────────────────────┐
  │ STEP 0: Check LLM (puerto 8000)             │
  │         Si no está, iniciar                 │
  └─────────────────┬───────────────────────────┘
                    ▼
  ┌─────────────────────────────────────────────┐
  │ STEP 1: Iniciar MCP HTTP (9999)             │
  │         OmnySysMCPServer                    │
  └─────────────────┬───────────────────────────┘
                    ▼
  ┌─────────────────────────────────────────────┐
  │ STEP 2: Layer A - Análisis Molecular        │
  │         • Extraer átomos desde AST          │
  │         • Guardar en atoms/                 │
  │         • Derivar moléculas                 │
  └─────────────────┬───────────────────────────┘
                    ▼
  ┌─────────────────────────────────────────────┐
  │ STEP 3: Layer B - Detección con Confidence  │
  │         • Detectar arquetipos               │
  │         • Calcular confidence               │
  │         • Bypass LLM si confidence >= 0.8   │
  └─────────────────┬───────────────────────────┘
                    ▼
  ┌─────────────────────────────────────────────┐
  │ STEP 4: Layer C - Iniciar Orchestrator      │
  │         • Queue priorizada (confidence)     │
  │         • Worker para LLM selectivo         │
  │         • FileWatcher con invalidación      │
  │           atómica                           │
  └─────────────────┬───────────────────────────┘
                    ▼
  ┌─────────────────────────────────────────────┐
  │ STEP 5: Configurar OpenCode                 │
  │         Auto-config mcpServers              │
  └─────────────────┬───────────────────────────┘
                    ▼
  ┌─────────────────────────────────────────────┐
  │ STEP 6: ✅ Listo!                           │
  │         14 herramientas disponibles         │
  │         5 metadata extractors activos       │
  │         Data Flow v2 integrado              │
  │         90% bypass rate                     │
  └─────────────────────────────────────────────┘
```

---

## 📊 Métricas del Sistema (v0.7.1)

**Proyecto analizado**: 451 archivos JavaScript, ~980 funciones

| Métrica | Valor | vs v0.6 |
|---------|-------|---------|
| Archivos JS/TS | 451 | +33 |
| Funciones (átomos) | 980 | +37 |
| Arquetipos moleculares | 15 | = |
| Arquetipos atómicos | 7 | = |
| Metadata Extractors | 5 | Nuevo |
| Conexiones semánticas | ~120 | +20 |
| LLM Bypass Rate | 90% | = |
| Tiempo de invalidación | ~0.01ms | = |
| Cache hit rate (átomos) | 95% | = |
| Data Flow coverage | 100% | Nuevo |

---

## 🎓 Flujo de Uso para IAs

### Escenario: Refactorizar una función específica

**Paso 1**: IA llama a herramienta atómica
```javascript
const impact = await getFunctionDetails({
  filePath: "src/core/orchestrator.js",
  functionName: "analyzeAndWait"
});
```

**Paso 2**: OmnySys analiza
- Layer A: Carga átomo desde caché (`atoms::analyzeAndWait`)
- Layer B: Detecta arquetipo atómico (`hot-path`)
- Derivation Engine: Calcula impacto molecular

**Paso 3**: OmnySys responde
```javascript
{
  atom: {
    id: "src/core/orchestrator.js::analyzeAndWait",
    name: "analyzeAndWait",
    complexity: 28,
    isExported: true,
    calledBy: ["src/cli/commands/consolidate.js::run", "..."],
    archetype: {
      type: "hot-path",
      severity: 7,
      confidence: 1.0,
      evidence: ["exported", "12-callers"]
    }
  },
  callGraph: {
    callers: 12,
    files: 5
  },
  risk: {
    level: "high",
    reason: "Function is called from 12 places"
  }
}
```

**Paso 4**: IA toma decisión informada
- "Esta función es un hot-path (llamada desde 12 lugares)"
- "Si la modifico, afecto a 5 archivos"
- "Voy a mantener la firma compatible"

---

## 🛠️ Comandos CLI

```bash
# Control del sistema
npm run install:all    # Instala todo y arranca automáticamente
npm start              # Inicia LLM + MCP
npm stop               # Detiene todo
npm status             # Muestra estado (LLM + MCP)

# Herramientas MCP
npm tools              # Lista las 14 herramientas disponibles
omny call get_impact_map '{"filePath":"src/core.js"}'
omny call getFunctionDetails '{"filePath":"src/core.js","functionName":"init"}'
omny status            # Estado detallado

# Análisis
npm run analyze        # Analizar proyecto completo con Layer A
```

---

## 📡 Endpoints HTTP

### MCP Server (Puerto 9999)

```bash
# Estado y herramientas
GET  http://localhost:9999/health          # Estado
GET  http://localhost:9999/tools           # Lista herramientas

# Ejecutar herramienta
POST http://localhost:9999/tools/:name     # Ejecutar herramienta
POST http://localhost:9999/call            # Formato MCP estándar
```

**Ejemplos**:
```bash
# Impacto molecular
curl -X POST http://localhost:9999/tools/get_impact_map \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/core/orchestrator.js"}'

# Detalles atómicos
curl -X POST http://localhost:9999/tools/getFunctionDetails \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/core/orchestrator.js", "functionName": "analyzeAndWait"}'
```

---

## 📚 Documentación Relacionada

| Documento | Descripción |
|-----------|-------------|
| [docs/TOOLS_GUIDE.md](docs/TOOLS_GUIDE.md) | Guía completa de las 14 herramientas MCP |
| [docs/ARCHETYPE_SYSTEM.md](docs/ARCHETYPE_SYSTEM.md) | Sistema de arquetipos detallado |
| [docs/CORE_PRINCIPLES.md](docs/CORE_PRINCIPLES.md) | Los 4 Pilares de OmnySys |
| [docs/ARCHITECTURE_MOLECULAR_PLAN.md](docs/ARCHITECTURE_MOLECULAR_PLAN.md) | Plan detallado de arquitectura molecular |
| [docs/METADATA-INSIGHTS-GUIDE.md](docs/METADATA-INSIGHTS-GUIDE.md) | Catálogo de patrones metadata |
| [README.md](README.md) | Instalación y uso rápido |

---

## 🔄 Modos de Operacion del Orchestrator

### Modo Iterativo (Refinamiento)

El modo iterativo refina resultados del LLM con pasadas adicionales hasta convergencia.

**Diagrama:**
```
Iteracion 1: LLM base
   ↓
Detectar sugerencias con alta confianza
   ↓
Re-analizar archivos seleccionados
   ↓
Iteracion N hasta convergencia
```

**Reglas:**
- Se activa cuando la cola principal queda vacia
- Solo re-analiza archivos con `suggestedConnections` de confianza >= umbral
- No re-analiza archivos ya refinados en esa iteracion
- Se detiene cuando no hay mejoras o se alcanza `maxIterations`

**Parametros:**
- `confidenceThreshold` (default 0.9)
- `maxIterations` (default 10)

### Modo Consolidacion (AI Consolidation)

Consolida el analisis semantico con LLM a partir de la base estatica.

**Diagrama:**
```
Layer A (.omnysysdata/)
   ↓
Orchestrator
  - detecta arquetipos
  - cola de prioridad
  - LLM workers
  - iteraciones
  - issues
   ↓
llmInsights + semantic-issues.json
```

**Flujo:**
1. Verificar analisis estatico (`.omnysysdata/`)
2. Inicializar Orchestrator
3. Detectar arquetipos segun metadatos
4. Encolar archivos con prioridad
5. Ejecutar LLM en workers paralelos
6. Ejecutar modo iterativo hasta convergencia
7. Detectar issues semanticos
8. Guardar resultados en `.omnysysdata/`

**Salidas:**
- `llmInsights` en archivos analizados
- `.omnysysdata/semantic-issues.json`

### Modo Auto Serve (Pipeline Unificado)

Un solo comando deja el sistema operativo con `omnysys serve`:

**Diagrama:**
```
serve
  ↓
  +-> ensure Layer A
  +-> ensure LLM server
  +-> start Orchestrator
  +-> optional consolidate
  +-> start MCP Server
```

**Pipeline:**
1. Verificar `.omnysysdata/`
2. Si no existe, ejecutar `omnysys analyze`
3. Verificar LLM server y arrancar si es necesario
4. Inicializar Orchestrator en modo servicio
5. Ejecutar consolidacion inicial (opcional, segun config)
6. Iniciar MCP Server

---

## 📂 File Watcher - Contrato

**Objetivo:** Mantener `.omnysysdata/` consistente ante cambios en archivos del proyecto.

**Diagrama:**
```
FS Change → Queue → Analyze → Update Graph → Invalidate Cache
```

**Reglas:**
- Debounce para evitar duplicados
- Lock por archivo para evitar doble analisis
- Actualizacion bidireccional de dependencias
- Invalidacion de caches en MCP/Unified Server
- Si el parseo falla, no escribir datos nuevos

**Eventos:**
- `file:created`
- `file:modified`
- `file:deleted`
- `cache:invalidate`

---

**OmnySys - De la visión de túnel a la visión molecular completa.**
