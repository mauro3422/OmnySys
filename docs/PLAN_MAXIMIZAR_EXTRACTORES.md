# PLAN: Maximizar Uso de Extractores - Reducir LLM 70%+

## 🎯 Objetivo

Usar los **89 extractores existentes** para enriquecer el análisis de arquetipos **SIN LLM**, reduciendo el uso de IA de 89 archivos a ~15-20 archivos (reducción del 80%).

## 📊 Situación Actual

**Extractores disponibles:** 89 en 14 categorías  
**Extractores usados:** ~15 (17%)  
**Potencial desperdiciado:** 83%

## 💡 Estrategia: "Enriquecimiento en Capas"

```
Capa 1: Extracción Básica (YA LO TENEMOS)
  ↓
Capa 2: Enriquecimiento con Extractores Especializados (NUEVO)
  ↓  
Capa 3: Detección de Arquetipos por Reglas (NUEVO)
  ↓
Capa 4: Bypass LLM para casos resueltos (NUEVO)
  ↓
Capa 5: LLM Solo para casos complejos (REDUCIDO 80%)
```

## 🔧 Implementación Paso a Paso

### FASE 1: Integrar Metadata Extractors (2 horas)

**Archivo a crear:** `src/layer-b-semantic/enrichers/metadata-enricher.js`

```javascript
/**
 * Enriquece átomos con metadata de los extractores especializados
 * Esto reemplaza parte del análisis que hace LLM
 */

import { extractDNA } from '../../layer-a-static/extractors/metadata/dna-extractor.js';
import { extractAsyncPatterns } from '../../layer-a-static/extractors/metadata/async-patterns.js';
import { extractErrorHandling } from '../../layer-a-static/extractors/metadata/error-handling.js';
import { calculateDependencyDepth } from '../../layer-a-static/extractors/metadata/dependency-depth.js';
import { extractPerformanceHints } from '../../layer-a-static/extractors/metadata/performance-hints.js';
import { extractJSDocContracts } from '../../layer-a-static/extractors/metadata/jsdoc-contracts.js';

export function enrichAtomWithMetadata(atom, fileAnalysis) {
  // 1. ADN Estructural (fingerprint único)
  const dna = extractDNA(atom);
  
  // 2. Patrones Async (detecta race conditions sin LLM)
  const asyncPatterns = extractAsyncPatterns(atom);
  
  // 3. Manejo de errores (detecta fragilidad sin LLM)
  const errorHandling = extractErrorHandling(atom);
  
  // 4. Profundidad de dependencias (detecta god-functions sin LLM)
  const dependencyDepth = calculateDependencyDepth(atom, fileAnalysis);
  
  // 5. Performance hints (detecta problemas de performance sin LLM)
  const performance = extractPerformanceHints(atom);
  
  // 6. JSDoc contracts (detecta contratos de API sin LLM)
  const contracts = extractJSDocContracts(atom);
  
  return {
    ...atom,
    enriched: {
      dna,
      asyncPatterns,
      errorHandling,
      dependencyDepth,
      performance,
      contracts,
      enrichmentTimestamp: Date.now()
    }
  };
}
```

**Impacto:** Cada átomo ahora tiene 6 dimensiones de metadata que antes solo LLM podía detectar.

### FASE 2: Detección de Arquetipos por Reglas (2 horas)

**Archivo a crear:** `src/layer-b-semantic/archetype-detectors/rule-based-detector.js`

