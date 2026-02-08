# Guia de Modelos IA - OmnySys

**Version:** v0.6.0
**Fecha:** 2026-02-08
**Target Models:** Liquid Foundation Models 2.5 (LFM2.5-1.2B)
**Runtime:** llama.cpp (llama-server)

> **Documento unificado.** Consolida la guia de modelos, benchmarks de la evaluacion Semantic Layer,
> y la evaluacion historica de Qwen2.5-Coder. Los documentos originales estan archivados en `docs/archive/`.

---

## Current Production Model: LFM2.5-1.2B-Instruct

**LFM2.5-1.2B-Instruct** es el modelo de produccion de OmnySys para code analysis, JSON extraction, y tool use.

**Por que Instruct y no Thinking:**
- IFEval (instruction following): 86.23% -- suficiente para nuestros prompts estructurados.
- Respuestas cortas = inferencia rapida. Thinking genera cadenas de razonamiento largas que incrementan latencia.
- Thinking esta explicitamente NO recomendado para programacion por Liquid AI.
- En produccion, la velocidad y consistencia de Instruct superan la ventaja teorica de razonamiento de Thinking.
- Liquid AI recomienda Thinking para agentic tasks y razonamiento matematico, no para code analysis con JSON output.

---

## 1. Modelos Disponibles

### Tabla Comparativa de Variantes LFM2.5

| Variante | Parametros | Recomendacion | Caso de Uso Principal | Notas |
|----------|-----------|---------------|----------------------|-------|
| **LFM2.5-1.2B-Instruct** | 1.17B | **PRODUCCION** | Instruction following, tool use, JSON estructurado, code analysis | IFEval: 86.23. Respuestas cortas = inferencia rapida. |
| **LFM2.5-1.2B-Thinking** | 1.17B | Solo evaluacion/research | Agentic tasks, razonamiento estructurado, data extraction | IFEval: 88.42, MATH-500: 87.96. NO recomendado para programacion. Cadenas largas = lento. |
| **LFM2-1.2B-Extract** | 1.2B | Especializado (extraccion) | Extraccion estructurada (JSON, XML, YAML, CSV) de documentos no estructurados | Single-turn only. Nivel GPT-4o en extraccion, 160x mas pequeno. ~700 tok/s. |

### Caracteristicas Clave de la Arquitectura LFM2

- **Hybrid Liquid-Transformer**: 10 double-gated LIV convolution blocks + 6 Grouped Query Attention (GQA) layers.
- **Low Memory Footprint**: <2GB en Q4_0. Optimizado para ejecucion local (consumer GPUs / CPU).
- **Recurrent State**: Mantiene estructura en contextos largos (previene "lost brackets" en JSON).
- **High Speed**: Inferencia extremadamente rapida, ideal para agentes en tiempo real. 239 tok/s en CPU AMD.
- **Context Window**: 32,768 tokens.
- **Idiomas soportados**: EN, ES, ZH, DE, AR, JA, KO, FR.

### Limitaciones Comunes (Ambas Variantes)

| Limitacion | Mitigacion |
|-----------|-----------|
| Pocos parametros (1.2B) | Evitar razonamiento deductivo complejo. Usar "Step-by-Step" prompting. |
| Tendencia a copiar few-shot examples | Usar Evidence-First prompting (ver Seccion 3). |
| Compute Bound en Prefill | Alta latencia en prompts grandes si no se usa batching correctamente (ver Seccion 4). |

---

## 2. Model Comparison & Benchmarks

Datos extraidos de la evaluacion original de la Semantic Layer (archivado en `docs/archive/SEMANTIC_LAYER_MODELS.md`).

### Benchmark Comparativo: LFM2.5 Thinking vs Instruct

