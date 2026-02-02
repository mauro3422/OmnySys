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

#### 3.5.6: Validación en Test Cases

**Validar en scenario-2-semantic**:
```bash
# Ejecutar análisis estático
node src/layer-a-static/indexer.js test-cases/scenario-2-semantic/src

# Expected results:
✅ 3 shared_state connections detectadas
✅ 3 event_listener connections detectadas
✅ 6 files con side effects
✅ Risk scores: 4.0-7.5 range
✅ Confidence: 1.0 (todas detectadas por scripts)

# Comparar contra expected-semantic-connections.json
✅ 100% match (scripts detectan TODO en este caso simple)
```

**Performance esperado**:
- Análisis completo: <200ms para 6 archivos
- Escalabilidad: ~30ms por archivo (lineal)
- Zero external dependencies (sin modelo IA)

---

## FASE 4: MCP Server + Context Delivery System

**Objetivo**: Hacer que la IA reciba contexto relevante ANTES de editar código.

**El Problema Crítico**:
Cuando vas a editar `CameraState.js` en un proyecto de 500 archivos, ¿cuáles de esos 500 archivos son RELEVANTES? No puedes pasar todos (contexto saturado), pero necesitas los correctos.

### 4.1: MCP Server Básico

**Entregables**:
- Servidor MCP que expone el systemMap vía Model Context Protocol
- Endpoints principales:
  - `getSystemMap()` - Retorna mapa completo (para debugging)
  - `getFileContext(filePath)` - Contexto relevante para UN archivo
  - `getImpactAnalysis(filePath)` - Análisis de impacto de editar un archivo
  - `getQualityReport()` - Reporte de calidad del proyecto

**Stack técnico**:
- `@modelcontextprotocol/sdk` (MCP SDK oficial)
- Node.js server con stdio transport
- Lee `system-map.json` y `system-map-analysis.json`

**Ejemplo de uso**:
```javascript
// La IA invoca herramienta MCP
mcp.getFileContext("src/game/CameraState.js")

// Respuesta:
{
  "file": "src/game/CameraState.js",
  "relevantFiles": ["RenderEngine.js", "MinimapUI.js", "PlayerMovement.js"],
  "warnings": ["HOTSPOT: Used by 15 files"],
  "summary": "Camera state affects rendering, minimap, and player tracking"
}
```

### 4.2: Context Selector - Sistema de Relevancia

**El cerebro del sistema**: Decide QUÉ contexto pasar y CUÁNDO.

#### Algoritmo 1: Relevancia por Distancia (Graph Distance)

**Estrategia**: Filtrar por proximidad en el grafo de dependencias

```
TIER 0 (Distancia 0) - El archivo objetivo
├── CameraState.js ✅ SIEMPRE

TIER 1 (Distancia 1) - Dependencias directas
├── usedBy: [RenderEngine.js, MinimapUI.js] ✅ SIEMPRE
├── dependsOn: [Vector2D.js, MathUtils.js] ✅ SIEMPRE

TIER 2 (Distancia 2) - Dependencias transitivas
├── usedBy: [GameLoop.js, SceneManager.js] ⚠️ SELECTIVO
├── dependsOn: [Constants.js] ⚠️ SELECTIVO

TIER 3+ (Distancia 3+)
├── Demasiado lejos ❌ IGNORAR (excepto si es HOTSPOT)
```

**Regla de oro**: Pasar TIER 0 + TIER 1 completo + TIER 2 filtrado por score

#### Algoritmo 2: Relevancia por Scoring

**Estrategia**: Calcular score de relevancia para cada archivo

```javascript
function calculateRelevanceScore(file, targetFile, analysis) {
  let score = 100; // Base score

  // 🔥 BOOSTS (aumentan relevancia)
  if (isDirectDependency(file, targetFile)) score += 100;
  if (isHotspot(file, analysis)) score += 50;
  if (hasHighCoupling(file, targetFile, analysis)) score += 30;
  if (sharesConstants(file, targetFile)) score += 20;
  if (sharesTypes(file, targetFile)) score += 15;

  // 🧊 PENALTIES (reducen relevancia)
  if (isTestFile(file)) score -= 50;
  if (isConfigFile(file)) score -= 40;
  if (isBuildTool(file)) score -= 60;
  if (distance > 2) score -= 30 * (distance - 2);

  return Math.max(0, score);
}
```

**Threshold**: Solo pasar archivos con `score >= 100`

#### Algoritmo 3: Symbol-Level Filtering

