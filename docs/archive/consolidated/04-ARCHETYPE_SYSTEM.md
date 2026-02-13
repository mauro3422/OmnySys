---
⚠️  DOCUMENTO ARCHIVADO - Ver nueva ubicación
---
Este documento ha sido consolidado en la nueva estructura de documentación.

📍 Nueva ubicación: Ver docs/archive/consolidated/README.md para el mapa completo

🚀 Usar en su lugar:
- docs/01-core/ (fundamentos)
- docs/02-architecture/ (sistemas)
- docs/04-guides/ (guías prácticas)

---
Documento original (mantenido para referencia histórica):
# Sistema de Arquetipos

Documento central del sistema de arquetipos. Para agregar un nuevo arquetipo, ver `ARCHETYPE_DEVELOPMENT_GUIDE.md`.

**Ãšltima actualizaciÃ³n**: v0.6.0 (2026-02-08) - Agregado sistema de confianza (confidence-based bypass)

---

## PropÃ³sito

Los arquetipos clasifican archivos y funciones segÃºn sus **patrones de conexiÃ³n**: cÃ³mo una entidad se conecta con otras entidades del proyecto. Imagina que cada archivo es una caja â€” al levantarla, ves cables conectados a otras cajas. El arquetipo te dice **quÃ© tipo de cables tiene** y cuÃ¡ntos.

**Los arquetipos NO son para detectar calidad de cÃ³digo.** Cosas como "usa CSS-in-JS" o "tiene tipos TypeScript" no son arquetipos porque no cambian las conexiones del archivo.

---

## Test de la Caja

Antes de crear un arquetipo, debe pasar este test: **"Al levantar la caja (archivo), este arquetipo me ayuda a ver cables (conexiones) que de otra forma no verÃ­a?"**

| Arquetipo | Pasa? | QuÃ© cables revela | Confidence |
|-----------|-------|-------------------|------------|
| `god-object` | SI | Caja con 20+ cables a todos lados. Alto blast radius. | Confidence-based |
| `dynamic-importer` | SI | Cables invisibles (resueltos en runtime). Sin anÃ¡lisis no los ves. | Siempre LLM |
| `event-hub` | SI | Cables invisibles (emit/listen). No aparecen en imports. | Confidence-based |
| `global-state` | SI | Cables invisibles via `window.*`. Conecta lectores con escritores. | Confidence-based |
| `state-manager` | SI | Cables a todos los consumidores de estado (localStorage, etc). | Confidence-based |
| `orphan-module` | SI | Caja SIN cables visibles. Sospechoso: o es cÃ³digo muerto o tiene cables ocultos. | Confidence-based |
| `singleton` | SI (dÃ©bil) | Acoplamiento implÃ­cito: todos los usuarios de la instancia estÃ¡n conectados entre sÃ­. | Confidence-based |
| `facade` | SI | Cables de re-export: todos los consumidores dependen transitivamente de los mÃ³dulos internos. | 1.0 (determinÃ­stico) |
| `config-hub` | SI | Caja de config con cables a todos los consumidores. Cambiar una key afecta a muchos. | 1.0 (determinÃ­stico) |
| `entry-point` | SI | Punto de entrada: cables de import hacia adentro, cero hacia afuera. | 1.0 (determinÃ­stico) |
| `network-hub` | SI | Cables compartidos por endpoints de API. MÃºltiples archivos llaman al mismo backend. | Confidence-based |
| `critical-bottleneck` | SI | Cables a muchos + alta complejidad + hotspot git. Punto crÃ­tico del sistema. | Confidence-based |
| `api-event-bridge` | SI | Cables de coordinaciÃ³n: APIs + eventos. Race conditions potenciales. | Confidence-based |
| `storage-sync-manager` | SI | Cables multi-tab: sincronizaciÃ³n de estado entre pestaÃ±as. | Confidence-based |
| `default` | N/A | Fallback, no es un arquetipo real. | N/A |

---

## Sistema de Confianza (Confidence-Based Bypass)

### Principio

> *"Si tenemos suficiente evidencia estÃ¡tica, no necesitamos LLM"*

Cada arquetipo ahora calcula un **score de confianza** (0.0 - 1.0) basado en evidencia metadata. Si confidence >= 0.8, se hace bypass del LLM.

