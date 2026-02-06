# Guia de Modelos IA - OmnySys

**Version:** 1.0
**Target Models:** Liquid Foundation Models 2.5 (LFM2.5-1.2B)
**Runtime:** llama.cpp (llama-server)

---

## 1. Modelos Disponibles

### Tabla Comparativa de Variantes LFM2.5

| Variante | Parametros | Recomendacion | Caso de Uso Principal | Notas |
|----------|-----------|---------------|----------------------|-------|
| **LFM2.5-1.2B-Instruct** | 1.17B | **RECOMENDADO** | Instruction following, tool use, JSON estructurado, code analysis | IFEval: 86.23. No excluye tareas de programacion. Respuestas cortas = inferencia rapida. |
| **LFM2.5-1.2B-Thinking** | 1.17B | NO recomendado para codigo | Agentic tasks, razonamiento estructurado, data extraction | IFEval: 88.42, MATH-500: 87.96. Explicitamente NO recomendado para programacion. Cadenas de razonamiento largas = inferencia lenta. |
| **LFM2-1.2B-Extract** | 1.2B | Especializado (extraccion) | Extraccion estructurada (JSON, XML, YAML, CSV) de documentos no estructurados | Single-turn only. Nivel GPT-4o en extraccion, 160x mas pequeno. Soporta 9 idiomas. ~700 tok/s. |

### Caracteristicas Clave de la Arquitectura LFM2

- **Hybrid Liquid-Transformer**: 10 double-gated LIV convolution blocks + 6 Grouped Query Attention (GQA) layers.
- **Low Memory Footprint**: <2GB en Q4_0. Optimizado para ejecucion local (consumer GPUs / CPU).
- **Recurrent State**: Mantiene estructura en contextos largos (previene "lost brackets" en JSON).
- **High Speed**: Inferencia extremadamente rapida, ideal para agentes en tiempo real. 239 tok/s en CPU AMD.
- **Context Window**: 32,768 tokens.
- **Idiomas soportados**: EN, ES, ZH, DE, AR, JA, KO, FR.

### Conclusion: Usar LFM2.5-1.2B-Instruct

Para code analysis + structured JSON extraction, **Instruct** es la eleccion correcta. Usar **Extract** solo para tareas de extraccion pura single-turn.

### Limitaciones Comunes (Ambas Variantes)

| Limitacion | Mitigacion |
|-----------|-----------|
| Pocos parametros (1.2B) | Evitar razonamiento deductivo complejo. Usar "Step-by-Step" prompting. |
| Tendencia a copiar few-shot examples | Usar Evidence-First prompting (ver Seccion 3). |
| Compute Bound en Prefill | Alta latencia en prompts grandes si no se usa batching correctamente (ver Seccion 4). |

---

## 2. Setup y Configuracion

### Comando de Lanzamiento GPU (Port 8000)

```batch
server\llama-server.exe --model "%MODEL_PATH%" ^
    --port 8000 --host 127.0.0.1 ^
    --n-gpu-layers 999 ^
    --ctx-size 32768 --parallel 4 ^
    --cache-type-k q8_0 --cache-type-v q8_0 ^
    --flash-attn ^
    -cb --chat-template chatml
```

### Comando de Lanzamiento CPU (Port 8002)

```batch
server\llama-server.exe --model "%MODEL_PATH%" ^
    --port 8002 --host 127.0.0.1 ^
    -ngl 0 ^
    --ctx-size 24576 --parallel 3 ^
    --threads 4 --batch-size 512 ^
    --cache-type-k q8_0 --cache-type-v q8_0 ^
    -cb --chat-template chatml ^
    --log-file logs\ai_mapper_cpu.log
```

### Explicacion de Flags

| Flag | Descripcion |
|------|------------|
| `--n-gpu-layers 999` | Offload todas las capas a GPU. |
| `-ngl 0` | Forzar modo CPU-only (sin GPU offloading). |
| `--ctx-size N` | Contexto TOTAL dividido entre `--parallel` slots. Ver formula en Seccion 4. |
| `--parallel N` | Numero de slots concurrentes. GPU: 4, CPU: 3. |
| `-cb` | **Continuous Batching**. Critico para paralelismo real (ver Seccion 4). |
| `--cache-type-k q8_0` | Cuantizacion KV cache. Reduce memoria ~50% con perdida minima. |
| `--flash-attn` | Flash Attention (GPU only). Reduce memoria y acelera 10-20%. |
| `--chat-template chatml` | Formato ChatML requerido por LFM2.5. |
| `--threads N` | Cores fisicos (no hyperthreads). Evita context-switching overhead. |
| `--batch-size 512` | Batches pequenos para CPU. Reduce peak memory y previene OOM. |
| `--json-schema-file` | Schema enforcement. Solo funciona en CLI mode, NO en HTTP server mode. |

