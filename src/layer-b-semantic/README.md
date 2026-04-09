# Capa B: Enlazador Semántico

## Responsabilidad

Detectar conexiones entre archivos que el análisis estático simple no puede ver, usando pattern matching y álgebra de grafos.

Esta capa complementa la Capa A añadiendo "consciencia semántica".

**IMPORTANTE**: 100% estático, 0% LLM. Todo se detecta con reglas determinísticas.

---

## Tipos de Conexiones a Detectar

### 1. Estado Compartido
**Patrón**: Múltiples archivos leen/escriben el mismo objeto

```javascript
// store.js
export const state = { user: null };

// auth.js
state.user = { id: 1 }; // Escribe

// profile.js
console.log(state.user); // Lee
```

**Detección**:
- Identificar objetos exportados mutables
- Rastrear archivos que importan ese objeto
- Marcar como "conectados por estado compartido"

---

### 2. Sistema de Eventos
**Patrón**: Emisor y listeners sin import directo

```javascript
// button.js
eventBus.emit('click', data);

// analytics.js
eventBus.on('click', handler);
```

**Detección**:
- Pattern matching: `emit`, `on`, `addEventListener`, `dispatch`
- Extraer nombres de eventos (strings literales)
- Agrupar archivos por eventos compartidos

---

### 3. Side Effects (Storage)
**Patrón**: Comunicación vía localStorage, sessionStorage

```javascript
// writer.js
localStorage.setItem('token', value);

// reader.js
const token = localStorage.getItem('token');
```

**Detección**:
- Buscar patrones: `localStorage.setItem/getItem`
- Extraer keys usadas
- Conectar writers y readers del mismo key

---

### 4. Configuración Global
**Patrón**: Constantes de config usadas en múltiples lugares

```javascript
// config.js
export const DEBUG = true;

// logger.js
if (DEBUG) console.log(...);
```

**Detección**:
- Identificar archivos de configuración
- Rastrear usos de esas constantes
- Marcar dependencias "de configuración"

---

### 5. Archivos Desconectados (Shaders, CSS)
**Patrón**: JS que configura un shader GLSL sin import

```javascript
// renderer.js
gl.uniform1f(location, 'u_zoom', zoom);

// shader.glsl
uniform float u_zoom;
```

**Detección**:
- Buscar strings que coincidan con nombres en shaders
- Pattern matching: `uniform`, `attribute`, `varying`
- Conectar JS ↔ GLSL por nombres compartidos

---

## Componentes a Implementar

### 1. `pattern-matchers.js`
**Propósito**: Detectores heurísticos para patrones comunes

**Funcionalidad**:
- `detectEventUsage()` - encuentra .emit() y .on()
- `detectStorageUsage()` - encuentra localStorage/sessionStorage
- `detectGlobalState()` - encuentra mutaciones de objetos importados
- `detectShaderUniforms()` - encuentra uniforms en GLSL y JS

**API**:
```javascript
function detectPatterns(code, filePath) {
  return {
    events: { emits: string[], listens: string[] },
    storage: { reads: string[], writes: string[] },
    globalMutations: string[],
    shaderUniforms: string[]
  };
}
```

**Stack Técnico**:
- Regex para patrones simples
- AST traversal para casos complejos

---

### 2. `llm-analyzer.js`
**Propósito**: Usar IA local para análisis semántico profundo

**Funcionalidad**:
- Analizar código con modelo local (Qwen2.5-Coder-7B)
- Hacer preguntas sobre conexiones no obvias
- Generar metadata semántica

**Prompt Template**:
```
Analiza este archivo y determina:
1. ¿Modifica algún estado global?
2. ¿Emite o escucha eventos?
3. ¿Lee/escribe en localStorage?
4. ¿Qué otros archivos del proyecto podrían verse afectados si modifico este?

Archivo: {filePath}
Código: {code}
Contexto: {systemMap}

Responde en JSON:
{
  "sharedState": ["store.userState"],
  "events": { "emits": ["user:login"], "listens": ["app:ready"] },
  "sideEffects": ["localStorage.token"],
  "affectedFiles": ["Dashboard.js", "AuthService.js"],
  "reasoning": "Explica por qué están conectados"
}
```

**Stack Técnico**:
- Ollama para ejecutar modelos locales
- Qwen2.5-Coder-7B (modelo pequeño y rápido)
- JSON parsing de respuestas

---

### 3. `enricher.js`
**Propósito**: Combinar resultados de pattern-matchers + LLM + Capa A

**Funcionalidad**:
- Tomar `system-map.json` (Capa A)
- Añadir metadata semántica de pattern-matchers
- Añadir insights de LLM
- Generar `enhanced-system-map.json`

