/**
 * @fileoverview Análisis de impacto y namespace
 */

import path from 'path';
import { createLogger } from '../../../../utils/logger.js';
import { getAllAtoms } from '#layer-c/storage/index.js';
import { findAtomsByName } from './search.js';

const logger = createLogger('OmnySys:atomic:analysis');

/**
 * Detecta átomos renombrados
 */
function detectRenamedAtoms(removedAtoms, newAtoms) {
  const renamePairs = [];
  for (const removed of removedAtoms) {
    const renamed = newAtoms.find(n => {
      if (!removed.file || !n.file) return false;
      const removedFile = path.basename(removed.file);
      const newFile = path.basename(n.file);
      return n.line === removed.line &&
             removedFile === newFile &&
             n.name !== removed.name;
    });
    if (renamed) {
      renamePairs.push({ old: removed, new: renamed });
    }
  }
  return renamePairs;
}

/**
 * Analiza impacto de renombrado
 */
function analyzeRenameImpact(pair, allAtoms) {
  const previousAtom = pair.old;
  const currentAtom = pair.new;
  const impact = {
    name: currentAtom.name,
    changes: [`Renamed: ${previousAtom.name} -> ${currentAtom.name}`],
    dependents: [],
    score: 10,
    breakingChanges: [{
      type: 'rename',
      oldName: previousAtom.name,
      newName: currentAtom.name,
      file: currentAtom.file
    }],
    affectedFiles: new Set()
  };

  const dependents = allAtoms.filter(atom =>
    atom.id !== currentAtom.id &&
    atom.file !== currentAtom.file &&
    atom.calls?.some(call =>
      call.callee === previousAtom.name ||
      call.callee?.endsWith(`::${previousAtom.name}`)
    )
  );

  for (const dep of dependents) {
    impact.dependents.push({
      type: 'call',
      file: dep.file,
      function: dep.name,
      severity: 'breaking'
    });
    impact.affectedFiles.add(dep.file);
    impact.score += 5;
  }

  return impact;
}

/**
 * Analiza impacto de cambios de signature
 */
function analyzeSignatureImpact(currentAtom, previousAtom, allAtoms) {
  const impact = {
    name: currentAtom.name,
    changes: [],
    dependents: [],
    score: 0,
    breakingChanges: [],
    affectedFiles: new Set()
  };

  const prevParams = previousAtom.signature?.params || [];
  const currParams = currentAtom.signature?.params || [];

  if (prevParams.length !== currParams.length) {
    impact.changes.push(`Parameters changed: ${prevParams.length} -> ${currParams.length}`);
    impact.score += 8;

    const callers = allAtoms.filter(atom =>
      atom.calls?.some(call =>
        call.callee === currentAtom.name ||
        call.callee?.endsWith(`::${currentAtom.name}`)
      )
    );

    const requiredParams = currParams.filter(p => !p.optional).length;

    for (const caller of callers) {
      const call = caller.calls?.find(c =>
        c.callee === currentAtom.name ||
        c.callee?.endsWith(`::${currentAtom.name}`)
      );

      if (call && call.argumentCount < requiredParams) {
        impact.dependents.push({
          type: 'incompatible-call',
          file: caller.file,
          function: caller.name,
          line: call.line,
          severity: 'breaking'
        });
        impact.affectedFiles.add(caller.file);
        impact.score += 5;
      }
    }
  }

  return impact;
}

/**
 * Determina nivel de impacto basado en score
 */
function determineImpactLevel(score) {
  if (score >= 20) return 'critical';
  if (score >= 15) return 'high';
  if (score >= 10) return 'medium';
  if (score > 0) return 'low';
  return 'none';
}

/**
 * Análisis completo de impacto - muestra TODO lo que depende del cambio
 */
