/**
 * @fileoverview test-coverage.js
 * Encuentra gaps en la cobertura de tests
 * 
 * INTEGRA ÁLGEBRA DE GRAFOS:
 * - Centrality: mide importancia del átomo en el grafo
 * - Propagation: calcula impacto si el átomo cambia
 * - Breaking changes: predice qué se rompe si no se testea
 */

import { isTestFile } from './utils.js';

const PATH_ALIAS_MAP = {
  '#layer-c': 'src/layer-c-memory',
  '#core': 'src/core',
  '#services': 'src/services',
  '#utils': 'src/utils',
  '#layer-a': 'src/layer-a-static',
  '#layer-b': 'src/layer-b-semantic',
  '#shared': 'src/shared'
};

/**
 * Calcula centrality (PageRank-like) para un átomo basado en sus relaciones
 * @param {Object} atom - Átomo con relaciones
 * @returns {Object} { centrality, classification }
 */
function calculateCentrality(atom) {
  const callers = atom.calledBy || atom.callers || [];
  const calls = atom.calls || atom.callees || [];
  
  const inDegree = callers.length;
  const outDegree = calls.length;
  
  // Centrality = inDegree / (outDegree + 1)
  // +1 para evitar división por cero
  const centrality = inDegree / (outDegree + 1);
  
  let classification = 'LEAF';
  if (centrality > 10) classification = 'HUB';
  else if (centrality > 2) classification = 'BRIDGE';
  
  return { centrality, classification, inDegree, outDegree };
}

/**
 * Calcula propagation score (qué tanto se afecta si este átomo cambia)
 * @param {Object} atom - Átomo con relaciones
 * @returns {number} Score de propagation (0-1)
 */
function calculatePropagationScore(atom) {
  const calls = atom.calls || atom.callees || [];
  const complexity = atom.complexity || 1;
  
  // Más funciones llamadas = mayor propagation
  // Mayor complejidad = mayor impacto potencial
  const propagationScore = Math.min(1, (calls.length * 0.1 + complexity * 0.05));
  
  return propagationScore;
}

/**
 * Predice riesgo de breaking changes basado en centrality y propagation
 * @param {Object} atom - Átomo con relaciones
 * @returns {Object} { riskLevel, affectedCount, recommendation }
 */
function predictBreakingRisk(atom) {
  const { centrality, classification, inDegree, outDegree } = calculateCentrality(atom);
  const propagationScore = calculatePropagationScore(atom);
  
  // Más personas dependen de este (inDegree) = mayor riesgo si rompe
  // Si tiene alta propagation = cambios se propagan lejos
  const riskScore = (inDegree * 0.3) + (propagationScore * 0.5) + (centrality * 0.2);
  
  let riskLevel = 'LOW';
  if (riskScore > 5) riskLevel = 'HIGH';
  else if (riskScore > 2) riskLevel = 'MEDIUM';
  
  const recommendation = riskLevel === 'HIGH' 
    ? 'CRITICAL: Many dependents, needs comprehensive tests'
    : riskLevel === 'MEDIUM'
      ? 'MODERATE: Some dependents, prioritize edge cases'
      : 'LOW: Few dependents, basic tests sufficient';
  
  return {
    riskLevel,
    riskScore: riskScore.toFixed(2),
    inDegree,
    outDegree,
    classification,
    propagationScore: propagationScore.toFixed(2),
    recommendation
  };
}

/**
 * Extrae el nombre de la función que se está testando a partir del nombre del test
 * Patterns: "describe(funcName)", "it(funcName...)", etc.
 */
