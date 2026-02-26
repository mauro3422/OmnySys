/**
 * @fileoverview dead-code.js
 * Detecta código potencialmente muerto (no usado)
 *
 * MEJORADO con Álgebra de Grafos:
 * - graph.centrality: si es muy bajo, más probable dead code
 * - graph.propagationScore: si es 0, no afecta a nadie
 * - graph.riskLevel: si es LOW, más seguro considerarlo dead
 * - Detección de auto-ejecución y ejecución directa
 *
 * FIX: Falsos positivos - constructores, métodos de clase, archivos eliminados
 */

import { isTestCallback, isAnalysisScript, isDynamicallyUsed } from '../../core/analysis-checker/utils/script-classifier.js';
import { AtomClassifiers } from './utils.js';
import { getAtomsInFile } from '#layer-c/storage/index.js';
import { existsSync } from 'fs';

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
 * MEJORADO: Refactorizado para reducir complejidad (Grado A)
 * @param {Object} atom - Átomo a evaluar
 * @returns {boolean} true si debe saltarse
 */
function shouldSkipAtom(atom) {
  // 1. Clasificaciones base (Tests, Análisis, Uso dinámico)
  if (isTestCallback(atom) || isAnalysisScript(atom) || isDynamicallyUsed(atom)) {
    return true;
  }

  // 2. Filtros técnicos (Constructores, Métodos de Clase, Constantes, Eventos)
  if (AtomClassifiers.isClassMethod(atom) ||
    AtomClassifiers.isConstantOrVariable(atom) ||
    AtomClassifiers.isTechnicalArchetype(atom) ||
    AtomClassifiers.isCallbackOrEvent(atom)) {
    return true;
  }

  // 3. Propiedades del átomo (Exports, Callers, Size)
  if (atom.isExported || (atom.calledBy?.length > 0) || (atom.linesOfCode || 0) <= 5) {
    return true;
  }

  // 4. Purpose explícito
  const purpose = atom.purpose?.type || atom.purpose;
  const skipPurposes = [
    'ENTRY_POINT', 'TEST_HELPER', 'WORKER_ENTRY', 'API_EXPORT',
    'CLI_ENTRY', 'TEST_CALLBACK', 'SCRIPT_MAIN', 'PRIVATE_HELPER'
  ];

  if (skipPurposes.includes(purpose) || atom.purpose?.isDeadCode === false) {
    return true;
  }

  return false;
}

/**
 * Verifica si un átomo es un constructor de clase
 * @param {Object} atom - Átomo a evaluar
 * @returns {boolean} true si es constructor
 */
function isConstructor(atom) {
  return atom.name === 'constructor' || atom.functionType === 'class-method';
}

/**
 * Verifica si un átomo es un método de clase
 * @param {Object} atom - Átomo a evaluar
 * @returns {boolean} true si es método de clase
 */
function isClassMethod(atom) {
  return atom.className || atom.archetype?.type === 'class-method';
}

/**
 * Verifica si un átomo es una función de callback/evento
 * @param {Object} atom - Átomo a evaluar
 * @returns {boolean} true si es callback/evento
 */
function isCallbackOrEvent(atom) {
  const name = atom.name || '';
  return name?.startsWith('on') || name?.startsWith('handle');
}

/**
 * Verifica si un átomo es una constante o variable
 * @param {Object} atom - Átomo a evaluar
 * @returns {boolean} true si es constante o variable
 */
function isConstantOrVariable(atom) {
  const atomType = atom.type || atom.functionType;
  const name = atom.name || '';
  return atomType === 'variable' ||
    atomType === 'constant' ||
    name === name.toUpperCase() ||
    name.startsWith('_') && !name.includes('(') ||
    name.match(/^[A-Z_][A-Z0-9_]*$/);
}

/**
 * Verifica si un átomo es una función de utilidad/detector
 * @param {Object} atom - Átomo a evaluar
 * @returns {boolean} true si es utilidad/detector
 */