```javascript
/**
 * Detecta arquetipos usando REGLAS sobre metadata enriquecida
 * Esto reemplaza LLM para casos obvios
 */

import { Archetype } from '../archetypes/constants.js';

export function detectArchetypeByRules(enrichedAtom) {
  const rules = [
    // Regla 1: God Function
    {
      archetype: Archetype.GOD_FUNCTION,
      condition: (atom) => 
        atom.enriched.dependencyDepth.score > 8 ||
        atom.dataFlow.sideEffects.length > 5 ||
        atom.complexity > 15,
      confidence: 0.9
    },
    
    // Regla 2: Async Fragility
    {
      archetype: Archetype.FRAGILE_NETWORK,
      condition: (atom) =>
        atom.enriched.asyncPatterns.hasAsync &&
        !atom.enriched.asyncPatterns.hasErrorHandling &&
        atom.enriched.asyncPatterns.retryCount === 0,
      confidence: 0.85
    },
    
    // Regla 3: Error Handler
    {
      archetype: Archetype.ERROR_HANDLER,
      condition: (atom) =>
        atom.enriched.errorHandling.catches > 3 &&
        atom.name.toLowerCase().includes('error'),
      confidence: 0.95
    },
    
    // Regla 4: Pure Function
    {
      archetype: Archetype.PURE_FUNCTION,
      condition: (atom) =>
        atom.dataFlow.sideEffects.length === 0 &&
        atom.enriched.dependencyDepth.score === 0 &&
        atom.dataFlow.inputs.length > 0 &&
        atom.dataFlow.outputs.length > 0,
      confidence: 0.9
    },
    
    // Regla 5: Event Handler
    {
      archetype: Archetype.EVENT_HANDLER,
      condition: (atom) =>
        atom.name.toLowerCase().includes('handle') ||
        atom.name.toLowerCase().includes('on') ||
        atom.dataFlow.sideEffects.some(s => s.type === 'event-emit'),
      confidence: 0.8
    },
    
    // Regla 6: Data Transformer
    {
      archetype: Archetype.DATA_TRANSFORMER,
      condition: (atom) =>
        atom.dataFlow.transformations.length > 2 &&
        atom.dataFlow.sideEffects.length === 0 &&
        atom.dataFlow.inputs.length === atom.dataFlow.outputs.length,
      confidence: 0.85
    },
    
    // Regla 7: API Client
    {
      archetype: Archetype.API_CLIENT,
      condition: (atom) =>
        atom.enriched.asyncPatterns.hasFetch ||
        atom.calls.some(c => c.includes('fetch') || c.includes('axios')),
      confidence: 0.9
    },
    
    // Regla 8: Configuration Hub
    {
      archetype: Archetype.CONFIG_HUB,
      condition: (atom) =>
        atom.name.toLowerCase().includes('config') ||
        atom.name.toLowerCase().includes('settings') ||
        atom.dataFlow.inputs.some(i => i.name.includes('config')),
      confidence: 0.75
    }
  ];
  
  // Evaluar todas las reglas
  const matches = rules
    .filter(rule => rule.condition(enrichedAtom))
    .map(rule => ({
      archetype: rule.archetype,
      confidence: rule.confidence,
      reason: `Rule-based detection: ${rule.archetype}`
    }));
  
  // Retornar el mejor match o null si ninguno
  return matches.length > 0 
    ? matches.sort((a, b) => b.confidence - a.confidence)[0]
    : null;
}
```

**Impacto:** Detectamos 8 arquetipos comunes SIN LLM con 75-95% de confianza.

### FASE 3: Gate 2.5 - Bypass para casos resueltos (1 hora)

**Modificar:** `src/core/orchestrator/llm-analysis.js`

```javascript
// ANTES:
function shouldUseLLM(archetypes, fileAnalysis) {
  if (archetypes.length === 0) return false;
  if (archetypes.some(a => a.requiresLLM === false)) return false;
  return true; // Todo lo demás va a LLM
}

// DESPUÉS:
function shouldUseLLM(archetypes, fileAnalysis, enrichedMetadata) {
  // Gate 1: Sin arquetipos
  if (archetypes.length === 0) return false;
  
  // Gate 2: Arquetipos con requiresLLM = false
  if (archetypes.every(a => a.requiresLLM === false)) return false;
  
  // 🆕 Gate 2.5: Reglas detectaron arquetipo con alta confianza
  const ruleBasedArchetype = detectArchetypeByRules(enrichedMetadata);
  if (ruleBasedArchetype && ruleBasedArchetype.confidence > 0.85) {
    // Usar detección por reglas, NO necesita LLM
    return false;
  }
  
  // Gate 3: Casos complejos que SÍ necesitan LLM
  return llmAnalyzer.needsLLMAnalysis(fileAnalysis.semanticAnalysis || {}, fileAnalysis);
}
```

