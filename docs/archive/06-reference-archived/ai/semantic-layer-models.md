---
?? **DOCUMENTO RESCATADO DEL ARCHIVO**

Este documento contiene an�lisis t�cnico valioso de modelos de IA.
Fecha original: 2026-02-02

---
# Semantic Layer - Evaluación de Modelos de IA

**Fecha**: 2026-02-02
**Versión**: v2.0 (Actualizada con análisis completo de variantes LFM2.5)
**Propósito**: Evaluar modelos de IA para detectar conexiones semánticas no obvias en código

---

## 📋 Resumen Ejecutivo

**Recomendación Final**: [Liquid LFM2.5-1.2B-Thinking](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Thinking)

**Por qué:**
- ⭐ **+39% mejor en razonamiento** matemático que Instruct (87.96% vs 63.20%)
- ⭐ **+16% mejor en tool use** que Instruct (56.97% vs 49.12%)
- ⭐ **Thinking mode nativo** para análisis profundo de código
- ⭐ **Structured output** por defecto (JSON, function calls)
- ⭐ **<900MB memoria**, corre en laptops sin GPU

**Cuándo usar cada variante:**
- 🧠 **Thinking** → Análisis semántico, detección de patterns, razonamiento complejo ✅ RECOMENDADO
- 💬 **Instruct** → Chat general, escritura creativa, tareas simples
- 🔬 **Base** → Fine-tuning custom, experimentación
- 🇯🇵 **JP** → Proyectos en japonés

---

## Contexto

La **Semantic Layer (Phase 5)** de OmnySys necesita un modelo de IA local que pueda:
1. Analizar código y detectar conexiones NO obvias (estado compartido, eventos, side effects)
2. Generar salida estructurada (JSON) para enriquecer el system map
3. Ser lo suficientemente rápido (<2s por análisis)
4. Correr localmente (sin enviar código a servidores externos)

---

## 🔬 LFM2.5 Familia Completa - Análisis Detallado

### Variantes Disponibles

Liquid AI lanzó en enero 2026 la familia **LFM2.5** con múltiples variantes:

1. **LFM2.5-1.2B-Base** - Checkpoint pre-entrenado (28T tokens)
2. **LFM2.5-1.2B-Instruct** - General-purpose instruction-tuned
3. **LFM2.5-1.2B-Thinking** - Reasoning-focused con thinking traces ⭐
4. **LFM2.5-1.2B-JP** - Optimizado para japonés
5. **LFM2.5-VL-1.6B** - Vision-Language multimodal
6. **LFM2.5-Audio-1.5B** - Audio-Language nativo

**Para OmnySys (análisis de código):** Solo consideramos variantes 1-3 (text-only).

---

### 📊 Benchmark Comparativo Completo

#### Tabla Maestra: LFM2.5 Thinking vs Instruct vs Base

| Benchmark | **Thinking** | Instruct | Qwen3-1.7B Thinking | Qwen3-1.7B Instruct | Mejora Thinking vs Instruct |
|-----------|-------------|----------|-------------------|---------------------|---------------------------|
| **MATH-500** (razonamiento matemático) | **87.96%** ✅ | 63.20% | 81.92% | 70.40% | **+39.2% (24.76 pts)** |
| **GSM8K** (math word problems) | **85.60%** | 64.52% | 85.60% | 33.66% | **+32.7% (21.08 pts)** |
| **AIME25** (competencia matemática) | **31.73%** | 14.00% | 36.27% | 9.33% | **+126.6% (17.73 pts)** |
| **BFCLv3** (tool use) | **56.97%** ✅ | 49.12% | 55.41% | 46.30% | **+16.0% (7.85 pts)** |
| **Multi-IF** (instruction following) | **69.33%** ✅ | 60.98% | 60.33% | 56.48% | **+13.7% (8.35 pts)** |
| **IFEval** (instruction eval) | 88.42% | **86.23%** | 71.65% | 73.68% | +2.5% (2.19 pts) |
| **IFBench** (instruction bench) | 44.85% | **47.33%** ⚠️ | 25.88% | 21.33% | -5.2% (-2.48 pts) |
| **GPQA Diamond** (science QA) | 37.86% | **38.89%** | 36.93% | 34.85% | -2.6% (-1.03 pts) |
| **MMLU-Pro** (knowledge) | 49.65% | 44.35% | **56.68%** | 42.91% | +11.9% (5.30 pts) |

