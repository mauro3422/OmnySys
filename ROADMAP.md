# CogniSystem - Roadmap de Desarrollo

## Filosofía de Desarrollo

**Enfoque incremental**: Construir y validar cada capa antes de pasar a la siguiente. Evitar el "big bang" que puede generar frustración si no funciona de inmediato.

**Principio**: "Funciona en sintético antes de tocar código real"

---

## FASE 0: Preparación y Documentación ✅

**Objetivo**: Capturar todo el conocimiento antes de que se compacte el contexto.

**Tareas**:
- [x] Crear README.md con análisis del problema
- [x] Crear ROADMAP.md (este archivo)
- [ ] Crear ARCHITECTURE.md con diseño técnico
- [ ] Crear docs/ con análisis detallado
- [ ] Crear estructura de carpetas del proyecto

**Entregables**:
- Documentación completa que puede sobrevivir a la compactación de contexto
- Estructura de proyecto profesional
- Casos de uso claramente definidos

---

## FASE 1: Capa A - Indexer Estático (MVP)

**Duración estimada**: No estimamos tiempos - nos enfocamos en qué construir

**Objetivo**: Crear un analizador estático que genere un grafo de dependencias técnico.

### 1.1: Parser de Código

**Entregables**:
- Script que puede parsear archivos JS/TS y extraer:
  - Imports/exports
  - Llamadas a funciones
  - Acceso a propiedades
  - Definiciones de clases/funciones

**Stack técnico**:
- Node.js
- `@babel/parser` o `ts-morph` para AST parsing
- `ripgrep` para búsquedas rápidas (opcional)

**Casos de prueba**:
```
test-cases/scenario-1-simple-import/
  ├── fileA.js (exporta función)
  └── fileB.js (importa de A)
Resultado esperado: Grafo detecta A → B
```

### 1.2: Constructor de Grafo

**Entregables**:
- Script que recorre el proyecto y construye `system-map.json`:
```json
{
  "files": {
    "src/CameraState.js": {
      "exports": ["CameraState", "updateCamera"],
      "imports": ["./math/Vector3"],
      "usedBy": ["src/RenderEngine.js", "src/Input.js"],
      "calls": ["Vector3.normalize", "clamp"]
    }
  },
  "dependencies": [
    { "from": "RenderEngine.js", "to": "CameraState.js", "type": "import" },
    { "from": "CameraState.js", "to": "Vector3.js", "type": "import" }
  ]
}
```

**Casos de prueba**:
```
test-cases/scenario-2-chain-dependency/
  ├── A.js (exporta X)
  ├── B.js (importa X, exporta Y)
  └── C.js (importa Y)
Resultado esperado: Grafo detecta A → B → C
```

### 1.3: Visualización (Debug)

**Entregables**:
- Script que convierte `system-map.json` a formato Mermaid o Graphviz
- Permite visualizar el grafo en markdown

**Propósito**:
Validar que el grafo está correctamente construido antes de usarlo.

---

## FASE 2: Integración Básica con IA

**Objetivo**: Hacer que una IA pueda consultar el grafo antes de editar.

### 2.1: Servidor MCP Simple

**Entregables**:
- Servidor MCP que expone una herramienta: `get_impact_map`
- Input: nombre de archivo
- Output: lista de archivos relacionados

**Ejemplo de uso**:
```bash
IA: "Voy a editar CameraState.js"
Tool: get_impact_map("CameraState.js")
Respuesta: {
  "directDependents": ["RenderEngine.js", "Input.js"],
  "indirectDependents": ["Main.js"],
  "imports": ["Vector3.js"]
}
IA: "Entendido, revisaré RenderEngine.js también"
```

### 2.2: Skill de Pre-Edición

**Entregables**:
- Skill personalizado que se ejecuta antes de editar
- Automáticamente llama a `get_impact_map` y muestra advertencias

