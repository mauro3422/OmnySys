# Sistema de Arquetipos - Catálogo y Extensión

**Versión**: v0.9.4  
**Estado**: Implementado (Confidence-Based Bypass activo)  
**Implementa**: [Pilar 1 - Box Test](../01-core/principles.md)

---

## ¿Qué son los Arquetipos?

Los arquetipos clasifican archivos y funciones según sus **patrones de conexión**: cómo una entidad se conecta con otras.

> **IMPORTANTE**: Los arquetipos NO detectan calidad de código. Cosas como "usa CSS-in-JS" o "tiene TypeScript" **NO son arquetipos** porque no cambian las conexiones del archivo.

---

## Parte 1: Catálogo de Arquetipos

### The Box Test (Pilar 1)

Antes de que un arquetipo sea válido, debe pasar este test:

> **"Al levantar la caja (archivo), este arquetipo me ayuda a ver cables (conexiones) que de otra forma no vería?"**

| Arquetipo | Pasa Box Test? | Qué cables revela | Nivel LLM |
|-----------|---------------|-------------------|-----------|
| `god-object` | ✅ | Caja con 20+ cables. Alto blast radius | Confidence-based |
| `dynamic-importer` | ✅ | Cables invisibles (runtime) | Siempre LLM |
| `event-hub` | ✅ | Cables invisibles (emit/listen) | Confidence-based |
| `global-state` | ✅ | Cables via `window.*` | Confidence-based |
| `state-manager` | ✅ | Cables a consumidores de estado | Confidence-based |
| `orphan-module` | ✅ | Caja SIN cables (sospechoso) | Confidence-based |
| `singleton` | ✅ | Acoplamiento implícito | Confidence-based |
| `facade` | ✅ | Cables de re-export | 1.0 (determinístico) |
| `config-hub` | ✅ | Cables de config a consumidores | 1.0 (determinístico) |
| `entry-point` | ✅ | Punto de entrada | 1.0 (determinístico) |
| `network-hub` | ✅ | Cables compartidos por APIs | Confidence-based |

**Anti-ejemplos** (NO son arquetipos):
- "usa CSS-in-JS" ❌ (estilo, no conexión)
- "tiene TypeScript" ❌ (lenguaje, no conexión)
- "tiene errores" ❌ (calidad, no conexión)

---

## Parte 2: Sistema de Confianza (Confidence-Based Bypass)

### Principio

> *"Si tenemos suficiente evidencia estática, no necesitamos LLM"*

Cada arquetipo calcula un **score de confianza** (0.0 - 1.0). Si confidence >= 0.8, se hace bypass del LLM.

### Fórmula de Confianza (ejemplo: god-object)

```javascript
const calculateConfidence = (metadata) => {
  let confidence = 0.0;
  const evidence = [];
  
  // Evidencia de exports (0.3)
  if (metadata.exportCount > 15) {
    confidence += 0.3;
    evidence.push(`exports:${metadata.exportCount}`);
  }
  
  // Evidencia de dependencias (0.3)
  const totalDeps = metadata.dependentCount + metadata.semanticDependentCount;
  if (totalDeps > 20) {
    confidence += 0.3;
    evidence.push(`dependents:${totalDeps}`);
  }
  
  // Evidencia de átomos críticos (0.4)
  const hasGodFunction = metadata.atoms?.some(
    a => a.archetype?.type === 'god-function'
  );
  if (hasGodFunction) {
    confidence += 0.4;
    evidence.push('has-god-function');
  }
  
  return { confidence: Math.min(confidence, 1.0), evidence };
};
```

### Decision Matrix

```javascript
function decideLLMNeed(archetype, metadata) {
  const { confidence, evidence } = calculateConfidence(metadata);
  
  if (confidence >= 0.8) {
    // ✅ BYPASS: Evidencia suficiente
    return { needsLLM: false, result: { type: archetype.type, confidence, evidence } };
  }
  
  if (confidence >= 0.5) {
    // ⚠️ CONDITIONAL: Evidencia parcial, LLM con contexto
    return { 
      needsLLM: true, 
      context: { confidence, evidence, missingInfo: inferMissingInfo(archetype, evidence) }
    };
  }
  
  // 🔍 LLM FULL: Sin evidencia suficiente
  return { needsLLM: true, context: { confidence: 0.2, evidence: [], missingInfo: 'all' } };
}
```

### Niveles de Confianza

| Nivel | Rango | Acción | Ejemplo |
|-------|-------|--------|---------|
| **1.0** | Confidence = 1.0 | Nunca necesita LLM | `facade`: `reExportCount >= 3` |
| **2** | 0.8 - 1.0 | Bypass automático | `god-object`: exports>15 + deps>20 |
| **3** | 0.5 - 0.8 | Conditional LLM | `event-hub`: eventos cruzados parcialmente |
| **4** | < 0.5 | Full LLM | `dynamic-importer`: rutas runtime |

### Métricas de Mejora (v0.6)

