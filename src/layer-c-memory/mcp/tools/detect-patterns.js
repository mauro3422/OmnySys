/**
 * MCP Tool: detect_patterns
 * Detecta patrones de código usando DNA structural hash y pattern hash
 */

import { getAllAtoms } from '#layer-c/storage/index.js';

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
        atoms: atomsList.slice(0, 8).map(a => ({
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
          atoms: atomsList.slice(0, 8).map(a => ({
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
    exactDuplicates: exactDuplicates.sort((a, b) => b.count - a.count).slice(0, 10),
    similarCode: similarCode.sort((a, b) => b.count - a.count).slice(0, 10),
    summary: {
      exactDuplicatesFound: exactDuplicates.length,
      similarCodeFound: similarCode.length,
      potentialSavingsLOC: exactDuplicates.reduce((sum, d) => sum + (d.count - 1) * (d.atoms[0]?.linesOfCode || 0), 0)
    }
  };
}

function findComplexityHotspots(atoms, excludeInternalTools = true) {
  const byFile = new Map();
  
  for (const atom of atoms) {
    if (!atom.filePath) continue;
    
    // Skip internal analysis scripts
    if (excludeInternalTools && (
      atom.purpose === 'ANALYSIS_SCRIPT' ||
      atom.filePath?.startsWith('scripts/audit') ||
      atom.filePath?.startsWith('scripts/analyze') ||
      atom.filePath?.startsWith('scripts/validate') ||
      atom.filePath?.startsWith('scripts/investigate')
    )) {
      continue;
    }
    
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

function findGodFunctions(atoms, threshold = 15, excludeInternalTools = true) {
  const filtered = atoms.filter(a => {
    if ((a.complexity || 0) < threshold) return false;
    
    // Skip internal analysis scripts unless explicitly included
    if (excludeInternalTools && (
      a.purpose === 'ANALYSIS_SCRIPT' ||
      a.filePath?.startsWith('scripts/audit') ||
      a.filePath?.startsWith('scripts/analyze') ||
      a.filePath?.startsWith('scripts/validate') ||
      a.filePath?.startsWith('scripts/investigate')
    )) {
      return false;
    }
    
    return true;
  });
  
  return filtered
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
      purpose: a.purpose,
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
    // Los callbacks de test no son código de producción — no tienen red real
    if (atom.isTestCallback) continue;
    if (isTestFile(atom.filePath)) continue;
    
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

/**
 * Find circular dependencies between files
 */
function findCircularDependencies(atoms) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();
  
  // Build graph: file -> files it imports from
  const graph = new Map();
  
  for (const atom of atoms) {
    if (!atom.filePath) continue;
    
    if (!graph.has(atom.filePath)) {
      graph.set(atom.filePath, new Set());
    }
    
    // Add imports as dependencies
    if (atom.calls) {
      for (const call of atom.calls) {
        if (call.filePath && call.filePath !== atom.filePath) {
          graph.get(atom.filePath).add(call.filePath);
        }
      }
    }
  }
  
  // DFS to find cycles
  function dfs(node, path) {
    if (recursionStack.has(node)) {
      // Found cycle
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart).concat([node]);
      
      // Check if this exact cycle was already found
      const cycleKey = cycle.sort().join('->');
      if (!visited.has(cycleKey)) {
        visited.add(cycleKey);
        cycles.push({
          type: 'import-cycle',
          files: cycle,
          length: cycle.length - 1,
          severity: cycle.length > 3 ? 'high' : 'medium',
          suggestion: 'Consider extracting shared code to a separate module'
        });
      }
      return;
    }
    
    if (visited.has(node) && !recursionStack.has(node)) {
      return; // Already processed
    }
    
    recursionStack.add(node);
    path.push(node);
    
    const neighbors = graph.get(node) || new Set();
    for (const neighbor of neighbors) {
      dfs(neighbor, [...path]);
    }
    
    recursionStack.delete(node);
  }
  
  for (const file of graph.keys()) {
    if (!recursionStack.has(file)) {
      dfs(file, []);
    }
  }
  
  return cycles.slice(0, 10); // Limit to top 10 cycles
}

/**
 * Check if a file is a test file
 */
function isTestFile(filePath) {
  if (!filePath) return false;
  return filePath.includes('.test.') || 
         filePath.includes('.spec.') ||
         filePath.includes('__tests__');
}

/**
 * Find test coverage gaps and relationships
 */
function findTestCoverageGaps(atoms, fileData = {}) {
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
            file: atom.filePath,
            complexity: atom.complexity
          });
          testStats.functionsWithTests.add(atom.id);
        }
      }
    }
    
    // If test has imports but no matched functions, it might be testing something else
    if (testInfo.imports.length > 0 && testInfo.testedFunctions.length === 0) {
      orphanedTests.push({
        testFile: testFile,
        reason: 'Test imports modules but no specific functions matched',
        imports: testInfo.imports.map(i => i.source)
      });
    }
  }
  
  // Third pass (call-based): usar calls[] de isTestCallback para cobertura precisa
  // Cada it('...', () => { ... }) ahora es un átomo con calls[] que apunta a producción
  const callbackAtoms = atoms.filter(a => a.isTestCallback && isTestFile(a.filePath));
  for (const cb of callbackAtoms) {
    for (const call of (cb.calls || [])) {
      const callName = typeof call === 'string' ? call : (call.name || call.callee);
      if (!callName) continue;
      const matched = nonTestAtoms.find(a => a.name === callName || a.fullName === callName);
      if (matched && matched.isExported) {
        testStats.functionsWithTests.add(matched.id);
      }
    }
  }

  // Fourth pass: find functions without tests
  for (const atom of nonTestAtoms) {
    if (!atom.isExported) continue;
    if (atom.purpose === 'TEST_HELPER') continue;
    if (atom.filePath?.includes('test')) continue;
    
    if (!testStats.functionsWithTests.has(atom.id)) {
      testStats.functionsWithoutTests.add(atom.id);
      
      const riskScore = calculateRiskForTesting(atom);
      
      if (riskScore > 3) {
        gaps.push({
          id: atom.id,
          name: atom.name,
          file: atom.filePath,
          line: atom.line,
          complexity: atom.complexity,
          calledBy: atom.calledBy?.length || 0,
          riskScore,
          severity: riskScore > 8 ? 'high' : (riskScore > 5 ? 'medium' : 'low'),
          reason: 'Exported function with no test coverage',
          suggestion: `Write tests for ${atom.name}() - complexity: ${atom.complexity}, called by ${atom.calledBy?.length || 0} functions`
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
 * Detecta deuda arquitectónica (archivos que violan SOLID/SSOT)
 * Se activa cuando: >250 líneas AND (múltiples responsabilidades OR duplicados OR complejidad alta)
 */
function findArchitecturalDebt(atoms) {
  const debtFiles = [];
  
  // Agrupar átomos por archivo
  const byFile = new Map();
  for (const atom of atoms) {
    if (!atom.filePath) continue;
    if (isAnalysisScript(atom)) continue; // Ignorar scripts de análisis
    
    if (!byFile.has(atom.filePath)) {
      byFile.set(atom.filePath, {
        atoms: [],
        totalLines: 0,
        responsibilities: new Set(),
        hasDuplicates: false,
        maxComplexity: 0
      });
    }
    
    const fileData = byFile.get(atom.filePath);
    fileData.atoms.push(atom);
    fileData.totalLines += atom.linesOfCode || 0;
    fileData.maxComplexity = Math.max(fileData.maxComplexity, atom.complexity || 0);
    
    // Detectar responsabilidades por flowType
    if (atom.dna?.flowType) {
      fileData.responsibilities.add(atom.dna.flowType);
    }
    
    // Detectar por propósito/archetype
    if (atom.purpose) {
      fileData.responsibilities.add(atom.purpose);
    }
    if (atom.archetype?.type) {
      fileData.responsibilities.add(atom.archetype.type);
    }
  }
  
  // Detectar duplicados por archivo
  const duplicates = findDuplicates(atoms, 2);
  const filesWithDuplicates = new Set();
  duplicates.exactDuplicates.forEach(dup => {
    dup.atoms.forEach(atom => {
      if (atom.file) filesWithDuplicates.add(atom.file);
    });
  });
  
  // Evaluar cada archivo
  for (const [filePath, fileData] of byFile) {
    const lines = fileData.totalLines;
    const responsibilities = fileData.responsibilities.size;
    const hasDuplicates = filesWithDuplicates.has(filePath);
    const maxComplexity = fileData.maxComplexity;
    
    // Criterios de deuda arquitectónica
    const hasTooManyLines = lines > 250;
    const hasTooManyResponsibilities = responsibilities > 3;
    const hasHighComplexity = maxComplexity > 30;
    
    // Se activa si cumple: líneas grandes AND (responsabilidades múltiples OR duplicados OR complejidad alta)
    if (hasTooManyLines && (hasTooManyResponsibilities || hasDuplicates || hasHighComplexity)) {
      const violations = [];
      if (hasTooManyLines) violations.push(`Archivo muy grande (${lines} líneas)`);
      if (hasTooManyResponsibilities) violations.push(`${responsibilities} responsabilidades distintas`);
      if (hasDuplicates) violations.push('Contiene código duplicado');
      if (hasHighComplexity) violations.push(`Complejidad máxima ${maxComplexity}`);
      
      // Calcular score de deuda
      const debtScore = (
        (lines > 250 ? 20 : 0) +
        (responsibilities > 3 ? responsibilities * 10 : 0) +
        (hasDuplicates ? 15 : 0) +
        (maxComplexity > 30 ? (maxComplexity - 30) * 2 : 0)
      );
      
      debtFiles.push({
        file: filePath,
        lines,
        atomCount: fileData.atoms.length,
        responsibilities: [...fileData.responsibilities].slice(0, 5),
        responsibilityCount: responsibilities,
        maxComplexity,
        hasDuplicates,
        violations,
        debtScore,
        severity: debtScore > 60 ? 'critical' : (debtScore > 40 ? 'high' : 'medium'),
        topAtoms: fileData.atoms
          .sort((a, b) => (b.complexity || 0) - (a.complexity || 0))
          .slice(0, 3)
          .map(a => ({
            name: a.name,
            complexity: a.complexity,
            linesOfCode: a.linesOfCode,
            purpose: a.purpose
          })),
        recommendation: `Dividir en módulos más pequeños (< 250 líneas). ${violations.join('. ')}`
      });
    }
  }
  
  return debtFiles.sort((a, b) => b.debtScore - a.debtScore).slice(0, 15);
}

/**
 * Check if atom is an analysis script (internal tool)
 */
function isAnalysisScript(atom) {
  return atom.purpose === 'ANALYSIS_SCRIPT' ||
    atom.filePath?.startsWith('scripts/audit') ||
    atom.filePath?.startsWith('scripts/analyze');
}

export async function detect_patterns(args, context) {
  const { patternType = 'all', minOccurrences = 2 } = args;
  const { projectPath } = context;
  
  try {
    const atoms = await getAllAtoms(projectPath);
    
    const result = {
      summary: {
        totalAtoms: atoms.length,
        withDna: atoms.filter(a => a.dna?.structuralHash).length,
        withPatternHash: atoms.filter(a => a.dna?.patternHash).length,
        analyzedAt: new Date().toISOString()
      }
    };
    
    if (patternType === 'all') {
      // Overview mode: top 5 per category + counts. Use specific patternType for full details.
      const dups = findDuplicates(atoms, minOccurrences);
      const godFns = findGodFunctions(atoms);
      const fragile = findFragileNetworkCalls(atoms);
      const dead = findDeadCode(atoms);
      const unusual = findUnusualPatterns(atoms);
      const cycles = findCircularDependencies(atoms);
      const testCoverage = findTestCoverageGaps(atoms);
      const archDebt = findArchitecturalDebt(atoms);

      result.overview = {
        note: 'Use patternType: "duplicates" | "god-functions" | "fragile-network" | "complexity" | "archetype" | "circular" | "test-coverage" | "architectural-debt" for full details',
        duplicates: { exact: dups.summary.exactDuplicatesFound, similar: dups.summary.similarCodeFound, potentialSavingsLOC: dups.summary.potentialSavingsLOC, top3: dups.exactDuplicates.slice(0, 3).map(d => ({ hash: d.hash, count: d.count, example: d.atoms[0] })) },
        godFunctions: { count: godFns.length, top5: godFns.slice(0, 5).map(g => ({ name: g.name, file: g.file, complexity: g.complexity, linesOfCode: g.linesOfCode })) },
        fragileNetwork: { fragile: fragile.fragile.length, wellHandled: fragile.wellHandled.length, top5: fragile.fragile.slice(0, 5).map(f => ({ name: f.name, file: f.file, risk: f.risk, issue: f.issue })) },
        deadCode: { count: dead.length, top5: dead.slice(0, 5).map(d => ({ name: d.name, file: d.file, linesOfCode: d.linesOfCode })) },
        unusedExports: { count: unusual.unusedExports.length, top5: unusual.unusedExports.slice(0, 5) },
        complexityHotspots: findComplexityHotspots(atoms).slice(0, 5).map(h => ({ file: h.file, totalComplexity: h.totalComplexity, atomCount: h.atomCount })),
        circularDependencies: { count: cycles.length, top3: cycles.slice(0, 3).map(c => ({ files: c.files.slice(0, 3), length: c.length, severity: c.severity })) },
        testCoverage: {
          stats: testCoverage.stats,
          gapsCount: testCoverage.gaps.length,
          orphanedTestsCount: testCoverage.orphanedTests.length,
          top3: testCoverage.gaps.slice(0, 3).map(t => ({ name: t.name, file: t.file, riskScore: t.riskScore }))
        },
        architecturalDebt: {
          count: archDebt.length,
          critical: archDebt.filter(d => d.severity === 'critical').length,
          top3: archDebt.slice(0, 3).map(d => ({ 
            file: d.file, 
            lines: d.lines, 
            violations: d.violations,
            debtScore: d.debtScore 
          }))
        }
      };
    }

    if (patternType === 'duplicates') {
      result.duplicates = findDuplicates(atoms, minOccurrences);
    }

    if (patternType === 'complexity') {
      result.complexityHotspots = findComplexityHotspots(atoms);
    }

    if (patternType === 'archetype') {
      result.archetypePatterns = findByArchetypePattern(atoms).slice(0, 20);
    }

    if (patternType === 'god-functions') {
      result.godFunctions = findGodFunctions(atoms);
    }

    if (patternType === 'fragile-network') {
      result.fragileNetwork = findFragileNetworkCalls(atoms);
    }

    if (patternType === 'circular') {
      result.circularDependencies = findCircularDependencies(atoms);
    }

    if (patternType === 'test-coverage') {
      const coverage = findTestCoverageGaps(atoms);
      result.testCoverage = coverage;
    }

    if (patternType === 'architectural-debt') {
      result.architecturalDebt = findArchitecturalDebt(atoms);
      result.summary.debtExplanation = 'Files > 250 lines with multiple responsibilities, duplicates, or high complexity. Consider splitting into smaller modules (< 250 lines each).';
    }

    return result;
  } catch (error) {
    return { error: error.message };
  }
}