### FÃ³rmula de Confianza

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
  
  // Evidencia de Ã¡tomos crÃ­ticos (0.4)
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
    // âœ… BYPASS: Evidencia suficiente
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
    // âš ï¸ CONDITIONAL: Evidencia parcial
    return {
      needsLLM: true,
      context: {
        confidence,
        evidence,
        missingInfo: inferMissingInfo(archetype, evidence),
        // Le damos al LLM el contexto de lo que YA sabemos
        promptAugmentation: `Ya detectÃ©: ${evidence.join(', ')}. 
                            Necesito verificar: ${inferMissingInfo(archetype, evidence)}`
      }
    };
  }
  
  // ðŸ” LLM FULL: Sin evidencia suficiente
  return {
    needsLLM: true,
    context: {
      confidence,
      evidence: [],
      missingInfo: 'all',
      promptAugmentation: 'AnÃ¡lisis completo necesario'
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
    context: 'Tengo evidencia de network + events, pero no sÃ© si coordina mÃºltiples APIs'
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
    context: 'Casi sin metadata. Necesito anÃ¡lisis completo.'
  }
}
```

---

## Regla LLM vs No-LLM (v0.6.0)

El sistema tiene **tres niveles** de decisiÃ³n LLM:

### Nivel 1: DeterminÃ­stico (Confidence = 1.0)

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

**Bypass automÃ¡tico si evidencia suficiente.**

### Nivel 3: Siempre LLM (confidence < 0.5 o casos especiales)

Arquetipos que requieren entendimiento semÃ¡ntico:

| Arquetipo | Por quÃ© siempre LLM |
|-----------|---------------------|
| `dynamic-importer` | Rutas dinÃ¡micas irresolubles estÃ¡ticamente |
| `api-event-bridge` | Necesita analizar timing y race conditions |
| `storage-sync-manager` | LÃ³gica de sync puede ser compleja |

---

## Pipeline de DecisiÃ³n LLM (v0.6)

```text
Layer A extrae metadata + Ã¡tomos
   |
   v
Derivation Engine calcula metadata molecular
   |
   v
detectArchetypes(metadata) -- evalÃºa TODOS los detectores
   |
   v
Por cada arquetipo detectado:
   |
   â”œâ”€ calculateConfidence(metadata)
   |      |
   |      â”œâ”€ confidence >= 0.8 â†’ BYPASS (no LLM)
   |      |
   |      â”œâ”€ 0.5 <= confidence < 0.8 â†’ CONDITIONAL LLM
   |      |                           (con contexto de evidencia)
   |      |
   |      â””â”€ confidence < 0.5 â†’ FULL LLM
   |
   v
Encolar para LLM (solo los que necesitan)
   |
   v
Merge resultados: estÃ¡ticos + LLM insights
```

### ImplementaciÃ³n

```javascript
// src/layer-b-semantic/llm-analyzer/analysis-decider.js