**Casos de prueba**:
```
test-cases/scenario-3-forgotten-dependent/
  ├── StateManager.js (módulo central)
  ├── UI.js (depende del estado)
  └── Logic.js (depende del estado)

Prueba: Pedir a IA editar StateManager sin mencionar UI/Logic
Resultado esperado: Skill advierte "Ojo, UI.js y Logic.js dependen de esto"
```

---

## FASE 3: Capa B - Analizador Semántico con IA

**Objetivo**: Detectar conexiones que el análisis estático no puede ver.

### 3.1: Configuración de IA Local

**Entregables**:
- Setup de modelo local (Qwen2.5-Coder-7B o similar)
- Script que puede hacer inferencia local

**Consideraciones**:
- Evaluar si vale la pena el costo computacional
- Comparar con alternativas (GPT-4o-mini vía API)

### 3.2: Detector de Conexiones Semánticas

**Entregables**:
- Script que lee el código y detecta:
  - Estado compartido (variables globales, stores)
  - Eventos/listeners
  - Efectos indirectos (ej: un botón que triggerea una función en otro módulo)

**Prompt para la IA**:
```
Analiza este código y lista todos los archivos del proyecto que
podrían verse afectados si modifico esta función, incluso si no
hay un import directo. Considera: estado compartido, eventos,
callbacks, configuración global.
```

**Casos de prueba**:
```
test-cases/scenario-4-event-coupling/
  ├── Button.js (dispara evento "click")
  ├── Analytics.js (escucha "click")
  └── Logger.js (escucha "click")

Resultado esperado: IA detecta que Button afecta Analytics y Logger
aunque no hay imports directos.
```

### 3.3: Enriquecimiento del Grafo

**Entregables**:
- Script que combina Capa A (estático) + Capa B (semántico)
- Genera `enhanced-system-map.json` con metadata enriquecida

### 3.4: Arquitectura de Datos para Semantic Layer ✅ COMPLETADO

**Objetivo**: Definir schemas y estructuras de datos ANTES de implementar IA.

**Entregables**:
- ✅ `schema/enhanced-system-map.schema.json` - JSON Schema completo
- ✅ `schema/types.d.ts` - TypeScript types para developer experience
- ✅ `test-cases/scenario-2-semantic/` - Casos de prueba con conexiones no obvias
  - 6 archivos con shared state y event listeners
  - NO tienen imports entre sí (conexiones semánticas puras)
  - `expected-semantic-connections.json` con resultados esperados
- ✅ `src/layer-b-semantic/schema-validator.js` - Validador de output de IA

**Schema diseñado**:
```javascript
{
  "metadata": { version, generated, analyzers },
  "files": {
    "path/to/file.js": {
      // Static analysis (ya existe)
      "imports": [...], "exports": [...],

      // Semantic analysis (nuevo)
      "semanticConnections": [
        {
          "id": "conn_1",
          "type": "shared_state",
          "target": "path/to/other.js",
          "reason": "Both access window.gameState",
          "confidence": 0.95,
          "severity": "high",
          "sourceLocations": [{ function, line }],
          "evidence": { sourceCode, targetCode }
        }
      ],
      "sideEffects": {
        "hasGlobalAccess": true,
        "modifiesDOM": false,
        ...
      },
      "riskScore": { total: 7.5, breakdown: {...} }
    }
  },
  "connectionIndex": { by_type, by_file, by_severity }
}
```

**Scope definido**:
- Análisis a nivel de ARCHIVO (no bloques de código)
- Metadata a nivel de FUNCIÓN (para ubicación exacta)
- Conexiones: shared_state, event_listener, callback, side_effect, global_access, mutation
- Risk scores: 0-10 scale

**Validación**:
- Confidence threshold: 0.7 (configurable)
- Severity levels: low, medium, high, critical
- Auto-filtrado de conexiones de baja confianza

**Por qué este orden**:
1. No puedes meter IA sin saber dónde escribe resultados
2. Schema definido permite iterar rápido con mocks
3. Test cases validan que el esquema cubre todos los casos

