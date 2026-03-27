import fs from 'fs/promises';
import path from 'path';
import { resolveImport, getResolutionConfig } from '../../layer-a-static/resolver.js';

export async function resolveAllImports(parsed, fullPath, rootPath) {
  const resolutionConfig = await getResolutionConfig(rootPath);
  const resolvedImports = [];

  for (const importStmt of parsed.imports || []) {
    const sources = Array.isArray(importStmt.source) ? importStmt.source : [importStmt.source];
    for (const source of sources) {
      const result = await resolveImport(source, fullPath, rootPath, resolutionConfig.aliases);
      resolvedImports.push({
        source,
        resolved: result.resolved,
        type: result.type,
        specifiers: importStmt.specifiers || [],
        reason: result.reason
      });
    }
  }

  return resolvedImports;
}

export async function loadDependencySources(resolvedImports, filePath, parsedSource, rootPath) {
  const fileSourceCode = { [filePath]: parsedSource };

  for (const imp of resolvedImports) {
    if (imp.type !== 'local' || !imp.resolved) continue;

    try {
      fileSourceCode[imp.resolved] = await fs.readFile(path.join(rootPath, imp.resolved), 'utf-8');
    } catch {
      // Ignore dependency read failures.
    }
  }

  return fileSourceCode;
}