| Benchmark | **Thinking** | **Instruct** | Qwen3-1.7B Thinking | Qwen3-1.7B Instruct | Delta Thinking vs Instruct |
|-----------|-------------|-------------|-------------------|---------------------|---------------------------|
| MATH-500 (razonamiento) | 87.96% | 63.20% | 81.92% | 70.40% | +24.76 pts |
| GSM8K (math word problems) | 85.60% | 64.52% | 85.60% | 33.66% | +21.08 pts |
| AIME25 (competencia mat.) | 31.73% | 14.00% | 36.27% | 9.33% | +17.73 pts |
| BFCLv3 (tool use) | 56.97% | 49.12% | 55.41% | 46.30% | +7.85 pts |
| Multi-IF (multi-instruction) | 69.33% | 60.98% | 60.33% | 56.48% | +8.35 pts |
| IFEval (instruction eval) | 88.42% | 86.23% | 71.65% | 73.68% | +2.19 pts |
| IFBench (instruction bench) | 44.85% | 47.33% | 25.88% | 21.33% | -2.48 pts |
| GPQA Diamond (science QA) | 37.86% | 38.89% | 36.93% | 34.85% | -1.03 pts |
| MMLU-Pro (knowledge) | 49.65% | 44.35% | 56.68% | 42.91% | +5.30 pts |

**Fuentes**: [LFM2.5-1.2B-Thinking HF](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Thinking), [LFM2.5-1.2B-Instruct HF](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct)

### Analisis de la Decision de Produccion

Thinking supera a Instruct en razonamiento matematico (+39%) y tool use (+16%). Sin embargo, para el caso de uso de OmnySys (code analysis con JSON output):

1. **Velocidad**: Instruct genera respuestas cortas y directas. Thinking genera thinking traces que multiplican tokens de salida y latencia.
2. **Doom loops**: Thinking tiene 0.36% vs 15.74% de Instruct, pero en produccion esto se mitiga con cognitive vaccines y temperature 0.0.
3. **IFBench**: Instruct es ligeramente mejor (+2.48 pts) en instruction benchmarks practicos.
4. **Programacion**: Liquid AI explicitamente NO recomienda Thinking para programacion.
5. **Estabilidad**: Instruct produce outputs mas predecibles y faciles de parsear como JSON.

**Conclusion**: Los benchmarks de razonamiento favorecen Thinking, pero las necesidades de produccion (velocidad, estabilidad, parseo JSON) favorecen **Instruct**.

### Comparacion con Modelos Externos

| Modelo | Parametros | MATH-500 | BFCLv3 | Memoria | Thinking |
|--------|-----------|----------|---------|---------|----------|
| **LFM2.5-1.2B-Instruct** | 1.2B | 63.20% | 49.12% | <900MB | No |
| LFM2.5-1.2B-Thinking | 1.2B | 87.96% | 56.97% | <900MB | Si |
| Qwen3-1.7B (thinking) | 1.7B | 81.92% | 55.41% | ~1.2GB | Si |
| Qwen2.5-Coder-7B | 7B | ~90% | ~65% | ~4GB | No |
| DeepSeek-Coder-6.7B | 6.7B | ~88% | ~60% | ~3.8GB | No |
| GPT-4o-mini (API) | N/A | ~95% | ~75% | Cloud | Si |

**Ventaja LFM2.5**: Mejor relacion performance/memoria/velocidad para uso local on-device.

---

## 3. Setup y Configuracion

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

## 4. Prompting

### 4.1 Formato ChatML

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

### 4.2 Schema en System Prompt

Siempre incluir el JSON schema completo en el system prompt. LFM2.5 performa mejor con schemas en el system prompt que dependiendo de `response_format` solo.

