# LFM2 Optimization & Prompt Engineering Guide 🧬

**Version:** 1.1 (Liquid Era - Forensic Update)
**Target Model:** Liquid Foundation Models 2.5 (LFM-1.2B / LFM-3B)

## 1. Understanding the Engine: LFM2 vs. Transformers
Unlike traditional GPT-style Transformers, **LFM2 (Liquid Foundation Models)** uses a hybrid architecture combining attention with **adaptive linear operators**.

### Key Characteristics "Edge-First"
- **Low Memory Footprint:** Optimized for local execution (Consumer GPUs/CPU).
- **Recurrent State:** Maintains structure better in long contexts (preventing "lost brackets" in JSON).
- **High Speed:** Extremely fast inference, ideal for real-time agents.

---

## 2. Engineering Best Practices

### A. Specialization > Generalization
LFM2 is a **specialist tool**, not a generalist encylopedia.
- **DO:** Use for RAG, extraction, summarization, and structured data tasks.
- **DON'T:** Use for "write me a novel" or complex zero-shot programming without context.

### B. The "Cage" Strategy (Context Isolation)
To prevent hallucinations where the model confuses context with target content:
```xml
<project_context>
  <!-- Background info only. NEVER describe this as current. -->
</project_context>

<target_file>
  <!-- The ONLY thing to analyze. -->
</target_file>
```
*Implementation in `AIWorkerPool.js`.*

### C. Cognitive Vaccines (Anti-Hallucination)
Explicitly negate common semantic traps in the **System Prompt**:
- `"Godot is NOT Go"` (Disambiguation)
- `"Config != Skill"` (Value judgment correction)
- `"Markdown describes, DOES NOT implement"` (Ontological correction)

---

## 3. High-Fidelity JSON Generation (LFM2.5 Structured Output)

The "Extract" capability of LFM2 is its strongest suit. LFM2.5 has **specialized models and techniques** for structured output generation.

### LFM2.5 Structured Output Best Practices

