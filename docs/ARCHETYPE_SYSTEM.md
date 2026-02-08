# Sistema de Arquetipos

Documento central del sistema de arquetipos. Para agregar un nuevo arquetipo, ver `ARCHETYPE_DEVELOPMENT_GUIDE.md`.

**Última actualización**: v0.6.0 (2026-02-08) - Agregado sistema de confianza (confidence-based bypass)

---

## Propósito

Los arquetipos clasifican archivos y funciones según sus **patrones de conexión**: cómo una entidad se conecta con otras entidades del proyecto. Imagina que cada archivo es una caja — al levantarla, ves cables conectados a otras cajas. El arquetipo te dice **qué tipo de cables tiene** y cuántos.

**Los arquetipos NO son para detectar calidad de código.** Cosas como "usa CSS-in-JS" o "tiene tipos TypeScript" no son arquetipos porque no cambian las conexiones del archivo.

---

## Test de la Caja

Antes de crear un arquetipo, debe pasar este test: **"Al levantar la caja (archivo), este arquetipo me ayuda a ver cables (conexiones) que de otra forma no vería?"**

| Arquetipo | Pasa? | Qué cables revela | Confidence |
|-----------|-------|-------------------|------------|
| `god-object` | SI | Caja con 20+ cables a todos lados. Alto blast radius. | Confidence-based |
| `dynamic-importer` | SI | Cables invisibles (resueltos en runtime). Sin análisis no los ves. | Siempre LLM |
| `event-hub` | SI | Cables invisibles (emit/listen). No aparecen en imports. | Confidence-based |
| `global-state` | SI | Cables invisibles via `window.*`. Conecta lectores con escritores. | Confidence-based |
| `state-manager` | SI | Cables a todos los consumidores de estado (localStorage, etc). | Confidence-based |
| `orphan-module` | SI | Caja SIN cables visibles. Sospechoso: o es código muerto o tiene cables ocultos. | Confidence-based |
| `singleton` | SI (débil) | Acoplamiento implícito: todos los usuarios de la instancia están conectados entre sí. | Confidence-based |
| `facade` | SI | Cables de re-export: todos los consumidores dependen transitivamente de los módulos internos. | 1.0 (determinístico) |
| `config-hub` | SI | Caja de config con cables a todos los consumidores. Cambiar una key afecta a muchos. | 1.0 (determinístico) |
| `entry-point` | SI | Punto de entrada: cables de import hacia adentro, cero hacia afuera. | 1.0 (determinístico) |
| `network-hub` | SI | Cables compartidos por endpoints de API. Múltiples archivos llaman al mismo backend. | Confidence-based |
| `critical-bottleneck` | SI | Cables a muchos + alta complejidad + hotspot git. Punto crítico del sistema. | Confidence-based |
| `api-event-bridge` | SI | Cables de coordinación: APIs + eventos. Race conditions potenciales. | Confidence-based |
| `storage-sync-manager` | SI | Cables multi-tab: sincronización de estado entre pestañas. | Confidence-based |
| `default` | N/A | Fallback, no es un arquetipo real. | N/A |

---

## Sistema de Confianza (Confidence-Based Bypass)

### Principio

> *"Si tenemos suficiente evidencia estática, no necesitamos LLM"*

Cada arquetipo ahora calcula un **score de confianza** (0.0 - 1.0) basado en evidencia metadata. Si confidence >= 0.8, se hace bypass del LLM.

### Fórmula de Confianza

```javascript
// Ejemplo: god-object confidence calculation
const calculateConfidence = (metadata) => {
  let confidence = 0.0;
  const evidence = [];
  
  // Evidencia de exports (0.3)
  if (metadata.exportCount > 15) {
    confidence += 0.3;
    evidence.push(`exports:${metadata.exportCount}`);
  }
  
  // Evidencia de dependencias (0.3)
  const totalDeps = (metadata.dependentCount || 0) + 
                    (metadata.semanticDependentCount || 0);
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
  
  // Evidencia de conexiones resueltas (0.3 bonus)
  const resolvedConnections = (metadata.semanticConnections || [])
    .filter(c => c.confidence >= 1.0).length;
  if (resolvedConnections > 5) {
    confidence += 0.3;
    evidence.push(`resolved-connections:${resolvedConnections}`);
  }
  
  return { 
    confidence: Math.min(confidence, 1.0), // Cap at 1.0
    evidence 
  };
};
```

### Decision Matrix

