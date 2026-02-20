/**
 * MCP Tool: get_health_metrics
 * Calcula métricas de salud del código: entropía, cohesión, límites
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

const LIMITS = {
  complexity: { max: 15, weight: 0.25 },
  parameters: { max: 4, weight: 0.15 },
  linesOfCode: { max: 50, weight: 0.15 },
  nestedLoops: { max: 3, weight: 0.15 },
  callers: { max: 20, weight: 0.15 },
  calls: { max: 10, weight: 0.15 }
};

function calculateAtomHealth(atom) {
  const violations = [];
  let healthScore = 100;
  
  if (atom.complexity > LIMITS.complexity.max) {
    const violation = (atom.complexity - LIMITS.complexity.max) / LIMITS.complexity.max;
    healthScore -= violation * LIMITS.complexity.weight * 100;
    violations.push({ metric: 'complexity', value: atom.complexity, max: LIMITS.complexity.max });
  }
  
  if (atom.linesOfCode > LIMITS.linesOfCode.max) {
    const violation = (atom.linesOfCode - LIMITS.linesOfCode.max) / LIMITS.linesOfCode.max;
    healthScore -= violation * LIMITS.linesOfCode.weight * 100;
    violations.push({ metric: 'linesOfCode', value: atom.linesOfCode, max: LIMITS.linesOfCode.max });
  }
  
  if (atom.hasNestedLoops && atom.complexity > 10) {
    violations.push({ metric: 'nestedLoops', value: true, max: false });
    healthScore -= 5;
  }
  
  const callerCount = atom.calledBy?.length || 0;
  if (callerCount > LIMITS.callers.max) {
    violations.push({ metric: 'callers', value: callerCount, max: LIMITS.callers.max });
    healthScore -= 5;
  }
  
  const callCount = atom.calls?.length || 0;
  if (callCount > LIMITS.calls.max) {
    violations.push({ metric: 'calls', value: callCount, max: LIMITS.calls.max });
    healthScore -= 3;
  }
  
  return {
    score: Math.max(0, Math.round(healthScore)),
    violations,
    grade: healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : healthScore >= 20 ? 'D' : 'F'
  };
}

function calculateEntropy(atoms) {
  const totalAtoms = atoms.length;
  if (totalAtoms === 0) return 0;
  
  const byCallerPattern = new Map();
  for (const atom of atoms) {
    const pattern = atom.callerPattern?.id || 'unknown';
    byCallerPattern.set(pattern, (byCallerPattern.get(pattern) || 0) + 1);
  }
  
  let entropy = 0;
  for (const count of byCallerPattern.values()) {
    const p = count / totalAtoms;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  
  const maxEntropy = Math.log2(Object.keys(byCallerPattern).length || 1);
  return {
    raw: entropy.toFixed(2),
    max: maxEntropy.toFixed(2),
    normalized: maxEntropy > 0 ? (entropy / maxEntropy).toFixed(2) : 0,
    distribution: Object.fromEntries(byCallerPattern)
  };
}

function calculateCohesion(atoms) {
  const fileGroups = new Map();
  
  for (const atom of atoms) {
    const file = atom.filePath;
    if (!fileGroups.has(file)) {
      fileGroups.set(file, []);
    }
    fileGroups.get(file).push(atom);
  }
  
  const cohesionScores = [];
  
  for (const [file, fileAtoms] of fileGroups) {
    if (fileAtoms.length < 2) continue;
    
    let internalConnections = 0;
    const possibleConnections = fileAtoms.length * (fileAtoms.length - 1);
    
    for (const atom of fileAtoms) {
      const calls = atom.calls || [];
      for (const call of calls) {
        if (fileAtoms.some(a => a.name === call.name)) {
          internalConnections++;
        }
      }
    }
    
    const cohesion = possibleConnections > 0 ? internalConnections / possibleConnections : 0;
    cohesionScores.push({
      file,
      atoms: fileAtoms.length,
      internalConnections,
      cohesion: cohesion.toFixed(2)
    });
  }
  
  const avgCohesion = cohesionScores.length > 0 
    ? cohesionScores.reduce((sum, c) => sum + parseFloat(c.cohesion), 0) / cohesionScores.length 
    : 0;
  
  return {
    average: avgCohesion.toFixed(2),
    topFiles: cohesionScores.sort((a, b) => parseFloat(b.cohesion) - parseFloat(a.cohesion)).slice(0, 10)
  };
}

function getHealthDistribution(atoms) {
  const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  const unhealthy = [];
  
  for (const atom of atoms) {
    const health = calculateAtomHealth(atom);
    distribution[health.grade]++;
    
    if (health.grade === 'F' || health.grade === 'D') {
      unhealthy.push({
        id: atom.id,
        name: atom.name,
        file: atom.filePath,
        score: health.score,
        grade: health.grade,
        violations: health.violations
      });
    }
  }
  
  return { distribution, unhealthy: unhealthy.slice(0, 20) };
}

export async function get_health_metrics(args, context) {
  const { filePath, includeDetails = false } = args;
  const { projectPath } = context;
  
  try {
    const atoms = await loadAllAtoms(projectPath);
    
    let targetAtoms = atoms;
    if (filePath) {
      targetAtoms = atoms.filter(a => a.filePath === filePath);
    }
    
    const healthDist = getHealthDistribution(targetAtoms);
    const entropy = calculateEntropy(targetAtoms);
    const cohesion = calculateCohesion(targetAtoms);
    
    const totalAtoms = targetAtoms.length;
    const avgComplexity = targetAtoms.reduce((sum, a) => sum + (a.complexity || 0), 0) / totalAtoms;
    
    const overallScore = Math.round(
      (healthDist.distribution.A + healthDist.distribution.B * 0.8 + healthDist.distribution.C * 0.6) / totalAtoms * 100
    );
    
    const result = {
      summary: {
        totalAtoms,
        overallScore,
        grade: overallScore >= 80 ? 'A' : overallScore >= 60 ? 'B' : overallScore >= 40 ? 'C' : 'D',
        averageComplexity: avgComplexity.toFixed(1)
      },
      healthDistribution: healthDist.distribution,
      entropy,
      cohesion: {
        average: cohesion.average,
        topFiles: includeDetails ? cohesion.topFiles : cohesion.topFiles.slice(0, 5)
      },
      unhealthyAtoms: healthDist.unhealthy,
      recommendations: []
    };
    
    if (healthDist.distribution.F > 0) {
      result.recommendations.push({
        priority: 'high',
        issue: `${healthDist.distribution.F} atoms have failing health (grade F)`,
        action: 'Review and refactor these atoms for complexity and size'
      });
    }
    
    if (parseFloat(entropy.normalized) > 0.7) {
      result.recommendations.push({
        priority: 'medium',
        issue: 'High entropy detected - caller patterns are too distributed',
        action: 'Consider consolidating similar patterns'
      });
    }
    
    if (parseFloat(cohesion.average) < 0.3) {
      result.recommendations.push({
        priority: 'low',
        issue: 'Low cohesion - atoms in files are not well connected',
        action: 'Consider reorganizing functions into more cohesive modules'
      });
    }
    
    if (avgComplexity > 10) {
      result.recommendations.push({
        priority: 'medium',
        issue: `Average complexity is high (${avgComplexity.toFixed(1)})`,
        action: 'Look for opportunities to simplify complex functions'
      });
    }
    
    return result;
  } catch (error) {
    return { error: error.message };
  }
}
