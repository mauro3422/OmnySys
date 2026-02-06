# Test Cases - Casos de Prueba Sintéticos

## Propósito

Esta carpeta contiene **proyectos sintéticos** diseñados para validar cada componente de OmnySys en un entorno controlado antes de aplicarlo a código real.

Cada escenario simula un patrón común que causa visión de túnel en IAs.

---

## Estructura

Cada caso de prueba sigue este formato:

```
scenario-X-nombre/
├── README.md              # Descripción del escenario
├── src/                   # Código sintético
│   ├── fileA.js
│   └── fileB.js
├── expected-graph.json    # Grafo esperado (ground truth)
└── expected-warnings.json # Advertencias que OmnySys debería generar
```

---

## Escenarios Actuales

### Scenario 1: Simple Import Chain
**Archivo**: `scenario-1-simple-import/`

**Descripción**: Cadena básica de imports: A → B → C

**Propósito**: Validar que Capa A detecta dependencias directas correctamente.

**Conexiones esperadas**:
- `fileA.js` importa `fileB.js`
- `fileB.js` importa `fileC.js`
- Dependientes indirectos: `fileC.js` afecta a `fileA.js` (transitivamente)

**Test**: ¿OmnySys detecta que modificar `fileC` afecta a `fileA` y `fileB`?

---

### Scenario 2: Shared State (Sin Import Directo)
**Archivo**: `scenario-2-shared-state/`

**Descripción**: Dos archivos modifican y leen el mismo objeto global

**Propósito**: Validar que Capa B detecta estado compartido

**Código ejemplo**:
```javascript
// store.js
export const state = { counter: 0 };

// incrementer.js
import { state } from './store';
state.counter++;

// display.js
import { state } from './store';
console.log(state.counter);
```

**Conexiones esperadas**:
- `incrementer.js` y `display.js` están conectados semánticamente
- Modificar `state.counter` en `incrementer` afecta `display`
- **No hay import directo entre incrementer y display**

**Test**: ¿OmnySys advierte que modificar `incrementer` puede afectar `display`?

---

### Scenario 3: Event System
**Archivo**: `scenario-3-event-system/`

**Descripción**: Un emisor de eventos y múltiples listeners

**Código ejemplo**:
```javascript
// button.js
eventBus.emit('click', data);

// analytics.js
eventBus.on('click', trackClick);

// logger.js
eventBus.on('click', logClick);
```

**Conexiones esperadas**:
- `button.js` afecta a `analytics.js` y `logger.js`
- **No hay imports directos**

**Test**: ¿OmnySys detecta que renombrar el evento 'click' romperá 2 archivos?

---

### Scenario 4: Hidden Side Effect (localStorage)
**Archivo**: `scenario-4-side-effect/`

**Descripción**: Un archivo escribe en localStorage, otro lee

**Código ejemplo**:
```javascript
// writer.js
localStorage.setItem('token', value);

// reader.js
const token = localStorage.getItem('token');
```

**Conexiones esperadas**:
- `writer.js` y `reader.js` están conectados por el key 'token'
- Cambiar el key rompe la conexión

**Test**: ¿OmnySys detecta la conexión vía localStorage?

---

### Scenario 5: Disconnected File (Shader)
**Archivo**: `scenario-5-disconnected-shader/`

**Descripción**: Archivo JS configura uniforms de un shader GLSL

**Código ejemplo**:
```javascript
// renderer.js
gl.uniform1f(gl.getUniformLocation(program, 'u_zoom'), zoom);

// shader.glsl
uniform float u_zoom;
void main() { /* usa u_zoom */ }
```

**Conexiones esperadas**:
- `renderer.js` está conectado a `shader.glsl` por el uniform `u_zoom`
- Renombrar `u_zoom` rompe el shader

**Test**: ¿OmnySys detecta la conexión aunque el shader no sea JS?

---

### Scenario 6: God Object
**Archivo**: `scenario-6-god-object/`

**Descripción**: Un archivo usado por 10+ otros archivos (alto riesgo)

**Propósito**: Validar análisis de riesgo

**Estructura**:
```
core.js (exporta función crítica)
├── moduleA.js (usa core)
├── moduleB.js (usa core)
├── ...
└── moduleJ.js (usa core)
```