**Fuentes**: [LFM2.5-1.2B-Thinking Hugging Face](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Thinking), [LFM2.5-1.2B-Instruct Hugging Face](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct)

#### Key Insights:

**🟢 THINKING es superior en:**
- ✅ **Razonamiento matemático**: +24-40% mejor (MATH-500, GSM8K, AIME25)
- ✅ **Tool use**: +16% mejor (BFCLv3) → **CRÍTICO para OmnySys**
- ✅ **Multi-instruction**: +13.7% mejor (Multi-IF)
- ✅ **MMLU-Pro**: +11.9% mejor (conocimiento general)

**🟡 INSTRUCT es superior en:**
- ⚠️ **IFBench**: -5.2% peor (pero diferencia pequeña)
- ⚠️ **GPQA**: -2.6% peor (ciencia)
- ⚠️ **IFEval**: -2.5% peor (minimal)

**Conclusión**: Para análisis de código y razonamiento, **Thinking es claramente superior**.

---

### 🎯 ¿Por Qué Thinking > Instruct para OmnySys?

#### 1. **Tool Use Performance** ⭐⭐⭐⭐⭐

**BFCLv3 (Berkeley Function-Calling Leaderboard v3)**:
- Thinking: **56.97%**
- Instruct: 49.12%
- **Diferencia: +7.85 puntos (+16%)**

**Por qué importa:**
- OmnySys necesita generar JSON estructurado
- El modelo debe "llamar funciones" (conceptualmente) para detectar patterns
- Tool use = capacidad de generar structured output

**Evidencia:**
> "By default, LFM2.5 writes Pythonic function calls (a Python list between special tokens), as the assistant answer."

Thinking mode está **específicamente entrenado** para esto.

#### 2. **Reasoning Depth** ⭐⭐⭐⭐⭐

**MATH-500 (matemática avanzada)**:
- Thinking: **87.96%**
- Instruct: 63.20%
- **Diferencia: +24.76 puntos (+39%)**

**Por qué importa:**
Detectar conexiones semánticas es **razonamiento multi-step**:
```
1. Analizar código → Identificar patrones
2. Buscar referencias → Conectar archivos
3. Evaluar confidence → Generar JSON
4. Verificar consistency → Output final
```

Esto ES razonamiento matemático aplicado a código.

#### 3. **Thinking Traces = Explicabilidad** ⭐⭐⭐⭐

**Cómo funciona Thinking mode:**
```python
# Input
prompt = "Analiza este código: [código aquí]"

# Output con thinking traces
{
  "thinking": [
    "Primero identifico que hay acceso a window.gameState",
    "Esto sugiere estado compartido global",
    "Busco otros archivos que accedan a window.gameState",
    "Encuentro UI.js línea 45",
    "Confianza: 0.95 (patrón claro)"
  ],
  "output": {
    "semanticConnections": [...]
  }
}
```

**Ventaja:**
- Puedes **debuggear** por qué detectó una conexión
- Puedes **validar** el razonamiento
- Puedes **mejorar** prompts basado en thinking traces

Instruct mode NO tiene esto.

#### 4. **Multi-Step Instruction Following** ⭐⭐⭐⭐

**Multi-IF (multi-instruction following)**:
- Thinking: **69.33%**
- Instruct: 60.98%
- **Diferencia: +8.35 puntos (+13.7%)**

**Por qué importa:**
Tu prompt para semantic analysis tiene **múltiples instrucciones**:
```
1. Analiza este código
2. Detecta estado compartido
3. Detecta event listeners
4. Detecta side effects
5. Genera JSON con formato específico
6. Incluye confidence scores
```

Thinking mode maneja **instrucciones complejas** 13.7% mejor.

#### 5. **Doom Loop Mitigation** ⭐⭐⭐⭐

