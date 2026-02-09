/**
 * @fileoverview analysis-decider.js
 * 
 * Determina si un archivo necesita análisis LLM
 * 
 * ARCHITECTURE: Layer B (Confidence-Based Decision)
 * Bridges Layer A (static) and Layer C (LLM) - decides when LLM is necessary
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 EXTENSION GUIDE - Adding New LLM Decision Criteria
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * To add a new criterion for when to use LLM analysis:
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * OPTION A: New Detection Criterion (e.g., Security Review, Performance Analysis)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Use this when you want to force LLM analysis for specific code patterns
 * that static analysis can't fully evaluate.
 *
 * 1️⃣  CREATE DETECTOR FUNCTION (add after existing check functions, line ~170+)
 *
 *     /**
 *      * Checks if file needs security review from LLM
 *      * Examples: crypto usage, auth logic, input validation
 *      * /
 *     function needsSecurityReview(fileAnalysis) {
 *       const atoms = fileAnalysis.atoms || [];
 *       
 *       // Check for security-sensitive patterns in atoms
 *       return atoms.some(atom => {
 *         // Uses crypto/auth APIs
 *         const securityCalls = ['crypto', 'bcrypt', 'jwt', 'auth'];
 *         const hasSecurityCalls = atom.calls?.some(call => 
 *           securityCalls.some(api => call.name?.toLowerCase().includes(api))
 *         );
 *         
 *         // Handles user input
 * *         const handlesUserInput = atom.params?.some(p => 
 *           ['userInput', 'data', 'payload'].includes(p.name)
 *         );
 *         
 *         return hasSecurityCalls || handlesUserInput;
 *       });
 *     }
 *
 * 2️⃣  ADD CHECK to needsLLMAnalysis() (line ~23-66):
 *
 *     // 8. Security-sensitive code -> SÍ LLM (for security review)
 *     if (needsSecurityReview(fileAnalysis)) {
 *       return true;
 *     }
 *
 * 3️⃣  UPDATE CONFIDENCE SCORING (if applicable):
 *     If this check represents a gap in static analysis confidence,
 *     also update any confidence calculation to reflect this.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * OPTION B: Refine Existing Criterion
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * To make an existing check more precise:
 *
 * EXAMPLE: Making hasUnresolvedEvents more precise
 *
 *     // BEFORE (line ~93-109):
 *     function hasUnresolvedEvents(fileAnalysis) {
 *       const eventNames = semanticAnalysis.events?.all || [];
 *       const resolvedEvents = (fileAnalysis.semanticConnections || [])
 *         .filter(c => c.type === 'eventListener' && c.confidence >= 1.0)
 *         .map(c => c.event || c.via);
 *       return eventNames.some(e => !resolvedEvents.includes(e.event || e));
 *     }
 *
 *     // AFTER (more sophisticated):
 *     function hasUnresolvedEvents(fileAnalysis) {
 *       const eventNames = semanticAnalysis.events?.all || [];
 *       
 *       // NEW: Consider event patterns (some are always OK)
 *       const safeEventPatterns = ['click', 'submit', 'load']; // Standard DOM events
 *       const suspiciousEvents = eventNames.filter(e => {
 *         const eventName = e.event || e;
 *         // Custom events (with colons) need more scrutiny
 *         const isCustomEvent = eventName.includes(':');
 *         // High-frequency events might indicate performance issues
 *         const isHighFrequency = ['scroll', 'mousemove', 'resize'].includes(eventName);
 *         return isCustomEvent || isHighFrequency;
 *       });
 *       
 *       const resolvedEvents = (fileAnalysis.semanticConnections || [])
 *         .filter(c => c.type === 'eventListener' && c.confidence >= 1.0)
 *         .map(c => c.event || c.via);
 *       
 *       // Only LLM if there are suspicious unresolved events
 *       return suspiciousEvents.some(e => !resolvedEvents.includes(e.event || e));
 *     }
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚠️  PRINCIPLES TO MAINTAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ✓ BYPASS FIRST: Default to NOT using LLM (confidence >= 0.8)
 * ✓ Evidence-based: Each check must look at specific atom/file metadata
 * ✓ Performance: Keep checks fast (O(n) where n = atoms in file)
 * ✓ SSOT: Don't duplicate detection logic from molecular-extractor.js
 *   Instead, check the atom metadata that extractor already produced
 * ✓ Layer B only: This file INTERPRETS metadata, doesn't extract new data
 *
 * 🔗  RELATED FILES:
 *     - molecular-extractor.js: Source of atom metadata we check
 *     - prompt-engine/: Where LLM prompts are built for files that need analysis
 *     - llm-analyzer/core.js: Where the actual LLM calls happen
 *
 * 📊  BYPASS RATE TARGET: 90%+
 *     Measure: console.log how often we return false vs true
 *     If bypass rate drops, criteria are too broad - refine them
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * @module llm-analyzer/analysis-decider
 * @phase Layer B (Decision Logic)
 * @dependencies NONE (pure functions over metadata)
 */

