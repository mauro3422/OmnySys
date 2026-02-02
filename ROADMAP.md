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

---

## FASE 4: MCP Server + Context Delivery System ⏭️ PRÓXIMO

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

## FASE 5: Semantic Layer - IA Local para Conexiones No Obvias

**Objetivo**: Usar modelo local (Liquid, Qwen, etc.) para detectar conexiones que análisis estático no puede ver.

### 5.1: Evaluación de Modelos

**Candidatos a evaluar**:
1. **Liquid LMF 2.5** - Nuevo modelo con "thinking", texto estructurado, rápido
2. **Qwen2.5-Coder-7B** - Especializado en código, open source
3. **DeepSeek-Coder-6.7B** - Alternativa ligera
4. **GPT-4o-mini** - Opción cloud como fallback

**Criterios de evaluación**:
- Velocidad de inferencia (objetivo: <2s por análisis)
- Calidad de detección (falsos positivos vs falsos negativos)
- Costo computacional (RAM, GPU requerida)
- Facilidad de setup

### 5.2: Detector de Conexiones Semánticas

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

**Prompt para IA semántica**:
```
Analiza este código y detecta conexiones NO OBVIAS:
- Estado compartido (global, window, localStorage)
- Event listeners (addEventListener, on, emit)
- Callbacks pasados como parámetros
- Side effects (DOM manipulation, fetch calls)
- Configuración global (process.env, config objects)

File: Player.js
Code: [código aquí]

Output formato JSON:
{
  "semanticConnections": [
    {
      "type": "shared_state",
      "target": "UI.js",
      "reason": "Both access window.gameState.score",
      "confidence": 0.95
    }
  ]
}
```

### 5.3: Enhanced System Map

**Entregables**:
- Combinar análisis estático + análisis semántico
- Generar `enhanced-system-map.json`

```json
{
  "files": {
    "Player.js": {
      "staticDependencies": ["Input.js"],
      "semanticDependencies": [
        {
          "file": "UI.js",
          "type": "shared_state",
          "confidence": 0.95,
          "detected_by": "liquid-lmf-2.5"
        }
      ]
    }
  }
}
```

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
**⏭️ SIGUIENTE**: Phase 4 - MCP Server + Context Delivery System

**Versión**: v0.3.4
**Quality Score**: 98/100 (Grade A)
**Última actualización**: 2026-02-02
