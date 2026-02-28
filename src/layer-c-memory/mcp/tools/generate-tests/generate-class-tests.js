/**
 * @fileoverview Generate Class Tests
 * 
 * Genera tests para clases usando el generador inteligente.
 * 
 * @module mcp/tools/generate-tests/generate-class-tests
 */

import { createLogger } from '../../../../utils/logger.js';
import { getFileDependents } from '../../../query/apis/file-api.js';
import { extractClassMethods, isBuilderPattern } from './class-analyzer.js';
import { generateSmartClassTests } from './smart-test-generator.js';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger('OmnySys:generate-class-tests');

/**
 * Genera tests para una clase usando el generador inteligente
 */
export async function generateClassTests(filePath, className, options, projectPath, context) {
  logger.info(`[GenerateClassTests] Generating tests for ${className}`);

  const fullPath = projectPath ? path.join(projectPath, filePath) : filePath;
  const sourceCode = await fs.readFile(fullPath, 'utf-8');

  // Obtener file dependents map para referenciar en smart tests
  let fileDependents = [];
  try {
    fileDependents = await getFileDependents(projectPath, filePath);
  } catch (e) {
    logger.warn(`Could not get dependents for ${filePath}: ${e.message}`);
  }

  const { methods, staticMethods } = extractClassMethods(sourceCode, className);

  const classInfo = {
    name: className,
    file: filePath,
    methods,
    staticMethods,
    isBuilder: isBuilderPattern({ methods })
  };

  // Usar generador inteligente
  const result = await generateSmartClassTests(classInfo, filePath, projectPath, { dependents: fileDependents }, options);

  return {
    success: true,
    file: filePath,
    target: {
      name: className,
      type: 'class'
    },
    mode: 'generate',
    generatedCode: result.code,
    testLocation: result.testLocation,
    metrics: result.metrics,
    recommendations: result.recommendations,
    note: 'Review generated code and test location before applying.'
  };
}

export default {
  generateClassTests
};