### Configuracion de Parametros de Generacion

```json
{
  "temperature": 0.0,
  "max_tokens": 1000,
  "stream": false
}
```

**temperature = 0.0** (greedy decoding) es obligatorio para extraccion deterministica de JSON.

---

## 3. Prompting

### 3.1 Formato ChatML

LFM2.5 usa formato ChatML. Siempre estructurar los prompts asi:

```
<|startoftext|><|im_start|>system
[System prompt con schema JSON y cognitive vaccines]<|im_end|>
<|im_start|>user
[Input document/code]<|im_end|>
<|im_start|>assistant
```

En codigo JavaScript:

```javascript
systemPrompt: `<|im_start|>system
You are a specialized data extractor. Return ONLY valid JSON.

Schema (root object, NO wrappers):
{
  "field1": "type",
  "field2": ["string"],
  "confidence": 0.0-1.0,
  "reasoning": "string"
}

Instructions:
- NO wrappers, return root object directly
- Use empty arrays [] if nothing found
<|im_end|>`

userPrompt: `<|im_start|>user
FILE: {filePath}
CODE:
{fileContent}

Extract data following schema.<|im_end|>
<|im_start|>assistant`
```

### 3.2 Schema en System Prompt

Siempre incluir el JSON schema completo en el system prompt. LFM2.5 performa mejor con schemas en el system prompt que dependiendo de `response_format` solo.

