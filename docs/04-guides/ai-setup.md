# Configuración de IA

**Versión**: v0.7.1  
**Opcional**: OmnySys funciona 100% con análisis estático

---

## Opciones de LLM

OmnySys puede usar LLM local para análisis semántico profundo.

| Opción | Modelo Recomendado | Velocidad | Calidad |
|--------|-------------------|-----------|---------|
| **GPU** | LFM2.5-Thinking | 3-4s/análisis | ⭐⭐⭐⭐⭐ |
| **CPU** | LFM2.5-Thinking-Q4 | 8-12s/análisis | ⭐⭐⭐⭐ |
| **API** | Claude/GPT-4 | Variable | ⭐⭐⭐⭐⭐ |

---

## Setup GPU (Recomendado)

### Requisitos
- GPU NVIDIA con 8GB+ VRAM
- CUDA 11.8+

### Instalación

```bash
# 1. Instalar llama-cpp-python con CUDA
CMAKE_ARGS="-DLLAMA_CUDA=on" pip install llama-cpp-python

# 2. Descargar modelo
mkdir -p models
cd models
wget https://huggingface.co/lfai/LFM2.5-Thinking/resolve/main/model.gguf

# 3. Script de inicio GPU
# src/ai/scripts/brain_gpu.bat (Windows)
# src/ai/scripts/brain_gpu.sh (Linux/Mac)
```

### Iniciar

```bash
# Terminal 1: Iniciar LLM GPU
./src/ai/scripts/brain_gpu.bat

# Terminal 2: Iniciar OmnySys con LLM
npm run start:with-llm
```

---

## Setup CPU

### Requisitos
- 16GB+ RAM
- CPU moderna (8+ cores)

### Instalación

```bash
# 1. Instalar llama-cpp-python (CPU)
pip install llama-cpp-python

# 2. Descargar modelo cuantizado
wget https://huggingface.co/lfai/LFM2.5-Thinking-Q4/resolve/main/model.gguf
```

### Iniciar

```bash
# Terminal 1: Iniciar LLM CPU
./src/ai/scripts/brain_cpu.bat

# Terminal 2: Iniciar OmnySys
npm run start:with-llm
```

---

## Verificar Conexión

```bash
# Verificar LLM está corriendo
curl http://localhost:8000/health

# Respuesta esperada
{ "status": "ok", "model": "LFM2.5-Thinking" }
```

---

## Configuración de Prompts

### Personalizar prompts por arquetipo

Archivo: `src/layer-b-semantic/prompt-engine/prompt-templates/{arquetipo}.js`

```javascript
// Ejemplo: god-object.js
export const godObjectTemplate = {
  system: `Eres un analizador de arquitectura...`,
  user: `Analiza este archivo:\n{fileContent}\nExports: {exportCount}`
};
```

---

## Troubleshooting

### "LLM not available"
```bash
# Verificar que llama-server corre
curl http://localhost:8000/health

# Verificar puerto
# GPU: 8000
# CPU: 8002
```

### "Out of memory"
```bash
# Reducir context size
# En src/ai/scripts/brain_gpu.bat
# -c 4096 (en lugar de 8192)
```

### Muy lento
```bash
# Usar modelo más pequeño (Q4 en lugar de Q8)
# O deshabilitar LLM (análisis estático funciona igual)
npm start  # Sin LLM
```

---

## Sin LLM (Modo Estático)

OmnySys funciona **perfectamente sin LLM**:

```bash
npm start
```

**Qué funciona**:
- ✅ Análisis estático completo
- ✅ Data Flow extraction
- ✅ Shadow Registry
- ✅ Archetype detection (confidence-based)

**Qué NO funciona**:
- ❌ Análisis semántico profundo
- ❌ Detección de patrones complejos

**Bypass rate**: 90% de archivos no necesitan LLM.

---

## Referencias

- [development.md](./development.md) - Desarrollo
- [../02-architecture/archetypes/system.md](../02-architecture/archetypes/system.md) - Sistema de confianza