**Impacto:** El 70% de los archivos con arquetipos comunes bypassan LLM.

### FASE 4: Usar Communication Extractors (1 hora)

**Integrar:** `src/layer-a-static/extractors/communication/`

```javascript
// Detectar conexiones de comunicación entre archivos
// Esto detecta coupling sin LLM

import { extractWebSocketConnections } from './communication/websocket.js';
import { extractWebWorkerConnections } from './communication/web-workers.js';
import { extractBroadcastChannelConnections } from './communication/broadcast-channel.js';

// Enriquecer análisis con conexiones de comunicación
const communicationConnections = {
  websocket: extractWebSocketConnections(fileContent),
  webworkers: extractWebWorkerConnections(fileContent),
  broadcast: extractBroadcastChannelConnections(fileContent)
};

// Detectar arquetipo "Communication Hub"
if (communicationConnections.websocket.length > 3 ||
    communicationConnections.broadcast.length > 2) {
  return {
    archetype: Archetype.COMMUNICATION_HUB,
    confidence: 0.9,
    reason: `High communication density: ${JSON.stringify(communicationConnections)}`
  };
}
```

**Impacto:** Detectamos "event-hubs" y "communication-hubs" sin LLM.

### FASE 5: Usar TypeScript Extractors para Breaking Changes (1 hora)

**Integrar:** `src/layer-a-static/extractors/typescript/`

```javascript
// Detectar breaking changes SIN LLM

import { detectPotentialBreakingChanges } from './typescript/typescript-extractor.js';

// En analyze_signature_change:
const breakingChanges = detectPotentialBreakingChanges({
  currentSignature: current,
  newSignature: proposed
});

if (breakingChanges.length === 0) {
  return {
    safeToChange: true,
    reason: 'TypeScript analysis: No breaking changes detected',
    confidence: 0.95
  };
}
```

**Impacto:** 90% de los análisis de breaking changes resueltos sin LLM.

## 📈 Resultado Esperado

### Antes (Sistema Actual):
```
Archivos: 89
  ↓
Arquetipos detectados: 89
  ↓
Envío a LLM: 89 (100%)
  ↓
Costo: ALTO
```

### Después (Con Este Plan):
```
Archivos: 89
  ↓
Enriquecidos con metadata: 89
  ↓
Arquetipos por REGLAS: 65 (73%)
  ↓
Bypass LLM: 65 (bypass inmediato)
  ↓
Envío a LLM: 24 (27%)
  ↓
Costo: 73% MENOR
```

## 🎯 Métricas de Éxito

- **Reducción de LLM:** De 89 a ~24 archivos (73% menos)
- **Tiempo de análisis:** De 10 min a 3 min (70% más rápido)
- **Precisión:** Mantener >90% (reglas con alta confianza)
- **Cobertura:** 100% de archivos enriquecidos con metadata

## 🚀 Prioridad de Implementación

1. **Fase 1** (2h): Metadata enricher - Impacto ALTO, esfuerzo MEDIO
2. **Fase 2** (2h): Rule-based detector - Impacto ALTO, esfuerzo MEDIO  
3. **Fase 3** (1h): Gate 2.5 - Impacto ALTO, esfuerzo BAJO
4. **Fase 4** (1h): Communication extractors - Impacto MEDIO, esfuerzo BAJO
5. **Fase 5** (1h): TypeScript breaking changes - Impacto MEDIO, esfuerzo BAJO

**Total: 7 horas para reducir LLM en 73%**

## 🎉 Beneficios

1. **Velocidad:** Análisis 3x más rápido
2. **Costo:** 73% menos uso de LLM
3. **Consistencia:** Reglas deterministicas (no varían como LLM)
4. **Escalabilidad:** Más archivos = más metadata = mejor detección
5. **Debugging:** Fácil ver por qué se detectó un arquetipo

## 💡 Próximo Paso

¿Implementamos **Fase 1** (Metadata Enricher)? Es la base de todo y da el mayor impacto.

**Tiempo estimado Fase 1:** 2 horas  
**Impacto:** Todos los átomos enriquecidos con 6 dimensiones de metadata
