/**
 * @fileoverview Batch Test Generator
 * 
 * Genera tests para múltiples funciones sin cobertura.
 * 
 * @module mcp/tools/generate-tests/batch-generator
 */

import { createLogger } from '../../../../utils/logger.js';
import { getAtomDetails } from '#layer-c/query/queries/file-query/index.js';
import { detect_patterns } from '../detect-patterns.js';
import { analyzeFunctionForTests } from './test-analyzer.js';
import { generateTestCode } from './code-generator.js';
import { calculateRiskScore } from './recommendations.js';

const logger = createLogger('OmnySys:batch-test-generator');

/**
 * Genera tests para múltiples funciones sin cobertura
 */
export async function generate_batch_tests(args, context) {
  const { 
    limit = 10, 
    minComplexity = 5, 
    sortBy = 'risk',
    dryRun = true,
    outputPath = 'tests/generated'
  } = args;
  const { projectPath, cache } = context;
  
  logger.info(`[Tool] generate_batch_tests(limit: ${limit}, minComplexity: ${minComplexity})`);
  
  try {
    // Obtener gaps de cobertura usando detect_patterns
    const patternsResult = await detect_patterns(
      { patternType: 'test-coverage', limit: 100 },
      context
    );
    
    const gaps = patternsResult?.testCoverage?.gaps || [];
    
    if (gaps.length === 0) {
      return {
        success: true,
        stats: { totalGaps: 0, processed: 0, successful: 0, failed: 0 },
        results: [],
        summary: 'No coverage gaps found'
      };
    }
    
    // Filtrar por complejidad mínima
    const filteredGaps = gaps.filter(g => (g.complexity || 0) >= minComplexity);
    
    // Ordenar
    const sortedGaps = sortGaps(filteredGaps, sortBy);
    
    // Limitar
    const selectedGaps = sortedGaps.slice(0, limit);
    
    // Generar tests para cada gap
    const results = [];
    for (const gap of selectedGaps) {
      try {
        const result = await generateTestForGap(gap, projectPath, cache, outputPath, dryRun);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          function: gap.name,
          file: gap.file,
          error: error.message
        });
      }
    }
    
    // Estadísticas
    const stats = {
      totalGaps: gaps.length,
      filteredGaps: filteredGaps.length,
      processed: selectedGaps.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      dryRun
    };
    
    return {
      success: true,
      stats,
      results,
      summary: generateBatchSummary(results)
    };
    
  } catch (error) {
    logger.error(`[Tool] generate_batch_tests failed: ${error.message}`);
    return {
      error: error.message
    };
  }
}

/**
 * Ordena gaps por criterio
 */
function sortGaps(gaps, sortBy) {
  switch (sortBy) {
    case 'risk':
      return [...gaps].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
    case 'complexity':
      return [...gaps].sort((a, b) => (b.complexity || 0) - (a.complexity || 0));
    case 'name':
      return [...gaps].sort((a, b) => a.name.localeCompare(b.name));
    default:
      return gaps;
  }
}

/**
 * Genera test para un gap específico
 */
async function generateTestForGap(gap, projectPath, cache, outputPath, dryRun) {
  const atom = await getAtomDetails(projectPath, gap.file, gap.name, cache);
  
  if (!atom) {
    return {
      success: false,
      function: gap.name,
      file: gap.file,
      error: 'Atom not found'
    };
  }
  
  const tests = await analyzeFunctionForTests(atom, projectPath);
  const testCode = generateTestCode(atom, tests, { useRealFactories: false });
  const riskScore = calculateRiskScore(atom);
  
  // Generar path del archivo de test
  const testFilePath = generateTestFilePath(gap.file, gap.name, outputPath);
  
  const result = {
    success: true,
    function: {
      name: gap.name,
      file: gap.file,
      complexity: atom.complexity,
      archetype: atom.archetype?.type,
      riskScore
    },
    test: {
      filePath: testFilePath,
      code: testCode,
      testCount: tests.length,
      types: [...new Set(tests.map(t => t.type))]
    },
    dryRun
  };
  
  // Si no es dry run, escribir el archivo
  if (!dryRun) {
    // TODO: Implementar escritura de archivo
    result.written = false;
    result.message = 'File writing not implemented yet - use dryRun=true';
  }
  
  return result;
}

/**
 * Genera el path del archivo de test
 */
function generateTestFilePath(sourceFile, functionName, outputPath) {
  // Convertir src/utils/math.js -> tests/generated/utils/math.test.js
  const relativePath = sourceFile
    .replace(/^src\//, '')
    .replace(/\.(js|ts)$/, '.test.js');
  
  return `${outputPath}/${relativePath}`;
}

/**
 * Genera resumen del batch
 */
function generateBatchSummary(results) {
  const successful = results.filter(r => r.success);
  
  if (successful.length === 0) {
    return 'No tests generated';
  }
  
  const totalTests = successful.reduce((sum, r) => sum + r.test.testCount, 0);
  const avgComplexity = Math.round(
    successful.reduce((sum, r) => sum + r.function.complexity, 0) / successful.length
  );
  const avgRiskScore = Math.round(
    successful.reduce((sum, r) => sum + r.function.riskScore, 0) / successful.length * 10
  ) / 10;
  
  const archetypes = {};
  successful.forEach(r => {
    const a = r.function.archetype || 'unknown';
    archetypes[a] = (archetypes[a] || 0) + 1;
  });
  
  return {
    totalTestsGenerated: totalTests,
    averageComplexity: avgComplexity,
    averageRiskScore: avgRiskScore,
    archetypesBreakdown: archetypes
  };
}

export default { generate_batch_tests };
