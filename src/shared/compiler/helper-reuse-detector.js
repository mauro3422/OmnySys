/**
 * @fileoverview helper-reuse-detector.js
 *
 * Detecta helpers duplicados y sugiere reutilizar helpers existentes.
 * Busca en /utils/, /shared/, /helpers/ helpers con fingerprints similares.
 *
 * @module shared/compiler/helper-reuse-detector
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:HelperReuseDetector');

/**
 * Directorios donde buscar helpers existentes
 */
const HELPER_DIRECTORIES = [
  '/utils/',
  '/shared/',
  '/helpers/',
  '/common/',
  '/lib/'
];

/**
 * Patrones de nombres que sugieren helpers utilitarios
 */
const UTILITY_NAME_PATTERNS = [
  /^normalize/,
  /^format/,
  /^parse/,
  /^validate/,
  /^sanitize/,
  /^transform/,
  /^extract/,
  /^build/,
  /^create/,
  /^make/,
  /^get/,
  /^set/,
  /^is/,
  /^has/,
  /^can/,
  /^should/
];

/**
 * Busca helpers existentes en el proyecto con fingerprint similar
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} semanticFingerprint - Fingerprint del helper duplicado
 * @param {string} helperName - Nombre del helper
 * @returns {Promise<Array>} Lista de helpers similares encontrados
 */
export async function findExistingHelpers(projectPath, semanticFingerprint, helperName) {
  const repo = getRepository(projectPath);
  if (!repo?.db) {
    logger.warn('[findExistingHelpers] DB not available');
    return [];
  }

  // Extraer verbo y dominio del fingerprint
  // Formato: verb:chest:domain:entity
  const [verb, chest, domain, entity] = semanticFingerprint.split(':');

  // Buscar helpers con mismo verbo y dominio
  const similarHelpers = repo.db.prepare(`
    SELECT a.name, a.file_path, a.lines_of_code, a.is_exported,
           json_extract(a.dna_json, '$.semanticFingerprint') as semanticFingerprint,
           json_extract(a.dna_json, '$.structuralHash') as structuralHash
    FROM atoms a
    WHERE json_extract(a.dna_json, '$.semanticFingerprint') LIKE ?
       OR json_extract(a.dna_json, '$.semanticFingerprint') LIKE ?
       OR json_extract(a.dna_json, '$.semanticFingerprint') LIKE ?
      AND a.atom_type IN ('function', 'arrow', 'method')
      AND (a.is_removed IS NULL OR a.is_removed = 0)
      AND (a.is_dead_code IS NULL OR a.is_dead_code = 0)
    ORDER BY a.is_exported DESC, a.lines_of_code ASC
    LIMIT 10
  `).all(
    `${verb}%:${domain}%`,
    `%:${chest}:%`,
    `${verb}:logic:core:%`
  );

  // Filtrar solo helpers en directorios utilitarios
  const utilityHelpers = similarHelpers.filter(helper =>
    HELPER_DIRECTORIES.some(dir => helper.file_path.includes(dir))
  );

  // Filtrar por patrones de nombre utilitario
  const namedHelpers = utilityHelpers.filter(helper =>
    UTILITY_NAME_PATTERNS.some(pattern => pattern.test(helper.name))
  );

  // Excluir el helper original
  const excludingSelf = namedHelpers.filter(helper =>
    helper.name !== helperName || !helper.file_path.includes(helperName)
  );

  logger.debug(`[findExistingHelpers] Found ${excludingSelf.length} similar helpers`);

  return excludingSelf.map(helper => ({
    name: helper.name,
    filePath: helper.file_path,
    linesOfCode: helper.lines_of_code,
    isExported: helper.is_exported === 1,
    semanticFingerprint: helper.semanticFingerprint,
    structuralHash: helper.structuralHash,
    matchReason: getMatchReason(helper.semanticFingerprint, verb, chest, domain)
  }));
}

/**
 * Obtiene la razón del match entre fingerprints
 */
function getMatchReason(fingerprint, verb, chest, domain) {
  const [fVerb, fChest, fDomain] = fingerprint.split(':');

  if (fVerb === verb && fDomain === domain) {
    return 'Same verb and domain';
  }

  if (fVerb === verb && fChest === chest) {
    return 'Same verb and chest';
  }

  if (fVerb === verb) {
    return 'Same verb';
  }

  return 'Similar semantic pattern';
}

/**
 * Genera sugerencia de reutilización
 * @param {string} duplicateFile - Archivo con el duplicado
 * @param {Array} existingHelpers - Helpers existentes encontrados
 * @returns {Object} Sugerencia de reutilización
 */
export function buildReuseSuggestion(duplicateFile, existingHelpers) {
  if (existingHelpers.length === 0) {
    return null;
  }

  // Ordenar por preferencia: exportados > no exportados, menos líneas > más líneas
  const sorted = [...existingHelpers].sort((a, b) => {
    if (a.isExported !== b.isExported) {
      return b.isExported ? 1 : -1;
    }
    return a.linesOfCode - b.linesOfCode;
  });

  const bestMatch = sorted[0];

  return {
    action: 'reuse_existing_helper',
    confidence: sorted.length > 1 ? 'high' : 'medium',
    existingHelper: {
      name: bestMatch.name,
      filePath: bestMatch.filePath,
      importStatement: `import { ${bestMatch.name} } from '${bestMatch.filePath.replace('.js', '')}';`,
      usage: `// Use ${bestMatch.name}() instead of duplicating logic`,
      reason: bestMatch.matchReason
    },
    alternatives: sorted.slice(1, 4).map(helper => ({
      name: helper.name,
      filePath: helper.filePath,
      reason: helper.matchReason
    })),
    totalSimilarHelpers: sorted.length,
    recommendation: `Replace duplicate in ${duplicateFile} with existing helper ${bestMatch.name} in ${bestMatch.filePath}`
  };
}

/**
 * Detecta oportunidades de reutilización de helpers para un archivo
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} filePath - Archivo a analizar
 * @param {Array} duplicateFindings - Duplicados detectados
 * @returns {Promise<Array>} Oportunidades de reutilización
 */
export async function detectHelperReuseOpportunities(projectPath, filePath, duplicateFindings = []) {
  const repo = getRepository(projectPath);
  if (!repo?.db) {
    return [];
  }

  const opportunities = [];

  for (const finding of duplicateFindings) {
    if (!finding.semanticFingerprint || !finding.symbol) {
      continue;
    }

    // Buscar helpers existentes
    const existingHelpers = await findExistingHelpers(
      projectPath,
      finding.semanticFingerprint,
      finding.symbol
    );

    if (existingHelpers.length > 0) {
      const suggestion = buildReuseSuggestion(filePath, existingHelpers);

      if (suggestion) {
        opportunities.push({
          duplicateSymbol: finding.symbol,
          duplicateFile: filePath,
          semanticFingerprint: finding.semanticFingerprint,
          ...suggestion
        });
      }
    }
  }

  logger.info(`[detectHelperReuseOpportunities] Found ${opportunities.length} reuse opportunities`);

  return opportunities;
}
