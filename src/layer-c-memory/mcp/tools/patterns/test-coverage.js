/**
 * @fileoverview test-coverage.js
 * Encuentra gaps en la cobertura de tests
 */

import { isTestFile } from './utils.js';

/**
 * Calcula el riesgo de no tener tests para una función
 * @param {Object} atom - Átomo de la función
 * @returns {number} Score de riesgo (0-10)
 */
function calculateRiskForTesting(atom) {
  let score = 0;
  
  // Higher complexity = higher risk
  score += (atom.complexity || 0) * 2;
  
  // More callers = more important to test
  score += (atom.calledBy?.length || 0);
  
  // Network operations are risky
  if (atom.hasNetworkCalls) score += 5;
  
  // Async functions need testing
  if (atom.isAsync) score += 2;
  
  // Error handling should be tested
  if (!atom.hasErrorHandling && atom.hasNetworkCalls) score += 5;
  
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
  
  // Build map of test file -> functions it tests
  const testFileToFunctions = new Map();
  
  for (const testAtom of testAtoms) {
    if (!testFileToFunctions.has(testAtom.filePath)) {
      testFileToFunctions.set(testAtom.filePath, {
        testFile: testAtom.filePath,
        testFunctions: [],
        testedFunctions: [],
        imports: []
      });
      testStats.totalTestFiles++;
    }
    
    testFileToFunctions.get(testAtom.filePath).testFunctions.push(testAtom);
    
    // Check imports to find what functions this test imports
    if (testAtom.imports) {
      for (const imp of testAtom.imports) {
        const source = imp.source || imp.module;
        if (!source) continue;
        
        // Skip if it's importing from another test file
        if (isTestFile(source)) continue;
        
        testFileToFunctions.get(testAtom.filePath).imports.push({
          source,
          specifiers: imp.specifiers?.map(s => s.local) || []
        });
      }
    }
  }
  
  // Second pass: match tests to functions
  for (const [testFile, testInfo] of testFileToFunctions) {
    for (const imp of testInfo.imports) {
      // Find atoms in the imported file
      const importedAtoms = nonTestAtoms.filter(atom => 
        atom.filePath && (
          atom.filePath.includes(imp.source) ||
          imp.source.includes(atom.filePath.replace(/\\/g, '/').split('/').pop()?.replace('.js', ''))
        )
      );
      
      for (const atom of importedAtoms) {
        // Check if this function is imported
        const isImported = imp.specifiers.length === 0 || // Default import
                          imp.specifiers.includes(atom.name) ||
                          imp.specifiers.includes('*');
        
        if (isImported && atom.isExported) {
          testInfo.testedFunctions.push({
            id: atom.id,
            name: atom.name,
            file: atom.filePath
          });
          testStats.functionsWithTests.add(atom.id);
        }
      }
    }
  }
  
  // Find functions without tests
  for (const atom of nonTestAtoms) {
    if (atom.isExported && !testStats.functionsWithTests.has(atom.id)) {
      testStats.functionsWithoutTests.add(atom.id);
      
      // Calculate risk
      const riskScore = calculateRiskForTesting(atom);
      
      if (riskScore >= 5) { // Only report high-risk functions
        gaps.push({
          id: atom.id,
          name: atom.name,
          file: atom.filePath,
          complexity: atom.complexity,
          line: atom.line,
          riskScore,
          severity: riskScore > 8 ? 'high' : (riskScore > 5 ? 'medium' : 'low'),
          reason: 'Exported function with no test coverage'
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
