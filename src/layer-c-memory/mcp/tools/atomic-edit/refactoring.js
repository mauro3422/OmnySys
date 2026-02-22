/**
 * @fileoverview Sugerencias de refactoring
 */

import path from 'path';
import { createLogger } from '../../../../utils/logger.js';
import { findAtomsByName } from './search.js';

const logger = createLogger('OmnySys:atomic:refactoring');

/**
 * Genera sugerencias de refactoring OPTIMIZADO
 */
export async function generateRefactoringSuggestionsOptimized(exports, newFilePath, projectPath) {
  const suggestions = {
    canConsolidate: false,
    totalSavings: { lines: 0, files: 0 },
    duplicates: [],
    recommendedActions: [],
    codeExamples: {}
  };
  
  try {
    for (const exportItem of exports) {
      const duplicates = await findAtomsByName(exportItem.name, projectPath);
      
      const realDuplicates = duplicates.filter(d => 
        !newFilePath.includes(d.filePath) &&
        d.linesOfCode > 3
      );
      
      if (realDuplicates.length === 0) continue;
      
      const analyzed = realDuplicates.map(d => ({
        filePath: d.filePath,
        line: d.line,
        linesOfCode: d.linesOfCode,
        complexity: d.complexity,
        callers: d.calledBy?.length || 0,
        changeRisk: d.derived?.changeRisk || 0.5,
        consolidationScore: (
          (d.calledBy?.length || 0) * 2 +
          (d.linesOfCode > 10 ? 5 : 0) +
          (d.complexity < 10 ? 3 : 0) -
          (d.derived?.changeRisk || 0) * 10
        )
      }));
      
      analyzed.sort((a, b) => b.consolidationScore - a.consolidationScore);
      
      const best = analyzed[0];
      const totalLines = analyzed.reduce((sum, d) => sum + d.linesOfCode, 0);
      
      suggestions.duplicates.push({
        name: exportItem.name,
        occurrenceCount: realDuplicates.length,
        potentialSavings: totalLines - (exportItem.linesOfCode || 1),
        bestConsolidationCandidate: best.filePath,
        riskLevel: best.changeRisk > 0.5 ? 'high' : 'low',
        allLocations: analyzed.slice(0, 5)
      });
      
      suggestions.totalSavings.lines += totalLines;
      suggestions.totalSavings.files += realDuplicates.length;
      
      const relativePath = path.relative(
        path.dirname(best.filePath),
        newFilePath
      ).replace(/\\/g, '/');
      
      const importPath = relativePath.startsWith('.') 
        ? relativePath 
        : './' + relativePath;
      
      suggestions.codeExamples[exportItem.name] = {
        import: `import { ${exportItem.name} } from '${importPath}';`,
        remove: `// Remove ${exportItem.name}() from this file`,
        reason: `Consolidate in ${newFilePath} (${best.callers} callers)`
      };
      
      if (best.changeRisk < 0.3 && best.callers === 0) {
        suggestions.recommendedActions.push({
          priority: 'high',
          type: 'safe_to_consolidate',
          target: best.filePath,
          function: exportItem.name,
          reason: `Low risk (${best.changeRisk.toFixed(2)}), no external callers`,
          autoFixComplexity: 'simple'
        });
        suggestions.canConsolidate = true;
      }
    }
    
  } catch (error) {
    logger.warn(`[RefactoringOptimized] Error: ${error.message}`);
  }
  
  return suggestions;
}
