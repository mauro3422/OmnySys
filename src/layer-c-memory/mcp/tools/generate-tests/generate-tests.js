import { createLogger } from '../../../../utils/logger.js';
import { analyzeForTests } from './analyze-for-tests.js';
import { generateClassTests } from './generate-class-tests.js';
import { generateFunctionTests } from './generate-function-tests.js';
import { generateMirrorTestCode } from './mirror-test-generator.js';
import { getAtomDetails } from '#layer-c/query/queries/file-query/index.js';

const logger = createLogger('OmnySys:generate-tests');

export async function generate_tests(args, context) {
  const { filePath, functionName, className, action = 'analyze', options = {} } = args;
  const { projectPath, cache } = context;
  const { validateImports = true, mirror = false } = options;

  const targetName = functionName || className;
  const targetType = className ? 'class' : (functionName ? 'function' : 'auto');

  logger.info(`[Tool] generate_tests("${filePath}::${targetName}" mode: ${action}, mirror: ${mirror})`);

  if (!filePath) {
    return {
      error: 'Missing required parameter: filePath',
      example: 'generate_tests({ filePath: "src/utils/math.js", functionName: "add" })'
    };
  }

  try {
    if (mirror && functionName) {
      const atom = await getAtomDetails(projectPath, filePath, functionName, cache);
      if (!atom) {
        return { error: 'ATOM_NOT_FOUND', message: `Function ${functionName} not found` };
      }

      const mirrorResult = generateMirrorTestCode(atom, options);
      return {
        success: true,
        type: 'MIRROR_TEST',
        atom: mirrorResult.atom,
        generatedCode: mirrorResult.code,
        testCount: mirrorResult.testCount,
        metadata: mirrorResult.metadata,
        note: 'MIRROR TEST: Este test usa código REAL del sistema (sin mocks). Si falla, el átomo tiene problemas.'
      };
    }

    if (action === 'analyze') {
      return await analyzeForTests(filePath, targetName, targetType, projectPath, cache, context, validateImports);
    }

    if (action === 'generate') {
      if (className) {
        return await generateClassTests(filePath, className, options, projectPath, context);
      }

      if (functionName) {
        return await generateFunctionTests(filePath, functionName, options, projectPath, cache, context);
      }

      return {
        error: 'Must specify functionName or className for generation',
        suggestion: 'Use analyze mode first to see available targets'
      };
    }

    return {
      error: `Unknown action: ${action}`,
      validActions: ['analyze', 'generate']
    };
  } catch (error) {
    logger.error(`[Tool] generate_tests failed: ${error.message}`);
    return {
      error: error.message,
      file: filePath,
      target: targetName
    };
  }
}

export default { generate_tests };
