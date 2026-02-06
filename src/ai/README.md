# AI Integration - Local LLM for Semantic Analysis

This directory contains the AI integration for CogniSystem, enabling deep semantic analysis using local LLMs.

## Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Static Analysis (Layer A)              â”‚
â”‚  â”œâ”€ AST parsing                         â”‚
â”‚  â”œâ”€ Pattern matching                    â”‚
â”‚  â””â”€ ~80% of cases âœ…                    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                  â¬‡ï¸
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  LLM Analysis (Layer B - Optional)      â”‚
â”‚  â”œâ”€ Complex code patterns               â”‚
â”‚  â”œâ”€ Indirect connections                â”‚
â”‚  â””â”€ ~20% of cases (when needed) ðŸ¤–      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## Components

### 1. [ai-config.json](ai-config.json)
Configuration file for AI servers and analysis behavior.

**Key settings**:
- `llm.enabled`: Enable/disable LLM analysis (default: `false`)
- `llm.mode`: Which server to use (`gpu`, `cpu`)
- `analysis.llmOnlyForComplex`: Only use LLM for complex cases (default: `true`)
- `performance.enableCPUFallback`: Enable CPU server as fallback (default: `false`)

### 2. [llm-client.js](llm-client.js)
HTTP client for communicating with llama-server instances.

**Features**:
- Health checking
- Automatic server selection (GPU/CPU)
- Parallel analysis across multiple servers
- Timeout handling

### 3. [scripts/](scripts/)
Batch scripts to start AI servers.

- `brain_gpu.bat` - GPU-accelerated server (port 8000)
- `start_brain_cpu.bat` - CPU-only server (port 8002)

### 4. [server/](server/) (Transfer from Giteach)
llama-server binaries and DLLs.

**Required files**:
- `llama-server.exe` - Main inference engine
- `ggml-vulkan.dll` - GPU acceleration via Vulkan
- `llama.dll`, `ggml.dll`, `ggml-base.dll` - Core libraries

### 5. [models/](models/) (Transfer from Giteach)
AI model files.

**Required model**:
- `LFM2.5-1.2B-Instruct-Q8_0.gguf` (~1.25 GB)
  - Liquid Foundation Model 2.5
  - 1.2B parameters
  - Q8_0 quantization (high quality)
  - Optimized for edge/local inference

## Setup

### Prerequisites
1. **GPU with Vulkan support** (recommended) OR **CPU with 4+ cores**
2. **4 GB RAM** minimum (8 GB recommended)
3. **2 GB disk space** for model + binaries

### Installation

**Step 1: Transfer files from Giteach**

```bash
# From Giteach project directory
# Copy server binaries
cp -r Giteach/server/* aver/src/ai/server/

# Copy model
cp Giteach/models/LFM2.5-1.2B-Instruct-Q8_0.gguf aver/src/ai/models/
```

**Step 2: Enable AI in config**

Edit [ai-config.json](ai-config.json):
```json
{
  "llm": {
    "enabled": true,  // â† Change to true
    "mode": "gpu"     // Or "cpu" if no GPU
  }
}
```

**Step 3: Start AI server**

```bash
# Start GPU server
OmnySys ai start gpu

# OR start both GPU + CPU for parallel processing
OmnySys ai start both
```

**Step 4: Verify**

```bash
OmnySys ai status
```

Expected output:
```
ðŸ“Š AI Server Status

GPU Server (port 8000):
  âœ… RUNNING

ðŸ’¡ Configuration:
  LLM enabled: Yes
  Mode: gpu
```

## Usage

### Automatic (Integrated with Analysis)

When AI is enabled, it automatically activates during `OmnySys analyze`:

```bash
OmnySys analyze /path/to/project
```

Output will include:
```
ðŸ¤– LLM enrichment phase...
ðŸ“Š Analyzing 12 complex files with LLM...
âœ“ Enhanced 10/12 files with LLM insights
```

### Manual (CLI Commands)

```bash
# Start servers
OmnySys ai start gpu       # GPU only
OmnySys ai start cpu       # CPU only
OmnySys ai start both      # Both servers

# Check status
OmnySys ai status

# Stop servers
OmnySys ai stop
```

## Configuration

### When to Use LLM

LLM analysis triggers automatically when:
1. Static analysis confidence < 0.8 (configurable via `confidenceThreshold`)
2. Dynamic code detected (`eval()`, computed properties)
3. Complex patterns (>3 event listeners, >3 shared state writes)

