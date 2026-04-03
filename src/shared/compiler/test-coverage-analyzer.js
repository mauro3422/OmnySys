import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../layer-c-memory/utils/logger.js';
import { parseExistingTests } from '../../layer-c-memory/mcp/tools/generate-tests/coverage-analyzer/parsers/index.js';
import { detectTestedEntities, detectObsoleteTests, detectDuplicateTests } from '../../layer-c-memory/mcp/tools/generate-tests/coverage-analyzer/detectors/index.js';
import { analyzeEntityCoverage } from '../../layer-c-memory/mcp/tools/generate-tests/coverage-analyzer/analyzers/index.js';
import { buildCoverageRecommendations, compareWithGeneratedTests } from '../../layer-c-memory/mcp/tools/generate-tests/coverage-analyzer/reporters/index.js';

const logger = createLogger('OmnySys:test-coverage-analyzer');

export async function analyzeTestCoverage(testFilePath, projectPath) {
  logger.info(`[CoverageAnalyzer] Analyzing test file: ${testFilePath}`);

  try {
    const fullPath = projectPath ? path.join(projectPath, testFilePath) : testFilePath;
    const testContent = await fs.readFile(fullPath, 'utf-8');

    const existingTests = parseExistingTests(testContent);
    const testedEntities = detectTestedEntities(testContent);

    const coverageGaps = [];
    for (const entity of testedEntities) {
      const gaps = await analyzeEntityCoverage(entity, existingTests, projectPath);
      if (gaps.missingTests.length > 0) {
        coverageGaps.push(gaps);
      }
    }

    const obsoleteTests = detectObsoleteTests(existingTests, projectPath);
    const duplicateTests = detectDuplicateTests(existingTests);

    return {
      success: true,
      testFile: testFilePath,
      summary: {
        totalTests: existingTests.length,
        testedEntities: testedEntities.length,
        coverageGaps: coverageGaps.length,
        obsoleteTests: obsoleteTests.length,
        duplicateTests: duplicateTests.length
      },
      entities: testedEntities,
      gaps: coverageGaps,
      obsolete: obsoleteTests,
      duplicates: duplicateTests,
      recommendations: buildCoverageRecommendations(coverageGaps, obsoleteTests, duplicateTests)
    };
  } catch (error) {
    logger.error(`[CoverageAnalyzer] Failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      testFile: testFilePath
    };
  }
}

export { compareWithGeneratedTests } from '../../layer-c-memory/mcp/tools/generate-tests/coverage-analyzer/reporters/index.js';

export default {
  analyzeTestCoverage,
  compareWithGeneratedTests
};