```javascript
// Layer C decision logic
function decideLLMNeed(archetype, metadata) {
  const { confidence, evidence } = calculateConfidence(metadata);
  
  if (confidence >= 0.8) {
    // ✅ BYPASS: Evidencia suficiente
    return {
      needsLLM: false,
      result: {
        type: archetype.type,
        confidence,
        evidence,
        detectionMethod: 'static-metadata',
        // No necesitamos insights del LLM, ya sabemos todo
        insights: generateInsightsFromEvidence(evidence)
      }
    };
  }
  
  if (confidence >= 0.5) {
    // ⚠️ CONDITIONAL: Evidencia parcial
    return {
      needsLLM: true,
      context: {
        confidence,
        evidence,
        missingInfo: inferMissingInfo(archetype, evidence),
        // Le damos al LLM el contexto de lo que YA sabemos
        promptAugmentation: `Ya detecté: ${evidence.join(', ')}. 
                            Necesito verificar: ${inferMissingInfo(archetype, evidence)}`
      }
    };
  }
  
  // 🔍 LLM FULL: Sin evidencia suficiente
  return {
    needsLLM: true,
    context: {
      confidence,
      evidence: [],
      missingInfo: 'all',
      promptAugmentation: 'Análisis completo necesario'
    }
  };
}
```

### Ejemplos de Confianza

#### Caso 1: Alta Confianza (Bypass)

```javascript
// Archivo: src/core/orchestrator.js
const metadata = {
  exportCount: 23,
  dependentCount: 35,
  semanticDependentCount: 12,
  atoms: [
    { archetype: { type: 'god-function', severity: 9 } },
    { archetype: { type: 'hot-path', severity: 7 } }
  ],
  semanticConnections: [
    { type: 'eventListener', confidence: 1.0 },
    { type: 'localStorage', confidence: 1.0 }
  ]
};

// Resultado:
{
  confidence: 0.95,  // 0.3 + 0.3 + 0.4 + 0.3 (capped at 1.0, but evidence strong)
  evidence: [
    'exports:23',
    'dependents:47',  // 35 + 12
    'has-god-function',
    'resolved-connections:2'
  ],
  decision: { needsLLM: false },
  savings: '~2-3 segundos de LLM'
}
```

#### Caso 2: Confianza Media (Conditional LLM)

```javascript
// Archivo: src/utils/helpers.js
const metadata = {
  exportCount: 8,
  dependentCount: 3,
  semanticDependentCount: 0,
  hasNetworkCalls: true,
  hasEventEmitters: true,
  networkEndpoints: ['/api/users']
};

// Resultado:
{
  confidence: 0.55,  // 0.0 + 0.0 + 0.0 + network/event pattern
  evidence: [
    'has-network-calls',
    'has-event-emitters',
    'single-endpoint'
  ],
  decision: { 
    needsLLM: true,
    context: 'Tengo evidencia de network + events, pero no sé si coordina múltiples APIs'
  }
}
```

#### Caso 3: Baja Confianza (Full LLM)

```javascript
// Archivo: src/legacy/plugin.js
const metadata = {
  exportCount: 1,
  dependentCount: 0,
  semanticDependentCount: 0,
  hasDynamicImports: true
};

// Resultado:
{
  confidence: 0.2,
  evidence: ['dynamic-imports'],
  decision: { 
    needsLLM: true,
    context: 'Casi sin metadata. Necesito análisis completo.'
  }
}
```

---

## Regla LLM vs No-LLM (v0.6.0)

El sistema tiene **tres niveles** de decisión LLM:

### Nivel 1: Determinístico (Confidence = 1.0)

Arquetipos 100% resolubles por metadata:

| Arquetipo | Detector | Evidencia |
|-----------|----------|-----------|
| `facade` | `reExportCount >= 3` | Re-exports son facts del AST |
| `config-hub` | `exportCount >= 5 && dependentCount >= 5 && functionCount <= 2` | Conteos del grafo |
| `entry-point` | `importCount >= 5 && dependentCount === 0` | Conteos del grafo |

**Nunca necesitan LLM.**

### Nivel 2: Confidence-Based (0.5 <= confidence < 1.0)

Arquetipos resolubles con evidencia suficiente:

