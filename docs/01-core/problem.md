# El Problema: Visión de Túnel en IAs

**Fecha**: 2026-02-12  
**Estado**: Análisis completo  
**Próximo**: [La Solución (OmnySys)](./philosophy.md)

---

## Resumen Ejecutivo

Las IAs que trabajan con código sufren de un problema fundamental: **visión de túnel**. Cuando se enfocan en editar un archivo o función, pierden el contexto del sistema completo, causando bugs colaterales que pueden tomar días en debuggear.

> *"La IA solo ve el archivo que está editando, no los 15 archivos que dependen de él."*

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

---

### 3. El Dilema de Modularidad

#### Opción A: Archivos Grandes (Monolíticos)
- ✅ Todo el contexto en un lugar
- ❌ IAs pequeñas no pueden regenerar 400+ líneas sin romper sintaxis

#### Opción B: Archivos Pequeños (Modulares)
- ✅ Fácil de regenerar (50-100 líneas)
- ❌ Conexiones entre archivos se vuelven invisibles

**Resultado**: Proyectos bloqueados que no pueden crecer.

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
}
```

---

## Casos de Visión de Túnel (Catálogo)

### ✅ Ya Detectados por OmnySys

| Caso | Ejemplo | Detector |
|------|---------|----------|
| **Imports/Exports** | Renombrar exportación rompe importadores | AST + Grafo |
| **localStorage** | `setItem('token')` ↔ `getItem('auth_token')` | Regex |
| **Eventos** | `emit('userLogin')` vs `on('userLoggedIn')` | Regex |
| **Variables Globales** | `window.eventBus` usado en 5 archivos | Tracking |
| **Web Workers** | Mensajes entre main y worker | postMessage |
| **WebSocket** | Múltiples archivos conectan al mismo WS | URL tracking |
| **API Endpoints** | `fetch('/api/users')` en 3 archivos | URL detection |
| **Dead Code** | Función nunca llamada | Usage analysis |
| **BroadcastChannel** | Canal `'app_sync'` compartido | Constructor tracking |

### 🚧 Pendientes de Alta Prioridad

| Caso | Impacto | Prioridad |
|------|---------|-----------|
| **CSS-in-JS** | Theme, styled-components | P0 |
| **TypeScript Types** | Interfaces, type safety | P0 |
| **Redux/Context** | Selectores, estado global | P0 |
| **GraphQL** | Fragments, queries | P1 |
| **Middleware** | Cadena de procesamiento | P2 |

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

---

## Requisitos para una Solución Real

### Must-Have
1. **Velocidad**: Respuesta instantánea
2. **Precisión**: Conexiones directas + semánticas
3. **Automatización**: Sin intervención manual
4. **Integración**: Dentro del workflow de la IA

### Nice-to-Have
1. Visualización del grafo
2. Predicción de impacto en tests
3. Aprendizaje de bugs pasados
4. Priorización de riesgos

---

## La Solución: Memoria Externa

OmnySys actúa como **memoria externa persistente** que:

1. **Pre-construye** el contexto completo del proyecto
2. **Detecta** conexiones estáticas + semánticas
3. **Inyecta** el contexto relevante cuando la IA va a editar
4. **Aprende** del historial de cambios

**Arquitectura**:
- **Layer A**: Análisis estático veloz (determinístico)
- **Layer B**: IA local encuentra conexiones semánticas
- **Layer C**: Memoria persistente + exposición MCP

---

## Métricas de Éxito

**Objetivo**: Reducir bugs colaterales en 80%+

**KPIs**:
- Bugs colaterales por modificación compleja
- Tiempo de debugging post-implementación
- Archivos que IA considera vs necesita considerar
- Proyectos que pueden seguir creciendo

---

## Conclusión

El problema de visión de túnel no es un "bug" de los modelos, es una **limitación arquitectural** de cómo trabajan con código modular.

**La única solución es una memoria externa** que mantenga el contexto completo y lo inyecte proactivamente.

**OmnySys es esa memoria externa.**

---

## Siguiente Paso

👉 [La Filosofía de OmnySys](./philosophy.md) - Cómo modelamos el software como sistema físico

👉 [Los 4 Pilares](./principles.md) - Principios fundamentales del diseño