**API**:
```javascript
async function enrichGraph(staticGraph, projectPath) {
  // 1. Para cada archivo, ejecutar pattern matchers
  // 2. Para archivos críticos, ejecutar LLM
  // 3. Combinar resultados
  // 4. Retornar enhanced graph
}
```

**Output**:
```typescript
interface EnhancedFileNode extends FileNode {
  semanticConnections: {
    sharedState: string[];
    events: { emits: string[]; listens: string[] };
    storage: { reads: string[]; writes: string[] };
  };
  affectedBy: string[]; // Archivos que afectan a este
  affects: string[];    // Archivos que este afecta
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;    // Por qué está conectado (del LLM)
}
```

---

### 4. `connection-inference.js`
**Propósito**: Inferir conexiones a partir de patterns detectados

**Funcionalidad**:
- Si fileA emite evento 'X' y fileB escucha 'X' → conectarlos
- Si fileA escribe key 'token' y fileB lee 'token' → conectarlos
- Si fileA y fileB ambos modifican state.user → conectarlos

**Algoritmo**:
```javascript
function inferConnections(patterns) {
  const connections = [];

  // Conectar por eventos
  for (const emitter of findEmitters('click')) {
    for (const listener of findListeners('click')) {
      connections.push({
        from: emitter,
        to: listener,
        type: 'event',
        event: 'click'
      });
    }
  }

  // Conectar por storage
  // Conectar por estado
  // ...

  return connections;
}
```

---

## Estrategia de Implementación

### Fase 1: Pattern Matchers (Sin IA)
**Objetivo**: Detectar patrones sin usar LLM

**Implementar**:
1. Detector de eventos (emit/on)
2. Detector de localStorage
3. Detector de estado mutable

**Validar con**: `test-cases/scenario-2-shared-state/`, `scenario-3-event-system/`

---

## Responsabilidad

Detectar conexiones semánticas profundas y razonar sobre el comportamiento del código usando modelos de lenguaje (LLM) e inferencia avanzada.

**Evolución (v0.9.70)**: Los patrones básicos de estado compartido y eventos (anteriormente detectados aquí vía regex) han sido migrados a la **Layer A (Static)** mediante el extractor mandatorio de **Tree-sitter**, garantizando precisión determinista.

La Layer B ahora se enfoca en:
1. **Orquestación LLM**: Decidir cuándo un archivo requiere análisis por inteligencia artificial.
2. **Inferencia de Relaciones**: Conectar átomos basados en dominios semánticos y propósitos.
3. **Análisis de Intención**: Entender el "por qué" detrás de las conexiones técnicas.

---

## Tipos de Conexiones Semánticas

### 1. Inferencia de Relaciones (v2)
**Patrón**: Átomos que operan sobre el mismo dominio semántico aunque no compartan variables técnicas.

**Detección**:
- Análisis de `semanticDomain` extraído en Layer A.
- Uso de LLM para mapear intenciones compartidas.

### 2. Razonamiento sobre Effectos Secundarios
**Patrón**: Entender el impacto real de un `sharedStateAccess` detectado estáticamente.

**Análisis**:
- El LLM evalúa si un acceso a estado global es una lectura segura o una mutación crítica con riesgo de race condition.

---

## Componentes

### 1. `llm-analyzer.js`
**Propósito**: Interfaz con el servidor de IA local (LFM/Qwen).

### 2. `semantic-enricher.js`
**Propósito**: Orquestar el enriquecimiento de los átomos guardados en SQLite con insights semánticos.

### 3. `atom-decider`
**Propósito**: Motor de reglas para filtrar qué átomos necesitan pasar por el LLM (ahorro de tokens y tiempo).

---

## Flujo de Trabajo Moderno

```
SQLite (Static Atoms) → Semantic Decider → LLM Inference → SQLite (Semantic Update)
```

**Beneficio**: No regeneramos el grafo; lo "enriquecemos" aumentando la metadata de los átomos ya persistidos por la Layer A.

---

### Fase 2: LLM Local (Opcional)
**Objetivo**: Añadir inteligencia para casos complejos

**Consideraciones**:
- ¿Vale la pena el costo computacional?
- ¿Qwen2.5-Coder-7B es suficientemente bueno?
- ¿Alternativa: GPT-4o-mini vía API?

**Decisión**: Implementar solo si pattern matchers no son suficientes

---

### Fase 3: Enriquecimiento
**Objetivo**: Combinar Capa A + Capa B

**Output**: `enhanced-system-map.json` listo para Capa C

---

## Casos de Prueba

**Validar con**:
- `test-cases/scenario-2-shared-state/` - Estado compartido
- `test-cases/scenario-3-event-system/` - Eventos
- `test-cases/scenario-4-side-effect/` - localStorage
- `test-cases/scenario-5-disconnected-shader/` - Shaders

