# Análisis Detallado del Problema: Visión de Túnel en IAs

## Resumen Ejecutivo

Las IAs que trabajan con código sufren de un problema fundamental: **visión de túnel**. Cuando se enfocan en editar un archivo o función, pierden el contexto del sistema completo, causando bugs colaterales que pueden tomar días en debuggear.

Este problema es especialmente grave en proyectos modulares con muchos archivos pequeños, creando un callejón sin salida donde el desarrollador debe elegir entre:
- Monolitos inmanejables para IAs pequeñas
- Módulos limpios pero con conexiones invisibles

---

## El Problema en Detalle

### Síntoma Principal: Bugs Colaterales Recurrentes

**Definición**: Modificaciones que funcionan correctamente en el archivo editado, pero rompen funcionalidad en otros archivos no considerados.

**Frecuencia**: Ocurre constantemente, especialmente con modelos más pequeños, pero incluso modelos grandes (GPT-4, Claude Sonnet) fallan cuando:
- La tarea es compleja y multi-archivo
- Hay funciones creadas antes de la compactación de contexto
- El proyecto tiene alta modularidad

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

---

## Causas Raíz

### 1. Límite de Contexto

**Problema**:
- Las IAs tienen un límite de tokens (incluso con contexto largo)
- No pueden mantener 50+ archivos en memoria simultáneamente
- Deben elegir qué leer, y eligen basado en lo que parece más relevante

**Consecuencia**:
- Se enfocan en el archivo que editarán
- Ignoran archivos que "no parecen relacionados" pero sí lo están

### 2. Conexiones Implícitas

**Tipos de conexiones que las IAs no ven**:

#### a) Estado Compartido
```javascript
// store.js
export const state = { camera: { x: 0, y: 0, zoom: 1 } };

// CameraController.js
state.camera.zoom = 2; // IA sabe que esto modifica el estado

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

#### c) Configuración Global
```javascript
// config.js
export const ENABLE_ADVANCED_CULLING = true;

// Renderer.js
if (ENABLE_ADVANCED_CULLING) { /* usa camera.zoom */ }
```

#### d) Side Effects
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

### 3. Análisis Estático Insuficiente

**Lo que los imports NO revelan**:

```javascript
// CameraState.js
export class CameraState { /* ... */ }

// RenderEngine.js
import { CameraState } from './CameraState';
// La IA ve que RenderEngine depende de CameraState