| Métrica | Antes (v0.5) | Después (v0.6) | Mejora |
|---------|--------------|----------------|--------|
| LLM Calls | 30% de archivos | 10% de archivos | **-66%** |
| Tiempo de análisis | ~5s/archivo | ~1s promedio | **5x** |
| Bypass rate | 70% | 90% | **+20%** |
| False positives | 8% | 3% | **-62%** |

---

## Parte 3: Arquetipos Atómicos

Los arquetipos también se aplican a **funciones individuales** (átomos):

| Arquetipo | Detector | Evidencia |
|-----------|----------|-----------|
| `god-function` | `complexity > 20 && lines > 100` | Métricas AST |
| `fragile-network` | `hasNetworkCalls && !hasErrorHandling` | Side effects |
| `hot-path` | `isExported && calledBy.length > 5` | Call graph |
| `dead-function` | `!isExported && calledBy.length === 0` | Call graph |
| `utility` | `!hasSideEffects && complexity < 5` | Side effects |
| `standard` | default | Fallback |

Estos alimentan los detectores moleculares (ej: `has-god-function` contribuye a `god-object`).

---

## Parte 4: Cómo Agregar Nuevos Arquetipos

### Checklist de Validación

Antes de crear un arquetipo, responde:

1. **¿Esto me dice algo sobre CONEXIONES entre archivos?**
   - Si NO → No es arquetipo, solo metadata

2. **¿La metadata sola puede determinar el patrón Y la acción?**
   - Si SÍ ambas → Nivel 1 (1.0), no necesita LLM

3. **¿El LLM aporta algo que la metadata no puede?**
   - Si SÍ → Nivel 3-4 (conditional/full LLM)

### Flujo de Implementación

```
Paso 0: Validar propósito (Box Test)
   ↓
Paso 1: Definir señal de metadata
   ↓
Paso 2: Crear template del prompt (src/layer-b-semantic/prompt-engine/prompt-templates/)
   ↓
Paso 3: Crear JSON Schema (opcional)
   ↓
Paso 4: Registrar en PROMPT_REGISTRY
   ↓
Paso 5: Calcular confidence para bypass
   ↓
Paso 6: Documentar en PR (Cognitive Vaccine)
```

### Ejemplo: Agregando "rate-limited-api"

**Paso 0: Box Test**
> "¿Detectar rate limiting revela conexiones?"
> 
> ✅ SÍ - Archivos que comparten rate limit están acoplados.

**Paso 1: Metadata**
```javascript
// En buildPromptMetadata()
{
  hasNetworkCalls: true,
  hasRateLimiting: boolean,
  rateLimitIndicators: ['x-rate-limit', 'retry-after']
}
```

**Paso 2: Template**
```javascript
// rate-limited-api.js
export const rateLimitedApiTemplate = {
  system: `Detecta si este archivo interactúa con APIs rate-limited.
Responde en JSON: { "hasRateLimitedAPIs": boolean, "confidence": number }`,
  user: `{fileContent}
Indicadores detectados: {rateLimitIndicators}`
};
```

**Paso 4: Registro**
```javascript
'rate-limited-api': {
  template: rateLimitedApiTemplate,
  detector: (m) => m.hasNetworkCalls && m.hasRateLimiting,
  confidenceCalculator: (m) => {
    let confidence = 0;
    if (m.rateLimitIndicators?.length > 0) confidence += 0.5;
    if (m.hasRateLimiting) confidence += 0.5;
    return { confidence, evidence: ['rate-limit-detected'] };
  },
  requiresLLM: 'conditional',
  severity: 6,
  mergeKey: 'rateLimitAnalysis'
}
```

### Consejos

**✅ DO:**
- Usar metadata ya existente
- Calcular confidence basado en evidencia concreta
- Documentar el "por qué" del Box Test
- Testear con casos reales

**❌ DON'T:**
- Crear arquetipos por "sería interesante"
- Usar LLM para cosas que metadata puede determinar
- Ignorar el confidence calculation

---

## Pipeline de Decisión Completo

```
Layer A extrae metadata + átomos
   │
   ▼
Derivation Engine calcula metadata molecular
   │
   ▼
detectArchetypes(metadata) -- evalúa TODOS los detectores
   │
   ▼
Por cada arquetipo detectado:
   │
   ├─ calculateConfidence(metadata)
   │      │
   │      ├─ confidence >= 0.8 → BYPASS (no LLM)
   │      │
   │      ├─ 0.5 <= confidence < 0.8 → CONDITIONAL LLM
   │      │
   │      └─ confidence < 0.5 → FULL LLM
   │
   ▼
Encolar para LLM (solo los que necesitan)
   │
   ▼
LLM Analyzer procesa con contexto enriquecido
   │
   ▼
Merge insights con metadata estática
```

---

## Referencias

- [principles.md](../01-core/principles.md) - Los 4 Pilares (Box Test)
- [03-orchestrator/03-orchestrator-interno.md](../03-orchestrator/03-orchestrator-interno.md) - Decisión LLM en orchestrator
- Código: `src/layer-b-semantic/prompt-engine/`

---

**Documentos consolidados:**
- `archetypes/system.md` - Catálogo y sistema de confianza
- `archetypes/development.md` - Guía de extensión
- `archetypes/README.md` - (integrado)

**Estado**: ✅ Implementado y operativo
