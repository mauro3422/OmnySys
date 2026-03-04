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
import { BaseSqlRepository } from '#layer-c/storage/repository/core/BaseSqlRepository.js';

const logger = createLogger('OmnySys:static:insights');

/**
 * Mapeo de purpose de átomo a responsabilidad legible.
 */
const PURPOSE_TO_RESPONSIBILITY = {
  API_EXPORT: 'api',
  EVENT_HANDLER: 'event-handling',
  TEST_HELPER: 'testing',
  TIMER_ASYNC: 'async-orchestration',
  NETWORK_HANDLER: 'network',
  INTERNAL_HELPER: 'internal-logic',
  CONFIG_SETUP: 'configuration',
  SCRIPT_MAIN: 'entry-point',
  CLASS_METHOD: 'class-api',
  DEAD_CODE: 'unused',
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

    // Initiate background Phase 2 deep scanning
    this._startPhase2BackgroundIndexer();

    // 🏘️ ANALYZE SOCIETIES (PUEBLOS)
    // Se ejecuta asíncronamente para no bloquear el boot, 
    // pero ya empieza a poblar la tabla de sociedades.
    (async () => {
      try {
        const { analyzeSocieties } = await import('#layer-b/society-manager/index.js');
        await analyzeSocieties(this.projectPath);
        logger.info('  🏘️  Society analysis (Pueblos) initial pass complete');
      } catch (e) {
        logger.debug('  ⚠️  Initial society analysis failed:', e.message);
      }
    })();

    // 📊 PERSIST GRAPH METRICS (centrality, propagation, risk)
    // Se ejecuta asíncronamente después del boot para poblar centralityScore,
    // propagationScore y risk_level en todos los átomos indexados.
    (async () => {
      try {
        // Small delay to let the save pipeline flush first
        await new Promise(resolve => setTimeout(resolve, 5000));
        const { persistGraphMetrics } = await import('#layer-c/storage/enrichment/index.js');
        await persistGraphMetrics(this.projectPath);
        logger.info('  📊 Graph metrics persisted (centrality, propagation, risk_level)');
      } catch (e) {
        logger.debug('  ⚠️  Graph metrics persistence failed:', e.message);
      }
    })();

  } catch (error) {
    logger.error('  ❌ Static insights init failed:', error.message);
  }
}

/**
 * On-demand prioritization: immediately deep-scan a file if Phase 2 is incomplete.
 * Called by MCP query tools before returning results, so they always have full data.
 * @param {string} relativeFilePath - File path relative to project root
 */
export async function _prioritizeFileForPhase2(relativeFilePath) {
  if (!relativeFilePath) return;

  try {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(this.projectPath);
    if (!repo || !repo.db) return;

    // Check if this specific file still needs Phase 2
    const pending = repo.db.prepare(
      `SELECT COUNT(*) as count FROM atoms WHERE file_path = ? AND is_phase2_complete = 0`
    ).get(relativeFilePath);

    if (!pending || pending.count === 0) return; // Already done

    logger.debug(`⚡ On-demand Phase 2 for: ${relativeFilePath}`);

    const { analyzeProjectFilesUnified } = await import('#layer-a/pipeline/unified-analysis.js');

    // Clear stale atoms, then deep-scan this specific file
    const hr = new BaseSqlRepository(repo.db, 'StaticInsights:OnDemand');
    hr.delete('atoms', 'file_path', relativeFilePath);

    const absolutePath = path.join(this.projectPath, relativeFilePath);
    await analyzeProjectFilesUnified([absolutePath], this.projectPath, false, 'deep');

  } catch (e) {
    logger.debug(`[On-demand Phase 2] Error for ${relativeFilePath}: ${e.message}`);
  }
}

/**
 * Background loop that continuously processes Phase 1 (Structural) files
 * into Phase 2 (Deep) files without blocking the main event loop.
 */