### 3.5: Semantic Detection - Static (Hybrid Approach) ⏭️ PRÓXIMO

**Objetivo**: Detectar conexiones semánticas usando análisis estático (scripts puros). IA solo para casos complejos.

**Filosofía Híbrida**:
```
Layer A-Extended (Scripts)      Layer B (IA - Optional)
├─ 80% de casos                 ├─ 20% de casos complejos
├─ Patterns obvios              ├─ Código dinámico
├─ Zero cost                    ├─ Indirección compleja
├─ Instantáneo (<100ms)         ├─ Context understanding
└─ 100% reproducible            └─ Síntesis y verificación
```

#### 3.5.1: Detección Estática de Shared State

**Entregables**:
- `src/layer-a-static/analyses/tier3/shared-state-detector.js`
- Detecta `window.*`, `globalThis.*`, `global.*`
- AST traversal para encontrar reads/writes
- Genera conexiones con confidence = 1.0 (determinístico)

**Algoritmo**:
```javascript
1. Para cada archivo:
   a. Traverse AST buscando MemberExpression con object = "window"
   b. Clasificar como READ o WRITE
   c. Guardar línea y función donde ocurre

2. Para cada propiedad global:
   a. Si tiene WRITERS y READERS en archivos distintos
   b. Crear semantic connection: writer → reader
   c. Confidence: 1.0 (100% seguro)
   d. Severity: calculado por scoring rules
```

**Casos detectados**:
```javascript
// DETECTA:
window.gameState = { score: 0 };           // Write
const score = window.gameState.score;      // Read
window.eventBus.emit('event');             // Write (method call)

// NO DETECTA (requiere IA):
const state = window.gameState;
state.score = 10;                          // Indirección
window[propName] = value;                  // Dynamic property
```

#### 3.5.2: Detección Estática de Event Patterns

**Entregables**:
- `src/layer-a-static/analyses/tier3/event-pattern-detector.js`
- Detecta event emitters y listeners
- Matching automático entre emisores y receptores

**Patterns detectados**:
```javascript
// Event Bus Pattern
window.eventBus.on('event:name', handler);    // Listener
window.eventBus.emit('event:name', data);     // Emitter

// DOM Events
element.addEventListener('click', handler);    // Listener
element.dispatchEvent(new Event('click'));    // Emitter

// Custom Emitters
EventEmitter.on('custom', handler);
EventEmitter.emit('custom', data);
```

**Algoritmo**:
```javascript
1. Detectar listeners:
   a. Buscar CallExpression con método "on", "addEventListener"
   b. Extraer event name (primer argumento)
   c. Guardar: { file, line, eventName, type: 'listener' }

2. Detectar emitters:
   a. Buscar CallExpression con método "emit", "dispatchEvent"
   b. Extraer event name
   c. Guardar: { file, line, eventName, type: 'emitter' }

3. Matching:
   a. Para cada eventName que tiene listeners Y emitters
   b. Crear conexiones: emitter → listener
   c. Confidence: 1.0 si string literal, 0.8 si variable
```

#### 3.5.3: Side Effects Detection

**Entregables**:
- `src/layer-a-static/analyses/tier3/side-effects-detector.js`
- Detecta todas las categorías de side effects

**Detecciones**:
```javascript
{
  "hasGlobalAccess": detectGlobalAccess(),      // window.*, global.*
  "modifiesDOM": detectDOMCalls(),              // document.*, querySelector, etc.
  "makesNetworkCalls": detectNetworkAPIs(),     // fetch, XMLHttpRequest, axios
  "usesLocalStorage": detectStorageCalls(),     // localStorage, sessionStorage
  "accessesWindow": detectWindowAccess(),       // window object usage
  "modifiesGlobalState": detectGlobalWrites(),  // window.x = ..., global.y = ...
  "hasEventListeners": detectEventListeners(),  // addEventListener, on()
  "usesTimers": detectTimerCalls()              // setTimeout, setInterval
}
```

