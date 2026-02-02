
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

