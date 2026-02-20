/**
 * @fileoverview analysis-decider.js
 * 
 * Determina si un archivo necesita análisis LLM
 * 
 * ARCHITECTURE: Layer B (Confidence-Based Decision)
 * Bridges Layer A (static) and Layer C (LLM) - decides when LLM is necessary
 * 
 * 🆕 v0.9.33: Integración con Inference Engine
 * El Inference Engine deduce patrones SIN LLM, reduciendo aún más las llamadas.
 * Si el Inference Engine puede resolver algo → BYPASS LLM
 *
 * @module llm-analyzer/analysis-decider
 * @phase Layer B (Decision Logic)
 */

// 🆕 v0.9.33: Importar Inference Engine para deducir sin LLM
import { inferFromFile } from '../inference-engine/index.js';

/**
 * Calcula un score de completitud de metadatos estáticos para un archivo (0.0 - 1.0)
 *
 * La idea: si Layer A ya extrajo datos ricos para un archivo, el LLM no aporta nada nuevo.
 * Si hay "huecos oscuros" (sin callers, sin imports, sin exports, sin dataFlow),
 * el LLM puede llenar esos vacíos con razonamiento semántico.
 *
 * @param {object} fileAnalysis - Análisis completo del archivo
 * @returns {{ score: number, gaps: string[] }} - score 0-1 y lista de campos faltantes
 */
export function computeMetadataCompleteness(fileAnalysis) {
  const gaps = [];
  let filled = 0;
  const total = 6; // campos fiables disponibles en el file-level JSON

  const atoms = fileAnalysis.atoms || [];
  const imports = fileAnalysis.imports || [];
  const exports = fileAnalysis.exports || [];
  const usedBy = fileAnalysis.usedBy || [];
  const semanticConnections = fileAnalysis.semanticConnections || [];
  const totalAtoms = fileAnalysis.totalAtoms || atoms.length;
  const filePath = fileAnalysis.filePath || '';

  // EXCEPCIONES: Archivos que NO necesitan LLM por naturaleza
  const isEntryPoint = imports.length > 0 && usedBy.length === 0;
  const isTypeFile = filePath.endsWith('.d.ts') || 
                     filePath.includes('/types/') || 
                     filePath.includes('/@types/');
  const isConfigFile = filePath.includes('config') || 
                       filePath.includes('constant') || 
                       filePath.includes('.config.');
  const isTestFile = filePath.includes('.test.') || 
                     filePath.includes('.spec.') || 
                     filePath.includes('/tests/');
  const isUtilityFile = filePath.includes('/utils/') || 
                        filePath.includes('/helpers/');

  // Si es un archivo especial, retornar score alto sin análisis
  if (isTypeFile || isConfigFile || isTestFile) {
    return { score: 1.0, gaps: [] };
  }

  // 1. ¿Tiene átomos extraídos?
  if (totalAtoms > 0 || isConfigFile || isEntryPoint) filled++;
  else gaps.push('no-atoms');

  // 2. ¿Alguien usa este archivo?
  if (usedBy.length > 0 || isEntryPoint) filled++;
  else gaps.push('no-usedby');

  // 3. ¿Tiene dataFlow en al menos un átomo?
  const hasDataFlow = atoms.some(a => a.dataFlow && (
    (a.dataFlow.inputs && a.dataFlow.inputs.length > 0) ||
    (a.dataFlow.outputs && a.dataFlow.outputs.length > 0)
  ));
  if (hasDataFlow || isUtilityFile || totalAtoms === 0) filled++;
  else gaps.push('no-dataflow');

  // 4. ¿Tiene calls en al menos un átomo?
  const hasCalls = atoms.some(a => (a.calls || []).length > 0);
  if (hasCalls || totalAtoms === 0 || isConfigFile) filled++;
  else gaps.push('no-calls');

  // 5. ¿Tiene imports o exports?
  if (imports.length > 0 || exports.length > 0 || isEntryPoint) filled++;
  else gaps.push('isolated-module');

  // 6. ¿Conexiones semánticas resueltas?
  if (semanticConnections.length > 0) filled++;
  else {
    const semanticAnalysis = fileAnalysis.semanticAnalysis || {};
    const hasSemanticSignals = (semanticAnalysis.events?.all?.length > 0) ||
                               (semanticAnalysis.localStorage?.all?.length > 0) ||
                               (semanticAnalysis.globals?.all?.length > 0);
    if (!hasSemanticSignals) filled++;
    else gaps.push('unresolved-semantic');
  }

  return { score: filled / total, gaps };
}

/**
 * 🆕 v0.9.33: Usa el Inference Engine para deducir patrones SIN LLM
 * 
 * Si el Inference Engine puede resolver patrones con alta confianza,
 * NO necesitamos LLM.
 * 
 * @param {object} fileAnalysis - Análisis del archivo
 * @returns {{ canBypass: boolean, inferredPatterns: object, confidence: number }}
 */
