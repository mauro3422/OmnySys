# Guía de Prompting para LFM2-Extract

## 📋 Resumen Ejecutivo

**LFM2-Extract** (350M y 1.2B) está diseñado específicamente para **extracción estructurada**.

---

## 🎯 Principios Fundamentales

### 1. Temperature = 0 (Greedy Decoding)
```javascript
{ "temperature": 0.0, "max_tokens": 1000 }
```

### 2. ChatML Format (RECOMENDADO)
```javascript
systemPrompt: `<|im_start|>system
Schema (root object, NO wrappers):
{ "field": "type" }
<|im_end|>`

userPrompt: `<|im_start|>user
Context...
<|im_end|>
<|im_start|>assistant`
```

### 3. ⚠️ VERIFICACIÓN CRÍTICA: Cliente LLM

**El BUG más común:** El cliente filtra campos de la respuesta.

```javascript
// ❌ INCORRECTO - Filtra campos
return {
  sharedState: parsed.sharedState || [],
  events: parsed.events || [],
  confidence: parsed.confidence
  // ❌ Faltan: responsibilities, riskLevel, etc.
};

// ✅ CORRECTO - Preservar TODO
return {
  ...parsed,  // Spread operator preserva todos los campos
  confidence: parsed.confidence || 0.5,
  reasoning: parsed.reasoning || 'No reasoning provided'
};
```

**Siempre verificar:** El cliente LLM debe usar `...parsed` para no perder campos.

---

## 🏗️ Estructura Template Estándar

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

---

## ✅ Checklist Implementación

- [ ] `temperature: 0.0` en config
- [ ] ChatML format con `<|im_start|>`
- [ ] Schema claro "root object, NO wrappers"
- [ ] Cliente LLM usa `...parsed` para preservar campos
- [ ] Template en `prompt-templates/<tipo>.js`
- [ ] Registrado en `prompt-selector.js`
- [ ] Mapeado en `getTemplate()` del selector

---

## 🐛 Errores Comunes

### Error 1: Cliente filtra campos
**Síntoma:** Responsabilidades extraídas pero no guardadas.
**Fix:** Usar `return { ...parsed, ... }` en `llm-client.js`.

### Error 2: Wrapper objects
**Síntoma:** `{ "tipo": { "data": ... } }`
**Fix:** Cognitive vaccine: "Return root object directly".

### Error 3: Caché corrupta
**Síntoma:** Cambios en prompt no tienen efecto.
**Fix:** Eliminar `.OmnySysData/unified-cache/`.

---

## 📊 Template de Ejemplo: God Object

```javascript
export default {
  systemPrompt: `<|im_start|>system
You are a specialized data extractor.

Schema (root object, NO wrappers):
{
  "confidence": 0.0-1.0,
  "riskLevel": "high|medium|low|none",
  "responsibilities": ["string"],
  "impactScore": 0.0-1.0,
  "reasoning": "string"
}

Instructions:
- Extract from code: responsibilities = purposes of exports
- riskLevel: "high" if >10 dependents with mixed purposes
- NO wrappers
<|im_end|>`,

  userPrompt: `<|im_start|>user
FILE: {filePath}
EXPORTS: {exports}
DEPENDENTS: {dependentCount}

CODE:
{fileContent}

Extract God Object analysis.<|im_end|>
<|im_start|>assistant`
};
```

---

## 🔧 Testing Rápido

```bash
# Crear script test-llm-prompt.js
node test-llm-prompt.js <archivo>

# Verificar cliente no filtra
cat src/ai/llm-client.js | grep -A5 "JSON.parse"
# Debería ver: return { ...parsed, ... }
```

---

**Versión:** 4.0 (Con verificación de cliente LLM)
**Última actualización:** 2026-02-04
