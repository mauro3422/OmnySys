/**
 * @fileoverview Análisis de impacto y namespace
 */

import path from 'path';
import { createLogger } from '../../../../utils/logger.js';
import { getAllAtoms } from '#layer-c/storage/index.js';
import { findAtomsByName } from './search.js';

const logger = createLogger('OmnySys:atomic:analysis');

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
  
  for (const pair of renamePairs) {
    const previousAtom = pair.old;
    const currentAtom = pair.new;
    
    const atomImpact = {
      name: currentAtom.name,
      changes: [`Renamed: ${previousAtom.name} -> ${currentAtom.name}`],
      dependents: []
    };
    
    impact.score += 10;
    impact.breakingChanges.push({
      type: 'rename',
      oldName: previousAtom.name,
      newName: currentAtom.name,
      file: currentAtom.file
    });
    
    const dependents = allAtoms.filter(atom =>
      atom.id !== currentAtom.id &&
      atom.file !== currentAtom.file &&
      atom.calls?.some(call =>
        call.callee === previousAtom.name ||
        call.callee?.endsWith(`::${previousAtom.name}`)
      )
    );
    
    for (const dep of dependents) {
      atomImpact.dependents.push({
        type: 'call',
        file: dep.file,
        function: dep.name,
        severity: 'breaking'
      });
      impact.affectedFiles.add(dep.file);
      impact.score += 5;
    }
    
    if (atomImpact.dependents.length > 0) {
      impact.dependencyTree.push(atomImpact);
    }
  }
  
  const modifiedAtoms = currentAtoms.filter(a => previousIds.has(a.id));
  
  for (const currentAtom of modifiedAtoms) {
    const previousAtom = previousAtoms.find(a => a.id === currentAtom.id);
    if (!previousAtom) continue;
    
    const atomImpact = {
      name: currentAtom.name,
      changes: [],
      dependents: []
    };
    
    const prevParams = previousAtom.signature?.params || [];
    const currParams = currentAtom.signature?.params || [];
    
    if (prevParams.length !== currParams.length) {
      atomImpact.changes.push(`Parameters changed: ${prevParams.length} -> ${currParams.length}`);
      impact.score += 8;
      
      const callers = allAtoms.filter(atom =>
        atom.calls?.some(call =>
          call.callee === currentAtom.name ||
          call.callee?.endsWith(`::${currentAtom.name}`)
        )
      );
      
      for (const caller of callers) {
        const call = caller.calls?.find(c =>
          c.callee === currentAtom.name ||
          c.callee?.endsWith(`::${currentAtom.name}`)
        );
        
        if (call && call.argumentCount < currParams.filter(p => !p.optional).length) {
          atomImpact.dependents.push({
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
    
    if (atomImpact.changes.length > 0 || atomImpact.dependents.length > 0) {
      impact.dependencyTree.push(atomImpact);
    }
  }
  
  if (impact.score >= 20) impact.level = 'critical';
  else if (impact.score >= 15) impact.level = 'high';
  else if (impact.score >= 10) impact.level = 'medium';
  else if (impact.score > 0) impact.level = 'low';
  
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
