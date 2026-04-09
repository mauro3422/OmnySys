# El Problema: Visión de Túnel en IAs

**Fecha**: 2026-02-12
**Actualizado**: 2026-04-09 (v0.9.434)
**Estado**: ✅ **45 MCP Tools · 14,241 átomos · 100% Estático**

---

## Resumen Ejecutivo

Las IAs que trabajan con código sufren de un problema fundamental: **visión de túnel**. Cuando se enfocan en editar un archivo o función, pierden el contexto del sistema completo, causando bugs colaterales que pueden tomar días en debuggear.

> *"La IA solo ve el archivo que está editando, no los 15 archivos que dependen de él."*

**Solución de OmnySys**: Construir un **mapa de dependencias y conexiones semánticas** 100% estático (AST + regex + álgebra de grafos) y exponerlo vía MCP para que la IA edite con contexto real.

**IMPORTANTE**: OmnySys **NO USA LLM** para el análisis. Todo es determinístico: misma entrada → misma salida.

---

## El Síntoma: Bugs Colaterales Recurrentes

### Escenario Típico

```
1. Usuario: "Actualiza el sistema de cámara para que soporte zoom"

2. IA: *Lee CameraState.js*
   IA: *Modifica updateCamera() para añadir zoom*
   IA: "Listo, implementé el zoom"

3. Usuario prueba → 3 cosas se rompieron:
   - El minimapa ya no sigue la cámara correctamente
   - El sistema de culling de objetos dejó de funcionar
   - Los shaders de post-processing tienen glitches

4. IA no sabía que:
   - Minimap.js lee directamente el state de la cámara
   - CullingSystem.js usa el FOV de la cámara (que zoom modifica)
   - PostProcess.glsl depende de la matriz de proyección
```

**Tiempo perdido**: 2-3 días debuggeando y regenerando código.

### Impacto Medido

| Tipo de Modificación | Archivos que IA lee | Archivos realmente afectados | Bugs colaterales |
|---------------------|---------------------|------------------------------|------------------|
| Función simple | 1-2 | 1-2 | 0 |
| Sistema complejo | 2-4 | 5-8 | 2-4 |
| Refactoring | 3-5 | 10-15 | 5+ |

---

## Las Causas Raíz

### 1. Límite de Contexto

Las IAs tienen ventanas de contexto limitadas:
- GPT-4: ~128K tokens
- Claude: ~200K tokens
- Modelos locales: ~4K-8K tokens

**Problema**: No pueden mantener 50+ archivos en memoria simultáneamente.

**Consecuencia**: Deben elegir qué leer, y eligen basado en lo que "parece" más relevante, ignorando conexiones no obvias.

**Solución de OmnySys**: Pre-construir el contexto completo del proyecto y exponerlo vía MCP tools.

---

### 2. Conexiones Implícitas (Invisibles)

Las IAs no ven estos tipos de conexiones:

#### a) Estado Compartido
```javascript
// store.js
export const state = { camera: { x: 0, y: 0, zoom: 1 } };

// CameraController.js
state.camera.zoom = 2; // IA sabe que modifica el estado

// Minimap.js (en otro directorio)
function render() {
  const zoom = state.camera.zoom; // IA NO sabe que esto se afecta
}
```

#### b) Eventos y Callbacks
```javascript
// EventBus.js
export const eventBus = new EventEmitter();

// Button.js
button.onclick = () => eventBus.emit('zoom:changed', 2);

// CameraController.js
eventBus.on('zoom:changed', handleZoom); // IA no ve la conexión
```

#### c) localStorage / sessionStorage
```javascript
// CameraState.js
function updateCamera() {
  localStorage.setItem('camera-zoom', zoom); // Escribe
}

// Minimap.js
function init() {
  const savedZoom = localStorage.getItem('camera-zoom'); // Lee
}
```