/**
 * Determina si un archivo necesita análisis LLM
 *
 * ESTRATEGIA OPTIMIZADA v0.6:
 * - NO gastar LLM si las conexiones estáticas ya cubrieron el caso
 * - SÍ analizar solo cuando hay eventos/state NO resueltos por Layer A
 * - SÍ analizar código dinámico (no se puede resolver estáticamente)
 * - SÍ analizar archivos huérfanos sin explicación
 *
 * @param {object} semanticAnalysis - Resultados del análisis semántico (staticAnalysis)
 * @param {object} fileAnalysis - Info completa del archivo (imports, usedBy, semanticConnections)
 * @param {number} confidenceThreshold - Umbral de confianza (default 0.7)
 * @returns {boolean} - true si necesita análisis LLM
 */
export function needsLLMAnalysis(semanticAnalysis, fileAnalysis = null, confidenceThreshold = 0.7) {
  // Sin fileAnalysis, no podemos determinar si las conexiones están resueltas
  if (!fileAnalysis) {
    return true; // Fallback seguro
  }

  // 1. Huérfano sin explicación -> SÍ LLM
  if (isOrphanWithNoConnections(fileAnalysis)) {
    return true;
  }

  // 2. Dynamic imports/eval -> SÍ LLM (no se puede resolver estáticamente)
  if (hasDynamicCode(semanticAnalysis)) {
    return true;
  }

  // 3. Eventos: solo si hay eventos NO resueltos por conexiones estáticas
  if (hasUnresolvedEvents(fileAnalysis)) {
    return true;
  }

  // 4. Shared state: solo si hay state NO cruzado estáticamente
  if (hasUnresolvedSharedState(fileAnalysis)) {
    return true;
  }

  // 5. Conexiones de baja confianza -> SÍ LLM
  if (hasLowConfidenceConnections(fileAnalysis, confidenceThreshold)) {
    return true;
  }

  // 6. Network calls: solo si hay endpoints NO cross-referenciados
  if (hasUnresolvedNetworkConnections(fileAnalysis)) {
    return true;
  }

  // 7. Lifecycle hooks: solo si NO tienen cleanup o contexto resuelto
  if (hasUnresolvedLifecycleConnections(fileAnalysis)) {
    return true;
  }

  // Si llegamos aquí, Layer A ya cubrió todas las conexiones
  return false;
}

/**
 * Verifica si un archivo es huérfano sin ninguna conexión detectada
 */
function isOrphanWithNoConnections(fileAnalysis) {
  const hasImports = (fileAnalysis.imports || []).length > 0;
  const hasUsedBy = (fileAnalysis.usedBy || []).length > 0;
  const hasSemanticConnections = (fileAnalysis.semanticConnections || []).length > 0;
  return !hasImports && !hasUsedBy && !hasSemanticConnections;
}

/**
 * Verifica si tiene código dinámico que no se puede analizar estáticamente
 */