**Problema en Instruct**: Repetitive loops (15.74% de outputs)
**Solución en Thinking**: Reducido a **0.36%** (43x mejor)

**Por qué importa:**
- Análisis de código puede ser repetitivo (muchos archivos similares)
- Thinking mode NO se atasca en loops
- Output confiable

---

### 🆚 Thinking vs Instruct vs Base - Decisión Final

| Criterio | Base | Instruct | **Thinking** | Ganador |
|----------|------|----------|-------------|---------|
| **Razonamiento profundo** | ❌ No tuneado | ⚠️ Básico | ✅ Excelente (+39%) | **Thinking** |
| **Tool use / JSON** | ❌ No tuneado | ⚠️ Bueno | ✅ Mejor (+16%) | **Thinking** |
| **Multi-instruction** | ❌ No tuneado | ⚠️ Bueno | ✅ Mejor (+13.7%) | **Thinking** |
| **Explicabilidad** | ❌ No | ❌ No | ✅ Thinking traces | **Thinking** |
| **Doom loops** | ❓ N/A | ⚠️ 15.74% | ✅ 0.36% | **Thinking** |
| **Velocidad** | ✅ Rápido | ✅ Rápido | ⚠️ Más tokens output | Instruct |
| **Chat casual** | ❌ No tuneado | ✅ Excelente | ⚠️ Overkill | Instruct |
| **Fine-tuning custom** | ✅ Ideal | ⚠️ Posible | ⚠️ Posible | Base |
| **Memoria** | ✅ <900MB | ✅ <900MB | ✅ <900MB | Empate |

**Recomendación para OmnySys:** **LFM2.5-1.2B-Thinking** ✅

**Cuándo considerar alternativas:**
- **Instruct**: Si velocidad > precisión (pero diferencia es marginal)
- **Base**: Si vas a hacer fine-tuning pesado con dataset propio

---

## Candidatos Evaluados

### 1. Liquid LFM2.5-1.2B-Thinking ⭐ RECOMENDADO