**Problema**: No todas las dependencias son iguales

```javascript
// CameraState.js exporta:
export const position = { x, y };      // Usado por 10 archivos
export const zoom = 1.0;               // Usado por 3 archivos
export function toJSON() { ... }       // Usado por 1 archivo (SaveManager)

// Si vas a editar position:
✅ Pasar: MinimapUI.js, PlayerMovement.js (usan position)
❌ NO pasar: SaveManager.js (solo usa toJSON)
```

**Implementación**:
- Usar `constantUsage`, `objectExports` del análisis
- Preguntar: "¿Qué símbolo específico vas a modificar?"
- Filtrar solo archivos que usan ESE símbolo

#### Algoritmo 4: Risk-Based Expansion

**Estrategia**: Si el archivo es CRÍTICO, ampliar contexto

```javascript
if (isHotspot(targetFile) && callers >= 15) {
  // Archivo super crítico - pasar MÁS contexto
  maxFiles = 15;
  includeAllCallers = true;
  warnings.push("⚠️ CRITICAL FILE: 15+ files depend on this");
}

if (hasCircularDependency(targetFile)) {
  // Dependency hell - advertir
  warnings.push("🔴 CIRCULAR DEPENDENCY: Review carefully");
  includeCircularFiles = true;
}

if (couplingStrength >= 5) {
  // Alto acoplamiento - pasar archivos acoplados
  includeCoupledFiles = true;
  warnings.push("⚠️ HIGH COUPLING: Changes may cascade");
}
```

### 4.3: Context Injector - Formateo para IA

**Entregables**:
- Sistema que formatea el contexto de forma legible para la IA
- Diferentes niveles de detalle según la situación

#### Formato Estándar (Para ediciones normales)

```markdown
🧭 CONTEXT FOR EDITING: src/game/CameraState.js

📁 AFFECTED FILES (4):
  1. src/game/RenderEngine.js (imports: position, zoom, rotation)
     - Direct dependency
     - Hotspot: 23 callers

  2. src/ui/MinimapUI.js (imports: position)
     - Direct dependency
     - High coupling detected

  3. src/player/PlayerMovement.js (imports: followTarget, position)
     - Direct dependency

  4. src/effects/CameraShake.js (imports: shake method)
     - Transitive dependency

⚠️  WARNINGS:
  - CameraState.js is a HOTSPOT (used by 15 files)
  - High coupling with RenderEngine.js (bidirectional)
  - Circular function dependency detected in updateCamera()

💡 RECOMMENDATIONS:
  - Test camera movement after changes
  - Verify minimap sync
  - Check player tracking behavior
  - Run integration tests

📊 QUALITY:
  - Impact Level: HIGH (15 files affected)
  - Risk Score: 7/10
  - Test Coverage: 85%
```

#### Formato Compacto (Para archivos simples)

```markdown
🧭 CameraState.js → Affects: RenderEngine.js, MinimapUI.js (2 files)
⚠️  Hotspot (15 callers) - Test carefully
```

#### Formato Expandido (Para archivos críticos)

Incluir:
- Function-level call graph
- Constant usage analysis
- Type dependencies (TypeScript)
- Recent change history (git)
- Related test files

### 4.4: Hook Integration - Interceptar Ediciones

**Entregables**:
- Hook que intercepta cuando la IA va a editar código
- Inyecta contexto ANTES de que la IA escriba

**Flujo**:
```
1. IA invoca herramienta Edit(file="CameraState.js", ...)
2. Hook intercepta ANTES de ejecutar
3. Consulta MCP Server: getFileContext("CameraState.js")
4. Recibe contexto relevante
5. Prepend contexto al prompt de la IA
6. IA ahora tiene contexto completo
7. Ejecuta Edit con conocimiento total
```

**Implementación**:
- Usar pre-tool-execution hooks (si disponible en SDK)
- O usar prompt engineering: "Before editing X, always check context for X"

### 4.5: Incremental Context - Ajuste Dinámico

**Problema**: A veces la IA necesita MÁS contexto si falla

**Estrategia**: Sistema de contexto incremental

```javascript
let contextDepth = 1; // Empezar conservador

// Si la IA falla o pide ayuda
if (errorDetected || aiAsksForHelp) {
  contextDepth++;
  expandContext(); // Incluir TIER 2, TIER 3
}

// Si la IA tiene éxito
if (testsPass && noErrors) {
  contextDepth = 1; // Volver a modo conservador
}
```