function extractFunctionNameFromTest(testName) {
  if (!testName) return null;
  
  // describe(atomic_edit) -> atomic_edit
  const describeMatch = testName.match(/^describe\(([^)]+)\)/);
  if (describeMatch) {
    return describeMatch[1].replace(/['"]/g, '');
  }
  
  // it(some test for X) -> buscar X
  const itMatch = testName.match(/^it\([^)]*for\s+(\w+)/i);
  if (itMatch) {
    return itMatch[1];
  }
  
  // it(X does Y) -> X
  const itActionMatch = testName.match(/^it\(([^)]+?)\s+(does|should|returns|verifies)/i);
  if (itActionMatch) {
    return itActionMatch[1].trim();
  }
  
  return null;
}

function resolvePathAlias(source) {
  if (!source) return source;
  
  for (const [alias, resolvedPath] of Object.entries(PATH_ALIAS_MAP)) {
    if (source.startsWith(alias)) {
      return source.replace(alias, resolvedPath);
    }
  }
  return source;
}

function normalizeFilePath(filePath) {
  if (!filePath) return '';
  return filePath.replace(/\\/g, '/').replace(/\.js$/, '');
}

function matchImportToAtom(impSource, atom) {
  const resolvedSource = resolvePathAlias(impSource);
  const normalizedSource = normalizeFilePath(resolvedSource);
  const normalizedAtomPath = normalizeFilePath(atom.filePath);
  
  if (normalizedAtomPath.includes(normalizedSource.split('/').pop()?.replace('.js', ''))) {
    return true;
  }
  
  const sourceParts = normalizedSource.split('/');
  const atomParts = normalizedAtomPath.split('/');
  
  for (let i = Math.max(0, sourceParts.length - 3); i < sourceParts.length; i++) {
    const partial = sourceParts.slice(i).join('/');
    if (normalizedAtomPath.includes(partial)) {
      return true;
    }
  }
  
  return false;
}

function matchSpecifierToAtom(specifiers, atom) {
  if (!specifiers || specifiers.length === 0) return true;
  
  if (specifiers.includes('*')) return true;
  
  const atomName = atom.name;
  
  for (const spec of specifiers) {
    if (spec === atomName) return true;
    
    if (atomName.includes(spec) || spec.includes(atomName)) return true;
    
    if (spec.endsWith('Optimized') && atomName.startsWith(spec.replace('Optimized', ''))) return true;
    if (spec.startsWith('validate') && atomName.startsWith('validate')) return true;
    if (spec.startsWith('get') && atomName.startsWith('get')) return true;
    if (spec.startsWith('set') && atomName.startsWith('set')) return true;
  }
  
  return false;
}

/**
 * Calcula el riesgo de no tener tests para una función
 * USA ÁLGEBRA DE GRAFOS para cálculos más precisos
 * @param {Object} atom - Átomo de la función
 * @returns {Object} Score de riesgo y metadatos del grafo
 */
function calculateRiskForTesting(atom) {
  let score = 0;
  
  // === DATOS DEL ÁTOMO (básico) ===
  // Higher complexity = higher risk
  score += (atom.complexity || 0) * 1.5;
  
  // Async functions need testing
  if (atom.isAsync) score += 2;
  
  // Network operations are risky
  if (atom.hasNetworkCalls) score += 5;
  
  // Error handling should be tested
  if (!atom.hasErrorHandling && atom.hasNetworkCalls) score += 5;
  
  // === ÁLGEBRA DE GRAFOS (nuevo) ===
  // Calculate centrality (PageRank-like)
  const { centrality, classification, inDegree, outDegree } = calculateCentrality(atom);
  
  // Calculate propagation score
  const propagationScore = calculatePropagationScore(atom);
  
  // Predict breaking changes risk
  const breakingRisk = predictBreakingRisk(atom);
  
  // Add graph-based scores
  // High centrality = many dependents = high risk if breaks
  score += centrality * 2;
  
  // High propagation = changes affect many
  score += propagationScore * 3;
  
  // High inDegree (many callers) = important to test
  if (inDegree > 5) score += 3;
  else if (inDegree > 2) score += 1;
  
  // Export/API functions are more critical
  if (atom.isExported) score += 2;
  
  // Purpose-based scoring
  const purpose = atom.purpose_type || atom.purpose?.type || '';
  if (purpose === 'API_EXPORT') score += 3;
  if (purpose === 'EVENT_HANDLER') score += 4;
  if (purpose === 'TIMER_ASYNC') score += 2;
  
  // Archetype-based scoring
  const archetype = atom.archetype_type || atom.archetype?.type || '';
  if (archetype === 'orchestrator') score += 3;
  if (archetype === 'god-function') score += 5;
  if (archetype === 'handler') score += 2;
  
  return {
    score: Math.min(score, 20), // Cap at 20
    graphMetrics: {
      centrality: centrality.toFixed(3),
      classification,
      inDegree,
      outDegree,
      propagationScore: propagationScore.toFixed(2),
      breakingRisk: breakingRisk.riskLevel
    }
  };
  
  return Math.min(score, 10);
}

/**
 * Encuentra gaps en la cobertura de tests
 * @param {Array} atoms - Lista de átomos
 * @returns {Object} Gaps, relaciones y estadísticas
 */
export function findTestCoverageGaps(atoms) {
  const gaps = [];
  const testRelations = [];
  const orphanedTests = [];
  const testStats = {
    totalTestFiles: 0,
    totalTests: 0,
    functionsWithTests: new Set(),
    functionsWithoutTests: new Set()
  };
  
  // First pass: identify all test atoms and their imports
  const testAtoms = atoms.filter(atom => isTestFile(atom.filePath));
  const nonTestAtoms = atoms.filter(atom => !isTestFile(atom.filePath));
  
  testStats.totalTests = testAtoms.length;
  
  // Strategy: Use test function names to infer what they test
  // Test names often contain the function name being tested (e.g., "describe(atomic_edit)")
  const testFileToFunctions = new Map();
  
  for (const testAtom of testAtoms) {
    const filePath = testAtom.filePath;
    
    if (!testFileToFunctions.has(filePath)) {
      testFileToFunctions.set(filePath, {
        testFile: filePath,
        testFunctions: [],
        testedFunctions: new Set()
      });
      testStats.totalTestFiles++;
    }
    
    testFileToFunctions.get(filePath).testFunctions.push(testAtom);
    
    // Extract function name from test callback name
    // Patterns: "describe(funcName)", "it(funcName...)", etc.
    const atomName = testAtom.name;
    const testedFunctionName = extractFunctionNameFromTest(atomName);
    
    if (testedFunctionName) {
      testFileToFunctions.get(filePath).testedFunctions.add(testedFunctionName);
    }
  }
  
  // Match tested functions to actual atoms
  for (const [testFile, testInfo] of testFileToFunctions) {
    for (const testedFnName of testInfo.testedFunctions) {
      // Find matching atoms (exact or fuzzy match)
      const matchingAtoms = nonTestAtoms.filter(atom => {
        const name = atom.name?.toLowerCase() || '';
        const fnName = testedFnName.toLowerCase();
        
        // Exact match
        if (name === fnName) return true;
        
        // Fuzzy: contains, prefix, suffix
        if (name.includes(fnName) || fnName.includes(name)) return true;
        
        // Common variations
        if (name === fnName + 'Optimized') return true;
        if (name === fnName + 'Async') return true;
        if (fnName === name + 'Optimized') return true;
        
        return false;
      });
      
      for (const atom of matchingAtoms) {
        if (atom.isExported) {
          testStats.functionsWithTests.add(atom.id);
          testRelations.push({
            testFile: testFile,
            testedFunctions: [{ id: atom.id, name: atom.name, file: atom.filePath }],
            coverage: 'inferred'
          });
        }
      }
    }
  }
   
  // Find functions without tests
  for (const atom of nonTestAtoms) {
    if (atom.isExported && !testStats.functionsWithTests.has(atom.id)) {
      testStats.functionsWithoutTests.add(atom.id);
      
      // Calculate risk using ALGEBRA DE GRAFOS
      const riskResult = calculateRiskForTesting(atom);
      const riskScore = riskResult.score;
      const graphMetrics = riskResult.graphMetrics;
      
      if (riskScore >= 5) { // Only report high-risk functions
        gaps.push({
          id: atom.id,
          name: atom.name,
          file: atom.filePath,
          complexity: atom.complexity,
          line: atom.line,
          riskScore,
          severity: riskScore > 12 ? 'critical' : (riskScore > 8 ? 'high' : (riskScore > 5 ? 'medium' : 'low')),
          reason: 'Exported function with no test coverage',
          // Include graph metrics
          graph: graphMetrics,
          recommendation: graphMetrics.breakingRisk === 'HIGH' 
            ? 'URGENT: Many dependents, needs comprehensive tests'
            : graphMetrics.breakingRisk === 'MEDIUM'
              ? 'MODERATE: Prioritize edge cases'
              : 'LOW: Basic tests sufficient'
        });
      }
    }
  }
  
  // Build test relations for high-value functions
  for (const [testFile, testInfo] of testFileToFunctions) {
    if (testInfo.testedFunctions.length > 0) {
      testRelations.push({
        testFile: testFile,
        testedFunctions: testInfo.testedFunctions.slice(0, 5),
        coverage: testInfo.testedFunctions.length > 3 ? 'partial' : 'minimal'
      });
    }
  }
  
  return {
    gaps: gaps.sort((a, b) => b.riskScore - a.riskScore).slice(0, 20),
    testRelations: testRelations.slice(0, 15),
    orphanedTests: orphanedTests.slice(0, 10),
    stats: {
      totalTestFiles: testStats.totalTestFiles,
      totalTestAtoms: testStats.totalTests,
      functionsWithTests: testStats.functionsWithTests.size,
      functionsWithoutTests: testStats.functionsWithoutTests.size,
      coveragePercent: testStats.functionsWithTests.size + testStats.functionsWithoutTests.size > 0 
        ? Math.round((testStats.functionsWithTests.size / (testStats.functionsWithTests.size + testStats.functionsWithoutTests.size)) * 100)
        : 0
    }
  };
}