#### d) Variables Globales
```javascript
// config.js
export const ENABLE_ADVANCED_CULLING = true;

// Renderer.js
if (ENABLE_ADVANCED_CULLING) { /* usa camera.zoom */ }
```

**Solución de OmnySys**: Extractores estáticos (regex) detectan estas conexiones y las exponen con confidence 1.0.

---

### 3. El Dilema de Modularidad

#### Opción A: Archivos Grandes (Monolíticos)
- ✅ Todo el contexto en un lugar
- ❌ IAs pequeñas no pueden regenerar 400+ líneas sin romper sintaxis

#### Opción B: Archivos Pequeños (Modulares)
- ✅ Fácil de regenerar (50-100 líneas)
- ❌ Conexiones entre archivos se vuelven invisibles

**Resultado**: Proyectos bloqueados que no pueden crecer.

**Solución de OmnySys**: Modelo molecular - archivos (moléculas) compuestos de funciones (átomos) con conexiones explícitas.

---

## El "Árbol Genealógico" de un Archivo

Para tener visión COMPLETA, necesitamos conocer:

```typescript
interface FileContext {
  // Identidad
  path: string;
  exports: Export[];
  imports: Import[];

  // Dependencias directas
  dependsOn: string[];  // Archivos que importa
  usedBy: string[];     // Archivos que lo importan

  // Conexiones semánticas (INVISIBLES a simple vista)
  localStorage: { key: string, operation: 'read'|'write' }[];
  events: { name: string, role: 'emitter'|'listener' }[];
  globals: { property: string, operation: 'read'|'write' }[];
  workers: { workerPath: string, messages: string[] }[];
  webSockets: { url: string }[];
  apiCalls: { endpoint: string, method: string }[];

  // Impacto
  riskScore: number;
  isHotspot: boolean;   // Usado por muchos archivos
  isOrphan: boolean;    // No usado por nadie

  // Contexto
  functions: Function[];
  complexity: number;
  culture: 'laws' | 'gatekeeper' | 'citizen' | 'auditor' | 'entrypoint' | 'script';
}
```

**OmnySys extrae TODO esto automáticamente** con AST + regex, sin LLM.

---

## Casos de Visión de Túnel (Catálogo)

### ✅ Ya Detectados por OmnySys

| Caso | Ejemplo | Detector | Confidence |
|------|---------|----------|------------|
| **Imports/Exports** | Renombrar exportación rompe importadores | AST + grafo | 1.0 |
| **localStorage** | `setItem('token')` ↔ `getItem('auth_token')` | Regex cross-ref | 1.0 |
| **Eventos** | `emit('userLogin')` vs `on('userLoggedIn')` | Regex cross-ref | 1.0 |
| **Variables Globales** | `window.eventBus` usado en 5 archivos | Tracking | 1.0 |
| **Web Workers** | Mensajes entre main y worker | postMessage tracking | 1.0 |
| **WebSocket** | Múltiples archivos conectan al mismo WS | URL tracking | 1.0 |
| **API Endpoints** | `fetch('/api/users')` en 3 archivos | URL detection | 1.0 |
| **Dead Code** | Función nunca llamada | Usage analysis | 0.85-1.0 |
| **BroadcastChannel** | Canal `'app_sync'` compartido | Constructor tracking | 1.0 |
| **Class Methods** | `new Foo().bar()` llamado dinámicamente | Class instantiation tracker | 0.8-1.0 |
| **Builder Pattern** | `builder.withX().withY().build()` | Method chaining detection | 0.8-1.0 |

### 🚧 Pendientes de Alta Prioridad

| Caso | Impacto | Prioridad | Estado |
|------|---------|-----------|--------|
| **CSS-in-JS** | Theme, styled-components | P0 | 🔴 Pendiente |
| **TypeScript Types** | Interfaces, type safety | P0 | 🔴 Pendiente |
| **Redux/Context** | Selectores, estado global | P0 | 🟡 Parcial |
| **GraphQL** | Fragments, queries | P1 | 🔴 Pendiente |
| **Middleware** | Cadena de procesamiento | P2 | 🟡 Parcial |

