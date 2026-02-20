/**
 * @fileoverview call-graph-analyzer.js
 *
 * Call Graph Analyzer - Find all call sites of a symbol
 * Usa el caché de Layer A para obtener información precisa
 *
 * @module layer-graph/query/call-graph-analyzer
 */

import fs from 'fs/promises';
import path from 'path';
import { getFileAnalysis } from '#layer-c/query/apis/file-api.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:call:graph');

/**
 * Encuentra todos los call sites de un símbolo usando el caché de Layer A
 *
 * Estrategia:
 * 1. Leer el archivo objetivo del caché para ver sus exports
 * 2. Buscar en todos los archivos que tienen "usedBy" o imports al target
 * 3. Analizar el código fuente para encontrar líneas específicas de llamada
 */
export async function findCallSites(projectPath, targetFile, symbolName) {
  try {
    // PASO 1: Leer metadata del archivo objetivo desde el caché
    const targetAnalysis = await getFileAnalysis(projectPath, targetFile);

    if (!targetAnalysis) {
      return {
        error: `File ${targetFile} not found in cache. Run analysis first.`
      };
    }

    // Verificar que el símbolo existe (incluyendo reexports y métodos de clase)
    const exportInfo = targetAnalysis.exports?.find(e => e.name === symbolName);
    const hasDefinition = targetAnalysis.definitions?.some(
      d => d.name === symbolName || d.name?.endsWith(`.${symbolName}`)
    );

    if (!exportInfo && !hasDefinition) {
      return {
        error: `Symbol '${symbolName}' not found in ${targetFile}`,
        availableExports: targetAnalysis.exports?.map(e => e.name) || [],
        availableDefinitions: targetAnalysis.definitions?.map(d => d.name) || []
      };
    }

    if (exportInfo?.type === 'reexport' && exportInfo.source) {
      logger.info(`  Note: ${symbolName} is reexported from ${exportInfo.source}`);
    }

    const exportType = exportInfo?.type || 'function';

    // PASO 2: Obtener lista de archivos que usan este archivo
    const dependents = targetAnalysis.usedBy || [];
    const directImports = targetAnalysis.importedBy || [];
    const allDependentFiles = [...new Set([...dependents, ...directImports])];

    logger.info(`[Call Graph] ${symbolName} in ${targetFile}`);
    logger.info(`  Found ${allDependentFiles.length} dependent files`);

    // PASO 3: Analizar cada archivo dependiente para encontrar call sites específicos
    const callSites = [];

    for (const depFile of allDependentFiles) {
      try {
        const depPath = path.join(projectPath, depFile);
        const content = await fs.readFile(depPath, 'utf-8');
        const lines = content.split('\n');

        const depAnalysis = await getFileAnalysis(projectPath, depFile);

        const importInfo = depAnalysis?.imports?.find(imp => {
          const resolvedPath = imp.resolvedPath || imp.source;
          return resolvedPath && (resolvedPath.includes(targetFile) || targetFile.includes(resolvedPath));
        });

        let localName = symbolName;
        let namespaceName = null;

        if (importInfo) {
          const specifier = importInfo.specifiers?.find(s =>
            s.imported === symbolName || s.name === symbolName
          );
          if (specifier?.local && specifier.local !== symbolName) {
            localName = specifier.local;
          }
          if (importInfo.specifiers?.some(s => s.type === 'namespace')) {
            namespaceName = importInfo.specifiers.find(s => s.type === 'namespace')?.local || 'namespace';
          }
        }

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();

          // Skip import/export declarations — they reference the symbol but are never call sites
          if (/^import\s/.test(trimmedLine) || /^export\s*\{/.test(trimmedLine)) continue;

          let match = null;
          let callType = 'function_call';

          if (new RegExp(`\\b${localName}\\s*\\(`).test(line)) {
            match = { type: 'direct', name: localName };
          } else if (new RegExp(`\\b${localName}\\b`).test(line) &&
                   !line.includes(`${localName}(`) &&
                   !line.includes(`${localName}.`) &&
                   !new RegExp(`(function|const|let|var|import|export)\\s+${localName}`).test(line)) {
            match = { type: 'reference', name: localName };
            callType = 'variable_reference';
          } else if (namespaceName && new RegExp(`\\b${namespaceName}\\.${localName}\\s*\\(`).test(line)) {
            match = { type: 'namespace', name: `${namespaceName}.${localName}` };
            callType = 'namespace_call';
          } else if (new RegExp(`new\\s+${localName}\\s*\\(`).test(line)) {
            match = { type: 'new', name: `new ${localName}` };
            callType = 'instantiation';
          } else if (new RegExp(`\\.${localName}\\s*\\(`).test(line)) {
            match = { type: 'method', name: `.${localName}` };
            callType = 'method_call';
          } else if (new RegExp(`\\b${localName}\\.(call|apply)\\s*\\(`).test(line)) {
            match = { type: 'call/apply', name: `${localName}.call/apply` };
            callType = 'call_apply';
          }

          if (match) {
            const contextStart = Math.max(0, i - 2);
            const contextEnd = Math.min(lines.length, i + 3);
            const context = lines.slice(contextStart, contextEnd).join('\n');

            callSites.push({
              file: depFile,
              line: i + 1,
              column: line.indexOf(match.name) + 1,
              code: line.trim(),
              context,
              type: callType,
              importType: importInfo
                ? (importInfo.specifiers?.some(s => s.type === 'namespace') ? 'namespace'
                  : importInfo.specifiers?.some(s => s.type === 'default' || s.imported === 'default') ? 'default'
                  : importInfo.specifiers?.length > 0 ? 'named'
                  : importInfo.type || 'unknown')
                : 'unknown',
              alias: localName !== symbolName ? localName : null,
              namespace: namespaceName
            });
          }
        }

      } catch (error) {
        logger.warn(`  ⚠️  Could not analyze ${depFile}: ${error.message}`);
        continue;
      }
    }

    callSites.sort((a, b) => {
      if (a.file !== b.file) return a.file.localeCompare(b.file);
      return a.line - b.line;
    });

    logger.info(`  ✓ Found ${callSites.length} call sites`);

    return {
      targetSymbol: symbolName,
      targetFile,
      exportType,
      totalCallSites: callSites.length,
      uniqueFiles: [...new Set(callSites.map(s => s.file))].length,
      callSites: callSites.slice(0, 50)
    };

  } catch (error) {
    logger.error(`Error in findCallSites: ${error.message}`);
    return { error: error.message };
  }
}