export function needsLLMAnalysis(archetype, fileAnalysis) {
  // Si es determinÃ­stico, nunca necesita LLM
  if (archetype.requiresLLM === false) {
    return false;
  }
  
  // Calcular confianza
  const { confidence, evidence } = archetype.calculateConfidence(fileAnalysis);
  
  // Threshold configurable
  const BYPASS_THRESHOLD = 0.8;
  
  if (confidence >= BYPASS_THRESHOLD) {
    // Guardar resultado estÃ¡tico
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

## Arquetipos Actuales (15) â€” ClasificaciÃ³n por Necesidad de LLM

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
| `critical-bottleneck` | 10 | gitHotspotScore > 3 + complexity O(nÂ²) + dependents > 5 |
| `api-event-bridge` | 8 | hasNetworkCalls + hasEventEmitters + endpoints > 1 |
| `storage-sync-manager` | 8 | hasLocalStorage + hasStorageEvent + connections > 2 |

### requiresLLM: true (siempre necesitan anÃ¡lisis semÃ¡ntico)

| Arquetipo | Severity | Por quÃ© siempre LLM |
|-----------|----------|---------------------|
| `dynamic-importer` | 7 | Rutas dinÃ¡micas irresolubles estÃ¡ticamente |
| `default` | 0 | Fallback, anÃ¡lisis general |

---

## Arquetipos AtÃ³micos (Nuevo en v0.6)

A nivel funciÃ³n (Ã¡tomo), detectores 100% estÃ¡ticos:

| Arquetipo AtÃ³mico | Detector | Severity |
|-------------------|----------|----------|
| `god-function` | complexity > 20 && lines > 100 | 9 |
| `fragile-network` | hasNetworkCalls && !hasErrorHandling | 8 |
| `hot-path` | isExported && calledBy.length > 5 | 7 |
| `dead-function` | !isExported && calledBy.length === 0 | 5 |
| `private-utility` | !isExported && calledBy.length > 0 && !hasSideEffects | 3 |
| `utility` | !hasSideEffects && complexity < 5 && lines < 20 | 2 |
| `standard` | Default | 1 |

**Nunca necesitan LLM** â€” son puramente estadÃ­sticos.

---

## Diagrama de Flujo Completo

```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Layer A (ExtracciÃ³n)                                            â”‚
â”‚ â€¢ Extraer Ã¡tomos (funciones) desde AST                          â”‚
â”‚ â€¢ Extraer metadata (57 campos)                                  â”‚
â”‚ â€¢ Guardar en atoms/ (SSOT)                                      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                           â”‚
                           â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Derivation Engine                                               â”‚
â”‚ â€¢ Componer molÃ©culas desde Ã¡tomos                               â”‚
â”‚ â€¢ Calcular metadata molecular (exports, complexity, risk)       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                           â”‚
                           â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Layer B (DetecciÃ³n)                                             â”‚
â”‚ â€¢ detectArchetypes(metadata)                                    â”‚
â”‚ â€¢ calculateConfidence() por arquetipo                           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                           â”‚
           â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
           â”‚               â”‚               â”‚
           â–¼               â–¼               â–¼
    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
    â”‚Confidenceâ”‚    â”‚Confidenceâ”‚    â”‚Confidenceâ”‚
    â”‚  >= 0.8  â”‚    â”‚  0.5-0.8 â”‚    â”‚  < 0.5   â”‚
    â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜
         â”‚               â”‚               â”‚
         â–¼               â–¼               â–¼
    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
    â”‚  BYPASS  â”‚    â”‚CONDITIONALâ”‚   â”‚  FULL    â”‚
    â”‚   No LLM â”‚    â”‚   LLM    â”‚    â”‚   LLM    â”‚
    â”‚   1.0ms  â”‚    â”‚  +contextâ”‚    â”‚   2-3s   â”‚
    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Anti-patrones

Antes de agregar un arquetipo, pregunta: **"Esto me dice algo sobre las CONEXIONES entre archivos?"**

| Pregunta | Respuesta | Es arquetipo? |
|----------|-----------|---------------|
| "Emite eventos custom" | Si, conexiÃ³n invisible | SI |
| "Lee localStorage" | Si, estado compartido entre archivos | SI |
| "Tiene 20 dependents" | Si, acoplamiento crÃ­tico | SI |
| "Usa CSS-in-JS" | No, es un detalle de estilo | NO |
| "Tiene TypeScript" | No, es un lenguaje | NO |
| "Tiene dependencias circulares" | Si, pero Layer A ya lo detecta | NO (no necesita arquetipo) |
| "Tiene muchos errores" | No, es calidad de cÃ³digo | NO |

Y antes de mandar algo al LLM, pregunta: **"La metadata ya me da esta conexiÃ³n con certeza?"**

| Dato | Necesita LLM? | Por quÃ© |
|------|--------------|---------|
| "File A y B comparten localStorage key 'token'" | NO | Regex + cross-reference da confidence 1.0 |
| "File A emite 'save' y File B escucha 'save'" | NO | Regex + cross-reference da confidence 1.0 |
| "File A tiene import() pero no sabemos quÃ© carga" | SI | Solo LLM puede inferir la ruta |
| "File A tiene 15 exports usados por 20 archivos + has-god-function" | NO | Confidence >= 0.8, bypass! |

---

## MÃ©tricas de Efectividad

### v0.5.x (antes de confidence-based)

| MÃ©trica | Valor |
|---------|-------|
| LLM Calls | ~30% de archivos |
| Tiempo promedio | ~2-3s por archivo |
| Bypass rate | 70% |

### v0.6.0 (con confidence-based)

| MÃ©trica | Valor | Mejora |
|---------|-------|--------|
| LLM Calls | ~10% de archivos | -66% |
| Tiempo promedio | ~0.5s por archivo | 5x mÃ¡s rÃ¡pido |
| Bypass rate | 90% | +20% |
| Confidence promedio | 0.87 | Alto |

---

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js` | DefiniciÃ³n de arquetipos + confidence calculators |
| `src/layer-b-semantic/llm-analyzer/analysis-decider.js` | LÃ³gica de decisiÃ³n LLM basada en confidence |
| `src/shared/derivation-engine.js` | DerivaciÃ³n de metadata molecular + DerivationCache |
| `src/core/unified-cache-manager/atoms.js` | CachÃ© de Ã¡tomos individuales |
| `src/layer-a-static/pipeline/molecular-extractor.js` | ExtracciÃ³n de Ã¡tomos desde AST |
| `src/layer-a-static/storage/storage-manager.js` | Almacenamiento atÃ³mico (SSOT) |

---

Ãšltima actualizaciÃ³n: 2026-02-08
VersiÃ³n: v0.6.0