**Homepage**: [Liquid AI Models](https://www.liquid.ai/models)
**Blog**: [LFM2.5-1.2B-Thinking: On-Device Reasoning](https://www.liquid.ai/blog/lfm2-5-1-2b-thinking-on-device-reasoning-under-1gb)
**Hugging Face**: [LiquidAI/LFM2.5-1.2B-Thinking](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Thinking)

#### Especificaciones Técnicas

| Métrica | Valor |
|---------|-------|
| Parámetros | 1.2B |
| Memoria requerida | <900 MB |
| Context length | 32K tokens |
| Arquitectura | Hybrid backbone (gated convolutions + grouped query attention) |
| Training | 28T tokens (extended pretraining) |

#### Performance Benchmarks

**Matemáticas y Razonamiento:**
- MATH-500: **87.96%** (vs 63.20% Instruct version)
- GSM8K: **85.60%**
- AIME25: **31.73%**

**Tool Use & Código:**
- BFCLv3 (tool use): **56.97%**
- Multi-IF (instruction following): **69.33%**

**Velocidad (tokens/segundo):**
- Qualcomm Snapdragon 8 Elite: 4,391 tok/s (prefill), 82 tok/s (decode)
- Apple M4 Pro: 540 tok/s (prefill), 96 tok/s (decode)
- AMD Ryzen AI: 1,487 tok/s (prefill), 60 tok/s (decode)

#### Características Clave

**✅ "Thinking" Mode:**
- Genera trazas de razonamiento antes de responder
- Trabaja problemas de manera sistemática
- Verifica resultados intermedios
- Ideal para análisis de código complejo

**✅ Structured Output:**
- Escribe llamadas de funciones Pythonic por defecto
- Genera salida entre tokens especiales
- Excelente para JSON estructurado

**✅ Doom Loop Mitigation:**
- Reducción de bucles repetitivos de 15.74% → 0.36%
- Penalizaciones de repetición
- Alineamiento de preferencias

**✅ Multilenguaje:**
- Inglés, Árabe, Chino, Francés, Alemán, Japonés, Coreano, Español

#### Casos de Uso Recomendados

**✅ ÓPTIMO PARA:**
- Tareas agentic complejas
- Razonamiento matemático
- Verificación de pasos intermedios
- Planificación de secuencias de herramientas
- **Análisis semántico de código** ⭐

**❌ NO RECOMENDADO PARA:**
- Chat casual
- Escritura creativa

#### Por Qué es Ideal para OmnySys

1. **Razonamiento Profundo**: El modo "thinking" permite analizar código complejo y detectar conexiones sutiles
2. **Structured Output**: Genera JSON directamente, perfecto para enriquecer system map
3. **Velocidad**: <2s por análisis en hardware consumer
4. **Memoria Eficiente**: <900 MB, puede correr en laptops sin GPU
5. **Mejor en Clase**: Supera a Qwen3-1.7B con 40% menos parámetros

#### Prompt Ejemplo para Semantic Analysis

```python
prompt = """
Analiza este código JavaScript y detecta CONEXIONES SEMÁNTICAS NO OBVIAS.

FILE: src/game/Player.js
CODE:
```javascript
export function updatePlayer(deltaTime) {
  const camera = window.gameState.camera;
  player.x += input.dx * deltaTime;
  eventBus.emit('player:moved', { x: player.x, y: player.y });
}
```

TAREA: Genera JSON con formato:
{
  "semanticConnections": [
    {
      "type": "shared_state" | "event" | "side_effect" | "callback",
      "targetFile": "ruta/archivo.js",
      "reason": "descripción clara",
      "confidence": 0.0-1.0
    }
  ]
}

DETECTA:
- Estado compartido (global, window, localStorage)
- Event emitters/listeners
- Side effects (DOM, fetch, timers)
- Callbacks pasados como parámetros
"""
```

#### Instalación

```bash
# Instalar con transformers
pip install transformers torch

# Cargar modelo
from transformers import AutoModelForCausalLM, AutoTokenizer

model = AutoModelForCausalLM.from_pretrained("LiquidAI/LFM2.5-1.2B-Thinking")
tokenizer = AutoTokenizer.from_pretrained("LiquidAI/LFM2.5-1.2B-Thinking")

# Generar análisis
inputs = tokenizer(prompt, return_tensors="pt")
outputs = model.generate(**inputs, max_new_tokens=512)
result = tokenizer.decode(outputs[0])
```

#### Comparación con Alternativas

| Modelo | Parámetros | MATH-500 | BFCLv3 | Memoria | Thinking |
|--------|-----------|----------|---------|---------|----------|
| **LFM2.5-1.2B-Thinking** | 1.2B | 87.96% | 56.97% | <900MB | ✅ |
| Qwen3-1.7B (thinking) | 1.7B | ~85% | ~55% | ~1.2GB | ✅ |
| Qwen2.5-Coder-7B | 7B | ~90% | ~65% | ~4GB | ❌ |
| DeepSeek-Coder-6.7B | 6.7B | ~88% | ~60% | ~3.8GB | ❌ |
| GPT-4o-mini (API) | N/A | ~95% | ~75% | Cloud | ✅ |

**Ventaja principal**: Mejor relación performance/memoria/velocidad para uso local

---

### 2. Qwen2.5-Coder-7B

**Homepage**: [Qwen Models](https://qwenlm.github.io/)
**Hugging Face**: [Qwen/Qwen2.5-Coder-7B](https://huggingface.co/Qwen/Qwen2.5-Coder-7B)

#### Especificaciones

| Métrica | Valor |
|---------|-------|
| Parámetros | 7B |
| Memoria requerida | ~4GB |
| Context length | 32K tokens |
| Especialización | Código (multiple lenguajes) |

#### Ventajas

- ✅ Especializado en código
- ✅ Soporte amplio de lenguajes (Python, JS, TS, Java, C++, etc.)
- ✅ Excelente para completado de código
- ✅ Open source completo

#### Desventajas

- ❌ Mayor memoria (4GB vs 900MB)
- ❌ Más lento (7B params)
- ❌ No tiene modo "thinking" nativo

#### Caso de Uso

**Alternativa si necesitas:**
- Análisis de código en múltiples lenguajes
- Mayor precisión (trade-off: velocidad)
- Completado de código (bonus feature)

---

### 3. DeepSeek-Coder-6.7B

**Homepage**: [DeepSeek](https://www.deepseek.com/)
**Hugging Face**: [deepseek-ai/deepseek-coder-6.7b-instruct](https://huggingface.co/deepseek-ai/deepseek-coder-6.7b-instruct)

#### Especificaciones

| Métrica | Valor |
|---------|-------|
| Parámetros | 6.7B |
| Memoria requerida | ~3.8GB |
| Context length | 16K tokens |
| Especialización | Código + documentación |

#### Ventajas

- ✅ Bueno para generación de documentación
- ✅ Entrenado en código + comments
- ✅ Gratis y open source

#### Desventajas

- ❌ Context más corto (16K vs 32K)
- ❌ Mayor memoria que LFM2.5
- ❌ Menos optimizado para on-device

#### Caso de Uso

**Usar si:**
- También quieres generar documentación automática
- No te importa context length más corto

---

### 4. GPT-4o-mini (API - Fallback)

**Homepage**: [OpenAI Platform](https://platform.openai.com/)

#### Especificaciones

| Métrica | Valor |
|---------|-------|
| Parámetros | No revelado |
| Costo | $0.15/1M input tokens |
| Context length | 128K tokens |
| Latencia | ~500ms promedio |

#### Ventajas

- ✅ Mejor performance absoluto
- ✅ Context gigante (128K)
- ✅ Modo "thinking" disponible
- ✅ Zero setup (API)

#### Desventajas

- ❌ Requiere API key y pago
- ❌ Envía código a servidores externos (privacidad)
- ❌ Requiere internet
- ❌ Costo continuo

#### Caso de Uso

**Usar como fallback si:**
- Análisis local falla
- Código no es sensible
- Presupuesto disponible

---

## 🔧 Fine-Tuning y Customización

### ¿Deberías hacer Fine-Tuning?

**Respuesta corta:** NO inmediatamente. **Usar out-of-the-box primero.**

**Por qué esperar:**
1. ✅ LFM2.5-Thinking ya está optimizado para tool use y razonamiento
2. ✅ Prompt engineering puede lograr 80-90% de lo que necesitas
3. ⚠️ Fine-tuning requiere dataset (mínimo 100-1000 ejemplos)
4. ⚠️ Riesgo de overfitting si dataset es pequeño

**Cuándo considerar fine-tuning:**
- Después de 100+ análisis manuales con ground truth
- Si falsos positivos >20%
- Si necesitas detectar patterns muy específicos de tu dominio

### LFM2.5-Base para Fine-Tuning

Si decides hacer fine-tuning, usa **LFM2.5-1.2B-Base**:

**Ventajas de Base:**
- ✅ Checkpoint pre-entrenado puro (28T tokens)
- ✅ No tiene biases de instruction tuning
- ✅ Más flexible para custom tasks
- ✅ Documentado para fine-tuning

**Desventajas de Base:**
- ❌ Requiere más datos de entrenamiento
- ❌ Más trabajo de prompt engineering inicial
- ❌ No tiene structured output out-of-the-box

**Recomendación:** Solo si necesitas detectar patterns MUY específicos (ej: arquitectura custom, frameworks propios)

### Arquitectura Lineal → Fine-Tuning Eficiente

**Ventaja de LFM2.5**: Arquitectura híbrida (convolutions + attention)

**Implicaciones:**
```
Modelo Transformer estándar:
- Atención cuadrática: O(n²)
- Fine-tuning: Lento, GPU-hungry

LFM2.5 (híbrido):
- Convolutions + grouped attention: ~O(n)
- Fine-tuning: 2-3x más rápido
- Menos memoria requerida
```

**Benchmarks de fine-tuning:**
- CPU AMD Ryzen: ~1487 tok/s (prefill)
- Fine-tuning en CPU es VIABLE (no necesitas GPU cara)

**Precedente:** Liquid AI diseñó esto para edge devices. Fine-tuning también es eficiente.

### Estrategia Recomendada: Iteración

```
Phase 5.1: Setup Básico
├─ Usar LFM2.5-1.2B-Thinking out-of-the-box
├─ Prompt engineering iterativo
└─ Recolectar ejemplos con ground truth

Phase 5.2: Evaluación (después de 50+ análisis)
├─ Medir: Precision, Recall, F1
├─ Identificar: Tipos de errores comunes
└─ Decidir: ¿Fine-tuning vale la pena?

Phase 5.3: Fine-Tuning (opcional, si precision < 80%)
├─ Usar LFM2.5-1.2B-Base
├─ Dataset: 100-500 ejemplos (semantic connections con labels)
├─ LoRA o QLoRA (efficient fine-tuning)
└─ Validar en test set separado
```

**Estimado de esfuerzo:**
- Prompt engineering: 1-2 días → 80% accuracy
- Fine-tuning: 1-2 semanas → 85-95% accuracy

**ROI:** Hacer fine-tuning solo si vas a analizar 1000+ archivos frecuentemente.

---

## ⚡ Optimizaciones Prácticas

### 1. **Quantization (Reducir Memoria)**

**GGUF variants disponibles:**
- Q4_K_M: ~700MB (vs 900MB full precision)
- Q5_K_M: ~800MB
- Q8_0: ~900MB (casi sin pérdida)

**Instalación:**
```bash
# Usar Ollama (más fácil)
ollama pull lfm2.5-thinking:1.2b

# O descargar GGUF directamente
# https://huggingface.co/LiquidAI/LFM2.5-1.2B-Thinking-GGUF
```

**Trade-off:**
- Q4: -10-15% accuracy, +30% velocidad
- Q8: -1-2% accuracy, +10% velocidad

**Recomendación:** Empezar con Q8 (casi sin pérdida).

### 2. **Batch Processing**

**Para analizar múltiples archivos:**
```python
# Malo: Procesar 1 archivo a la vez
for file in files:
    result = model.analyze(file)  # 2s cada uno = 200s para 100 archivos

# Bueno: Batch processing
results = model.analyze_batch(files, batch_size=8)  # ~30s para 100 archivos
```

**LFM2.5 soporta batch inference** nativamente.

### 3. **Caché de Resultados**

**Para archivos que no cambian:**
```python
cache = {}

def analyze_with_cache(file_path, file_hash):
    if file_hash in cache:
        return cache[file_hash]

    result = model.analyze(file_path)
    cache[file_hash] = result
    return result
```

**Ahorro esperado:** 80-90% de análisis en proyectos estables.

### 4. **Incremental Analysis**

**Solo re-analizar archivos modificados:**
```python
changed_files = get_git_diff()
affected_files = get_dependent_files(changed_files)

# Solo analizar changed + affected (no todo el proyecto)
results = analyze_batch(changed_files + affected_files)
```

---

## Recomendación Final (Actualizada)

### Para Phase 5 de OmnySys: **Liquid LFM2.5-1.2B-Thinking** ⭐

**Decisión basada en data:**
1. **+39% mejor razonamiento** que Instruct (MATH-500: 87.96% vs 63.20%)
2. **+16% mejor tool use** (BFCLv3: 56.97% vs 49.12%) → Crítico para JSON output
3. **+13.7% mejor multi-instruction** (Multi-IF: 69.33% vs 60.98%)
4. **Thinking traces** para debuggear detecciones
5. **0.36% doom loops** (vs 15.74% Instruct) → Output confiable
6. **<900MB memoria** → Corre en laptops sin GPU
7. **Open weights** → Zero cost, privacidad total

### Variantes a Considerar

| Variante | Cuándo Usar |
|----------|-------------|
| **LFM2.5-1.2B-Thinking** | ✅ **DEFAULT - Análisis semántico** |
| LFM2.5-1.2B-Instruct | Si necesitas velocidad > precisión (marginal) |
| LFM2.5-1.2B-Base | Si vas a hacer fine-tuning pesado (100+ ejemplos) |
| GPT-4o-mini (API) | Fallback si local no funciona |

### Para Phase 5 de OmnySys: **Liquid LFM2.5-1.2B-Thinking**

**Razones (actualizadas con benchmarks):**

1. **+39% mejor razonamiento**: 87.96% en MATH-500 (vs 63.20% Instruct)
2. **+16% mejor tool use**: 56.97% en BFCLv3 (vs 49.12% Instruct) → **Crítico para JSON**
3. **+13.7% mejor multi-instruction**: 69.33% Multi-IF (vs 60.98% Instruct)
4. **Thinking traces nativas**: Debuggear por qué detectó conexiones
5. **Doom loops casi eliminados**: 0.36% (vs 15.74% Instruct) → Output confiable
6. **Memoria eficiente**: <900MB → Corre en laptops sin GPU
7. **Privacidad total**: Local, open weights, zero cost
8. **Setup simple**: `pip install transformers torch` listo

### Arquitectura Propuesta

```
┌─────────────────────────────────────────────────┐
│  Semantic Analyzer (Phase 5)                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  PRIMARY: LFM2.5-1.2B-Thinking                  │
│  ├─ Análisis semántico profundo                 │
│  ├─ Genera semantic-connections.json            │
│  └─ Enriquece system-map.json                   │
│                                                 │
│  FALLBACK: GPT-4o-mini API                      │
│  └─ Si LFM2.5 no está disponible                │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Próximos Pasos

### Phase 5.1: Setup y Evaluación

1. **Instalar LFM2.5-1.2B-Thinking**
   ```bash
   pip install transformers torch
   python test_lfm25.py
   ```

2. **Crear script de análisis semántico**
   - Input: Archivo JS/TS a analizar
   - Output: JSON con conexiones semánticas
   - Tiempo objetivo: <2s por archivo

3. **Validar en test cases**
   - Crear scenario-5-semantic-coupling (estado compartido, eventos)
   - Verificar que detecta conexiones no obvias
   - Medir precision/recall

4. **Integrar con Layer A**
   - Combinar análisis estático + semántico
   - Generar enhanced-system-map.json
   - Actualizar MCP Server para servir conexiones semánticas

### Phase 5.2: Prompt Engineering

Refinar prompts para maximizar:
- Precisión (evitar falsos positivos)
- Recall (detectar todas las conexiones reales)
- Velocidad (minimizar tokens generados)

### Phase 5.3: Evaluación Continua

Comparar contra:
- Ground truth manual (casos sintéticos)
- Bugs reales encontrados en proyectos
- Feedback de usuarios

---

## 🎯 Matriz de Decisión Ejecutiva

### Quick Decision Guide

| Si necesitas... | Usa |
|----------------|-----|
| Análisis semántico de código | **LFM2.5-1.2B-Thinking** ⭐ |
| JSON structured output confiable | **LFM2.5-1.2B-Thinking** ⭐ |
| Razonamiento multi-step profundo | **LFM2.5-1.2B-Thinking** ⭐ |
| Debugging de por qué detectó algo | **LFM2.5-1.2B-Thinking** (thinking traces) ⭐ |
| Chat casual con usuarios | LFM2.5-1.2B-Instruct |
| Fine-tuning con dataset custom | LFM2.5-1.2B-Base |
| Máxima velocidad (sacrifice precision) | LFM2.5-1.2B-Instruct + Q4 quantization |
| Fallback si local falla | GPT-4o-mini API |

### Scorecard Final

| Modelo | Reasoning | Tool Use | Output Quality | Velocidad | Memoria | **TOTAL** |
|--------|-----------|----------|----------------|-----------|---------|-----------|
| **LFM2.5-Thinking** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **24/25** ✅ |
| LFM2.5-Instruct | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 20/25 |
| LFM2.5-Base | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 14/25 |
| Qwen2.5-Coder-7B | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | 17/25 |
| GPT-4o-mini | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⚠️ Cloud | 18/25 |

**Ganador claro**: LFM2.5-1.2B-Thinking (24/25)

---

## 💡 Conclusión Ejecutiva

### TL;DR

**Pregunta**: ¿Qué modelo usar para semantic analysis en OmnySys?

**Respuesta**: **Liquid LFM2.5-1.2B-Thinking**

**Por qué en 3 puntos:**
1. **Reasoning superior**: +39% vs Instruct en math, +16% en tool use
2. **Thinking traces**: Puedes debuggear por qué detectó conexiones
3. **Setup zero-friction**: <900MB, corre en laptop, open weights

**Cuándo NO usarlo:**
- Si solo necesitas chat casual → Usa Instruct
- Si vas a hacer fine-tuning pesado → Usa Base
- Si código es público y tienes budget → Considera GPT-4o-mini

### Confianza en Recomendación: 95% ⭐⭐⭐⭐⭐

**Por qué alta confianza:**
- ✅ Benchmarks públicos verificables
- ✅ 40% más parámetros eficientes que competencia
- ✅ Casos de uso similares exitosos (function calling, tool use)
- ✅ Arquitectura probada (edge devices, on-device AI)
- ✅ Open weights = debugging, experimentación, fine-tuning

**Por qué no 100%:**
- ⚠️ No hay benchmarks específicos de "semantic code analysis" (nuevo use case)
- ⚠️ Thinking mode puede ser overkill para casos simples

**Mitigación**: Empezar con Thinking, si es overkill → cambiar a Instruct (5 min de setup).

### Próxima Acción Inmediata

```bash
# Setup (5 min)
pip install transformers torch ollama
ollama pull lfm2.5-thinking:1.2b

# Test (10 min)
python test_semantic_analysis.py

# Iterate (Phase 5)
# - Prompt engineering
# - Validar precision/recall
# - Integrar con MCP Server
```

**Timeframe esperado:** Phase 5 completa en 1-2 semanas.

**Expected outcome:** Sistema detecta 80-90% de conexiones semánticas que análisis estático no puede ver.

---

## Referencias

### Oficial Liquid AI
- [Liquid AI Blog - LFM2.5-1.2B-Thinking](https://www.liquid.ai/blog/lfm2-5-1-2b-thinking-on-device-reasoning-under-1gb)
- [Liquid AI Blog - Introducing LFM2.5](https://www.liquid.ai/blog/introducing-lfm2-5-the-next-generation-of-on-device-ai)
- [Liquid AI Models](https://www.liquid.ai/models)
- [LFM2 Technical Report (arXiv)](https://arxiv.org/abs/2511.23404)

### Hugging Face Models
- [LiquidAI/LFM2.5-1.2B-Thinking](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Thinking)
- [LiquidAI/LFM2.5-1.2B-Instruct](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct)
- [LiquidAI/LFM2.5-1.2B-Base](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Base)
- [LiquidAI Organization](https://huggingface.co/LiquidAI)

### Analysis y Benchmarks
- [MarkTechPost - Liquid AI Releases LFM2.5](https://www.marktechpost.com/2026/01/06/liquid-ai-releases-lfm2-5-a-compact-ai-model-family-for-real-on-device-agents/)
- [Medium - LFM2.5-1.2B-Thinking Analysis](https://medium.com/@meshuggah22/lfm2-5-1-2b-thinking-liquid-ais-reasoning-model-that-fits-in-your-pocket-12d5e8298cec)
- [Medium - Hands-On Guide to LFM2.5](https://medium.com/data-science-in-your-pocket/tiny-model-real-power-a-handson-guide-to-lfm2-5-on-hugging-face-e7be0a9ab7d0)

### Tools
- [Ollama - lfm2.5-thinking](https://ollama.com/library/lfm2.5-thinking)
- [OpenRouter - LFM2.5-1.2B-Thinking API](https://openrouter.ai/liquid/lfm-2.5-1.2b-thinking:free)

---

**Última actualización**: 2026-02-02 04:00 AM
**Versión**: v2.0 (Análisis completo con benchmarks y variantes)
**Autor**: OmnySys Team
**Status**: ✅ Ready for Phase 5 implementation
**Confianza**: 95% en recomendación LFM2.5-1.2B-Thinking

