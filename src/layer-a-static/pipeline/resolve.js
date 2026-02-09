import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:resolve');


﻿import { resolveImport, getResolutionConfig } from '../resolver.js';

export async function resolveImports(parsedFiles, absoluteRootPath, verbose = true) {
  if (verbose) logger.info('âš™ï¸  Loading resolution config...');
  const resolutionConfig = await getResolutionConfig(absoluteRootPath);
  if (verbose) {
    const aliasCount = Object.keys(resolutionConfig.aliases).length;
    logger.info(`  âœ“ Found ${aliasCount} aliases\n`);
  }

  if (verbose) logger.info('ðŸ”— Resolving imports...');
  const resolvedImports = {};
  let totalImports = 0;
  let resolvedCount = 0;

  for (const [filePath, fileInfo] of Object.entries(parsedFiles)) {
    const resolved = [];

    for (const importStmt of fileInfo.imports || []) {
      totalImports++;
      const importSources = Array.isArray(importStmt.source)
        ? importStmt.source
        : [importStmt.source];

      for (const source of importSources) {
        const result = await resolveImport(
          source,
          filePath,
          absoluteRootPath,
          resolutionConfig.aliases
        );

        if (result.type === 'local') {
          resolvedCount++;
        }

        resolved.push({
          source,
          resolved: result.resolved,
          type: result.type,
          symbols: importStmt.specifiers,
          reason: result.reason
        });
      }
    }

    resolvedImports[filePath] = resolved;
  }

  if (verbose) {
    logger.info(`  âœ“ Resolved ${resolvedCount}/${totalImports} imports\n`);
  }

  return { resolvedImports, resolutionConfig };
}
