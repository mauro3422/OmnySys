/**
 * MCP Tool: detect_patterns
 * Detecta patrones de código usando DNA structural hash y pattern hash
 */

import fs from 'fs/promises';
import path from 'path';

async function loadAllAtoms(projectPath) {
  const atomsDir = path.join(projectPath, '.omnysysdata', 'atoms');
  const atoms = [];
  
  async function scanDir(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            atoms.push(JSON.parse(content));
          } catch {}
        }
      }
    } catch {}
  }
  
  await scanDir(atomsDir);
  return atoms;
}

function findDuplicates(atoms, minOccurrences) {
  const byStructuralHash = new Map();
  const byPatternHash = new Map();
  
  for (const atom of atoms) {
    const structHash = atom.dna?.structuralHash;
    const patternHash = atom.dna?.patternHash;
    
    if (structHash) {
      if (!byStructuralHash.has(structHash)) {
        byStructuralHash.set(structHash, []);
      }
      byStructuralHash.get(structHash).push(atom);
    }
    
    if (patternHash) {
      if (!byPatternHash.has(patternHash)) {
        byPatternHash.set(patternHash, []);
      }
      byPatternHash.get(patternHash).push(atom);
    }
  }
  
  const exactDuplicates = [];
  for (const [hash, atomsList] of byStructuralHash) {
    if (atomsList.length >= minOccurrences) {
      exactDuplicates.push({
        type: 'exact',
        hash,
        count: atomsList.length,
        similarity: 100,
        atoms: atomsList.map(a => ({
          id: a.id,
          name: a.name,
          file: a.filePath,
          line: a.line,
          complexity: a.complexity,
          linesOfCode: a.linesOfCode
        })),
        recommendation: `Extract to shared function. Potential savings: ${(atomsList.length - 1) * atomsList[0].linesOfCode} LOC`
      });
    }
  }
  
  const similarCode = [];
  for (const [hash, atomsList] of byPatternHash) {
    if (atomsList.length >= minOccurrences) {
      const existingExact = exactDuplicates.some(d => 
        d.atoms.some(a => atomsList.some(a2 => a.id === a2.id))
      );
      
      if (!existingExact && atomsList.length >= 2) {
        similarCode.push({
          type: 'similar',
          patternHash: hash,
          count: atomsList.length,
          similarity: 80,
          flowType: atomsList[0].dna?.flowType,
          operationSequence: atomsList[0].dna?.operationSequence?.slice(0, 10),
          atoms: atomsList.map(a => ({
            id: a.id,
            name: a.name,
            file: a.filePath,
            line: a.line,
            complexity: a.complexity,
            linesOfCode: a.linesOfCode,
            structuralHash: a.dna?.structuralHash
          })),
          recommendation: 'Similar structure detected. Consider refactoring if logic is duplicated.'
        });
      }
    }
  }
  
  return {
    exactDuplicates: exactDuplicates.sort((a, b) => b.count - a.count).slice(0, 15),
    similarCode: similarCode.sort((a, b) => b.count - a.count).slice(0, 15),
    summary: {
      exactDuplicatesFound: exactDuplicates.length,
      similarCodeFound: similarCode.length,
      potentialSavingsLOC: exactDuplicates.reduce((sum, d) => sum + (d.count - 1) * (d.atoms[0]?.linesOfCode || 0), 0)
    }
  };
}

function findComplexityHotspots(atoms) {
  const byFile = new Map();
  
  for (const atom of atoms) {
    if (!atom.filePath) continue;
    
    if (!byFile.has(atom.filePath)) {
      byFile.set(atom.filePath, { atoms: [], totalComplexity: 0, totalLOC: 0 });
    }
    
    const fileData = byFile.get(atom.filePath);
    fileData.atoms.push(atom);
    fileData.totalComplexity += atom.complexity || 0;
    fileData.totalLOC += atom.linesOfCode || 0;
  }
  
  const hotspots = [];
  for (const [file, data] of byFile) {
    if (data.totalComplexity >= 50) {
      hotspots.push({
        file,
        atomCount: data.atoms.length,
        totalComplexity: data.totalComplexity,
        totalLOC: data.totalLOC,
        avgComplexity: Math.round(data.totalComplexity / data.atoms.length * 10) / 10,
        topAtoms: data.atoms
          .sort((a, b) => (b.complexity || 0) - (a.complexity || 0))
          .slice(0, 3)
          .map(a => ({ name: a.name, complexity: a.complexity }))
      });
    }
  }
  
  return hotspots.sort((a, b) => b.totalComplexity - a.totalComplexity).slice(0, 10);
}

function findGodFunctions(atoms, threshold = 15) {
  return atoms
    .filter(a => (a.complexity || 0) >= threshold)
    .map(a => ({
      id: a.id,
      name: a.name,
      file: a.filePath,
      line: a.line,
      complexity: a.complexity,
      calls: a.calls?.length || 0,
      calledBy: a.calledBy?.length || 0,
      linesOfCode: a.linesOfCode,
      bigO: a.performance?.complexity?.bigO,
      flowType: a.dna?.flowType,
      recommendation: getGodFunctionRecommendation(a)
    }))
    .sort((a, b) => b.complexity - a.complexity);
}

function getGodFunctionRecommendation(atom) {
  const recs = [];
  
  if (atom.complexity > 30) {
    recs.push('Break into smaller functions');
  }
  if (atom.linesOfCode > 100) {
    recs.push('Extract logical blocks to separate functions');
  }
  if (atom.calls?.length > 15) {
    recs.push('Consider using a dispatcher pattern');
  }
  if (atom.performance?.complexity?.bigO === 'O(n^2)' || atom.performance?.complexity?.bigO === 'O(2^n)') {
    recs.push('Review algorithm complexity - consider caching or optimization');
  }
  
  return recs.length > 0 ? recs.join('. ') : 'Review for refactoring opportunities';
}

