/**
 * Tool: search_files
 * Search for files in the project by pattern
 */

import { getProjectMetadata } from '#layer-c/query/apis/project-api.js';
import { getAllAtoms } from '#layer-c/storage/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:search');



export async function search_files(args, context) {
  const { pattern } = args;
  const { projectPath, server } = context;
  
  logger.info(`[Tool] search_files("${pattern}")`);

  try {
    const metadata = await getProjectMetadata(projectPath);
    const fileIndex = metadata?.fileIndex || metadata?.files || {};
    const allFiles = Object.keys(fileIndex);
    const lowerPattern = pattern.toLowerCase();

    // Buscar por path de archivo
    const pathMatches = allFiles.filter(f => f.toLowerCase().includes(lowerPattern));

    // Buscar por nombres de átomos (funciones, clases, variables)
    const symbolMatches = [];
    try {
      const atoms = await getAllAtoms(projectPath);
      const matchedFiles = new Set(pathMatches);
      const symbolFileHits = new Map(); // filePath → [matchedNames]

      for (const atom of atoms) {
        if (matchedFiles.has(atom.filePath)) continue;
        const name = (atom.name || '').toLowerCase();
        const fingerprint = (atom.dna?.semanticFingerprint || '').toLowerCase();
        if (name.includes(lowerPattern) || fingerprint.includes(lowerPattern)) {
          if (!symbolFileHits.has(atom.filePath)) symbolFileHits.set(atom.filePath, []);
          symbolFileHits.get(atom.filePath).push(atom.name);
        }
      }

      for (const [filePath, names] of symbolFileHits) {
        symbolMatches.push({ path: filePath, symbols: names.slice(0, 5) });
      }
    } catch {
      // Symbol search optional — path matches still returned
    }

    const allMatchPaths = [...pathMatches, ...symbolMatches.map(m => m.path)];

    return {
      pattern,
      found: allMatchPaths.length,
      files: pathMatches.slice(0, 20),
      symbolFiles: symbolMatches.slice(0, 10),
      byType: {
        pathMatches: pathMatches.length,
        symbolMatches: symbolMatches.length
      },
      totalIndexed: allFiles.length
    };
  } catch (error) {
    return {
      pattern,
      found: 0,
      files: [],
      error: error.message,
      note: 'Server may still be initializing'
    };
  }
}