export async function analyzeFullImpact(filePath, projectPath, previousAtoms, currentAtoms, allAtoms) {
  const impact = {
    level: 'none',
    score: 0,
    affectedFiles: new Set(),
    affectedFunctions: [],
    breakingChanges: [],
    warnings: [],
    dependencyTree: []
  };

  const currentIds = new Set(currentAtoms.map(a => a.id));
  const previousIds = new Set(previousAtoms.map(a => a.id));

  const removedAtoms = previousAtoms.filter(a => !currentIds.has(a.id));
  const newAtoms = currentAtoms.filter(a => !previousIds.has(a.id));

  // Analizar renombrados
  const renamePairs = detectRenamedAtoms(removedAtoms, newAtoms);
  for (const pair of renamePairs) {
    const atomImpact = analyzeRenameImpact(pair, allAtoms);
    impact.score += atomImpact.score;
    impact.breakingChanges.push(...atomImpact.breakingChanges);
    for (const file of atomImpact.affectedFiles) {
      impact.affectedFiles.add(file);
    }
    if (atomImpact.dependents.length > 0) {
      impact.dependencyTree.push({
        name: atomImpact.name,
        changes: atomImpact.changes,
        dependents: atomImpact.dependents
      });
    }
  }

  // Analizar modificados
  const modifiedAtoms = currentAtoms.filter(a => previousIds.has(a.id));
  for (const currentAtom of modifiedAtoms) {
    const previousAtom = previousAtoms.find(a => a.id === currentAtom.id);
    if (!previousAtom) continue;

    const atomImpact = analyzeSignatureImpact(currentAtom, previousAtom, allAtoms);
    impact.score += atomImpact.score;
    for (const file of atomImpact.affectedFiles) {
      impact.affectedFiles.add(file);
    }
    if (atomImpact.changes.length > 0 || atomImpact.dependents.length > 0) {
      impact.dependencyTree.push({
        name: atomImpact.name,
        changes: atomImpact.changes,
        dependents: atomImpact.dependents
      });
    }
  }

  impact.level = determineImpactLevel(impact.score);
  return impact;
}

/**
 * Analiza el riesgo de namespace del código nuevo
 */
export async function analyzeNamespaceRisk(code, projectPath) {
  const risk = {
    level: 'low',
    score: 0,
    warnings: [],
    exports: 0
  };
  
  try {
    const allAtoms = await getAllAtoms(projectPath);
    
    const exportMatches = code.match(/export\s+(?:async\s+)?function\s+(\w+)/g) || [];
    risk.exports = exportMatches.length;
    
    for (const match of exportMatches) {
      const nameMatch = match.match(/function\s+(\w+)/);
      if (!nameMatch) continue;
      
      const exportName = nameMatch[1];
      
      const similar = allAtoms.filter(atom => {
        if (atom.name === exportName) return false;
        const distance = levenshteinDistance(atom.name, exportName);
        return distance <= 2 && distance > 0;
      });
      
      if (similar.length > 0) {
        risk.score += similar.length * 2;
        risk.warnings.push({
          type: 'similar_name',
          name: exportName,
          similarNames: similar.slice(0, 3).map(a => a.name),
          message: `⚠️ "${exportName}" is similar to existing: ${similar.slice(0, 3).map(a => a.name).join(', ')}`
        });
      }
      
      const genericNames = ['utils', 'helpers', 'common', 'index', 'main', 'api', 'service', 'controller'];
      if (genericNames.includes(exportName.toLowerCase())) {
        risk.score += 5;
        risk.warnings.push({
          type: 'generic_name',
          name: exportName,
          message: `⚠️ "${exportName}" is a generic name, may cause confusion`
        });
      }
    }
    
    if (risk.score >= 10) risk.level = 'high';
    else if (risk.score >= 5) risk.level = 'medium';
    
  } catch (error) {
    logger.warn(`[NamespaceRisk] Error analyzing: ${error.message}`);
  }
  
  return risk;
}

/**
 * Calcula distancia de Levenshtein
 */
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
