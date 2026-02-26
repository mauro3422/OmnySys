import { getAllAtoms } from '#layer-c/storage/index.js';
import { createLogger } from '../../../utils/logger.js';
import { AnalysisEngine } from '../core/shared/analysis-engine.js';

const logger = createLogger('OmnySys:atomic:graph-alerts');

/**
 * Calcula el "Blast Radius" de un cambio en un archivo o símbolo
 */
export async function analyzeBlastRadius(filePath, projectPath, symbolName = null) {
  try {
    const allAtoms = await getAllAtoms(projectPath);

    // Si hay un símbolo específico, usar el engine para análisis profundo
    if (symbolName) {
      const blastResults = await AnalysisEngine.analyzeBlastRadius(symbolName, filePath, projectPath, allAtoms);
      return {
        level: blastResults.level,
        score: blastResults.score,
        classification: blastResults.classification,
        maxCallers: blastResults.directDependents,
        affectedFilesCount: blastResults.affectedFiles,
        warning: blastResults.recommendation
      };
    }

    // Si es un archivo completo, analizar el átomo más crítico del archivo
    const atomsInFile = allAtoms.filter(a => (a.filePath === filePath || a.file === filePath));
    if (atomsInFile.length === 0) return { level: 'low', score: 0, reason: 'No atoms found' };

    let highestBlast = { score: -1 };
    for (const atom of atomsInFile) {
      const result = await AnalysisEngine.analyzeBlastRadius(atom.name, filePath, projectPath, allAtoms);
      if (result.score > highestBlast.score) highestBlast = result;
    }

    return {
      level: highestBlast.level,
      score: highestBlast.score,
      classification: highestBlast.classification,
      maxCallers: highestBlast.directDependents,
      affectedFilesCount: highestBlast.affectedFiles,
      warning: highestBlast.recommendation
    };

  } catch (error) {
    logger.error(`Error analyzing blast radius: ${error.message}`);
    return { level: 'unknown', score: 0, error: error.message };
  }
}
