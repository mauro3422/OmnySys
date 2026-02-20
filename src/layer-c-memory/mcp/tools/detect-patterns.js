/**
 * MCP Tool: detect_patterns
 * Detecta patrones de código usando DNA structural hash
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

function findDuplicates(atoms) {
  const byHash = new Map();
  
  for (const atom of atoms) {
    const hash = atom.dna?.structuralHash;
    if (!hash) continue;
    
    if (!byHash.has(hash)) {
      byHash.set(hash, []);
    }
    byHash.get(hash).push(atom);
  }
  
  const duplicates = [];
  for (const [hash, atomsList] of byHash) {
    if (atomsList.length > 1) {
      duplicates.push({
        hash,
        count: atomsList.length,
        atoms: atomsList.map(a => ({
          id: a.id,
          name: a.name,
          file: a.filePath,
          complexity: a.complexity,
          linesOfCode: a.linesOfCode
        }))
      });
    }
  }
  
  return duplicates.sort((a, b) => b.count - a.count);
}

function findSimilarByComplexity(atoms) {
  const byComplexity = new Map();
  
  for (const atom of atoms) {
    const c = atom.complexity || 0;
    if (c < 5) continue;
    
    const bucket = Math.floor(c / 5) * 5;
    if (!byComplexity.has(bucket)) {
      byComplexity.set(bucket, []);
    }
    byComplexity.get(bucket).push(atom);
  }
  
  const similar = [];
  for (const [bucket, atomsList] of byComplexity) {
    if (atomsList.length >= 3) {
      similar.push({
        complexityRange: `${bucket}-${bucket + 4}`,
        count: atomsList.length,
        examples: atomsList.slice(0, 5).map(a => ({
          id: a.id,
          name: a.name,
          file: a.filePath,
          complexity: a.complexity
        }))
      });
    }
  }
  
  return similar.sort((a, b) => b.count - a.count);
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

function findGodFunctions(atoms, threshold = 15) {
  return atoms
    .filter(a => (a.complexity || 0) >= threshold)
    .map(a => ({
      id: a.id,
      name: a.name,
      file: a.filePath,
      complexity: a.complexity,
      calls: a.calls?.length || 0,
      calledBy: a.calledBy?.length || 0,
      linesOfCode: a.linesOfCode
    }))
    .sort((a, b) => b.complexity - a.complexity);
}

function findFragileNetwork(atoms) {
  return atoms
    .filter(a => a.hasNetworkCalls && !a.hasErrorHandling)
    .map(a => ({
      id: a.id,
      name: a.name,
      file: a.filePath,
      networkEndpoints: a.networkEndpoints?.length || 0,
      hasErrorHandling: a.hasErrorHandling
    }))
    .slice(0, 20);
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
        patternTypes: ['duplicates', 'complexity', 'archetype', 'god-functions', 'fragile-network']
      }
    };
    
    if (patternType === 'all' || patternType === 'duplicates') {
      const duplicates = findDuplicates(atoms);
      result.duplicates = {
        count: duplicates.length,
        potentialSavings: duplicates.reduce((sum, d) => sum + (d.count - 1) * d.atoms[0].linesOfCode, 0),
        top: duplicates.filter(d => d.count >= minOccurrences).slice(0, 10)
      };
    }
    
    if (patternType === 'all' || patternType === 'complexity') {
      result.complexityPatterns = findSimilarByComplexity(atoms);
    }
    
    if (patternType === 'all' || patternType === 'archetype') {
      result.archetypePatterns = findByArchetypePattern(atoms);
    }
    
    if (patternType === 'all' || patternType === 'god-functions') {
      result.godFunctions = findGodFunctions(atoms);
    }
    
    if (patternType === 'all' || patternType === 'fragile-network') {
      result.fragileNetwork = findFragileNetwork(atoms);
    }
    
    return result;
  } catch (error) {
    return { error: error.message };
  }
}