export async function _startPhase2BackgroundIndexer() {
  if (this._phase2Interval) return;

  logger.info('🔄 Starting Background Phase 2 Indexer (Deep Metadata)...');

  // Initialize total count if possible
  try {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(this.projectPath);
    if (repo && repo.db) {
      const countResult = repo.db.prepare('SELECT COUNT(DISTINCT file_path) as count FROM atoms WHERE is_phase2_complete = 0').get();
      this.totalPhase2Files = countResult?.count || 0;
      this.processedFiles = new Set(); // Reset for Phase 2 tracking

      if (this.totalPhase2Files > 0) {
        logger.info(`📊 Phase 2: Pending analysis for ${this.totalPhase2Files} files`);
        const { BatchTimer } = await import('#utils/performance-tracker.js');
        this._phase2GlobalTimer = new BatchTimer('Phase 2 Deep Scan', this.totalPhase2Files, true);
      }
    }
  } catch (e) {
    logger.debug('Could not initialize Phase 2 total count yet');
  }

  this._phase2Interval = setInterval(async () => {
    // Only queue new background files if the worker queue is basically empty and we aren't already bursting
    if (this.queue.size() > 20 || !this.isRunning || this._isPhase2Bursting) return;

    // Init in-memory blacklist to prevent re-queuing same files indefinitely
    if (!this._phase2ProcessedPaths) this._phase2ProcessedPaths = new Set();

    this._isPhase2Bursting = true;
    try {
      const { getRepository } = await import('#layer-c/storage/repository/index.js');
      const repo = getRepository(this.projectPath);

      if (!repo || !repo.db) return;

      // Find up to 100 files that have incomplete Phase 2 atoms
      const rows = repo.db.prepare(`
        SELECT DISTINCT file_path 
        FROM atoms 
        WHERE is_phase2_complete = 0 
        LIMIT 200
      `).all();

      if (rows.length === 0) {
        // Everything is deeply scanned!
        if (this._phase2GlobalTimer) {
          this._phase2GlobalTimer.end(true);
          this._phase2GlobalTimer = null;
        }
        clearInterval(this._phase2Interval);
        this._phase2Interval = null;

        // ✅ Phase 2 complete — persist final graph metrics now that all atoms are deep-scanned
        (async () => {
          try {
            const { persistGraphMetrics } = await import('#layer-c/storage/enrichment/index.js');
            await persistGraphMetrics(this.projectPath);
            logger.info('  📊 Phase 2 complete — final graph metrics persisted (centrality, risk_level, propagation)');
          } catch (e) {
            logger.debug('  ⚠️  Post-Phase2 graph metrics failed:', e.message);
          }
        })();

        return;
      }

      // Filter out files already dispatched this session to prevent infinite loop
      const filesToProcess = rows
        .map(r => r.file_path)
        .filter(fp => !this._phase2ProcessedPaths.has(fp));

      // Mark them all as dispatched immediately (before any async op)
      for (const fp of filesToProcess) this._phase2ProcessedPaths.add(fp);

      const enqueuedCount = filesToProcess.length;

      if (enqueuedCount > 0) {
        const { analyzeProjectFilesUnified } = await import('#layer-a/pipeline/unified-analysis.js');

        // 1. Clear atoms first (avoid ghost atoms)
        // Optimizacion: usamos una transaccion para borrar mas rapido y seguro
        const hr = new BaseSqlRepository(repo.db, 'StaticInsights:Batch');
        const runDeleteBatch = hr.transaction((paths) => {
          for (const p of paths) hr.delete('atoms', 'file_path', p);
        });
        runDeleteBatch(filesToProcess);

        // 2. Run Parallel Multi-Threaded Analysis (SILENCED)
        // Note: we use absolute paths for the pipeline
        const absoluteFiles = filesToProcess.map(f => path.join(this.projectPath, f));

        try {
          await analyzeProjectFilesUnified(absoluteFiles, this.projectPath, false, 'deep');
        } catch (pipelineErr) {
          logger.error(`❌ Phase 2 unified analysis failed: ${pipelineErr.message}`);
        }

        // 3. Update stats manually since we bypassed the Orchestrator queue
        for (const relPath of filesToProcess) {
          const absPath = path.join(this.projectPath, relPath);
          this.indexedFiles.add(absPath);
          this.processedFiles.add(absPath);
        }

        if (this._phase2GlobalTimer) {
          this._phase2GlobalTimer.onItemProcessed(enqueuedCount);
        }

        // Emit progress bar update
        this.emit('job:complete', { filePath: filesToProcess[0] }, {});
      }

    } catch (e) {
      if (!e.message.includes('not initialized')) {
        logger.warn(`⚠️ Background Phase 2 indexer error: ${e.message}`);
      }
    } finally {
      this._isPhase2Bursting = false;
    }
  }, 1000); // Check every 1 second for aggressive queue refilling
}

