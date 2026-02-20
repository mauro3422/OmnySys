/**
 * @fileoverview static-insights.js
 *
 * Deriva insights de archivos DIRECTAMENTE desde datos de átomos,
 * sin usar LLM. Reemplaza el pipeline LLM de análisis de arquetipos.
 *
 * LO QUE ANTES HACÍA EL LLM:
 *   - god-object: riskLevel, responsibilities[], impactScore
 *   - orphan-module: isOrphan, potentialUsage[]
 *   - network-hub: endpoints[], riskLevel
 *   - critical-bottleneck: optimizationStrategy, estimatedImpact
 *
 * LO QUE HACEMOS AHORA (desde átomos):
 *   - riskLevel     ← complejidad ciclomática + dependentCount
 *   - responsibilities ← atom.purpose[] únicos del archivo
 *   - impactScore   ← usedBy.length / totalFiles (normalizado)
 *   - isOrphan      ← usedBy.length === 0 && !isEntryPoint
 *   - archetype     ← atom.archetype.type dominante
 *
 * @module core/orchestrator/static-insights
 */

import path from 'path';
import { createLogger } from '../../utils/logger.js';
import { safeReadJson } from '#utils/json-safe.js';

const logger = createLogger('OmnySys:static:insights');

/**
 * Mapeo de purpose de átomo a responsabilidad legible.
 */
const PURPOSE_TO_RESPONSIBILITY = {
  API_EXPORT:       'api',
  EVENT_HANDLER:    'event-handling',
  TEST_HELPER:      'testing',
  TIMER_ASYNC:      'async-orchestration',
  NETWORK_HANDLER:  'network',
  INTERNAL_HELPER:  'internal-logic',
  CONFIG_SETUP:     'configuration',
  SCRIPT_MAIN:      'entry-point',
  CLASS_METHOD:     'class-api',
  DEAD_CODE:        'unused',
};

/**
 * Calcula riskLevel desde complejidad de átomos y número de dependientes.
 */
function deriveRiskLevel(atoms, usedByCount) {
  const avgComplexity = atoms.length > 0
    ? atoms.reduce((sum, a) => sum + (a.complexity || 1), 0) / atoms.length
    : 1;

  const hasGodFunction = atoms.some(a => a.archetype?.type === 'god-function');
  const hasHotPath = atoms.some(a => a.archetype?.type === 'hot-path');

  if (hasGodFunction || (avgComplexity > 15 && usedByCount > 10)) return 'high';
  if (hasHotPath || avgComplexity > 8 || usedByCount > 5) return 'medium';
  return 'low';
}

/**
 * Extrae responsabilidades únicas desde los purposes de los átomos.
 */
function deriveResponsibilities(atoms) {
  const seen = new Set();
  for (const atom of atoms) {
    if (atom.purpose && PURPOSE_TO_RESPONSIBILITY[atom.purpose]) {
      seen.add(PURPOSE_TO_RESPONSIBILITY[atom.purpose]);
    }
  }
  return [...seen];
}

/**
 * Deriva insights estáticos para un archivo desde sus átomos.
 * Produce la misma estructura que antes generaba el LLM.
 */
export function deriveFileInsights(fileAnalysis, totalFiles = 1000) {
  const atoms = fileAnalysis.atoms || [];
  const usedBy = fileAnalysis.usedBy || [];
  const imports = fileAnalysis.imports || [];
  const filePath = fileAnalysis.filePath || '';

  const usedByCount = usedBy.length;
  const isEntryPoint = imports.length > 0 && usedByCount === 0;
  const isOrphan = usedByCount === 0 && !isEntryPoint && atoms.length > 0;

  // Arquetipo dominante del archivo (desde átomos)
  const archetypeCounts = {};
  for (const atom of atoms) {
    const t = atom.archetype?.type;
    if (t) archetypeCounts[t] = (archetypeCounts[t] || 0) + 1;
  }
  const dominantAtomArchetype = Object.entries(archetypeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'standard';

  const riskLevel = deriveRiskLevel(atoms, usedByCount);
  const responsibilities = deriveResponsibilities(atoms);
  const impactScore = Math.min(usedByCount / Math.max(totalFiles * 0.1, 1), 1.0);

  return {
    // Equivalente a llmInsights pero derivado estáticamente
    derivedInsights: {
      source: 'static-atoms',   // Trazabilidad: de dónde viene esto
      riskLevel,
      responsibilities,
      impactScore: parseFloat(impactScore.toFixed(3)),
      isOrphan,
      isEntryPoint,
      dominantAtomArchetype,
      atomCount: atoms.length,
      usedByCount,
      confidence: 1.0,           // Determinístico, no probabilístico
    }
  };
}

/**
 * Reemplaza _analyzeComplexFilesWithLLM en el orchestrator.
 * Los insights se derivan on-demand via deriveFileInsights() cuando se consultan.
 * Solo emite el evento de completado para que el sistema sepa que está listo.
 */
export async function _deriveStaticInsights() {
  logger.info('⚛️  Static insights mode — derived on-demand from atoms (no LLM)');

  try {
    const indexPath = path.join(this.OmnySysDataPath, 'index.json');
    const index = await safeReadJson(indexPath, { fileIndex: {} });
    const totalFiles = Object.keys(index?.fileIndex || {}).length;

    logger.info(`  ✅ ${totalFiles} files ready — insights derived on-demand`);

    // Emitir evento de completado (antes lo hacía el LLM pipeline)
    this.emit?.('analysis:complete', {
      iterations: 0,
      totalFiles,
      source: 'static-atoms',
      issues: { stats: { totalIssues: 0 } }
    });

  } catch (error) {
    logger.error('  ❌ Static insights init failed:', error.message);
  }
}
