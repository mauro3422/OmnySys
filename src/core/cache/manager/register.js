import fs from 'fs/promises';
import path from 'path';
import { SemanticChangeType as ChangeType } from '#config/change-types.js';
import { hashContent, detectChangeType } from './utils.js';
import { CacheEntry } from './entry.js';

/**
 * Registra un archivo y detecta qué tipo de re-análisis necesita
 * 🆕 AHORA: Incluye hash de metadata para invalidación completa
 * 
 * @param {string} filePath - Ruta del archivo
 * @param {string} content - Contenido actual
 * @param {object} metadata - Metadata enriquecida (opcional)
 * @returns {object} - { changeType, needsStatic, needsLLM, dependencies }
 */
export async function registerFile(filePath, content, metadata = null) {
  const contentHash = hashContent(content);
  
  // 🆕 NUEVO: Calcular hash de metadata si existe
  const metadataHash = metadata ? hashContent(JSON.stringify(metadata)) : null;
  const combinedHash = metadataHash 
    ? hashContent(content + metadataHash) 
    : contentHash;
  
  const existingEntry = this.index.entries[filePath];

  // Si no hay entrada previa, es nuevo
  if (!existingEntry) {
    const entry = new CacheEntry(filePath, contentHash, ChangeType.SEMANTIC);
    entry.metadataHash = metadataHash; // 🆕 Guardar hash de metadata
    entry.combinedHash = combinedHash; // 🆕 Guardar hash combinado
    this.index.entries[filePath] = entry;

    return {
      changeType: ChangeType.SEMANTIC,
      needsStatic: true,
      needsLLM: true,
      isNew: true,
      entry
    };
  }

  // 🆕 MODIFICADO: Comparar hash combinado (contenido + metadata)
  const existingCombinedHash = existingEntry.combinedHash || existingEntry.contentHash;
  if (existingCombinedHash === combinedHash) {
    return {
      changeType: ChangeType.NONE,
      needsStatic: false,
      needsLLM: false,
      isNew: false,
      entry: existingEntry
    };
  }

  // Detectar tipo de cambio
  const oldCode = await this.getPreviousCode(filePath);
  const changeType = detectChangeType(oldCode, content, existingEntry);

  // 🆕 MODIFICADO: Detectar si cambió solo la metadata (no el contenido)
  const metadataChanged = existingEntry.metadataHash !== metadataHash;
  const contentChanged = existingEntry.contentHash !== contentHash;
  
  // Actualizar entrada
  existingEntry.contentHash = contentHash;
  existingEntry.metadataHash = metadataHash; // 🆕 Actualizar hash de metadata
  existingEntry.combinedHash = combinedHash; // 🆕 Actualizar hash combinado
  existingEntry.changeType = changeType;
  existingEntry.version++;
  existingEntry.timestamp = Date.now();
  
  // Log metadata-only changes in debug mode
  if (metadataChanged && !contentChanged && process.env.DEBUG) {
    process.stderr.write(`[Cache] Metadata changed for ${filePath} (content unchanged)\n`);
  }

  // Determinar qué se necesita re-analizar
  const result = {
    changeType,
    needsStatic: true, // Siempre re-analizar estático si cambió el código
    needsLLM: this.shouldReanalyzeLLM(existingEntry, changeType),
    isNew: false,
    entry: existingEntry
  };

  // Si es CRITICAL, invalidar dependientes
  if (changeType === ChangeType.CRITICAL) {
    await this.invalidateDependents(filePath);
  }

  return result;
}

/**
 * Determina si se necesita re-análisis LLM
 */
export function shouldReanalyzeLLM(entry, changeType) {
  // Si nunca se analizó con LLM, sí se necesita
  if (!entry.llmAnalyzed) {
    return true;
  }

  // Según el tipo de cambio
  switch (changeType) {
    case ChangeType.COSMETIC:
      return false; // Solo formato, no requiere LLM
    case ChangeType.STATIC:
      return false; // Solo estructura, insights LLM siguen válidos
    case ChangeType.SEMANTIC:
    case ChangeType.CRITICAL:
      return true; // Cambios en lógica/conexiones, requiere LLM
    default:
      return true;
  }
}

/**
 * Guarda resultado de análisis estático
 */
export async function saveStaticAnalysis(filePath, analysis) {
  const entry = this.index.entries[filePath];
  if (!entry) return;

  // Guardar análisis en disco
  const analysisPath = path.join(
    this.cacheDir,
    'static',
    `${filePath.replace(/[\/\\]/g, '_')}.v${entry.version}.json`
  );
  await fs.mkdir(path.dirname(analysisPath), { recursive: true });
  await fs.writeFile(analysisPath, JSON.stringify(analysis, null, 2));

  // Actualizar entrada
  entry.staticAnalyzed = true;
  entry.staticHash = hashContent(JSON.stringify(analysis));
  entry.dependsOn = analysis.imports?.map((i) => i.resolved).filter(Boolean) || [];

  // Actualizar grafo de dependencias
  this.updateDependencyGraph(filePath, entry.dependsOn);

  await this.saveIndex();
}

/**
 * Guarda resultado de análisis LLM
 */
export async function saveLLMInsights(filePath, insights) {
  const entry = this.index.entries[filePath];
  if (!entry) return;

  // Guardar insights en disco
  const insightsPath = path.join(
    this.cacheDir,
    'llm',
    `${filePath.replace(/[\/\\]/g, '_')}.v${entry.version}.insights.json`
  );
  await fs.mkdir(path.dirname(insightsPath), { recursive: true });
  await fs.writeFile(insightsPath, JSON.stringify(insights, null, 2));

  // Actualizar entrada
  entry.llmAnalyzed = true;
  entry.llmHash = hashContent(JSON.stringify(insights));

  await this.saveIndex();
}

// ============================================================
// MÉTODOS COMPATIBLES CON LLMCACHE (adaptadores)
// ============================================================

/**
 * Obtiene resultado LLM cacheado (compatible con LLMCache antiguo)
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código fuente (para verificación de hash)
 * @param {string} promptTemplate - Template del prompt
 * @returns {Promise<object|null>} - Resultado cacheado o null
 */
export async function get(filePath, code, promptTemplate) {
  const entry = this.index.entries[filePath];

  // Si no hay entrada o no se analizó con LLM
  if (!entry || !entry.llmAnalyzed) {
    return null;
  }

  try {
    const insightsPath = path.join(
      this.cacheDir,
      'llm',
      `${filePath.replace(/[\/\\]/g, '_')}.v${entry.version}.insights.json`
    );

    const content = await fs.readFile(insightsPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Guarda resultado LLM (compatible con LLMCache antiguo)
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código fuente
 * @param {string} promptTemplate - Template del prompt
 * @param {object} result - Resultado del análisis
 * @returns {Promise<boolean>}
 */
export async function set(filePath, code, promptTemplate, result) {
  // Asegurar que existe la entrada
  if (!this.index.entries[filePath]) {
    await this.registerFile(filePath, code);
  }

  await this.saveLLMInsights(filePath, result);
  return true;
}

/**
 * Obtiene el código anterior de un archivo (si existe)
 */
export async function getPreviousCode(filePath) {
  // En una implementación real, esto podría venir de git o de un backup
  // Por ahora, retornamos vacío para forzar re-análisis
  return '';
}