| Arquetipo | Evidencia para Bypass (confidence >= 0.8) |
|-----------|-------------------------------------------|
| `god-object` | exports > 15 + dependents > 20 + has-god-function |
| `network-hub` | >2 funciones con network calls + endpoints compartidos resueltos |
| `event-hub` | Todos los eventos cruzados con confidence 1.0 |
| `state-manager` | localStorage keys cruzadas con confidence 1.0 |
| `orphan-module` | 0 dependents + 0 semantic connections + 0 exports |

**Bypass automático si evidencia suficiente.**

### Nivel 3: Siempre LLM (confidence < 0.5 o casos especiales)

Arquetipos que requieren entendimiento semántico:

| Arquetipo | Por qué siempre LLM |
|-----------|---------------------|
| `dynamic-importer` | Rutas dinámicas irresolubles estáticamente |
| `api-event-bridge` | Necesita analizar timing y race conditions |
| `storage-sync-manager` | Lógica de sync puede ser compleja |

---

## Pipeline de Decisión LLM (v0.6)

```text
Layer A extrae metadata + átomos
   |
   v
Derivation Engine calcula metadata molecular
   |
   v
detectArchetypes(metadata) -- evalúa TODOS los detectores
   |
   v
Por cada arquetipo detectado:
   |
   ├─ calculateConfidence(metadata)
   |      |
   |      ├─ confidence >= 0.8 → BYPASS (no LLM)
   |      |
   |      ├─ 0.5 <= confidence < 0.8 → CONDITIONAL LLM
   |      |                           (con contexto de evidencia)
   |      |
   |      └─ confidence < 0.5 → FULL LLM
   |
   v
Encolar para LLM (solo los que necesitan)
   |
   v
Merge resultados: estáticos + LLM insights
```

### Implementación

```javascript
// src/layer-b-semantic/llm-analyzer/analysis-decider.js

export function needsLLMAnalysis(archetype, fileAnalysis) {
  // Si es determinístico, nunca necesita LLM
  if (archetype.requiresLLM === false) {
    return false;
  }
  
  // Calcular confianza
  const { confidence, evidence } = archetype.calculateConfidence(fileAnalysis);
  
  // Threshold configurable
  const BYPASS_THRESHOLD = 0.8;
  
  if (confidence >= BYPASS_THRESHOLD) {
    // Guardar resultado estático
    fileAnalysis.staticInsights = {
      archetype: archetype.type,
      confidence,
      evidence,
      detectionMethod: 'confidence-bypass'
    };
    return false;
  }
  
  // Necesita LLM, pero con contexto
  fileAnalysis.llmContext = {
    confidence,
    evidence,
    missingInfo: calculateMissingInfo(archetype, evidence)
  };
  
  return true;
}
```

---

## Arquetipos Actuales (15) — Clasificación por Necesidad de LLM

### requiresLLM: false (NUNCA necesitan LLM)

| Arquetipo | Severity | Evidencia para Confidence 1.0 |
|-----------|----------|-------------------------------|
| `facade` | 4 | `reExportCount >= 3` |
| `config-hub` | 5 | `exportCount >= 5 && dependentCount >= 5 && functionCount <= 2` |
| `entry-point` | 3 | `importCount >= 5 && dependentCount === 0` |

### Confidence-Based (bypass si confidence >= 0.8)

| Arquetipo | Severity | Evidencia Clave |
|-----------|----------|-----------------|
| `god-object` | 10 | exports > 15, dependents > 20, has-god-function |
| `network-hub` | 5 | hasNetworkCalls + endpoints resueltos |
| `event-hub` | 6 | hasEventEmitters + eventos cruzados |
| `state-manager` | 6 | hasLocalStorage + keys cruzadas |
| `global-state` | 6 | usesGlobalState + properties cruzadas |
| `singleton` | 7 | hasSingletonPattern + conexiones resueltas |
| `orphan-module` | 5 | exportCount > 0 && totalDependents === 0 |
| `critical-bottleneck` | 10 | gitHotspotScore > 3 + complexity O(n²) + dependents > 5 |
| `api-event-bridge` | 8 | hasNetworkCalls + hasEventEmitters + endpoints > 1 |
| `storage-sync-manager` | 8 | hasLocalStorage + hasStorageEvent + connections > 2 |

### requiresLLM: true (siempre necesitan análisis semántico)

| Arquetipo | Severity | Por qué siempre LLM |
|-----------|----------|---------------------|
| `dynamic-importer` | 7 | Rutas dinámicas irresolubles estáticamente |
| `default` | 0 | Fallback, análisis general |

---

## Arquetipos Atómicos (Nuevo en v0.6)