### 4.6: Caché y Performance

**Entregables**:
- Sistema de caché para consultas repetidas
- Pre-computar contextos comunes

**Optimizaciones**:
```javascript
// Caché de contextos frecuentes
const contextCache = new LRU(maxSize: 100);

// Pre-compute para archivos hotspot
for (const hotspot of analysis.hotspots) {
  contextCache.set(hotspot.file, computeContext(hotspot.file));
}

// Invalidar caché solo cuando archivo cambia
fileWatcher.on('change', (file) => {
  contextCache.invalidate(file);
  // Re-computar solo archivos afectados
});
```

---

## FASE 5: Semantic Layer - IA para Casos Complejos y Síntesis

**Objetivo**: Usar IA local (LFM2.5-Thinking) SOLO para casos complejos y síntesis/verificación.

**Estrategia Híbrida - 80/20 Rule**:
```
Phase 3.5 (Scripts)             Phase 5 (IA)
├─ 80% de detección             ├─ 20% casos complejos
├─ Zero cost                    ├─ Síntesis de resultados
├─ <200ms                       ├─ Verificación de findings
└─ Patterns obvios              └─ Context understanding
```

### 5.1: Casos que Requieren IA

**Cuándo usar IA (no scripts)**:

```javascript
// ❌ Scripts NO pueden detectar:

// 1. Indirección
const state = window.gameState;
state.score = 10;  // ¿state === window.gameState?

// 2. Código dinámico
const propName = config.stateProp;
window[propName] = { score: 0 };  // Runtime value

// 3. Chains complejas
const obj = getStateObject();  // ¿Qué devuelve?
obj.score = 10;

// 4. Template strings
const eventName = `game:${action}`;  // ¿Qué valor tiene action?
window.eventBus.on(eventName, handler);
```

**Triggers para análisis con IA**:
```javascript
function shouldUseAI(file, staticAnalysis) {
  return (
    file.hasIndirection ||              // Variables como proxies
    file.hasDynamicProperties ||        // window[varName]
    file.complexityScore > 7 ||         // Alto riesgo
    staticAnalysis.lowConfidence ||     // Scripts no seguros
    file.isHotspot && hasSemanticRisk   // Crítico + sospechoso
  );
}
```

### 5.2: IA para Síntesis y Verificación

**Uso principal**: Enriquecer resultados de scripts, no reemplazarlos.

**Tareas de IA**:
```javascript
// 1. Síntesis
"Estos 5 archivos acceden a window.gameState. Resumen:
 - Player.js ESCRIBE score (high impact)
 - UI.js LEE score (medium impact)
 - Analytics.js LEE para metrics (low impact)
 Riesgo: Race condition si Player modifica mientras UI lee."

// 2. Verificación de false positives
StaticAnalysis: "Detecté shared state en A.js y B.js"
AI: "Verificado. B.js efectivamente depende del estado de A.
     Confidence: 0.95"

// 3. Context understanding
StaticAnalysis: "window.eventBus.emit('user:login', data)"
AI: "Este evento es crítico para autenticación. Impacta:
     - Session management
     - Authorization flow
     - Analytics tracking
     Severity: CRITICAL (no solo 'high')"

// 4. Recommendations
"Refactoring suggestion: Considera usar un state manager
 en lugar de window.gameState para mejor testability."
```

### 5.3: Evaluación de Modelos (Actualizado)

**Modelo seleccionado**: **LFM2.5-1.2B-Thinking** (ver docs/SEMANTIC_LAYER_MODELS.md)

**Por qué:**
- ✅ +39% mejor razonamiento que Instruct
- ✅ +16% mejor tool use (JSON output)
- ✅ Thinking traces para debug
- ✅ <900MB memoria
- ✅ Ya evaluado y documentado

**Uso limitado**:
- Solo 10-20% de archivos (casos complejos)
- Síntesis al final del análisis
- Verificación bajo demanda

### 5.4: Detector de Casos Complejos

**Casos que análisis estático NO detecta**:

```javascript
// Caso 1: Estado compartido via store
// GameStore.js
export const gameState = { score: 0 };

// Player.js - NO importa GameStore
function updateScore() {
  window.gameState.score++; // ❌ Análisis estático no lo ve
}

// UI.js - NO importa Player
function displayScore() {
  return window.gameState.score; // ❌ Conexión no obvia
}
```