**Criterio de éxito**:
- Detecta conexiones que Capa A no ve
- Tasa de falsos positivos < 10%
- Tasa de falsos negativos < 5%

---

## Limitaciones

**Lo que la Capa B NO puede hacer perfectamente**:

1. **Código dinámico extremo**: `eval()`, `new Function()`
2. **Lógica de negocio difusa**: "Esta función afecta indirectamente a aquella por razones de negocio"
3. **Dependencias externas**: APIs, bases de datos

**Solución**: Advertir al usuario que hay incertidumbre

---

## Performance

**Objetivo**: Analizar 100 archivos en < 30 segundos (sin LLM)

**Optimizaciones**:
- Pattern matching primero (rápido)
- LLM solo para casos ambiguos (lento)
- Caché de resultados de LLM

---

## Configuración del LLM

### Implementación Actual ✅

**llama-server (Local - Implementado)**
- Servidor local con LFM2.5-1.2B-Instruct
- Binarios optimizados con Vulkan (GPU) y CPU
- Continuous batching para paralelismo
- Ver [src/ai/README.md](../ai/README.md) para setup completo

**Configuración**:
```bash
# Iniciar servidor
OmnySys ai start gpu

# Habilitar en config
# Editar src/ai/ai-config.json: "enabled": true

# Analizar con LLM
OmnySys analyze /path/to/project
```

### Alternativas (No implementadas)

**Opción A: Ollama (Local)**
```bash
ollama pull qwen2.5-coder:7b
ollama run qwen2.5-coder:7b
```

**Opción B: OpenAI API (Cloud)**
```javascript
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: prompt }]
});
```

---

## Estado de Implementación

### ✅ Implementado

1. **pattern-matchers.js** - Detección estática de patrones (eventos, storage, CSS)
2. **llm-analyzer.js** - Wrapper para análisis LLM local
3. **semantic-enricher.js** - Orquestador static + LLM
4. **schema-validator.js** - Validación de resultados
5. **Integración con indexer.js** - Pipeline completo

### ⏭️ Pendiente (Opcional)

1. **connection-inference.js** - Inferencia avanzada de conexiones
   - Actualmente se hace en shared-state-detector y event-pattern-detector
2. **Fallback a OpenAI API** - Si servidor local falla
3. **Caché de resultados LLM** - Para evitar re-análisis

---

## Uso

### Análisis Básico (Solo Static)

```bash
# LLM deshabilitado por defecto
OmnySys analyze /path/to/project
```

Usa solo:
- Pattern matching (regex)
- AST traversal
- Heurísticas estáticas

**Ventajas**: Instantáneo, zero costo
**Limitaciones**: No detecta indirección ni código dinámico

### Análisis Avanzado (Static + LLM)

```bash
# 1. Habilitar LLM en config
# Editar src/ai/ai-config.json: "enabled": true

# 2. Iniciar servidor
OmnySys ai start gpu

# 3. Analizar
OmnySys analyze /path/to/project
```

Output:
```
🤖 LLM enrichment phase...
📊 Analyzing 12 complex files with LLM...
✓ Enhanced 10/12 files with LLM insights
```

**Ventajas**: Detecta casos complejos, indirección, razonamiento contextual
**Limitaciones**: Más lento (200-500ms por archivo), requiere recursos

### ¿Cuándo Usar LLM?

LLM se activa automáticamente solo para:
1. **Código dinámico**: `window[prop] = value`, `eval()`
2. **Baja confianza**: Patrones ambiguos detectados por static
3. **Complejidad alta**: >3 eventos, >3 shared state writes

Configurar en `src/ai/ai-config.json`:
```json
{
  "analysis": {
    "llmOnlyForComplex": true,  // Solo casos complejos
    "complexityThreshold": 0.7,
    "confidenceThreshold": 0.8
  }
}
```

---

## Siguientes Pasos

1. ✅ Validar con test-cases existentes
2. ✅ Transferir archivos de Giteach (binarios + modelo)
3. ⏭️ Crear test-cases específicos para LLM (código dinámico, indirección)
4. ⏭️ Benchmark de performance (GPU vs CPU)
5. ⏭️ Fine-tuning de prompts para mejor precisión

---

## Referencias

- [src/ai/README.md](../ai/README.md) - Setup completo de AI
- [../ai/llm-client.js](../ai/llm-client.js) - Cliente HTTP
- [llm-analyzer.js](llm-analyzer.js) - Implementación del analyzer
- [semantic-enricher.js](semantic-enricher.js) - Orquestador
- [docs/ai_architecture/AI_SETUP_GUIDE.md](../../docs/ai_architecture/AI_SETUP_GUIDE.md) - Arquitectura Vulkan
