/**
 * @fileoverview dead-code.js
 * Detecta código potencialmente muerto (no usado)
 * 
 * MEJORADO con Álgebra de Grafos:
 * - graph.centrality: si es muy bajo, más probable dead code
 * - graph.propagationScore: si es 0, no afecta a nadie
 * - graph.riskLevel: si es LOW, más seguro considerarlo dead
 * - Detección de auto-ejecución y ejecución directa
 */

import { isTestCallback, isAnalysisScript, isDynamicallyUsed } from '../../core/analysis-checker/utils/script-classifier.js';
import { getAtomsInFile } from '#layer-c/storage/index.js';

// Mantener funciones locales para backward compatibility
const localIsTestCallback = isTestCallback;
const localIsAnalysisScript = isAnalysisScript;
const localIsDynamicallyUsed = isDynamicallyUsed;

/**
 * Verifica si un archivo tiene auto-ejecución (patrones como: func()... func())
 * @param {string} filePath - Ruta del archivo
 * @returns {boolean}
 */
async function hasAutoExecution(filePath) {
  try {
    const { readFileSync } = await import('fs');
    const content = readFileSync(filePath, 'utf-8');
    
    // Patrones de auto-ejecución:
    // - function name() { ... } name()
    // - () => { ... }()
    // - const x = () => {}; x()
    // - name().then() (como runSimulation().then())
    const autoExecPatterns = [
      /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\w+\s*\(/,
      /const\s+(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>)\s*\{[\s\S]*?\n\1\s*\(/,
      /let\s+(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>)\s*\{[\s\S]*?\n\1\s*\(/,
      /\w+\s*\([^)]*\)\s*;[\s\S]*?\n\w+\s*\([^)]*\)\s*;.*\n\w+\s*\(/,
      // Patrones específicos de auto-ejecución con .then()
      /runSimulation\s*\(\s*\)\s*\.\s*then\s*\(/,
      /\w+\s*\(\s*\)\s*\.\s*then\s*\(/,
      // Patrón general de llamada y then en el mismo archivo
      /^\s*\w+\s*\([^)]*\)\s*\.\s*then/m,
    ];
    
    return autoExecPatterns.some(pattern => pattern.test(content));
  } catch (e) {
    return false;
  }
}

/**
 * Verifica si un archivo se ejecuta directamente (shebang, node ejecutar)
 * @param {string} filePath - Ruta del archivo
 * @returns {boolean}
 */
async function isDirectlyExecutable(filePath) {
  try {
    const { readFileSync } = await import('fs');
    const content = readFileSync(filePath, 'utf-8');
    const firstLine = content.split('\n')[0].trim();
    
    // Shebang
    if (firstLine.startsWith('#!')) return true;
    
    // patterns de ejecución directa en package.json scripts
    const name = filePath.split('/').pop().replace('.js', '');
    
    // Common CLI entry patterns
    const cliPatterns = [
      /async\s+function\s+main\s*\(/,
      /function\s+main\s*\(/,
      /^\s*main\s*\(\s*\)\s*\{/m,
      /process\.argv/,
      /yargs\./,
      /commander\./,
      /inquirer\./,
    ];
    
    return cliPatterns.some(pattern => pattern.test(content));
  } catch (e) {
    return false;
  }
}

/**
 * Verifica si un átomo debe ser excluido del análisis de dead code
 * @param {Object} atom - Átomo a evaluar
 * @returns {boolean} true si debe saltarse
 */
function shouldSkipAtom(atom) {
  const atomType = atom.type || atom.functionType;
  const name = atom.name || '';
  
  if (localIsTestCallback(atom)) return true;
  if (localIsAnalysisScript(atom)) return true;
  
  const purpose = atom.purpose;
  if (purpose?.isDeadCode === false) return true;
  if (purpose && ['ENTRY_POINT', 'TEST_HELPER', 'WORKER_ENTRY'].includes(purpose.type)) return true;
  if (atom.isExported) return true;
  if (atom.calledBy?.length > 0) return true;
  if (['CLI_ENTRY', 'TEST_CALLBACK', 'SCRIPT_MAIN', 'PRIVATE_HELPER'].includes(atom.purpose)) return true;
  if (localIsDynamicallyUsed(atom)) return true;
  if (atom.name?.startsWith('on') || atom.name?.startsWith('handle')) return true;
  if (atom.filePath?.includes('coverage/')) return true;
  
  if (atomType === 'variable' || 
      atomType === 'constant' || 
      name === name.toUpperCase() ||
      name.startsWith('_') && !name.includes('(') ||
      name.match(/^[A-Z_][A-Z0-9_]*$/)) {
    return true;
  }
  
  if ((atom.linesOfCode || 0) <= 5) return true;
  
  return false;
}

/**
 * Calcula score de "dead code confidence" usando métricas del grafo
 * @param {Object} atom - Átomo a evaluar
 * @returns {Object} { score, reasons }
 */
function calculateDeadCodeScore(atom) {
  let score = 0;
  const reasons = [];
  
  // Métricas del grafo (Álgebra de Grafos)
  const graph = atom.graph || {};
  const centrality = graph.centrality || 0;
  const propagation = graph.propagationScore || 0;
  const riskLevel = graph.riskLevel || 'UNKNOWN';
  const inDegree = graph.inDegree || atom.calledBy?.length || 0;
  const outDegree = graph.outDegree || atom.calls?.length || 0;
  
  // 1. Centrality: si es muy bajo, más probable dead
  if (centrality === 0) {
    score += 30;
    reasons.push('centrality=0 (no dependents)');
  } else if (centrality < 0.1) {
    score += 15;
    reasons.push('centrality muy baja');
  }
  
  // 2. Propagation: si es 0, no afecta a nadie
  if (propagation === 0) {
    score += 25;
    reasons.push('propagation=0 (no impacta)');
  } else if (propagation < 0.5) {
    score += 10;
  }
  
  // 3. Risk Level: si es LOW, más seguro considerarlo dead
  if (riskLevel === 'LOW') {
    score += 15;
    reasons.push('riskLevel=LOW');
  } else if (riskLevel === 'HIGH') {
    score -= 20; // Reducir confianza si es HIGH risk
    reasons.push('riskLevel=HIGH (cuidado!)');
  }
  
  // 4. In-degree: si no tiene callers, más probable dead
  if (inDegree === 0) {
    score += 20;
    reasons.push('sin callers');
  }
  
  // 5. Out-degree: si no llama a nada, podría ser helper muerto
  if (outDegree === 0 && !atom.isExported) {
    score += 10;
    reasons.push('no llama a nada (aislado)');
  }
  
  // 6. Es exported? Reduce chance de dead
  if (atom.isExported) {
    score -= 15;
    reasons.push('exported (podría usarseexternamente)');
  }
  
  return { 
    score, 
    reasons,
    confidence: score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low',
    graphMetrics: { centrality, propagation, riskLevel, inDegree, outDegree }
  };
}

/**
 * Encuentra código potencialmente muerto
 * VERSIÓN MEJORADA con Álgebra de Grafos
 * @param {Array} atoms - Lista de átomos
 * @param {string} projectPath - Ruta del proyecto (para verificar auto-ejecución)
 * @returns {Array} Código potencialmente muerto
 */
export async function findDeadCode(atoms, projectPath = null) {
  const dead = [];
  
  const executableCache = new Map();
  const fileUsageCache = new Map();
  
  const atomsByFile = new Map();
  for (const atom of atoms) {
    if (!atomsByFile.has(atom.filePath)) {
      atomsByFile.set(atom.filePath, []);
    }
    atomsByFile.get(atom.filePath).push(atom);
  }
  
  function isFileUsed(filePath) {
    if (fileUsageCache.has(filePath)) return fileUsageCache.get(filePath);
    
    const fileAtoms = atomsByFile.get(filePath) || [];
    const hasUsedAtom = fileAtoms.some(a => 
      (a.calledBy && a.calledBy.length > 0) || 
      a.isExported === true
    );
    fileUsageCache.set(filePath, hasUsedAtom);
    return hasUsedAtom;
  }
  
  for (const atom of atoms) {
    if (shouldSkipAtom(atom)) continue;
    
    if (atom.filePath && isFileUsed(atom.filePath)) continue;
    
    if (projectPath && atom.filePath) {
      const fullPath = `${projectPath}/${atom.filePath}`.replace(/\\/g, '/');
      
      if (!executableCache.has(atom.filePath)) {
        const isAutoExec = await hasAutoExecution(fullPath);
        const isDirectExec = await isDirectlyExecutable(fullPath);
        executableCache.set(atom.filePath, { isAutoExec, isDirectExec });
      }
      
      const { isAutoExec, isDirectExec } = executableCache.get(atom.filePath);
      if (isAutoExec || isDirectExec) continue;
    }
    
    const deadCodeAnalysis = calculateDeadCodeScore(atom);
    
    if (deadCodeAnalysis.score >= 10) {
      dead.push({
        id: atom.id,
        name: atom.name,
        file: atom.filePath,
        line: atom.line,
        complexity: atom.complexity,
        linesOfCode: atom.linesOfCode,
        type: atom.type || atom.functionType,
        reason: deadCodeAnalysis.reasons.join(', '),
        confidence: deadCodeAnalysis.confidence,
        graphAnalysis: deadCodeAnalysis.graphMetrics,
        deadCodeScore: deadCodeAnalysis.score
      });
    }
  }
  
  return dead.sort((a, b) => (b.deadCodeScore || 0) - (a.deadCodeScore || 0));
}