### Performance Tuning

**For small projects (<100 files)**:
- Use GPU only
- Set `llmOnlyForComplex: true`
- Set `maxConcurrentAnalyses: 4`

**For large projects (>500 files)**:
- Use both GPU + CPU
- Set `enableCPUFallback: true`
- Increase `maxConcurrentAnalyses` to 8-12

**Low RAM systems**:
- Edit `brain_gpu.bat`: reduce `--ctx-size` to 32768
- Reduce `--parallel` to 2
- Use CPU server instead

### Prompt Customization

Edit `ai-config.json` â†’ `prompts.analysisTemplate` to customize what the LLM analyzes.

Default prompt focuses on:
- Shared state detection
- Event emission/listening
- Side effects
- Affected files

You can add custom analysis like:
- Security patterns
- Performance anti-patterns
- Business logic connections

## Troubleshooting

### "No LLM servers available"
**Cause**: Servers not started or crashed

**Fix**:
```bash
OmnySys ai status       # Check status
OmnySys ai start gpu    # Start servers
```

Check logs in `logs/ai_brain_gpu.log`

### "Vulkan device not found"
**Cause**: GPU doesn't support Vulkan or drivers outdated

**Fix**:
- Update GPU drivers
- OR switch to CPU mode:
  ```json
  { "llm": { "mode": "cpu" } }
  ```

### "Port already in use"
**Cause**: Another process using port 8000/8002

**Fix**:
```bash
# Windows
netstat -ano | findstr :8000
taskkill /F /PID <pid>

# Or change ports in ai-config.json
```

### "Out of memory"
**Cause**: Model too large for available RAM/VRAM

**Fix**:
- Reduce context size in `brain_gpu.bat`:
  ```batch
  --ctx-size 32768  (instead of 49152)
  ```
- Reduce parallel slots:
  ```batch
  --parallel 2  (instead of 4)
  ```
- Use CPU server (uses system RAM, not VRAM)

### LLM returns invalid JSON
**Cause**: Model hallucinating or prompt unclear

**Fix**:
- Check `ai_brain_gpu.log` for model output
- Lower temperature in `llm-client.js` (currently 0.1)
- Simplify `analysisTemplate` in config

## Performance Benchmarks

Tested on:
- **GPU**: RTX 3060 (12GB VRAM)
- **CPU**: Ryzen 7 5800X (8 cores)
- **Model**: LFM2.5-1.2B-Q8_0

| Scenario | GPU (ms) | CPU (ms) |
|----------|----------|----------|
| Single file analysis | 200-500 | 800-1500 |
| 10 files (parallel) | 1000-2000 | 5000-8000 |
| 50 files (batch) | 8000-12000 | 30000-50000 |

**Conclusion**: GPU is 3-5x faster. Use CPU only if GPU unavailable.

## Architecture Details

### Why llama-server instead of Ollama?

1. **Granular control**: Direct access to Vulkan layers, batching, KV cache
2. **Continuous batching**: `-cb` flag enables parallel token processing
3. **Quantized KV cache**: `--cache-type-k q8_0` saves 50% VRAM
4. **No overhead**: Ollama adds abstraction layers

### Why LFM2.5-1.2B?

1. **Small but capable**: 1.2B params is perfect for code analysis
2. **Fast**: Inference in 200-500ms on modest GPU
3. **Instruct-tuned**: Follows JSON output format reliably
4. **Q8_0 quantization**: High quality with reasonable size

### Continuous Batching (`-cb`)

Without `-cb`: Process one request â†’ generate all tokens â†’ next request

With `-cb`: Interleave tokens from multiple requests â†’ 3-4x throughput

Perfect for analyzing 10+ files simultaneously.

## Next Steps

1. **Enable AI**: Edit `ai-config.json` and start servers
2. **Analyze project**: Run `OmnySys analyze <project>` and observe LLM usage
3. **Tune performance**: Adjust `maxConcurrentAnalyses` based on your hardware
4. **Customize prompts**: Modify `analysisTemplate` for domain-specific analysis

## Reference

- [AI_SETUP_GUIDE.md](../../docs/ai_architecture/AI_SETUP_GUIDE.md) - Detailed Vulkan architecture
- [layer-b-semantic/README.md](../layer-b-semantic/README.md) - Semantic analysis overview
- [Logs README](../../logs/README.md) - Logging and troubleshooting