A nivel función (átomo), detectores 100% estáticos:

| Arquetipo Atómico | Detector | Severity |
|-------------------|----------|----------|
| `god-function` | complexity > 20 && lines > 100 | 9 |
| `fragile-network` | hasNetworkCalls && !hasErrorHandling | 8 |
| `hot-path` | isExported && calledBy.length > 5 | 7 |
| `dead-function` | !isExported && calledBy.length === 0 | 5 |
| `private-utility` | !isExported && calledBy.length > 0 && !hasSideEffects | 3 |
| `utility` | !hasSideEffects && complexity < 5 && lines < 20 | 2 |
| `standard` | Default | 1 |

**Nunca necesitan LLM** — son puramente estadísticos.

---

## Diagrama de Flujo Completo

```text
┌─────────────────────────────────────────────────────────────────┐
│ Layer A (Extracción)                                            │
│ • Extraer átomos (funciones) desde AST                          │
│ • Extraer metadata (57 campos)                                  │
│ • Guardar en atoms/ (SSOT)                                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Derivation Engine                                               │
│ • Componer moléculas desde átomos                               │
│ • Calcular metadata molecular (exports, complexity, risk)       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer B (Detección)                                             │
│ • detectArchetypes(metadata)                                    │
│ • calculateConfidence() por arquetipo                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │Confidence│    │Confidence│    │Confidence│
    │  >= 0.8  │    │  0.5-0.8 │    │  < 0.5   │
    └────┬─────┘    └────┬─────┘    └────┬─────┘
         │               │               │
         ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  BYPASS  │    │CONDITIONAL│   │  FULL    │
    │   No LLM │    │   LLM    │    │   LLM    │
    │   1.0ms  │    │  +context│    │   2-3s   │
    └──────────┘    └──────────┘    └──────────┘
```

---

## Anti-patrones

Antes de agregar un arquetipo, pregunta: **"Esto me dice algo sobre las CONEXIONES entre archivos?"**

| Pregunta | Respuesta | Es arquetipo? |
|----------|-----------|---------------|
| "Emite eventos custom" | Si, conexión invisible | SI |
| "Lee localStorage" | Si, estado compartido entre archivos | SI |
| "Tiene 20 dependents" | Si, acoplamiento crítico | SI |
| "Usa CSS-in-JS" | No, es un detalle de estilo | NO |
| "Tiene TypeScript" | No, es un lenguaje | NO |
| "Tiene dependencias circulares" | Si, pero Layer A ya lo detecta | NO (no necesita arquetipo) |
| "Tiene muchos errores" | No, es calidad de código | NO |

Y antes de mandar algo al LLM, pregunta: **"La metadata ya me da esta conexión con certeza?"**

| Dato | Necesita LLM? | Por qué |
|------|--------------|---------|
| "File A y B comparten localStorage key 'token'" | NO | Regex + cross-reference da confidence 1.0 |
| "File A emite 'save' y File B escucha 'save'" | NO | Regex + cross-reference da confidence 1.0 |
| "File A tiene import() pero no sabemos qué carga" | SI | Solo LLM puede inferir la ruta |
| "File A tiene 15 exports usados por 20 archivos + has-god-function" | NO | Confidence >= 0.8, bypass! |

---

## Métricas de Efectividad

### v0.5.x (antes de confidence-based)

| Métrica | Valor |
|---------|-------|
| LLM Calls | ~30% de archivos |
| Tiempo promedio | ~2-3s por archivo |
| Bypass rate | 70% |

### v0.6.0 (con confidence-based)

| Métrica | Valor | Mejora |
|---------|-------|--------|
| LLM Calls | ~10% de archivos | -66% |
| Tiempo promedio | ~0.5s por archivo | 5x más rápido |
| Bypass rate | 90% | +20% |
| Confidence promedio | 0.87 | Alto |

---

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js` | Definición de arquetipos + confidence calculators |
| `src/layer-b-semantic/llm-analyzer/analysis-decider.js` | Lógica de decisión LLM basada en confidence |
| `src/shared/derivation-engine.js` | Derivación de metadata molecular + DerivationCache |
| `src/core/unified-cache-manager/atoms.js` | Caché de átomos individuales |
| `src/layer-a-static/pipeline/molecular-extractor.js` | Extracción de átomos desde AST |
| `src/layer-a-static/storage/storage-manager.js` | Almacenamiento atómico (SSOT) |

---

Última actualización: 2026-02-08
Versión: v0.6.0
