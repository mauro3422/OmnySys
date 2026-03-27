/**
 * @fileoverview helper-reuse-detector.js
 *
 * Detecta helpers duplicados y sugiere reutilizar helpers existentes.
 * Busca en /utils/, /shared/, /helpers/ helpers con fingerprints similares.
 *
 * @module shared/compiler/helper-reuse-detector
 */

import { createLogger } from '#utils/logger.js';
import { findExistingHelpers } from './helper-reuse-detector-search.js';
import { buildReuseSuggestion } from './helper-reuse-detector-suggestion.js';

const logger = createLogger('OmnySys:HelperReuseDetector');

export async function detectHelperReuseOpportunities(projectPath, filePath, duplicateFindings = []) {
  const opportunities = [];

  for (const finding of duplicateFindings) {
    if (!finding.semanticFingerprint || !finding.symbol) {
      continue;
    }

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

export {
  findExistingHelpers
} from './helper-reuse-detector-search.js';

export {
  buildReuseSuggestion
} from './helper-reuse-detector-suggestion.js';
