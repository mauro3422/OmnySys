# Scenario 2: Semantic Connections Test Case

**Propósito**: Validar que el análisis semántico (LFM2.5-Thinking) detecta conexiones NO OBVIAS que el análisis estático no puede ver.

## Descripción del Escenario

Este test case contiene un mini-proyecto de juego con **6 archivos** que están conectados semánticamente pero **NO tienen imports entre sí**.

### Archivos

1. **GameStore.js** - Define `window.gameState` (estado global)
2. **Player.js** - Modifica `window.gameState` sin importar GameStore
3. **UI.js** - Lee `window.gameState` sin importar GameStore ni Player
4. **EventBus.js** - Define `window.eventBus` (sistema de eventos)
5. **Analytics.js** - Registra listeners en `window.eventBus` sin importar EventBus
6. **GameEvents.js** - Emite eventos en `window.eventBus` sin importar EventBus

### Conexiones Semánticas Esperadas

**Shared State** (3 conexiones):
- `Player.js` ↔ `GameStore.js` (Player modifica estado de GameStore)
- `Player.js` ↔ `UI.js` (ambos acceden a window.gameState)
- `UI.js` ↔ `GameStore.js` (UI lee estado de GameStore)

**Event Listeners** (3 conexiones):
- `Analytics.js` ↔ `EventBus.js` (Analytics registra listeners)
- `GameEvents.js` ↔ `EventBus.js` (GameEvents emite eventos)
- `GameEvents.js` ↔ `Analytics.js` (conexión indirecta via eventBus)

**Total**: 6 conexiones semánticas no detectables por análisis estático

## Side Effects Detectados

Todos los archivos tienen side effects:

- **GameStore.js**: Crea `window.gameState` (global state)
- **Player.js**: Modifica `window.gameState`
- **UI.js**: Lee `window.gameState`, modifica DOM
- **EventBus.js**: Crea `window.eventBus` (global event bus)
- **Analytics.js**: Registra event listeners, hace network calls (fetch)
- **GameEvents.js**: Emite eventos

## Risk Scores Esperados

- **Player.js**: 7.5/10 (HIGH) - Modifica estado global, múltiples conexiones
- **UI.js**: 6.5/10 (MEDIUM-HIGH) - Modifica DOM, lee estado global
- **GameStore.js**: 6.0/10 (MEDIUM-HIGH) - Define estado usado por múltiples archivos
- **EventBus.js**: 5.5/10 (MEDIUM) - Define event bus usado por múltiples archivos
- **Analytics.js**: 5.0/10 (MEDIUM) - Network calls, event listeners
- **GameEvents.js**: 4.0/10 (MEDIUM-LOW) - Emite eventos

## Validación

Para validar que el análisis semántico funciona correctamente:

1. Ejecutar análisis estático: `node src/layer-a-static/indexer.js test-cases/scenario-2-semantic/src`
   - **Resultado esperado**: 0 dependencias estáticas (ningún import entre archivos)

2. Ejecutar análisis semántico: `node src/layer-b-semantic/analyzer.js test-cases/scenario-2-semantic/src`
   - **Resultado esperado**: 6 conexiones semánticas detectadas

3. Comparar con `expected-semantic-connections.json`
   - Todas las conexiones deben ser detectadas
   - Confidence scores >= 0.85
   - Side effects correctamente identificados

## Uso

```bash
# Análisis estático (baseline)
npm run analyze test-cases/scenario-2-semantic/src

# Análisis semántico (cuando esté implementado)
npm run analyze:semantic test-cases/scenario-2-semantic/src

# Validar contra expected output
npm run test:semantic scenario-2
```

## Notas de Implementación

Este test case es **crítico** para validar que:

1. El análisis estático NO detecta estas conexiones (baseline)
2. El análisis semántico SÍ las detecta (target)
3. La confianza es suficientemente alta (>0.85)
4. Los falsos positivos son mínimos

**Expected output**: Ver `expected-semantic-connections.json`