**Prompt para IA (casos complejos)**:
```
Análisis estático ya detectó:
- window.gameState accedido en Player.js (línea 15) y UI.js (línea 23)
- Confidence: 1.0 (determinístico)

Tu tarea:
1. Verificar si hay conexiones ADICIONALES no detectadas
2. Analizar IMPACTO de estas conexiones
3. Sugerir severity ajustada por contexto

Code context:
[código relevante aquí]

Output JSON:
{
  "additionalConnections": [...],  // Solo si encontrás algo nuevo
  "verification": {
    "staticFindingsCorrect": true,
    "contextAnalysis": "Player modifica score, UI lo lee en tiempo real...",
    "suggestedSeverity": "critical",  // vs "high" del static
    "reasoning": "UI puede mostrar datos stale si..."
  },
  "recommendations": [...]
}
```

### 5.5: Flujo Híbrido Completo (Static + AI)

**Pipeline integrado**:

```javascript
async function analyzeProjectHybrid(projectPath) {
  // ========== PHASE 1: STATIC ANALYSIS (100% files, <200ms) ==========
  console.log('🔍 Phase 1: Static analysis...');

  const systemMap = await buildSystemMap(projectPath);
  const staticAnalysis = await analyzeSystemMap(systemMap);

  // ========== PHASE 2: SEMANTIC - STATIC (100% files, <200ms) ==========
  console.log('🔍 Phase 2: Semantic detection (scripts)...');

  const semanticStatic = {
    sharedState: detectSharedState(systemMap),          // window.*, global.*
    eventPatterns: detectEventPatterns(systemMap),      // on(), emit()
    sideEffects: detectSideEffects(systemMap),          // DOM, network, storage
    riskScores: calculateRiskScores(systemMap, analysis) // Rule-based
  };

  // ========== PHASE 3: IDENTIFY COMPLEX CASES (~10-20% files) ==========
  console.log('🔍 Phase 3: Identify complex cases...');

  const complexFiles = identifyComplexCases(systemMap, semanticStatic);

  console.log(`  → ${complexFiles.length} files need AI analysis`);
  console.log(`  → ${systemMap.files.length - complexFiles.length} files done with scripts`);

  // ========== PHASE 4: AI ANALYSIS (only complex, 2s each) ==========
  let aiResults = {};

  if (complexFiles.length > 0 && config.enableAI) {
    console.log('🤖 Phase 4: AI analysis for complex cases...');
    aiResults = await analyzeWithAI(complexFiles, semanticStatic);
  }

  // ========== PHASE 5: SYNTHESIS (optional, 5s total) ==========
  let synthesis = null;

  if (config.enableAISynthesis) {
    console.log('🤖 Phase 5: AI synthesis...');
    synthesis = await synthesizeFindings(semanticStatic, aiResults);
  }

  // ========== PHASE 6: MERGE & SAVE ==========
  console.log('💾 Phase 6: Merge and save...');

  const enhanced = mergeAllAnalyses(
    systemMap,
    staticAnalysis,
    semanticStatic,
    aiResults,
    synthesis
  );

  fs.writeFileSync('enhanced-system-map.json', JSON.stringify(enhanced, null, 2));

  return enhanced;
}
```

**Identificación de casos complejos**:

```javascript
function identifyComplexCases(systemMap, semanticStatic) {
  const complexFiles = [];

  for (const [filePath, fileInfo] of Object.entries(systemMap.files)) {
    const needsAI =
      // 1. Alto riesgo + bajo confidence
      (fileInfo.riskScore > 7 && hasLowConfidencePatterns(fileInfo)) ||

      // 2. Hotspot con semantic connections
      (isHotspot(filePath, analysis) && semanticStatic.connections[filePath]?.length > 0) ||

      // 3. Código dinámico detectado
      hasDynamicPatterns(fileInfo) ||

      // 4. Indirección compleja
      hasIndirection(fileInfo) ||

      // 5. Configuración manual (flags en código)
      fileInfo.forceAIAnalysis;

    if (needsAI) {
      complexFiles.push({
        path: filePath,
        reason: getComplexityReason(fileInfo),
        staticFindings: semanticStatic.connections[filePath] || []
      });
    }
  }

  return complexFiles;
}
```

**Merge de resultados**:

```javascript
function mergeAllAnalyses(systemMap, staticAnalysis, semanticStatic, aiResults, synthesis) {
  const enhanced = {
    metadata: {
      version: '0.4.0',
      generated: new Date().toISOString(),
      analyzers: {
        static: 'layer-a-v0.3.4',
        semanticStatic: 'layer-a-extended-v0.3.5',
        semanticAI: aiResults ? 'layer-b-lfm2.5-thinking-v1' : null
      },
      stats: {
        totalFiles: Object.keys(systemMap.files).length,
        analyzedWithScripts: Object.keys(systemMap.files).length - (aiResults ? Object.keys(aiResults).length : 0),
        analyzedWithAI: aiResults ? Object.keys(aiResults).length : 0,
        aiUsagePercentage: aiResults ? (Object.keys(aiResults).length / Object.keys(systemMap.files).length * 100).toFixed(1) + '%' : '0%'
      }
    },
    files: {},
    synthesis: synthesis || null
  };

  for (const [filePath, fileInfo] of Object.entries(systemMap.files)) {
    enhanced.files[filePath] = {
      // Static analysis
      ...fileInfo,

      // Semantic - Static
      semanticConnections: semanticStatic.connections[filePath] || [],
      sideEffects: semanticStatic.sideEffects[filePath] || {},
      riskScore: semanticStatic.riskScores[filePath] || { total: 0 },

      // AI results (if analyzed)
      aiEnhancement: aiResults[filePath] || null,

      // Analysis metadata
      analysis: {
        staticAnalyzed: true,
        semanticStaticAnalyzed: true,
        aiAnalyzed: !!aiResults[filePath],
        needsReanalysis: false
      }
    };
  }

  return enhanced;
}
```

**Performance esperado**:

```
Project: 100 files

Phase 1: Static analysis           → 2s
Phase 2: Semantic (scripts)        → 2s
Phase 3: Identify complex          → 0.1s
Phase 4: AI (10 files @ 2s each)   → 20s
Phase 5: Synthesis                 → 5s
Phase 6: Merge & save              → 0.5s

TOTAL: ~30s (vs 200s si TODO fuera con IA)
Savings: 85% faster
```

**Configuración**:

```javascript
// cognisystem.config.js
module.exports = {
  semantic: {
    // Static detection (always enabled)
    staticDetection: true,

    // AI analysis (optional)
    enableAI: false,  // Default: false (zero cost)
    aiThreshold: {
      riskScore: 7,           // Analizar con IA si risk >= 7
      hotspotConnections: 3,  // Hotspot + 3+ connections
      complexityScore: 8      // Complexity >= 8
    },

    // AI synthesis (optional)
    enableAISynthesis: false,  // Default: false

    // Model
    aiModel: 'lfm2.5-thinking',
    aiModelPath: '~/.cache/lm-studio/models/lfm2.5-1.2b-thinking'
  }
};
```

### 5.6: Validación del Enfoque Híbrido

**Test en scenario-2-semantic**:

```bash
# 1. Solo scripts (sin IA)
npm run analyze:semantic-static test-cases/scenario-2-semantic/src

# Expected:
✅ 3 shared_state connections (100% detected)
✅ 3 event_listener connections (100% detected)
✅ 6 side effects (100% detected)
✅ Risk scores: 4.0-7.5
✅ Time: <200ms
✅ Cost: $0

# 2. Con IA (casos complejos)
npm run analyze:semantic-hybrid test-cases/scenario-2-semantic/src

# Expected:
✅ Same connections (AI confirma, no agrega)
✅ Enhanced severity (AI ajusta por contexto)
✅ Synthesis: "Player-UI connection is critical due to real-time updates"
✅ Time: ~5s (solo synthesis)
✅ Cost: $0 (modelo local)
```

**Resultado esperado**:
- Scripts detectan 100% en caso simple
- IA agrega valor en synthesis y context understanding
- No hay diferencia en detección (validación del enfoque)

---

## FASE 6: Auto-Update + File Watching

**Objetivo**: Mantener el mapa actualizado sin regenerar todo

### 6.1: Incremental Rebuild

**Estrategia**:
```javascript
// Solo re-analizar archivos afectados
fileWatcher.on('change', (changedFile) => {
  const affectedFiles = [
    changedFile,
    ...systemMap.files[changedFile].usedBy,
    ...systemMap.files[changedFile].dependsOn
  ];

  reanalyzeFiles(affectedFiles); // Solo esto, no todo
  updateSystemMap(affectedFiles);
});
```

### 6.2: SQLite Migration

**Entregables**:
- Migrar de JSON a SQLite para queries O(1)
- Schema optimizado para búsquedas