---

## Por Qué Soluciones Actuales Fallan

### ❌ "Lee más archivos manualmente"
- El humano no siempre sabe qué archivos leer
- Si supiéramos, no necesitaríamos la IA

### ❌ "Usa mejores prompts"
- No hay prompt que le diga a la IA sobre conexiones que no ve
- "Revisa todos los archivos relacionados" es demasiado vago

### ❌ Herramientas Estáticas (ESLint, etc.)
- Solo ven imports directos
- No detectan estado compartido, eventos, side effects

### ❌ Servidores MCP Genéricos
- Análisis on-demand (lento)
- Sin memoria persistente
- No detectan conexiones semánticas

### ❌ LLM para Análisis
- **No determinístico**: misma entrada → diferente salida
- **Lento**: 2-3 segundos por consulta
- **Caro**: tokens = dinero
- **Impredecible**: puede inventar conexiones
- **Innecesario**: AST + regex es suficiente

**OmnySys NO USA LLM** para el análisis. Todo es estático y determinístico.

---

## Requisitos para una Solución Real

### Must-Have
1. **Velocidad**: Respuesta instantánea (<100ms)
2. **Precisión**: Conexiones directas + semánticas
3. **Automatización**: Sin intervención manual
4. **Integración**: Dentro del workflow de la IA
5. **Determinismo**: Misma entrada → misma salida

### Nice-to-Have
1. Visualización del grafo
2. Predicción de impacto en tests
3. Aprendizaje de bugs pasados
4. Priorización de riesgos

---

## La Solución: Memoria Externa Persistente

OmnySys actúa como **memoria externa persistente** que:

1. **Pre-construye** el contexto completo del proyecto (100% estático)
2. **Detecta** conexiones estáticas + semánticas (AST + regex)
3. **Inyecta** el contexto relevante cuando la IA va a editar (MCP tools)
4. **Aprende** del historial de cambios (SQLite + event sourcing)

**Arquitectura**:
- **Layer A**: Análisis estático veloz (determinístico, SIN LLM)
- **Layer B**: Detección semántica (regex + pattern matching, SIN LLM)
- **Layer C**: Memoria persistente + exposición MCP (SQLite + 29 tools)

**Estado actual**: v0.9.61 - 100% estático, 0% LLM.

---

## Métricas de Éxito

**Objetivo**: Reducir bugs colaterales en 80%+

**KPIs**:
- Bugs colaterales por modificación compleja
- Tiempo de debugging post-implementación
- Archivos que IA considera vs necesita considerar
- Proyectos que pueden seguir creciendo

**Resultados actuales (v0.9.434)**:
- ✅ 14,241 funciones analizadas con 66 campos de metadata
- ✅ 45 MCP tools disponibles para IAs
- ✅ 11,202 relaciones en grafo de llamadas
- ✅ 0% LLM - 100% determinístico

---

## Conclusión

El problema de visión de túnel no es un "bug" de los modelos, es una **limitación arquitectural** de cómo trabajan con código modular.

**La única solución es una memoria externa** que mantenga el contexto completo y lo inyecte proactivamente.

**OmnySys es esa memoria externa.**

**IMPORTANTE**: OmnySys **NO USA LLM** para el análisis. Todo es estático, determinístico y predecible.

---

## Siguiente Paso

👉 [La Filosofía de OmnySys](./philosophy.md) - Cómo modelamos el software como sistema físico

👉 [Los 4 Pilares](./principles.md) - Principios fundamentales del diseño

👉 [DATA_FLOW.md](../02-architecture/DATA_FLOW.md) - Flujo de datos detallado

---

**Última actualización**: 2026-04-09 (v0.9.434)
**Estado**: ✅ 100% Estático, 0% LLM