function tryInferWithoutLLM(fileAnalysis) {
  try {
    const inferences = inferFromFile(fileAnalysis);
    
    // Si el Inference Engine encontró patrones con alta confianza
    const patterns = inferences.patterns || {};
    const risk = inferences.risk || {};
    
    // Calcular confianza de las inferencias
    const hasHighConfidencePatterns = Object.values(patterns).some(p => 
      p && typeof p === 'object' && p.confidence >= 0.8
    );
    
    const hasResolvedRisk = risk.severity && risk.severity !== 'unknown';
    
    // Si el Inference Engine pudo deducir patrones → BYPASS LLM
    if (hasHighConfidencePatterns || hasResolvedRisk) {
      return {
        canBypass: true,
        inferredPatterns: patterns,
        confidence: hasHighConfidencePatterns ? 0.9 : 0.7,
        reason: 'Inference Engine resolved patterns'
      };
    }
    
    return { canBypass: false, inferredPatterns: patterns, confidence: 0 };
  } catch (error) {
    // Si el Inference Engine falla, continuar con análisis normal
    return { canBypass: false, error: error.message };
  }
}

/**
 * Determina si un archivo necesita análisis LLM
 *
 * ESTRATEGIA v0.9.33 — Inference Engine + Metadata Completeness:
 * 
 * 1. Intentar deducir con Inference Engine (SIN LLM)
 * 2. Si el Inference Engine resuelve → BYPASS
 * 3. Si no, verificar completitud de metadatos
 * 4. Si score alto (≥0.75) → BYPASS
 * 5. Si score bajo pero gaps no significativos → BYPASS
 * 6. Solo si hay gaps significativos → LLM
 *
 * Casos que SIEMPRE activan LLM independiente del score:
 * - Dynamic imports / eval (imposibles de resolver estáticamente)
 * - Archivos sin absolutamente ningún dato (fileAnalysis=null)
 *
 * @param {object} semanticAnalysis - Resultados del análisis semántico (staticAnalysis)
 * @param {object} fileAnalysis - Info completa del archivo
 * @param {number} confidenceThreshold - Umbral de confianza (default 0.7)
 * @returns {boolean} - true si necesita análisis LLM
 */
export function needsLLMAnalysis(semanticAnalysis, fileAnalysis = null, confidenceThreshold = 0.7) {
  // Sin fileAnalysis, cero conocimiento → LLM obligatorio
  if (!fileAnalysis) return true;

  // OVERRIDE 1: Dynamic imports/eval → LLM siempre (no resoluble estáticamente)
  if (hasDynamicCode(semanticAnalysis)) return true;

  // 🆕 v0.9.33: GATE 0 - Intentar Inference Engine primero
  const inference = tryInferWithoutLLM(fileAnalysis);
  if (inference.canBypass) {
    // El Inference Engine pudo deducir patrones → NO necesita LLM
    // Guardar inferencias en fileAnalysis para uso posterior
    fileAnalysis.inferredPatterns = inference.inferredPatterns;
    return false;
  }

  // Calcular completitud de metadatos estáticos
  const { score, gaps } = computeMetadataCompleteness(fileAnalysis);

  // OVERRIDE 2: Score perfecto → skip LLM sin más checks
  const COMPLETENESS_THRESHOLD = 0.75;
  if (score >= COMPLETENESS_THRESHOLD) return false;

  // Score bajo → LLM activa, pero solo si hay gaps significativos
  const significantGaps = ['no-atoms', 'no-callers', 'unresolved-semantic', 'no-dataflow'];
  const hasSignificantGap = gaps.some(g => significantGaps.includes(g));

  return hasSignificantGap;
}

/**
 * Verifica si tiene código dinámico que no se puede analizar estáticamente
 */
function hasDynamicCode(semanticAnalysis) {
  return semanticAnalysis?.hasDynamicImports ||
         semanticAnalysis?.hasEval ||
         (semanticAnalysis?.dynamicImports && semanticAnalysis.dynamicImports.length > 0) ||
         semanticAnalysis?.sideEffects?.some(
           effect => effect.includes('dynamic') || effect.includes('eval')
         );
}

/**
 * Verifica si hay eventos que NO fueron resueltos por conexiones estáticas
 */
function hasUnresolvedEvents(fileAnalysis) {
  const semanticAnalysis = fileAnalysis.semanticAnalysis || fileAnalysis;
  const eventNames = semanticAnalysis.events?.all || [];
  const resolvedEvents = (fileAnalysis.semanticConnections || [])
    .filter(c => c.type === 'eventListener' && c.confidence >= 1.0)
    .map(c => c.event || c.via);

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
  const storageKeys = semanticAnalysis.localStorage?.all || [];
  const globalAccess = semanticAnalysis.globals?.all || [];

  const resolvedConnections = (fileAnalysis.semanticConnections || [])
    .filter(c => (c.type === 'localStorage' || c.type === 'globalVariable') && c.confidence >= 1.0);

  const resolvedKeys = resolvedConnections.map(c => c.key || c.property || c.via);

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