```sql
CREATE TABLE files (
  path TEXT PRIMARY KEY,
  content TEXT,
  last_analyzed TIMESTAMP
);

CREATE TABLE dependencies (
  from_file TEXT,
  to_file TEXT,
  type TEXT,
  symbols TEXT,
  PRIMARY KEY (from_file, to_file)
);

CREATE INDEX idx_usedBy ON dependencies(to_file);
CREATE INDEX idx_dependsOn ON dependencies(from_file);
```

---

## FASE 5: Validación en Proyecto Real

**Objetivo**: Llevar CogniSystem a uno de tus proyectos bloqueados.

### 5.1: Selección de Proyecto

**Criterios**:
- Proyecto con bugs colaterales recurrentes
- Suficientemente complejo (10+ archivos modulares)
- Caso de uso claro y repetible

### 5.2: Instalación y Monitoreo

**Entregables**:
- Instalar CogniSystem en el proyecto
- Generar el grafo inicial
- Intentar una modificación que históricamente rompe cosas

### 5.3: Iteración

**Preguntas a responder**:
- ¿El grafo detectó las dependencias correctamente?
- ¿La IA usó el contexto para evitar bugs?
- ¿Hubo falsos positivos (conexiones irrelevantes)?
- ¿Faltaron conexiones importantes?

---

## FASE 6: Optimización y Escalado

**Objetivo**: Hacer que CogniSystem funcione en proyectos grandes (100+ archivos).

### 6.1: Performance

**Desafíos**:
- Tiempo de indexación inicial
- Tamaño del grafo en memoria
- Queries lentas

**Soluciones a evaluar**:
- Índices en SQLite
- Caché de resultados comunes
- Análisis parcial (solo lo necesario)

### 6.2: Filtrado Inteligente

**Problema**:
Si inyectamos todas las dependencias, saturamos el contexto de la IA.

**Solución**:
- Ranking de relevancia (directo vs indirecto)
- Límite de archivos relacionados (ej: máximo 5)
- Priorizar por tipo de cambio

---

## FASE 7: Features Avanzadas (Futuro)

### Ideas para expandir:

**Predicción de Impacto**:
- Antes de editar, mostrar: "Este cambio afectará 12 tests"

**Sugerencias Proactivas**:
- "Nota: si cambias esta función, probablemente quieras actualizar la documentación en docs/API.md"

**Integración con Testing**:
- Automáticamente ejecutar solo los tests relacionados con los archivos modificados

**Análisis de Riesgo**:
- "⚠️ Este archivo es crítico, usado por 15 módulos. ¿Seguro?"

**Detector de Código Muerto**:
- "Este archivo no es usado por nadie, ¿eliminarlo?"

---

## Criterios de Éxito

**Fase 1**: Grafo estático funciona en casos sintéticos
**Fase 2**: IA puede consultar el grafo manualmente
**Fase 3**: IA detecta conexiones semánticas correctamente
**Fase 4**: Sistema funciona automáticamente sin intervención
**Fase 5**: **CLAVE** - Previene bugs colaterales en proyecto real
**Fase 6**: Escala a proyectos grandes sin problemas de performance

---

## Notas de Desarrollo

### Principios:
1. **No estimar tiempos** - enfocarse en qué construir
2. **Validar antes de escalar** - cada fase debe funcionar antes de la siguiente
3. **Casos de prueba primero** - construir lo que sabemos que funciona
4. **Iterar en base a feedback real** - no construir features especulativos

### Gestión de Expectativas:
- Puede no funcionar al primer intento
- Algunas ideas pueden ser inviables
- El objetivo es aprender y mejorar, no perfección inmediata

---

## Estado Actual

**✅ COMPLETADO**: Phase 1, 2, 3.0, 3.1, 3.2, 3.3, 3.4
**📍 ACTUAL**: Phase 3.4 - Semantic Layer Data Architecture (v0.3.4)
**⏭️ SIGUIENTE**: Phase 3.5 - Semantic Detection Static (Hybrid Approach)

**Estrategia**: Enfoque híbrido 80/20
- 80% detección con scripts (zero cost, <200ms)
- 20% casos complejos con IA (cuando sea necesario)
- IA para síntesis y verificación (opcional)

**Versión**: v0.3.4
**Quality Score**: 98/100 (Grade A)
**Última actualización**: 2026-02-02

**Próximas implementaciones**:
1. Phase 3.5: Static semantic detection (scripts puros)
2. Phase 4: MCP Server
3. Phase 5: AI layer (casos complejos solo)
