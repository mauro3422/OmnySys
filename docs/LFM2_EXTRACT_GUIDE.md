# LFM2-Extract - Guía de Uso y Configuración

## 📋 Resumen

**LFM2-1.2B-Extract** es un modelo especializado de Liquid AI diseñado para extraer información estructurada de documentos no estructurados. Es 22.5x más pequeño que Gemma 3 27B pero con mejor performance en extracción.

### Características Principales

- **Tamaño**: 1.2B parámetros (~1.2GB en Q8_0)
- **Especialización**: Extracción estructurada (JSON, XML, YAML)
- **Idiomas**: Inglés, Árabe, Chino, Francés, Alemán, Japonés, Coreano, Portugués, Español
- **Performance**: Nivel GPT-4o en extracción (160x más pequeño)
- **Uso**: Single-turn conversations para extracción

## 🎯 Casos de Uso

1. **Extracción de datos estructurados** de:
   - Documentos (artículos, transcripciones, reportes)
   - Código fuente (localStorage keys, event names, API calls)
   - Emails (invoices, information extraction)

2. **Conversión de formatos**:
   - HTML → JSON
   - Markdown → Structured data
   - Plain text → Schema-validated JSON

## 🔧 Configuración

### System Prompt

El modelo **defaultea a JSON output** si no se proporciona system prompt. Para mejores resultados:

```json
{
  "systemPrompt": "Extract data and return as JSON with this schema:\n{\n  \"localStorage_keys\": [\"string\"],\n  \"event_names\": [\"string\"],\n  \"connections\": [{\"file\": \"string\", \"key\": \"string\"}]\n}"
}
```

### Parámetros de Generación

**CRÍTICO**: Usar **greedy decoding** para extracción:

```json
{
  "temperature": 0.0,
  "max_tokens": 1000,
  "stream": false
}
```

### Chat Template

LFM2-Extract usa formato ChatML:

```
<|startoftext|><|im_start|>system
[System prompt con schema JSON]<|im_end|>
<|im_start|>user
[Input document/code]<|im_end|>
<|im_start|>assistant
```

## 📝 Best Practices para Prompting

### 1. Schema Explícito en System Prompt

❌ **MAL** (sin schema):
```
System: Extract localStorage keys from the code.
```

✅ **BIEN** (con schema):
```
System: Extract localStorage keys and return as JSON:
{
  "localStorage_keys": ["string"],
  "connections": [{"source": "string", "target": "string", "key": "string"}]
}
```

### 2. Documentos Largos y Complejos

Para documentos >500 líneas:
- Proporcionar schema más detallado
- Especificar tipos de datos explícitamente
- Incluir ejemplos en el system prompt

### 3. Single-Turn Conversations

El modelo está optimizado para una sola pregunta-respuesta:

```
User: [Document to extract from]
Assistant: {"extracted": "data"}
```

NO usar multi-turn o conversaciones largas.

### 4. Formato de Output

Especificar formato deseado:
- `"Return as JSON"`
- `"Return as XML"`
- `"Return as YAML"`

### 5. Cognitive Vaccines (Anti-Hallucination)

Incluir instrucciones explícitas:

```
System: Extract ONLY information present in the input.
- DO NOT invent file names
- DO NOT assume connections
- COPY exact string literals
- If not found, return empty arrays
```

## 🚀 Integración con llama.cpp

### Flags Importantes

```bash
llama-server \
  --model LFM2-1.2B-Extract-Q8_0.gguf \
  --port 8000 \
  --n-gpu-layers 999 \
  --parallel 4 \
  --ctx-size 32768 \
  --temp 0.0 \
  --json-schema-file extraction_schema.json  # ← CRÍTICO
```

### JSON Schema Enforcement

Crear `extraction_schema.json`:

```json
{
  "type": "object",
  "properties": {
    "localStorage_keys": {
      "type": "array",
      "items": {"type": "string"}
    },
    "event_names": {
      "type": "array",
      "items": {"type": "string"}
    },
    "connections": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "source": {"type": "string"},
          "target": {"type": "string"},
          "key": {"type": "string"}
        },
        "required": ["source", "target", "key"]
      }
    }
  },
  "required": ["localStorage_keys", "event_names", "connections"]
}
```

## 📊 Performance Esperado

### Benchmarks

| Tarea | LFM2-Extract 1.2B | Gemma 3 27B | GPT-4o |
|-------|-------------------|-------------|--------|
| JSON Extraction | ✅ Excelente | ✅ Excelente | ✅ Excelente |
| Multi-language | ✅ 9 idiomas | ⚠️ Limitado | ✅ 50+ idiomas |
| Speed | 🚀 ~700 tok/s | 🐌 ~50 tok/s | ⏱️ Cloud API |
| Size | 💾 1.2 GB | 💾 27 GB | ☁️ Cloud only |
| Cost | 💰 FREE (local) | 💰 FREE (local) | 💰 API cost |

### Latency

- **Prompt eval**: ~1.4ms/token (GPU)
- **Generation**: ~37ms/token (GPU Vulkan RX 570)
- **Total** (500 token prompt + 100 token output): ~4.4 segundos

## 🔄 Migración desde LFM2.5-Instruct

### Cambios Necesarios

1. **Modelo**: Cambiar de `-Instruct` a `-Extract`
2. **Temperature**: 0.1 → 0.0
3. **System Prompt**: Agregar JSON schema explícito
4. **Thinking Tags**: Remover `<thinking>` tags (no necesarios)
5. **JSON Schema**: Agregar `--json-schema-file` flag

### Código de Ejemplo

**Antes** (Instruct):
```javascript
const prompt = `
Analyze this code for localStorage keys.

Code:
${code}

Return JSON.
`;
```

**Después** (Extract):
```javascript
const systemPrompt = `
Extract localStorage keys and return as JSON:
{"localStorage_keys": ["string"], "lines": [number]}
`;

const prompt = `
Code to analyze:
${code}
`;
```

## 🐛 Troubleshooting

### Problema: Arrays vacíos en output

**Causa**: Schema no explícito o temperatura > 0

**Solución**:
1. Agregar schema detallado en system prompt
2. Temperature = 0.0
3. Usar `--json-schema-file`

### Problema: JSON malformado

**Causa**: Sin JSON schema enforcement

**Solución**:
```bash
llama-server --json-schema-file schema.json
```

### Problema: Inventa file names

**Causa**: Prompt sin cognitive vaccines

**Solución**:
```
System: NEVER invent file names.
Use ONLY files mentioned in context.
If not found, return empty array.
```

## 📚 Referencias

- [LFM2-1.2B-Extract (HuggingFace)](https://huggingface.co/LiquidAI/LFM2-1.2B-Extract)
- [LFM2-1.2B-Extract-GGUF](https://huggingface.co/LiquidAI/LFM2-1.2B-Extract-GGUF)
- [JSON Prompting Guide](https://codeconductor.ai/blog/structured-prompting-techniques-xml-json/)
- [Liquid AI Nanos Blog](https://www.liquid.ai/blog/introducing-liquid-nanos-frontier-grade-performance-on-everyday-devices)

## ✅ Checklist de Implementación

- [ ] Descargar LFM2-1.2B-Extract-Q8_0.gguf
- [ ] Crear extraction_schema.json
- [ ] Actualizar ai-config.json con schema en systemPrompt
- [ ] Cambiar temperature a 0.0
- [ ] Remover `<thinking>` tags del prompt
- [ ] Agregar `--json-schema-file` flag al servidor
- [ ] Probar con scenario-4-localStorage-bridge
- [ ] Validar que arrays se llenan correctamente