function isUtilityOrDetector(atom) {
  const archetype = atom.archetype?.type;
  const name = atom.name || '';
  const filePath = atom.filePath || '';

  // Archetypes conocidos
  if (['detector', 'strategy', 'validator', 'handler', 'middleware', 'normalizer', 'transformer', 'parser', 'formatter'].includes(archetype)) {
    return true;
  }

  // Patrones de nombres en archivos específicos
  const detectorPatterns = [
    /[/\\]detectors[/\\]/i,
    /[/\\]strategies[/\\]/i,
    /[/\\]handlers[/\\]/i,
    /[/\\]middlewares[/\\]/i,
    /[/\\]validators[/\\]/i,
    /[/\\]normalizers[/\\]/i,
    /[/\\]transformers[/\\]/i,
    /[/\\]parsers[/\\]/i,
    /[/\\]formatters[/\\]/i,
    /[/\\]queries[/\\]/i
  ];

  if (detectorPatterns.some(pattern => pattern.test(filePath))) {
    return atom.isExported ||
      name?.startsWith('detect') ||
      name?.startsWith('validate') ||
      name?.startsWith('normalize') ||
      name?.startsWith('get') ||
      name?.startsWith('select') ||
      name?.startsWith('filter') ||
      name?.startsWith('list') ||
      name?.startsWith('find');
  }

  return false;
}

/**
 * Verifica si un átomo es una función de builder pattern
 * @param {Object} atom - Átomo a evaluar
 * @returns {boolean} true si es builder
 */
function isBuilderFunction(atom) {
  const archetype = atom.archetype?.type;
  const name = atom.name || '';
  return archetype === 'builder' || (name?.startsWith('with') && atom.className);
}

/**
 * Verifica si un átomo es una factory function
 * @param {Object} atom - Átomo a evaluar
 * @returns {boolean} true si es factory
 */
function isFactoryFunction(atom) {
  return atom.archetype?.type === 'factory';
}

/**
 * Verifica si un átomo es una función muy corta (helper trivial)
 * @param {Object} atom - Átomo a evaluar
 * @returns {boolean} true si es función corta
 */
function isShortFunction(atom) {
  return (atom.linesOfCode || 0) <= 5;
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
 * VERSIÓN MEJORADA con Álgebra de Grafos + FIX falsos positivos
 * @param {Array} atoms - Lista de átomos
 * @param {string} projectPath - Ruta del proyecto (para verificar auto-ejecución)
 * @returns {Array} Código potencialmente muerto
 */
export async function findDeadCode(atoms, projectPath = null) {
  const dead = [];

  const executableCache = new Map();
  const fileUsageCache = new Map();
  const fileExistenceCache = new Map();

  const atomsByFile = new Map();
  for (const atom of atoms) {
    if (!atom.filePath) continue;
    if (!atomsByFile.has(atom.filePath)) {
      atomsByFile.set(atom.filePath, []);
    }
    atomsByFile.get(atom.filePath).push(atom);
  }

  /**
   * Verifica si un archivo tiene átomos usados
   * MEJORADO: Detecta constructores y métodos de clase
   */
  function isFileUsed(filePath) {
    if (fileUsageCache.has(filePath)) return fileUsageCache.get(filePath);

    const fileAtoms = atomsByFile.get(filePath) || [];

    for (const atom of fileAtoms) {
      // Called directly
      if (atom.calledBy && atom.calledBy.length > 0) {
        fileUsageCache.set(filePath, true);
        return true;
      }

      // Exported (puede usarse externamente)
      if (atom.isExported === true) {
        fileUsageCache.set(filePath, true);
        return true;
      }

      // Constructor - la clase se usa aunque el constructor no tenga calledBy
      if (atom.name === 'constructor' && atom.isExported) {
        fileUsageCache.set(filePath, true);
        return true;
      }

      // Class methods - pueden usarse dinámicamente
      if (atom.className && fileAtoms.some(a => a.name === 'constructor' && a.isExported)) {
        fileUsageCache.set(filePath, true);
        return true;
      }
    }

    fileUsageCache.set(filePath, false);
    return false;
  }

  /**
   * Verifica si el archivo existe físicamente
   */
  function fileExists(filePath) {
    if (fileExistenceCache.has(filePath)) {
      return fileExistenceCache.get(filePath);
    }

    const fullPath = projectPath
      ? `${projectPath}/${filePath}`.replace(/\\/g, '/')
      : filePath;

    const exists = existsSync(fullPath);
    fileExistenceCache.set(filePath, exists);
    return exists;
  }

  for (const atom of atoms) {
    // Skip por clasificación
    if (shouldSkipAtom(atom)) continue;

    // FIX: Archivos que no existen más
    if (atom.filePath && !fileExists(atom.filePath)) {
      continue;
    }

    // Skip si el archivo tiene átomos usados
    if (atom.filePath && isFileUsed(atom.filePath)) continue;

    // Verificar auto-ejecución para scripts
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
