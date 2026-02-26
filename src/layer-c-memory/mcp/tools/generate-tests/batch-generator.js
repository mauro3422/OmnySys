/**
 * @fileoverview Batch Test Generator
 * 
 * Genera tests para múltiples funciones sin cobertura.
 * 
 * @module mcp/tools/generate-tests/batch-generator
 */

import fs from 'fs/promises';
import path from 'path';
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

    // Enriquecer gaps con fragilityScore del átomo (para mejor ordering)
    // Lo hacemos en un mini-pass antes de ordenar
    const enrichedGaps = await Promise.all(
      gaps.map(async g => {
        try {
          const a = await getAtomDetails(projectPath, g.file, g.name, cache);
          return { ...g, fragilityScore: a?.derived?.fragilityScore || 0, testabilityScore: a?.derived?.testabilityScore || 0 };
        } catch { return g; }
      })
    );

    // Filtrar por complejidad mínima
    const filteredGaps = enrichedGaps.filter(g => (g.complexity || 0) >= minComplexity);

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
 * Ordena gaps por criterio — incorpora fragilityScore del atom.derived
 * para priorizar funciones que más se rompen
 */
function sortGaps(gaps, sortBy) {
  switch (sortBy) {
    case 'risk':
      // Combina riskScore del gap con fragilityScore del átomo
      return [...gaps].sort((a, b) => {
        const scoreA = (b.riskScore || 0) + ((b.fragilityScore || 0) * 5);
        const scoreB = (a.riskScore || 0) + ((a.fragilityScore || 0) * 5);
        return scoreA - scoreB;
      });
    case 'complexity':
      return [...gaps].sort((a, b) => (b.complexity || 0) - (a.complexity || 0));
    case 'fragility':
      return [...gaps].sort((a, b) => (b.fragilityScore || 0) - (a.fragilityScore || 0));
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
  // Pass the test file's directory (not base outputPath) so resolveImportAlias can
  // compute the correct number of '../' needed for non-aliased paths.
  const testFilePath = generateTestFilePath(gap.file, gap.name, outputPath);
  const testFileDir = path.dirname(testFilePath);
  const testCode = generateTestCode(atom, tests, { useRealFactories: true, outputPath: testFileDir });
  const riskScore = calculateRiskScore(atom);


  const result = {
    success: true,
    function: {
      name: gap.name,
      file: gap.file,
      complexity: atom.complexity,
      archetype: atom.archetype?.type,
      fragilityScore: atom.derived?.fragilityScore || 0,
      testabilityScore: atom.derived?.testabilityScore || 0,
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

  if (!dryRun) {
    try {
      const absolutePath = path.join(projectPath, testFilePath);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, testCode, 'utf-8');
      result.written = true;
      result.writtenTo = testFilePath;
    } catch (writeError) {
      result.written = false;
      result.writeError = writeError.message;
    }
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