**IMPORTANTE**: `response_format` en llama.cpp HTTP API tiene problemas conocidos ([Issue #19051](https://github.com/ggml-org/llama.cpp/issues/19051)). Si grammar parsing falla, el servidor continua sin restricciones. Solucion: system prompts fuertes + validacion client-side.

### 4.3 Cognitive Vaccines (Anti-Hallucination)

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

### 4.4 Evidence-First Prompting (Anti-Echo)

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

### 4.5 Estrategia "Cage" (Context Isolation)

Para prevenir que el modelo confunda contexto con contenido target:

```xml
<project_context>
  <!-- Background info only. NEVER describe this as current. -->
</project_context>

<target_file>
  <!-- The ONLY thing to analyze. -->
</target_file>
```

### 4.6 Estructura de Template Estandar

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

### 4.7 Verificacion Client-Side (Spread Operator)

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

## 5. Optimizacion

### 5.1 Continuous Batching (`-cb`)

Sin `-cb`, el GPU procesa Request A completamente, luego Request B. Los workers reportan alta latencia (ej. 82s) cuando el modelo es rapido (16s) -- el tiempo extra es "Queue Wait Time".

Con `-cb`, el servidor intercala tokens de multiples requests dinamicamente. Throughput aumenta dramaticamente.

**Siempre usar `-cb`** en ambos servidores (GPU y CPU).

### 5.2 Formula de Context Size

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

### 5.3 KV Cache Quantization

| Cache Type | Uso de Memoria | Impacto en Calidad |
|------------|---------------|-------------------|
| `f16` (default) | 100% | Mejor |
| `q8_0` | ~50% | Perdida minima |
| `q4_0` | ~25% | Perdida menor |

**Recomendacion**: Usar `q8_0` para GPU y CPU. Maximiza slots sin degradacion de calidad.

Flags: `--cache-type-k q8_0 --cache-type-v q8_0`

### 5.4 Flash Attention (`--flash-attn`)

Optimizacion GPU-only:
- Reduce uso de memoria durante attention computation.
- Acelera inferencia 10-20%.
- Requerido para context windows grandes.

### 5.5 Estabilidad en CPU

Problemas comunes y soluciones:

**10-Minute Network Timeout (fetch failed)**:
- Causa: Windows HTTP client tiene timeout default de 10 minutos.
- Fix: `CPUSlotManager` para limitar requests concurrentes. `AIConnectionKeepAlive` hace ping a `/health` cada 30 segundos.

**Memory Fragmentation**:
- Causa: Inferencia prolongada fragmenta heap memory.
- Fix: `--batch-size 512` para reducir peak allocation. Considerar restarts periodicos del servidor.

**Thread Contention**:
- Causa: Demasiados threads compiten por CPU.
- Fix: `--threads` = physical core count (no logical/hyperthreading).

### 5.6 Estrategias de Paralelismo

**"Quality First" Concurrency Strategy**: Priorizar parallel workers sobre batch size.

| Estrategia | Config | Pros | Contras |
|-----------|--------|------|---------|
| High Batching | `parallel 1`, `batchSize 5` | Menos HTTP requests | Menor calidad (context dilution), feedback loop lento |
| **High Concurrency** | `parallel 4`, `batchSize 1` | **Maxima calidad** (contexto dedicado), 2x throughput | Requiere `-cb` |

**Recomendacion**: Mantener `batchSize = 1` en `AIWorkerPool.js` y dejar que Continuous Batching del GPU maneje el paralelismo.

### 5.7 Limites de Parallel Slots

| Slots | Comportamiento KV Cache | Recomendacion |
|-------|------------------------|--------------|
| 1-4 | Estable, eficiente | Recomendado |
| 5-8 | KV cache creciente, generacion mas lenta | Monitorear |
| 9+ | Degradacion significativa de performance | Evitar |

### 5.8 Uso de Memoria Bajo Carga Completa

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

## 6. Troubleshooting

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
**Solucion**: Usar `return { ...parsed, ... }` en `llm-client.js` (ver Seccion 4.7).

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
**Solucion**: Usar Evidence-First prompting (ver Seccion 4.4). Eliminar few-shot examples.

---

## 7. Historical: Qwen2.5-Coder Evaluation

> Evaluacion realizada 2026-02-06. Archivado en `docs/archive/QWEN2.5_CODER_GUIDE.md`.
> Estado: **Descartado** -- se mantuvo LFM2.5-1.2B-Instruct como modelo de produccion.

Se evaluo **Qwen2.5-Coder-1.5B-Instruct** (Alibaba Cloud) como alternativa potencial a LFM2.5.

### Resumen Comparativo

| Caracteristica | Qwen2.5-Coder-1.5B | LFM2.5-1.2B-Instruct |
|----------------|-------------------|----------------------|
| Parametros | 1.54B | 1.17B |
| Contexto | 32,768 tokens | 32,768 tokens |
| Lenguajes de codigo | 358 | ~100 |
| Tamano Q8_0 | ~1.6 GB | ~1.2 GB |
| Velocidad estimada | +30-40% vs LFM2 | Base |
| HumanEval | 42.1% | 31.2% |
| MBPP | 45.8% | 38.1% |

### Por Que Se Descarto

A pesar de ventajas en velocidad y benchmarks de code completion, Qwen2.5-Coder no fue adoptado porque:

1. **Arquitectura**: LFM2.5 tiene arquitectura hibrida Liquid-Transformer optimizada para on-device, con recurrent state que mantiene coherencia en JSON largo.
2. **Ecosistema**: Todo el stack de OmnySys (prompts, templates, cognitive vaccines) esta construido y probado para LFM2.5.
3. **Memoria**: LFM2.5 usa ~400MB menos en Q8_0.
4. **Caso de uso**: Los benchmarks de Qwen favorecen code completion/generation, no code analysis con JSON extraction que es nuestro caso de uso principal.

---

## 8. Referencias

### Modelos y Model Cards
- [LFM2.5-1.2B-Instruct (HuggingFace)](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct)
- [LFM2.5-1.2B-Thinking (HuggingFace)](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Thinking)
- [LFM2-1.2B-Extract (HuggingFace)](https://huggingface.co/LiquidAI/LFM2-1.2B-Extract)
- [LFM2-1.2B-Extract-GGUF](https://huggingface.co/LiquidAI/LFM2-1.2B-Extract-GGUF)

### Documentacion Liquid AI
- [Liquid AI Tool Use Documentation](https://docs.liquid.ai/lfm/key-concepts/tool-use)
- [Liquid AI Blog - Introducing LFM2.5](https://www.liquid.ai/blog/introducing-lfm2-5-the-next-generation-of-on-device-ai)
- [Liquid AI Blog - LFM2.5-1.2B-Thinking](https://www.liquid.ai/blog/lfm2-5-1-2b-thinking-on-device-reasoning-under-1gb)
- [Liquid AI Blog - Liquid Nanos](https://www.liquid.ai/blog/introducing-liquid-nanos-frontier-grade-performance-on-everyday-devices)
- [Liquid AI Models](https://www.liquid.ai/models)
- [LFM2 Technical Report (arXiv)](https://arxiv.org/abs/2511.23404)

### Articulos y Benchmarks
- [LFM2.5 Release Article (MarkTechPost)](https://www.marktechpost.com/2026/01/06/liquid-ai-releases-lfm2-5-a-compact-ai-model-family-for-real-on-device-agents/)
- [LFM2.5 Thinking Analysis (Medium)](https://medium.com/@meshuggah22/lfm2-5-1-2b-thinking-liquid-ais-reasoning-model-that-fits-in-your-pocket-12d5e8298cec)
- [JSON Prompting Guide (CodeConductor)](https://codeconductor.ai/blog/structured-prompting-techniques-xml-json/)

### Hugging Face (Variantes adicionales)
- [LiquidAI/LFM2.5-1.2B-Base](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Base)
- [LiquidAI Organization](https://huggingface.co/LiquidAI)
- [Qwen/Qwen2.5-Coder-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct) (historico)

### llama.cpp
- [llama.cpp JSON Schema Issue #19051](https://github.com/ggml-org/llama.cpp/issues/19051) - response_format limitations en HTTP server mode
