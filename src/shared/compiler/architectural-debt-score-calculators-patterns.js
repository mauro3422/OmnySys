import { createLogger } from '#utils/logger.js';
import { detectArchitecturalPattern } from './architectural-pattern-detector.js';
import { loadPatternAtoms } from './architectural-debt-score-repository.js';

const logger = createLogger('OmnySys:ArchitecturalDebtScore');

export async function calculatePatternScore(projectPath, repo) {
  const issues = [];
  let totalAtoms = 0;
  let problematicAtoms = 0;

  try {
    const atoms = loadPatternAtoms(repo);
    if (atoms.length > 0) {
      totalAtoms = atoms.length;

      for (const atom of atoms) {
        const metadata = {
          filePath: atom.file_path,
          name: atom.name,
          complexity: atom.complexity,
          isExported: atom.is_exported === 1,
          semanticFingerprint: atom.fingerprint
        };

        const pattern = detectArchitecturalPattern(metadata);

        if (pattern.patterns.length > 0 && pattern.severity !== 'low') {
          problematicAtoms++;

          for (const rec of pattern.recommendations) {
            issues.push({
              type: pattern.primaryPattern || 'architectural_issue',
              file: metadata.filePath,
              symbol: metadata.name,
              severity: pattern.severity,
              recommendation: rec.message,
              suggestedStructure: rec.suggestedStructure
            });
          }
        }
      }
    }
  } catch (err) {
    logger.error(`[calculatePatternScore] Error analyzing architectural patterns: ${err.message}`);
  }

  const problematicRatio = totalAtoms > 0 ? problematicAtoms / totalAtoms : 0;
  const normalized = Math.min(100, Math.round(problematicRatio * 200));

  return {
    normalized,
    issues,
    details: {
      totalAtoms,
      problematicAtoms,
      problematicRatio: Math.round(problematicRatio * 100 * 100) / 100
    }
  };
}