**Implementación por categoría**:
```javascript
// 1. DOM Manipulation
function detectDOMCalls(ast) {
  const domAPIs = ['document', 'querySelector', 'getElementById',
                   'appendChild', 'removeChild', 'innerHTML', 'textContent'];
  return hasCallToAny(ast, domAPIs);
}

// 2. Network Calls
function detectNetworkAPIs(ast) {
  const networkAPIs = ['fetch', 'XMLHttpRequest', 'axios', 'request'];
  return hasCallToAny(ast, networkAPIs);
}

// 3. Storage
function detectStorageCalls(ast) {
  const storageAPIs = ['localStorage', 'sessionStorage', 'indexedDB'];
  return hasAccessToAny(ast, storageAPIs);
}
```

#### 3.5.4: Rule-Based Scoring (Sin IA)

**Entregables**:
- `src/layer-a-static/analyses/tier3/risk-scorer.js`
- Sistema de scoring basado en reglas (no IA)
- Rápido, determinístico, explicable

**Scoring Rules**:
```javascript
function calculateRiskScore(file, connections, sideEffects, analysis) {
  let score = 0;

  // 1. Static Complexity (0-3 points)
  score += Math.min(3, file.functions.length / 10);  // Más funciones = más riesgo
  score += Math.min(2, file.imports.length / 20);    // Muchas dependencias

  // 2. Semantic Connections (0-3 points)
  const connectionCount = connections.length;
  if (connectionCount >= 5) score += 3;
  else if (connectionCount >= 3) score += 2;
  else if (connectionCount >= 1) score += 1;

  // 3. Side Effects (0-3 points)
  const sideEffectCount = Object.values(sideEffects).filter(Boolean).length;
  if (sideEffectCount >= 4) score += 3;
  else if (sideEffectCount >= 2) score += 2;
  else if (sideEffectCount >= 1) score += 1;

  // 4. Hotspot Risk (0-1 point)
  const isHotspot = analysis.hotspots.some(h => h.file === file.path);
  if (isHotspot) score += 1;

  return Math.min(10, score);
}
```

**Severity Calculation**:
```javascript
function calculateSeverity(connection, fileRisk) {
  // Shared state + high risk file = CRITICAL
  if (connection.type === 'shared_state' && fileRisk >= 7) {
    return 'critical';
  }

  // Event listener + hotspot = HIGH
  if (connection.type === 'event_listener' && fileRisk >= 5) {
    return 'high';
  }

  // Multiple readers/writers = HIGH
  if (connection.readers?.length > 3 || connection.writers?.length > 3) {
    return 'high';
  }

  // Default
  return connection.type === 'side_effect' ? 'low' : 'medium';
}
```

#### 3.5.5: Integration con Static Analysis

**Entregables**:
- Integrar semantic detection en pipeline existente
- Generar `enhanced-system-map.json` con resultados

**Flujo actualizado**:
```javascript
// indexer.js (main pipeline)
async function analyzeProject(projectPath) {
  // 1. Static Analysis (existente)
  const systemMap = await buildSystemMap(projectPath);
  const analysis = await analyzeSystemMap(systemMap);

  // 2. Semantic Detection - STATIC (nuevo)
  const semanticConnections = {
    sharedState: detectSharedState(systemMap),
    eventPatterns: detectEventPatterns(systemMap),
    sideEffects: detectSideEffects(systemMap)
  };

  // 3. Risk Scoring (nuevo)
  const riskScores = calculateRiskScores(systemMap, semanticConnections, analysis);

  // 4. Merge everything
  const enhanced = mergeAnalyses(systemMap, analysis, semanticConnections, riskScores);

  // 5. Save
  fs.writeFileSync('enhanced-system-map.json', JSON.stringify(enhanced, null, 2));

  return enhanced;
}
```
