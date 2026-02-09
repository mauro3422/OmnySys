/**
 * Cache Integration
 * 
 * Integra el UnifiedCacheManager con el sistema de análisis existente.
 * Reemplaza el uso separado de AnalysisCache y LLMCache.
 */

import { UnifiedCacheManager, ChangeType } from './unified-cache-manager.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('OmnySys:cache:integration');



/**
 * Wrapper para el análisis estático con caché inteligente
 */
export async function analyzeWithUnifiedCache(options) {
  const {
    rootPath,
    filePath,
    content,
    analyzeFn, // Función de análisis estático
    cacheManager,
    verbose = true
  } = options;
  
  // Registrar archivo y detectar cambios
  const cacheStatus = await cacheManager.registerFile(filePath, content);
  
  // Si no necesita re-análisis estático, retornar cache
  if (!cacheStatus.needsStatic && cacheStatus.entry.staticAnalyzed) {
    if (verbose) logger.info(`  ⚡ Cache hit (static): ${filePath}`);
    
    // Cargar análisis desde disco
    const cachedAnalysis = await loadStaticAnalysis(cacheManager, filePath, cacheStatus.entry.version);
    if (cachedAnalysis) {
      return {
        analysis: cachedAnalysis,
        fromCache: true,
        changeType: cacheStatus.changeType,
        needsLLM: cacheStatus.needsLLM
      };
    }
  }
  
  // Realizar análisis estático
  if (verbose) logger.info(`  🔍 Analyzing (static): ${filePath} [${cacheStatus.changeType}]`);
  const startTime = Date.now();
  const analysis = await analyzeFn(filePath, content);
  const duration = Date.now() - startTime;
  
  // Guardar en caché
  cacheStatus.entry.analysisDuration = duration;
  await cacheManager.saveStaticAnalysis(filePath, analysis);
  
  return {
    analysis,
    fromCache: false,
    changeType: cacheStatus.changeType,
    needsLLM: cacheStatus.needsLLM
  };
}

/**
 * Wrapper para el análisis LLM con caché inteligente
 */
export async function analyzeLLMWithUnifiedCache(options) {
  const {
    filePath,
    content,
    analyzeFn, // Función de análisis LLM
    cacheManager,
    forceReanalyze = false,
    verbose = true
  } = options;
  
  const entry = cacheManager.index.entries[filePath];
  
  // Verificar si se necesita re-análisis LLM
  if (!forceReanalyze && entry && entry.llmAnalyzed && !entry.needsLLM) {
    if (verbose) logger.info(`  ⚡ Cache hit (LLM): ${filePath}`);
    
    // Cargar insights desde disco
    const cachedInsights = await loadLLMInsights(cacheManager, filePath, entry.version);
    if (cachedInsights) {
      return {
        insights: cachedInsights,
        fromCache: true
      };
    }
  }
  
  // Realizar análisis LLM
  if (verbose) logger.info(`  🤖 Analyzing (LLM): ${filePath}`);
  const startTime = Date.now();
  const insights = await analyzeFn(filePath, content);
  const duration = Date.now() - startTime;
  
  // Guardar en caché
  if (entry) {
    entry.llmDuration = duration;
    await cacheManager.saveLLMInsights(filePath, insights);
  }
  
  return {
    insights,
    fromCache: false
  };
}

/**
 * Carga análisis estático desde disco
 */
async function loadStaticAnalysis(cacheManager, filePath, version) {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const analysisPath = path.join(
      cacheManager.cacheDir, 
      'static', 
      `${filePath.replace(/[\/\\]/g, '_')}.v${version}.json`
    );
    
    const content = await fs.readFile(analysisPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Carga insights LLM desde disco
 */
async function loadLLMInsights(cacheManager, filePath, version) {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const insightsPath = path.join(
      cacheManager.cacheDir, 
      'llm', 
      `${filePath.replace(/[\/\\]/g, '_')}.v${version}.insights.json`
    );
    
    const content = await fs.readFile(insightsPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Invalida caché de archivos dependientes cuando cambian sus dependencias
 */
export async function invalidateDependentCaches(cacheManager, changedFilePath) {
  const entry = cacheManager.index.entries[changedFilePath];
  if (!entry) return [];
  
  const invalidated = [];
  
  // Para cada archivo que usa el archivo cambiado
  for (const dependent of entry.usedBy) {
    const depEntry = cacheManager.index.entries[dependent];
    if (depEntry) {
      // Marcar para re-análisis
      depEntry.staticAnalyzed = false;
      depEntry.llmAnalyzed = false;
      depEntry.version++;
      
      invalidated.push(dependent);
      
      // Recursivamente invalidar sus dependientes
      const nested = await invalidateDependentCaches(cacheManager, dependent);
      invalidated.push(...nested);
    }
  }
  
  await cacheManager.saveIndex();
  return invalidated;
}

/**
 * Obtiene reporte de estado del caché unificado
 */
export function generateCacheReport(cacheManager) {
  const stats = cacheManager.getStats();
  const entries = Object.values(cacheManager.index.entries);
  
  // Calcular ahorro estimado
  const avgStaticTime = 50; // ms
  const avgLLMTime = 3000; // ms
  const savedStatic = (entries.length - stats.staticAnalyzed) * avgStaticTime;
  const savedLLM = (entries.length - stats.llmAnalyzed) * avgLLMTime;
  
  return {
    summary: {
      totalFiles: stats.totalFiles,
      cacheHitRate: {
        static: stats.staticAnalyzed / stats.totalFiles,
        llm: stats.llmAnalyzed / stats.totalFiles
      },
      estimatedTimeSaved: `${((savedStatic + savedLLM) / 1000).toFixed(1)}s`
    },
    byChangeType: stats.byChangeType,
    recentInvalidations: entries
      .filter(e => e.version > 1)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map(e => ({
        file: e.filePath,
        version: e.version,
        changeType: e.changeType,
        lastAnalyzed: new Date(e.timestamp).toISOString()
      }))
  };
}

export { ChangeType };
export default {
  analyzeWithUnifiedCache,
  analyzeLLMWithUnifiedCache,
  invalidateDependentCaches,
  generateCacheReport
};