**Test**: ¿OmnySys marca `core.js` como "HIGH RISK" al intentar editarlo?

---

### Scenario 7: Forgotten Test File
**Archivo**: `scenario-7-forgotten-test/`

**Descripción**: Modificar un módulo sin actualizar su test

**Código ejemplo**:
```javascript
// calculator.js
export function add(a, b) { return a + b; }

// calculator.test.js
import { add } from './calculator';
test('add', () => expect(add(1, 2)).toBe(3));
```

**Cambio simulado**: Renombrar `add` a `sum` en `calculator.js`

**Test**: ¿OmnySys advierte que `calculator.test.js` también debe actualizarse?

---

## Cómo Usar los Test Cases

### Paso 1: Ejecutar el Indexer
```bash
node src/layer-a-static/indexer.js test-cases/scenario-1-simple-import/src
```

**Output esperado**: `system-map.json` con el grafo de dependencias

### Paso 2: Comparar con Ground Truth
```bash
node scripts/compare-graphs.js \
  system-map.json \
  test-cases/scenario-1-simple-import/expected-graph.json
```

**Output esperado**: `✅ All dependencies detected correctly`

### Paso 3: Validar Capa B (Semántica)
```bash
node src/layer-b-semantic/analyzer.js test-cases/scenario-2-shared-state/src
```

**Output esperado**: Detectar conexión por estado compartido

### Paso 4: Validar Warnings
```bash
node src/layer-c-memory/query-interface.js get-impact-map fileA.js
```

**Output esperado**: Lista de archivos afectados (comparar con `expected-warnings.json`)

---

## Criterios de Éxito

Cada escenario pasa si:

1. **Capa A**: Detecta todas las dependencias directas (imports)
2. **Capa B**: Detecta conexiones semánticas (estado, eventos, etc.)
3. **Capa C**: Genera warnings correctos cuando simulas editar un archivo
4. **No falsos positivos**: No reporta conexiones que no existen

---

## Escenarios Futuros (Por Crear)

### Scenario 8: Circular Dependency
Detectar y advertir sobre dependencias circulares

### Scenario 9: Dynamic Import
Detectar `require(dynamicPath)` y marcar como "no resuelto"

### Scenario 10: Config File
Archivo de configuración usado por múltiples módulos

### Scenario 11: CSS-in-JS
Clases CSS usadas en JS (styled-components)

### Scenario 12: Monorepo
Múltiples paquetes con dependencias cruzadas

---

## Agregando Nuevos Test Cases

1. Crea la carpeta `scenario-X-nombre/`
2. Añade código sintético en `src/`
3. Genera `expected-graph.json` manualmente (ground truth)
4. Define `expected-warnings.json`
5. Actualiza este README con la descripción
6. Ejecuta el test: `npm test scenario-X`

---

## Notas

- Estos casos son **sintéticos**, no código real
- Están diseñados para ser **minimalistas**: el código más simple que demuestra el patrón
- **Ground truth es manual**: Tú defines qué conexiones deben detectarse
- Si OmnySys falla un test, el bug está en OmnySys, no en el test case

---

## Estado Actual

**Escenarios implementados**: 13/13

- [x] Scenario 1: Simple Import Chain
- [x] Scenario 2: Shared State (en `scenario-2-semantic`)
- [x] Scenario 3: Event System (en `scenario-2-semantic`)
- [x] Scenario 4: Hidden Side Effect (localStorage)
- [x] Scenario 5: Disconnected File (Shader)
- [x] Scenario 6: God Object
- [x] Scenario 7: Forgotten Test File
- [x] Scenario 8: Coordinate Matrix Trap (The "Mouse" Nightmare)
- [x] Scenario 9: The Event Race Condition (Propagation Trap)
- [x] Scenario 10: The Serialization Phantom (Main-Worker Bridge)
- [x] Scenario 11: The CSS Variable Poisoning (Visual Drift Trap)
- [x] Scenario 12: The Dynamic Property Trap (Reflection Nightmare)
- [x] Scenario 13: The Singleton Identity Crisis (The "Two Managers" Trap)

**Próximo paso**: ¡El sistema de pruebas es ahora una batería de pesadillas! El siguiente paso es ejecutar el análisis semántico para ver cuántas de estas trampas es capaz de detectar el motor actual.