function findFragileNetworkCalls(atoms) {
  const fragile = [];
  const handled = [];
  
  for (const atom of atoms) {
    if (!atom.hasNetworkCalls) continue;
    
    const info = {
      id: atom.id,
      name: atom.name,
      file: atom.filePath,
      line: atom.line,
      networkEndpoints: atom.networkEndpoints || [],
      hasErrorHandling: atom.hasErrorHandling,
      hasRetry: false,
      hasTimeout: false
    };

    if (atom.errorFlow?.catches?.length > 0) {
      info.hasRetry = atom.errorFlow.catches.some(c => c.rethrows);
    }
    
    if (atom.temporal?.patterns?.timers?.length > 0) {
      info.hasTimeout = true;
    }
    
    if (!atom.hasErrorHandling) {
      info.risk = 'high';
      info.issue = 'No error handling for network calls';
      fragile.push(info);
    } else if (!info.hasTimeout) {
      info.risk = 'medium';
      info.issue = 'Network calls may hang without timeout';
      fragile.push(info);
    } else {
      handled.push(info);
    }
  }
  
  return {
    fragile: fragile.sort((a, b) => {
      const order = { high: 3, medium: 2, low: 1 };
      return order[b.risk] - order[a.risk];
    }).slice(0, 20),
    wellHandled: handled.slice(0, 5)
  };
}

function findDeadCode(atoms) {
  return atoms
    .filter(a => 
      a.callerPattern?.id === 'truly_dead' || 
      a.purpose === 'DEAD_CODE' ||
      (a.isDeadCode === true)
    )
    .map(a => ({
      id: a.id,
      name: a.name,
      file: a.filePath,
      line: a.line,
      linesOfCode: a.linesOfCode,
      reason: a.callerPattern?.reason || a.purposeReason || 'Unused code'
    }));
}

function findUnusualPatterns(atoms) {
  const patterns = [];

  const deeplyNested = atoms.filter(a => 
    a.performance?.expensiveOps?.nestedLoops >= 3
  ).map(a => ({
    type: 'deeply_nested',
    id: a.id,
    name: a.name,
    file: a.filePath,
    nestedLoops: a.performance.expensiveOps.nestedLoops,
    concern: 'Deeply nested loops may indicate O(n^3) or worse complexity'
  }));

  const highFanOut = atoms.filter(a => 
    (a.calls?.length || 0) > 20
  ).map(a => ({
    type: 'high_fan_out',
    id: a.id,
    name: a.name,
    file: a.filePath,
    calls: a.calls?.length,
    concern: 'Function calls many other functions - consider cohesion'
  }));

  const unusedExports = atoms.filter(a => 
    a.isExported && 
    (!a.calledBy || a.calledBy.length === 0) &&
    a.callerPattern?.id !== 'entry_point' &&
    a.callerPattern?.id !== 'test_framework'
  ).map(a => ({
    type: 'unused_export',
    id: a.id,
    name: a.name,
    file: a.filePath,
    concern: 'Exported but never called from other files'
  }));

  return {
    deeplyNested: deeplyNested.slice(0, 10),
    highFanOut: highFanOut.slice(0, 10),
    unusedExports: unusedExports.slice(0, 20)
  };
}

function findByArchetypePattern(atoms) {
  const patterns = new Map();
  
  for (const atom of atoms) {
    const archetype = atom.archetype?.type || 'unknown';
    const hasAsync = atom.isAsync ? 'async' : 'sync';
    const hasNetwork = atom.hasNetworkCalls ? 'network' : 'local';
    const key = `${archetype}:${hasAsync}:${hasNetwork}`;
    
    if (!patterns.has(key)) {
      patterns.set(key, []);
    }
    patterns.get(key).push(atom);
  }
  
  const result = [];
  for (const [pattern, atomsList] of patterns) {
    if (atomsList.length >= 3) {
      result.push({
        pattern,
        count: atomsList.length,
        examples: atomsList.slice(0, 3).map(a => ({
          id: a.id,
          name: a.name,
          file: a.filePath
        }))
      });
    }
  }
  
  return result.sort((a, b) => b.count - a.count);
}

export async function detect_patterns(args, context) {
  const { patternType = 'all', minOccurrences = 2 } = args;
  const { projectPath } = context;
  
  try {
    const atoms = await loadAllAtoms(projectPath);
    
    const result = {
      summary: {
        totalAtoms: atoms.length,
        withDna: atoms.filter(a => a.dna?.structuralHash).length,
        withPatternHash: atoms.filter(a => a.dna?.patternHash).length,
        analyzedAt: new Date().toISOString()
      }
    };
    
    if (patternType === 'all' || patternType === 'duplicates') {
      result.duplicates = findDuplicates(atoms, minOccurrences);
    }
    
    if (patternType === 'all' || patternType === 'complexity') {
      result.complexityHotspots = findComplexityHotspots(atoms);
    }
    
    if (patternType === 'all' || patternType === 'archetype') {
      result.archetypePatterns = findByArchetypePattern(atoms);
    }
    
    if (patternType === 'all' || patternType === 'god-functions') {
      result.godFunctions = findGodFunctions(atoms);
    }
    
    if (patternType === 'all' || patternType === 'fragile-network') {
      result.fragileNetwork = findFragileNetworkCalls(atoms);
    }

    if (patternType === 'all') {
      result.deadCode = findDeadCode(atoms);
      result.unusualPatterns = findUnusualPatterns(atoms);
    }
    
    return result;
  } catch (error) {
    return { error: error.message };
  }
}
