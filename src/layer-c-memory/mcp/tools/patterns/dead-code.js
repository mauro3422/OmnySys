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
import { getAtomsInFile } from '#layer-c/storage/index.js';
import { existsSync } from 'fs';

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
  const filePath = atom.filePath || '';
  const archetype = atom.archetype?.type;
  const purpose = atom.purpose;

  // 1. Tests y scripts de análisis
  if (localIsTestCallback(atom)) return true;
  if (localIsAnalysisScript(atom)) return true;

  // 2. Purpose explícito - USAR EL CAMPO DEL MCP SCHEMA
  if (purpose && ['ENTRY_POINT', 'TEST_HELPER', 'WORKER_ENTRY', 'API_EXPORT'].includes(purpose)) return true;
  if (['CLI_ENTRY', 'TEST_CALLBACK', 'SCRIPT_MAIN', 'PRIVATE_HELPER'].includes(purpose)) return true;
  
  // Purpose con flag isDeadCode explícito
  if (atom.purpose?.isDeadCode === false) return true;

  // 3. Exportados o llamados directamente - USAR CAMPOS DEL MCP SCHEMA
  // NOTA: Arrow functions y métodos pueden no tener isExported=true por limitaciones del extractor
  if (atom.isExported === true) return true;
  if (atom.calledBy?.length > 0) return true;

  // 4. Dinámicamente usados (CLI, etc.)
  if (localIsDynamicallyUsed(atom)) return true;

  // 5. Event handlers (on*, handle*)
  if (name?.startsWith('on') || name?.startsWith('handle')) return true;

  // 6. Archivos de coverage
  if (filePath?.includes('coverage/')) return true;

  // 7. Constantes y variables (pueden usarse dinámicamente)
  if (atomType === 'variable' ||
      atomType === 'constant' ||
      name === name.toUpperCase() ||
      name.startsWith('_') && !name.includes('(') ||
      name.match(/^[A-Z_][A-Z0-9_]*$/)) {
    return true;
  }

  // 8. CONSTRUCTORES - siempre skip, se llaman con 'new'
  if (name === 'constructor' || atomType === 'class-method') return true;

  // 9. Métodos de clase - pueden llamarse dinámicamente
  if (atom.className || archetype === 'class-method') return true;

  // 10. Funciones muy cortas (helpers triviales)
  if ((atom.linesOfCode || 0) <= 5) return true;

  // 11. DETECTORES/ESTRATEGIAS - funciones que se pasan como referencias
  // USAR ARCHETYPE DEL MCP: 'detector', 'strategy', 'validator', etc.
  if (['detector', 'strategy', 'validator', 'handler', 'middleware', 'normalizer', 'transformer', 'parser', 'formatter'].includes(archetype)) {
    return true;
  }
  
  // Patrones de archivos que contienen callbacks/estrategias
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
    /[/\\]queries[/\\]/i  // NUEVO: funciones query que se pasan como referencias
  ];
  
  if (detectorPatterns.some(pattern => pattern.test(filePath))) {
    // Si está en un archivo de detectores/queries y es exportado o tiene nombre de detector/query
    if (atom.isExported || 
        name?.startsWith('detect') || 
        name?.startsWith('validate') || 
        name?.startsWith('normalize') ||
        name?.startsWith('get') ||
        name?.startsWith('select') ||
        name?.startsWith('filter') ||
        name?.startsWith('list') ||
        name?.startsWith('find')) {
      return true;
    }
  }

  // 12. Builder pattern methods (fluent interface) - USAR ARCHETYPE O NOMBRE
  if (archetype === 'builder' || (name?.startsWith('with') && atom.className)) {
    return true;
  }

  // 13. Factory functions - USAR ARCHETYPE DEL MCP
  if (archetype === 'factory') {
    return true;
  }

  // 14. Utility functions con muchos callers (aunque calledBy esté vacío por limitaciones del extractor)
  if (archetype === 'utility' && atom.complexity > 1) {
    return true;
  }

  // 15. ARROW FUNCTIONS en archivos de registry/index que se re-exportan
  // Estas son tipicamente funciones que se exportan desde el index del módulo
  if (atomType === 'arrow' && 
      purpose === 'API_EXPORT' && 
      filePath.includes('/index.js') === false && // No es el index mismo
      (filePath.includes('/registry/') || filePath.includes('/detectors/') || filePath.includes('/queries/'))) {
    return true;
  }

  // 16. FUNCIONES DETECTORAS - aunque el purpose sea DEAD_CODE por error del extractor
  // Si están en /detectors/ y empiezan con 'detect', son callbacks que se pasan como referencia
  if (filePath.includes('/detectors/') && name?.startsWith('detect')) {
    return true;
  }

  // 17. FUNCIONES QUERY - aunque el purpose sea DEAD_CODE por error del extractor
  // Si están en /queries/ y empiezan con 'get', 'select', 'filter', son utilidades
  if (filePath.includes('/queries/') && 
      (name?.startsWith('get') || name?.startsWith('select') || name?.startsWith('filter') || name?.startsWith('list'))) {
    return true;
  }

  // 18. MÉTODOS DE CLASES DE FASES/ESTRATEGIAS/STEPS - se llaman dinámicamente
  // Patrones: Phase.execute(), Strategy.reload(), Step.execute(), Extractor.extract()
  const classMethodPatterns = [
    { classPattern: /Phase$/, methodNames: ['execute', 'run', 'process'] },
    { classPattern: /Strategy$/, methodNames: ['execute', 'reload', 'validate', 'run'] },
    { classPattern: /Step$/, methodNames: ['execute', 'run', 'init'] },
    { classPattern: /Extractor$/, methodNames: ['extract', 'parse', 'analyze'] },
    { classPattern: /Builder$/, methodNames: ['build', 'create', 'with'] },
    { classPattern: /Manager$/, methodNames: ['load', 'save', 'get', 'set'] },
    { classPattern: /Handler$/, methodNames: ['handle', 'process', 'execute'] },
    { classPattern: /Validator$/, methodNames: ['validate', 'check'] },
    { classPattern: /Runner$/, methodNames: ['run', 'execute'] },
    { classPattern: /Processor$/, methodNames: ['process', 'transform'] }
  ];

  // Verificar si es método de una clase que sigue estos patrones
  if (atom.className) {
    for (const { classPattern, methodNames } of classMethodPatterns) {
      if (classPattern.test(atom.className) && methodNames.includes(name)) {
        return true;
      }
    }
  }

  // También verificar por archetype class-method
  if (archetype === 'class-method' && name !== 'constructor') {
    return true;
  }

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