**Sources:**
- [Liquid AI Tool Use Documentation](https://docs.liquid.ai/lfm/key-concepts/tool-use)
- [LFM2.5 Release Article](https://www.marktechpost.com/2026/01/06/liquid-ai-releases-lfm2-5-a-compact-ai-model-family-for-real-on-device-agents/)
- [llama.cpp JSON Schema Issue #19051](https://github.com/ggml-org/llama.cpp/issues/19051)

### Strategy 1: System Prompt Schema Definition (RECOMMENDED)
For LFM2.5, provide the JSON schema template **directly in the system prompt**:

```
System: You are a specialized code analyzer. Return ONLY valid JSON with ALL required fields.

RETURN COMPLETE JSON (ALL fields required, use empty arrays [] if nothing found):
{
  "sharedState": [],
  "events": [],
  "hiddenConnections": [],
  "confidence": 0.8,
  "reasoning": "Brief fact"
}
```

**Why?** LFM2.5 performs better with schemas in the system prompt, especially for long/complex documents. This improves accuracy over relying on `response_format` alone.

### Strategy 2: JSON Output Format Instruction
Add explicit instruction: **"Output function calls as JSON"** to your system prompt.

By default, LFM2.5 generates Pythonic function calls. This instruction switches to JSON format.

### Strategy 3: Temperature Control
```javascript
temperature: 0.0  // Deterministic generation for consistent JSON structure
```

### Important: llama.cpp JSON Schema Limitations
**WARNING:** `response_format` in llama.cpp HTTP API has known issues:
- [Issue #19051 (Jan 2026)](https://github.com/ggml-org/llama.cpp/issues/19051): If grammar parsing fails, server continues unconstrained
- `--json-schema-file` flag only works in CLI mode, NOT HTTP server mode
- **Solution:** Use strong system prompts + client-side validation (don't rely solely on server-side grammar)

### JSON-First Worker Prompts
Instead of asking for natural language summaries, request structured data:
```json
// STRICT RESPONSE FORMAT
{
    "tool": "analysis",
    "params": {
        "insight": "Technical observation...",
        "impact": "Architecture..."
    }
}
```
*This output is then parsed and formatted for the UI by the `AIWorkerPool` adapter.*

### Specialized Extraction Models

**LFM2-Extract** (350M and 1.2B variants):
- Purpose-built for extracting information from unstructured documents → structured formats
- Supports JSON, XML, YAML, CSV output
- **Best practice:** Be explicit about field names, data types, and formatting requirements
- Example: "Extract contact info to JSON with fields: name (string), email (string), phone (string)"

---

## 4. Summary of Improvements
| Feature | Old Approach | LFM2 Optimized |
| :--- | :--- | :--- |
| **Output Format** | Plain Text / Markdown | Strict JSON Schema |
| **Context** | Single block of text | XML-fenced Zones |
| **Parsing** | Regex (Fragile) | `JSON.parse` (Safe) |
| **Fidelity** | Hallucinations (Go/Godot) | Cognitive Vaccines |

---

## 5. Evidence-First Prompting (Anti-Echo)

**Problem**: When using few-shot examples, LFM2 (1.2B) tends to **copy example outputs** instead of analyzing the actual input code. This causes "echo pollution" where unrelated files get classified with example function names.

### Solution: Step-Based Extraction

Force the model to extract evidence BEFORE classification:

```
STEP 1: Extract the most important function/class/variable from the code.
STEP 2: Based on that evidence, classify the domain.

OUTPUT FORMAT:
[DOMAIN] Description | Evidence: <paste_actual_code_fragment>

IMPORTANT:
- Evidence MUST be copied from the actual code shown below.
- Never invent function names.
```

### Why it works
- The step-by-step process creates a "cognitive checkpoint"
- Model cannot classify without first reading the code
- No examples to copy = no echo pollution

---

## 6. LFM2.5 Model Variants & Selection Guide

### LFM2.5-1.2B-Instruct (OUR CURRENT MODEL)

**Sources:**
- [Hugging Face Model Card](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct)
- [Liquid AI Official Announcement](https://www.liquid.ai/blog/introducing-lfm2-5-the-next-generation-of-on-device-ai)

| Capability | Details |
|------------|---------|
| **Parameters** | 1.17 billion |
| **Training** | 28T tokens (up from 10T) |
| **Context Window** | 32,768 tokens |
| **Architecture** | **Hybrid Liquid-Transformer**: 10 double-gated LIV convolution blocks + 6 Grouped Query Attention (GQA) layers |
| **Speed** | Extremely fast generation (16s for 3k chars). Low latency on Edge devices. |
| **Languages** | EN, ES, ZH, DE, AR, JA, KO, FR |
| **Best Tasks** | General instruction following, tool use, structured JSON, code analysis |
| **Benchmarks** | IFEval: 86.23, IFBench: 47.33, GPQA: 38.89, MMLU Pro: 44.35 |
| **Memory** | <2GB (Q4_0 quantized) |

✅ **Recommended for OmnySystem** because:
- Excellent instruction following (IFEval 86.23)
- Strong tool use capabilities
- Shorter responses = faster inference
- Does NOT exclude programming tasks

### LFM2.5-1.2B-Thinking (ALTERNATIVE)

**Sources:**
- [Hugging Face Model Card](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Thinking)
- [Medium Analysis Article](https://medium.com/@meshuggah22/lfm2-5-1-2b-thinking-liquid-ais-reasoning-model-that-fits-in-your-pocket-12d5e8298cec)

| Capability | Details |
|------------|---------|
| **Benchmarks** | **IFEval: 88.42** (+2.19), MATH-500: 87.96 (+24.76), MMLU Pro: 49.65 (+5.30) |
| **Best Tasks** | **Agentic tasks**, data extraction, RAG, structured reasoning |
| **NOT Recommended** | ❌ **Programming tasks**, Knowledge-intensive tasks |
| **Speed** | Slower (longer reasoning chains), but higher quality reasoning |

⚠️ **NOT recommended for OmnySystem** because:
- Explicitly NOT for programming tasks
- Longer output = slower inference
- Our task IS code analysis (programming domain)

### Limitations (Both Variants) ⚠️
| Limitation | Mitigation |
|------------|------------|
| Small parameter count | Avoid complex deductive reasoning. Use "Step-by-Step" prompting. |
| Tendency to copy few-shot examples | Use Evidence-First prompting (Step-Based) |
| **Compute Bound** on Prefill | High latency on large prompts if not batched correctly (See Section 7). |

### Conclusion: Use LFM2.5-1.2B-Instruct
For code analysis + structured JSON extraction, **Instruct** is the right choice.

---

## 7. Hardware Parallelism & Continuous Batching 🚀

**CRITICAL PERFORMANCE NOTE:**

When running multiple AI workers (e.g., Worker 1, 2, 3) against a single GPU server, you MUST distinguish between "Software Slots" and "Hardware Execution".

### The "Queueing" Problem
Using `--parallel 4` alone reserves memory for 4 users but does **NOT** guarantee parallel execution.
- **Without `-cb`**: The GPU processes Request A fully, then Request B.
- **Symptom**: Workers report high latency (e.g., 82s) despite the model being fast (16s). The extra time is "Queue Wait Time".

### The Solution: Continuous Batching (`-cb`)
The `-cb` flag enables **Continuous Batching**, allowing the server to dynamically interleave tokens from multiple requests.
- **With `-cb`**: Request A and Request B define tokens simultaneously.
- **Result**: Throughput increases dramatically. Worker wait times drop to near zero.

### Recommended Launch Command (GPU)
```batch
server\llama-server.exe --model "%MODEL_PATH%" ^
    --port 8000 ^
    --host 0.0.0.0 ^
    --n-gpu-layers 999 ^
    --ctx-size 81920 ^
    --parallel 4 ^
    -cb ^                  <-- CRITICAL FOR PARALLELISM
    --chat-template chatml
```

### The "Quality First" Concurrency Strategy
For "Deep Forensics" on LFM 2.5 (1.2B), we prioritize **Parallel Workers** over **Batch Size**.

| Strategy | Config | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **High Batching** | `parallel 1`, `batchSize 5` | Fewer HTTP requests | **Lower Quality** (Context dilution), Slow feedback loop |
| **High Concurrency** | `parallel 4`, `batchSize 1` | **Maximum Quality** (Dedicated context), 2x Throughput | Requires `-cb` flag |

**Recommendation:**
Keep `batchSize = 1` in `AIWorkerPool.js` and let the GPU's **Continuous Batching** handle the parallelism. This gives you the speed of batching with the precision of single-file analysis.

---

## 8. CPU-Specific Optimizations (LFM2.5 + llama.cpp) 🖥️

LFM2 models are **explicitly optimized for CPU inference**, achieving 239 tokens/second on AMD CPUs with <1GB RAM usage. However, long-running CPU inference can encounter stability issues due to memory fragmentation and thread contention.

### Key CPU Parameters

| Parameter | Recommended Value | Reason |
|-----------|-------------------|--------|
| `--threads` | Physical cores (not hyperthreads) | Avoid context-switching overhead. 4 threads for 4-core CPU. |
| `--parallel` | Match concurrent clients | For 3 mappers, use `--parallel 3`. |
| `--batch-size` | 512 (CPU) | Smaller batches reduce peak memory usage and prevent OOM. |
| `-ngl 0` | Always | Force CPU-only mode (no GPU offloading). |
| `-cb` | Always | Enable continuous batching for parallel efficiency. |
| `--ctx-size` | 16384-20480 | Balance between context and memory. Avoid very large values on CPU. |

### Common CPU Stability Issues

1. **10-Minute Network Timeout (fetch failed)**
   - **Cause**: Windows HTTP client has a default 10-minute timeout. If the server is busy processing and doesn't respond, the connection dies.
   - **Fix 1**: Client-side slot management (`CPUSlotManager`) to limit concurrent requests to match `--parallel` setting.
   - **Fix 2**: `AIConnectionKeepAlive` module pings `/health` every 30 seconds to keep the connection active.

2. **Memory Fragmentation**
   - **Cause**: Long-running inference fragments heap memory.
   - **Fix**: Use `--batch-size 512` to reduce peak allocation. Consider periodic server restarts.

3. **Thread Contention**
   - **Cause**: Too many threads compete for CPU resources.
   - **Fix**: Set `--threads` to physical core count (not logical). Avoid hyperthreading.

### Recommended CPU Launch Command
```batch
server\llama-server.exe --model "%MODEL_PATH%" ^
    --port 8002 ^
    --host 127.0.0.1 ^
    -ngl 0 ^
    --ctx-size 20480 ^
    --threads 4 ^
    --parallel 3 ^
    --batch-size 512 ^      <-- CRITICAL FOR CPU STABILITY
    -cb ^
    --chat-template chatml ^
    --log-file logs\ai_mapper_cpu.log
```

### Log Rotation
All server startup scripts now include automatic log rotation:
- Previous logs are archived with timestamps (`ai_mapper_cpu_20260118_193000.log`).
- Prevents log files from growing indefinitely.
- Each session starts with a clean log.

---

## 9. Advanced Server Optimizations 🔧

### Context Size Formula (CRITICAL)
**`--ctx-size` is the TOTAL context, divided by `--parallel` slots.**

```
Effective Context Per Slot = --ctx-size / --parallel
```

| Config | Total Context | Parallel Slots | Per-Slot Context |
|--------|---------------|----------------|------------------|
| GPU (8GB VRAM) | 49152 | 4 | **12288** tokens |
| CPU (16GB RAM) | 65536 | 4 | **16384** tokens |

> ⚠️ If your prompts exceed the per-slot context, they will be truncated silently!

### KV Cache Quantization (`--cache-type-k q8_0`)
Reduces KV cache memory by ~50% with minimal quality loss.

| Cache Type | Memory Usage | Quality Impact |
|------------|--------------|----------------|
| `f16` (default) | 100% | Best |
| `q8_0` | ~50% | Minimal loss |
| `q4_0` | ~25% | Minor loss |

**Recommendation**: Use `q8_0` for both GPU and CPU to maximize slots without quality degradation.

### Flash Attention (`--flash-attn`)
GPU-only optimization that:
- Reduces memory usage during attention computation
- Speeds up inference by 10-20%
- Required for larger context windows

### Parallel Slot Limits
| Slots | KV Cache Behavior | Recommendation |
|-------|-------------------|----------------|
| 1-4 | Stable, efficient | ✅ Recommended |
| 5-8 | Growing KV cache, slower generation | ⚠️ Monitor |
| 9+ | Significant performance degradation | ❌ Avoid |

### Optimized Launch Commands

**GPU (Port 8000):**
```batch
server\llama-server.exe --model "%MODEL_PATH%" ^
    --port 8000 --host 127.0.0.1 ^
    --n-gpu-layers 999 ^
    --ctx-size 32768 --parallel 4 ^
    --cache-type-k q8_0 --cache-type-v q8_0 ^
    --flash-attn ^
    -cb --chat-template chatml
```

**CPU (Port 8002):**
```batch
server\llama-server.exe --model "%MODEL_PATH%" ^
    --port 8002 --host 127.0.0.1 ^
    -ngl 0 ^
    --ctx-size 24576 --parallel 3 ^
    --threads 4 --batch-size 512 ^
    --cache-type-k q8_0 --cache-type-v q8_0 ^
    -cb --chat-template chatml
```

### Connection Keep-Alive
The `AIConnectionKeepAlive.js` module prevents Windows HTTP timeouts by:
1. Pinging `/health` every 30 seconds
2. Maintaining active connections to all 3 servers
3. Detecting server crashes immediately

This is critical for long-running CPU inference that can exceed Windows' 10-minute HTTP timeout.

---

## 10. Complete Concurrency Analysis 📊

### GPU Server (Port 8000) - Peak Concurrent Calls

| Component | Concurrent Calls | When |
|-----------|------------------|------|
| **AI Workers** | 3 | During file analysis (bulk of processing) |
| **IntentOrchestrator** | 1-2 | User chat routing |
| **InsightGenerator** | 1-2 | Profile insights generation |
| **ProfileBuilder** | 1-3 | README generation (sequential) |
| **TOTAL PEAK** | **~5-6** | All systems active |

**Configuration**: `--parallel 4` with `aiSlotManager(5)` 
- Workers use 3 slots, leaving 1-2 for chat/curation
- If queue exceeds 5, client-side waiting kicks in (no server overload)

### CPU Server (Port 8002) - Peak Concurrent Calls

| Component | Concurrent Calls | When |
|-----------|------------------|------|
| **ThematicMappers** | 3 | Architecture, Habits, Stack (parallel) |
| **DNASynthesizer** | 1 | Global identity synthesis |
| **RepoBlueprintSynthesizer** | 1 | Per-repo blueprint |
| **EvolutionManager** | 1 | Metabolic evolution detection |
| **RepoContextManager** | 1 | Golden knowledge extraction |
| **TOTAL PEAK** | **~4-5** | Synthesis phase |

**Configuration**: `--parallel 4` with `cpuSlotManager(4)`
- 3 Mappers run together = 3 slots used
- 1 slot available for Synthesizer (DNASynth/Evolution)
- No more queue waiting for synthesis phase!

### Memory Behavior Under Full Load

**GPU (8GB VRAM):**
```
Model:          1.25 GB
KV Cache (80K): 4.00 GB (all 4 slots at 20K each)
Headroom:       ~2.75 GB
STATUS:         ✅ SAFE
```

**CPU (16GB RAM):**
```
Model:          1.25 GB
KV Cache (80K): 4.00 GB (all 4 slots at 20K each)
OS + Apps:      ~8.00 GB
Headroom:       ~2.75 GB
STATUS:         ✅ SAFE
```

### Why Current Configuration is Optimal

1. **GPU 4 slots** matches peak worker load (3) + chat headroom (1)
2. **CPU 4 slots** = 3 mappers + 1 synthesizer running simultaneously
3. **20K context per slot** allows for large file analysis without truncation
4. **q8_0 KV cache** reduces memory by 50% while maintaining quality