function hasDynamicCode(semanticAnalysis) {
  return semanticAnalysis.hasDynamicImports ||
         semanticAnalysis.hasEval ||
         (semanticAnalysis.dynamicImports && semanticAnalysis.dynamicImports.length > 0) ||
         semanticAnalysis.sideEffects?.some(
           effect => effect.includes('dynamic') || effect.includes('eval')
         );
}

/**
 * Verifica si hay eventos que NO fueron resueltos por conexiones estáticas
 */
function hasUnresolvedEvents(fileAnalysis) {
  const semanticAnalysis = fileAnalysis.semanticAnalysis || fileAnalysis;

  // Obtener todos los eventos detectados
  const eventNames = semanticAnalysis.events?.all || [];

  // Obtener eventos ya resueltos con confidence >= 1.0
  const resolvedEvents = (fileAnalysis.semanticConnections || [])
    .filter(c => c.type === 'eventListener' && c.confidence >= 1.0)
    .map(c => c.event || c.via);

  // Si hay eventos que NO tienen conexión estática resuelta
  return eventNames.some(e => {
    const eventName = e.event || e;
    return !resolvedEvents.includes(eventName);
  });
}

/**
 * Verifica si hay shared state que NO fue resuelto por conexiones estáticas
 */
function hasUnresolvedSharedState(fileAnalysis) {
  const semanticAnalysis = fileAnalysis.semanticAnalysis || fileAnalysis;

  // Obtener keys de localStorage y globals detectados
  const storageKeys = semanticAnalysis.localStorage?.all || [];
  const globalAccess = semanticAnalysis.globals?.all || [];

  // Obtener conexiones ya resueltas con confidence >= 1.0
  const resolvedConnections = (fileAnalysis.semanticConnections || [])
    .filter(c => (c.type === 'localStorage' || c.type === 'globalVariable') && c.confidence >= 1.0);

  const resolvedKeys = resolvedConnections.map(c => c.key || c.property || c.via);

  // Verificar si hay storage/globals sin resolver
  const unresolvedStorage = storageKeys.some(s => {
    const key = s.key || s;
    return !resolvedKeys.includes(key);
  });

  const unresolvedGlobals = globalAccess.some(g => {
    const prop = g.property || g;
    return !resolvedKeys.includes(prop);
  });

  return unresolvedStorage || unresolvedGlobals;
}

/**
 * Verifica si hay conexiones de baja confianza que necesitan análisis LLM
 */
function hasLowConfidenceConnections(fileAnalysis, threshold = 0.7) {
  return (fileAnalysis.semanticConnections || []).some(c => c.confidence < threshold);
}

/**
 * Verifica si tiene network calls con endpoints NO resueltos
 * NUEVO: Si tiene fetch() a los mismos endpoints que otro archivo, hay acoplamiento
 */
function hasUnresolvedNetworkConnections(fileAnalysis) {
  const metadata = fileAnalysis.metadata || {};
  const endpoints = metadata.sideEffects?.networkCalls || [];

  if (endpoints.length === 0) return false;

  // Verificar si hay conexiones semanticas con confidence >= 1.0 para cada endpoint
  const resolvedRoutes = (fileAnalysis.semanticConnections || [])
    .filter(c => c.type === 'shared-route' && c.confidence >= 1.0)
    .map(c => c.route);

  // Si hay endpoints que NO tienen conexión resuelta, necesita LLM
  return endpoints.some(endpoint => {
    const code = endpoint.code || '';
    return !resolvedRoutes.some(route => code.includes(route));
  });
}

/**
 * Verifica si tiene lifecycle hooks sin cleanup o sin contexto resuelto
 * NUEVO: Lifecycle hooks que NO tienen cleanup son auto-contenidos
 */
function hasUnresolvedLifecycleConnections(fileAnalysis) {
  const metadata = fileAnalysis.metadata || {};
  const hooks = metadata.temporal?.lifecycleHooks || [];

  if (hooks.length === 0) return false;

  // Si todos los hooks tienen cleanup, están auto-contenidos (no necesita LLM)
  const cleanups = metadata.temporal?.cleanupPatterns || [];
  return cleanups.length < hooks.length;
}