**IMPORTANTE**: `response_format` en llama.cpp HTTP API tiene problemas conocidos ([Issue #19051](https://github.com/ggml-org/llama.cpp/issues/19051)). Si grammar parsing falla, el servidor continua sin restricciones. Solucion: system prompts fuertes + validacion client-side.

Mal (sin schema):
```
System: Extract localStorage keys from the code.
```

Bien (con schema):
```
System: Extract localStorage keys and return as JSON:
{
  "localStorage_keys": ["string"],
  "connections": [{"source": "string", "target": "string", "key": "string"}]
}
```

### 3.3 Cognitive Vaccines (Anti-Hallucination)

Negar explicitamente trampas semanticas comunes en el system prompt:

```
- "Godot is NOT Go" (Desambiguacion)
- "Config != Skill" (Correccion de juicio de valor)
- "Markdown describes, DOES NOT implement" (Correccion ontologica)
- NEVER invent file names. Use ONLY files mentioned in context.
- DO NOT assume connections.
- COPY exact string literals.
- If not found, return empty arrays [].
```

### 3.4 Evidence-First Prompting (Anti-Echo)

Problema: Con few-shot examples, LFM2 tiende a copiar outputs de ejemplo en vez de analizar el input real ("echo pollution").

Solucion: Forzar extraccion de evidencia ANTES de clasificacion:

```
STEP 1: Extract the most important function/class/variable from the code.
STEP 2: Based on that evidence, classify the domain.

OUTPUT FORMAT:
[DOMAIN] Description | Evidence: <paste_actual_code_fragment>

IMPORTANT:
- Evidence MUST be copied from the actual code shown below.
- Never invent function names.
```

Funciona porque el proceso step-by-step crea un "cognitive checkpoint" -- el modelo no puede clasificar sin primero leer el codigo.

### 3.5 Estrategia "Cage" (Context Isolation)

Para prevenir que el modelo confunda contexto con contenido target:

```xml
<project_context>
  <!-- Background info only. NEVER describe this as current. -->
</project_context>

<target_file>
  <!-- The ONLY thing to analyze. -->
</target_file>
```

### 3.6 Estructura de Template Estandar

```javascript
export default {
  systemPrompt: `<|im_start|>system
You are a specialized data extractor. Return ONLY valid JSON.

Schema (root object, NO wrappers):
{
  "confidence": 0.0-1.0,
  "tipoEspecifico": "valor",
  "arrayDatos": ["string"],
  "reasoning": "string"
}

Instructions:
- confidence: certainty 0.0-1.0
- tipoEspecifico: description
- arrayDatos: extract from code
- reasoning: 1 sentence explanation
- NO wrappers, return root object
<|im_end|>`,

  userPrompt: `<|im_start|>user
FILE: {filePath}
METADATA: {valor1}, {valor2}

CODE:
{fileContent}

Extract data following schema.<|im_end|>
<|im_start|>assistant`
};
```

Templates van en `prompt-templates/<tipo>.js` y se registran en `prompt-selector.js` / `getTemplate()`.

### 3.7 Verificacion Client-Side (Spread Operator)

**El BUG mas comun**: El cliente LLM filtra campos de la respuesta JSON.

```javascript
// INCORRECTO - Filtra campos silenciosamente
return {
  sharedState: parsed.sharedState || [],
  events: parsed.events || [],
  confidence: parsed.confidence
  // Faltan: responsibilities, riskLevel, etc.
};

// CORRECTO - Preservar TODOS los campos
return {
  ...parsed,  // Spread operator preserva todos los campos
  confidence: parsed.confidence || 0.5,
  reasoning: parsed.reasoning || 'No reasoning provided'
};
```

**Regla**: El cliente LLM (`llm-client.js`) SIEMPRE debe usar `...parsed` para no perder campos.

---

## 4. Optimizacion

### 4.1 Continuous Batching (`-cb`)

Sin `-cb`, el GPU procesa Request A completamente, luego Request B. Los workers reportan alta latencia (ej. 82s) cuando el modelo es rapido (16s) -- el tiempo extra es "Queue Wait Time".

Con `-cb`, el servidor intercala tokens de multiples requests dinamicamente. Throughput aumenta dramaticamente.

**Siempre usar `-cb`** en ambos servidores (GPU y CPU).

### 4.2 Formula de Context Size

**`--ctx-size` es el contexto TOTAL, dividido entre `--parallel` slots.**

```
Effective Context Per Slot = --ctx-size / --parallel
```

| Config | Total Context | Parallel Slots | Per-Slot Context |
|--------|---------------|----------------|------------------|
| GPU (8GB VRAM) | 49152 | 4 | **12288** tokens |
| GPU (optimizado) | 32768 | 4 | **8192** tokens |
| CPU (16GB RAM) | 65536 | 4 | **16384** tokens |
| CPU (optimizado) | 24576 | 3 | **8192** tokens |

**ADVERTENCIA**: Si los prompts exceden el per-slot context, seran truncados silenciosamente.

### 4.3 KV Cache Quantization

| Cache Type | Uso de Memoria | Impacto en Calidad |
|------------|---------------|-------------------|
| `f16` (default) | 100% | Mejor |
| `q8_0` | ~50% | Perdida minima |
| `q4_0` | ~25% | Perdida menor |

**Recomendacion**: Usar `q8_0` para GPU y CPU. Maximiza slots sin degradacion de calidad.

Flags: `--cache-type-k q8_0 --cache-type-v q8_0`

### 4.4 Flash Attention (`--flash-attn`)

Optimizacion GPU-only:
- Reduce uso de memoria durante attention computation.
- Acelera inferencia 10-20%.
- Requerido para context windows grandes.

### 4.5 Estabilidad en CPU

Problemas comunes y soluciones:

**10-Minute Network Timeout (fetch failed)**:
- Causa: Windows HTTP client tiene timeout default de 10 minutos. Si el servidor esta procesando y no responde, la conexion muere.
- Fix: `CPUSlotManager` para limitar requests concurrentes. `AIConnectionKeepAlive` hace ping a `/health` cada 30 segundos.

**Memory Fragmentation**:
- Causa: Inferencia prolongada fragmenta heap memory.
- Fix: `--batch-size 512` para reducir peak allocation. Considerar restarts periodicos del servidor.

**Thread Contention**:
- Causa: Demasiados threads compiten por CPU.
- Fix: `--threads` = physical core count (no logical/hyperthreading).

### 4.6 Estrategias de Paralelismo

**"Quality First" Concurrency Strategy**: Priorizar parallel workers sobre batch size.

| Estrategia | Config | Pros | Contras |
|-----------|--------|------|---------|
| High Batching | `parallel 1`, `batchSize 5` | Menos HTTP requests | Menor calidad (context dilution), feedback loop lento |
| **High Concurrency** | `parallel 4`, `batchSize 1` | **Maxima calidad** (contexto dedicado), 2x throughput | Requiere `-cb` |

**Recomendacion**: Mantener `batchSize = 1` en `AIWorkerPool.js` y dejar que Continuous Batching del GPU maneje el paralelismo.

### 4.7 Limites de Parallel Slots

| Slots | Comportamiento KV Cache | Recomendacion |
|-------|------------------------|--------------|
| 1-4 | Estable, eficiente | Recomendado |
| 5-8 | KV cache creciente, generacion mas lenta | Monitorear |
| 9+ | Degradacion significativa de performance | Evitar |

### 4.8 Uso de Memoria Bajo Carga Completa

**GPU (8GB VRAM):**
```
Model:          1.25 GB
KV Cache (80K): 4.00 GB (4 slots x 20K cada uno)
Headroom:       ~2.75 GB
STATUS:         SAFE
```

**CPU (16GB RAM):**
```
Model:          1.25 GB
KV Cache (80K): 4.00 GB (4 slots x 20K cada uno)
OS + Apps:      ~8.00 GB
Headroom:       ~2.75 GB
STATUS:         SAFE
```

---

## 5. Troubleshooting

### Arrays vacios en output

**Causa**: Schema no explicito en system prompt o temperature > 0.
**Solucion**:
1. Agregar schema detallado en system prompt.
2. `temperature: 0.0`.
3. Usar `--json-schema-file` si se usa CLI mode.

### JSON malformado

**Causa**: Sin JSON schema enforcement o `response_format` fallo silenciosamente.
**Solucion**: Reforzar schema en system prompt + validacion client-side con `JSON.parse` y fallback. No depender unicamente de server-side grammar.

### Modelo inventa file names

**Causa**: Prompt sin cognitive vaccines.
**Solucion**: Agregar en system prompt:
```
NEVER invent file names. Use ONLY files mentioned in context.
If not found, return empty array.
```

### Cliente filtra campos de la respuesta

**Sintoma**: Datos extraidos correctamente por el modelo pero no guardados.
**Solucion**: Usar `return { ...parsed, ... }` en `llm-client.js` (ver Seccion 3.7).

### Wrapper objects en respuesta

**Sintoma**: `{ "tipo": { "data": ... } }` en vez del root object.
**Solucion**: Cognitive vaccine en system prompt: `"Return root object directly. NO wrappers."`

### Cache corrupta

**Sintoma**: Cambios en prompt no tienen efecto.
**Solucion**: Eliminar `.omnysysdata/unified-cache/`.

### Alta latencia con multiples workers

**Sintoma**: Workers reportan 60-80s latencia cuando el modelo responde en 16s.
**Causa**: Flag `-cb` no esta habilitada. El servidor serializa requests.
**Solucion**: Agregar `-cb` al comando de lanzamiento.

### Windows HTTP Timeout (fetch failed)

**Sintoma**: Requests fallan despues de ~10 minutos en CPU.
**Causa**: Windows HTTP client timeout default.
**Solucion**: Implementar `AIConnectionKeepAlive` con ping a `/health` cada 30s. Usar `CPUSlotManager` para limitar requests concurrentes.

### Context truncado silenciosamente

**Sintoma**: Respuestas incompletas o imprecisas en archivos grandes.
**Causa**: Prompt excede `--ctx-size / --parallel`.
**Solucion**: Verificar per-slot context con la formula. Aumentar `--ctx-size` o reducir `--parallel`.

### Echo pollution (copia few-shot examples)

**Sintoma**: Archivos no relacionados clasificados con nombres de funcion de los ejemplos.
**Causa**: Modelo copia outputs de ejemplo.
**Solucion**: Usar Evidence-First prompting (ver Seccion 3.4). Eliminar few-shot examples.

---

## 6. Referencias

### Modelos y Model Cards
- [LFM2.5-1.2B-Instruct (HuggingFace)](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct)
- [LFM2.5-1.2B-Thinking (HuggingFace)](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Thinking)
- [LFM2-1.2B-Extract (HuggingFace)](https://huggingface.co/LiquidAI/LFM2-1.2B-Extract)
- [LFM2-1.2B-Extract-GGUF](https://huggingface.co/LiquidAI/LFM2-1.2B-Extract-GGUF)

### Documentacion Liquid AI
- [Liquid AI Tool Use Documentation](https://docs.liquid.ai/lfm/key-concepts/tool-use)
- [Liquid AI Blog - Introducing LFM2.5](https://www.liquid.ai/blog/introducing-lfm2-5-the-next-generation-of-on-device-ai)
- [Liquid AI Blog - Liquid Nanos](https://www.liquid.ai/blog/introducing-liquid-nanos-frontier-grade-performance-on-everyday-devices)

### Articulos Tecnicos
- [LFM2.5 Release Article (MarkTechPost)](https://www.marktechpost.com/2026/01/06/liquid-ai-releases-lfm2-5-a-compact-ai-model-family-for-real-on-device-agents/)
- [LFM2.5 Thinking Analysis (Medium)](https://medium.com/@meshuggah22/lfm2-5-1-2b-thinking-liquid-ais-reasoning-model-that-fits-in-your-pocket-12d5e8298cec)
- [JSON Prompting Guide (CodeConductor)](https://codeconductor.ai/blog/structured-prompting-techniques-xml-json/)

### llama.cpp
- [llama.cpp JSON Schema Issue #19051](https://github.com/ggml-org/llama.cpp/issues/19051) - response_format limitations en HTTP server mode