// Shader.glsl (en carpeta separada)
uniform float u_zoom; // La IA NO ve que esto depende de CameraState
```

**Archivos "invisibles"**:
- Shaders (`.glsl`, `.vert`, `.frag`)
- CSS que depende de clases JS
- HTML templates
- Archivos de configuración (`.json`, `.yaml`)

### 4. Modularidad como Arma de Doble Filo

#### El Dilema

**Opción A: Archivos Grandes (Monolíticos)**
- **Ventaja**: Todo el contexto en un lugar
- **Desventaja**: IAs pequeñas no pueden regenerar 400+ líneas sin romper sintaxis
- **Problema real**: Claude Code (modelos pequeños) frecuentemente rompen archivos al regenerar

**Opción B: Archivos Pequeños (Modulares)**
- **Ventaja**: Fácil de regenerar (50-100 líneas)
- **Desventaja**: Conexiones entre archivos se vuelven invisibles
- **Problema real**: Visión de túnel causa bugs colaterales

**Resultado**: **Proyectos bloqueados que no pueden crecer.**

---

## Impacto Medido

### Cuantificación del Problema

**En un proyecto típico de 50 archivos modulares:**

| Tipo de Modificación | Archivos que IA lee | Archivos realmente afectados | Bugs colaterales promedio |
|---------------------|---------------------|------------------------------|---------------------------|
| Función simple | 1-2 | 1-2 | 0 |
| Sistema complejo (cámara, estado) | 2-4 | 5-8 | 2-4 |
| Refactoring | 3-5 | 10-15 | 5+ |

**Tiempo de debugging por bug colateral**: 2-6 horas (buscar la aguja en el pajar)

**Proyectos afectados**: Proyectos parados porque el usuario no puede hacer crecer el código sin bugs recurrentes.

### Casos de Uso Críticos

1. **Modificar sistema central** (estado, cámara, input)
   - Afecta 10+ archivos
   - IA solo considera 2-3
   - Resultado: Cascada de bugs

2. **Refactoring de arquitectura**
   - Cambiar nombres de funciones
   - Mover archivos
   - IA pierde referencias cruzadas

3. **Añadir feature que cruza capas**
   - UI → Lógica → Backend
   - IA se enfoca en una capa
   - Olvida actualizar las otras

---

## Por Qué Soluciones Actuales Fallan

### 1. "Lee más archivos manualmente"

**Problema**:
- El humano no siempre sabe qué archivos leer
- Si supiéramos, no necesitaríamos la IA
- Proceso tedioso y propenso a errores

### 2. "Usa mejores prompts"

**Problema**:
- No hay prompt que le diga a la IA sobre conexiones que no ve
- "Revisa todos los archivos relacionados" es demasiado vago
- La IA no sabe cuáles son "todos"

### 3. Herramientas de Análisis Estático Existentes

**Ejemplos**: ESLint, TypeScript, Dependency Cruiser

**Limitaciones**:
- Solo ven imports directos
- No detectan estado compartido, eventos, side effects
- No se integran con el workflow de IA

### 4. Servidores MCP Actuales

**Ejemplos**: `code-graph-rag-mcp`, `CodeGraphContext`

**Limitaciones**:
- Solo análisis estático (sin IA semántica)
- Análisis on-demand (lento)
- No detectan desconexiones (shaders, CSS, eventos)

---

## Requisitos para una Solución Real

### Must-Have

1. **Velocidad**: Respuesta instantánea cuando la IA va a editar
2. **Precisión**: Detectar conexiones directas + semánticas
3. **Automatización**: No requerir intervención manual
4. **Integración**: Funcionar dentro del workflow de la IA

### Nice-to-Have

1. **Visualización**: Mostrar el grafo de dependencias
2. **Predicción de Impacto**: "Este cambio afectará 5 tests"
3. **Histórico**: Aprender de bugs pasados
4. **Priorización**: "Este archivo es crítico, 15 módulos dependen de él"

---

## Propuesta de Solución: CogniSystem

Ver [../ARCHITECTURE.md](../ARCHITECTURE.md) para el diseño técnico completo.

**Resumen**:
- **Capa A**: Análisis estático veloz (imports, llamadas)
- **Capa B**: IA local encuentra conexiones semánticas
- **Capa C**: Memoria persistente que se activa automáticamente

**Diferenciador clave**: Combinación de velocidad (pre-construido) + inteligencia (IA semántica) + automatización (hooks de pre-edición).

---

## Casos de Prueba para Validar la Solución

### Caso 1: Modificación de Estado Central
**Setup**: Sistema con estado compartido en `store.js`, usado por 5 archivos
**Acción**: IA modifica estructura del estado
**Resultado esperado**: CogniSystem advierte de los 5 archivos afectados
**Resultado sin CogniSystem**: IA solo actualiza 1-2 archivos, rompe 3

### Caso 2: Sistema de Eventos
**Setup**: Botón que emite evento, 3 listeners en archivos diferentes
**Acción**: IA cambia el nombre del evento
**Resultado esperado**: CogniSystem identifica los 3 listeners
**Resultado sin CogniSystem**: IA cambia el nombre solo en el emisor

### Caso 3: Dependencia de Shader
**Setup**: Shader que usa uniform alimentado por JS
**Acción**: IA cambia el nombre de la variable en JS
**Resultado esperado**: CogniSystem detecta que el shader también debe cambiar
**Resultado sin CogniSystem**: Shader roto (error en runtime)

---

## Métricas de Éxito

**Objetivo**: Reducir bugs colaterales en 80%+

**KPIs**:
- Número de bugs colaterales por modificación compleja
- Tiempo de debugging post-implementación
- Cantidad de archivos que la IA considera vs necesita considerar
- Proyectos que pueden seguir creciendo sin bloquearse

---

## Conclusión

El problema de visión de túnel en IAs no es un "bug" de los modelos, es una **limitación arquitectural** de cómo trabajan con código modular. La única solución es una **memoria externa** que mantenga el contexto completo y lo inyecte proactivamente.

CogniSystem es esa memoria externa.
