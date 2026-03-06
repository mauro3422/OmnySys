/**
 * @fileoverview validation-utils.js
 *
 * Validation helpers for MCP file operations.
 *
 * @module mcp/core/validation-utils
 */

import fs from 'fs/promises';
import path from 'path';
import { getAtomsByName } from '#layer-c/storage/index.js';
import { getFileImpactSummary } from '#layer-c/query/apis/dependency-api.js';
import { arePathsEqual, normalizePath } from '../../../shared/utils/path-utils.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:mcp:validation');

/**
 * Validate that a file exists before editing.
 *
 * @param {string} filePath
 * @param {string|null} projectPath
 * @returns {Promise<object>}
 */
export async function validateFileExists(filePath, projectPath = null) {
  const result = {
    valid: true,
    warnings: [],
    errors: [],
    context: {}
  };

  try {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : (projectPath ? path.join(projectPath, filePath) : path.resolve(filePath));

    await fs.access(absolutePath);
    result.context.absolutePath = absolutePath;
    result.context.exists = true;
  } catch (error) {
    result.valid = false;
    result.errors.push(`File does not exist: ${filePath}`);
    result.context.exists = false;

    const suggestions = await findSimilarFiles(filePath);
    if (suggestions.length > 0) {
      result.context.suggestions = suggestions;
      result.warnings.push(`Did you mean: ${suggestions.join(', ')}?`);
    }
  }

  return result;
}

async function findSimilarFiles(filePath) {
  try {
    const dir = path.dirname(filePath);
    const basename = path.basename(filePath, path.extname(filePath));
    const files = await fs.readdir(dir, { withFileTypes: true });

    return files
      .filter((file) => file.isFile() && file.name.includes(basename.substring(0, 5)))
      .map((file) => path.join(dir, file.name))
      .slice(0, 3);
  } catch {
    return [];
  }
}

/**
 * Validate that the same symbol is not duplicated in the same file.
 *
 * @param {string} filePath
 * @param {string} symbolName
 * @param {string} projectPath
 * @returns {Promise<object>}
 */
export async function validateNoDuplicates(filePath, symbolName, projectPath) {
  const result = {
    valid: true,
    warnings: [],
    errors: [],
    context: {}
  };

  if (!projectPath) {
    result.warnings.push('Cannot check duplicates: projectPath not provided');
    return result;
  }

  try {
    const instances = await getAtomsByName(projectPath, symbolName);

    if (instances.length > 1) {
      const sameFileInstances = instances.filter(
        (instance) => arePathsEqual(instance.filePath || instance.file_path, filePath, projectPath)
      );

      if (sameFileInstances.length > 1) {
        result.valid = false;
        result.errors.push(
          `Duplicate symbol "${symbolName}" found ${sameFileInstances.length} times in this file`
        );
        result.context.duplicates = sameFileInstances.map((atom) => ({
          id: atom.id,
          filePath: atom.filePath,
          line: atom.line,
          complexity: atom.complexity
        }));
      } else {
        const relatedFiles = [...new Set(
          instances
            .map((instance) => normalizePath(instance.filePath || instance.file_path, projectPath))
            .filter(Boolean)
            .filter((instancePath) => !arePathsEqual(instancePath, filePath, projectPath))
        )];
        result.warnings.push(
          `Symbol "${symbolName}" exists in ${instances.length} files - editing this one may affect: ` +
          `${relatedFiles.slice(0, 3).join(', ')}`
        );
        result.context.relatedFiles = relatedFiles.slice(0, 10);
      }
    }
  } catch (error) {
    result.warnings.push(`Could not verify duplicates for "${symbolName}": ${error.message}`);
  }

  return result;
}

/**
 * Validate that a file path looks safe and reasonable.
 *
 * @param {string} filePath
 * @returns {object}
 */
export function validatePath(filePath) {
  const result = {
    valid: true,
    warnings: [],
    errors: [],
    context: {}
  };

  if (path.isAbsolute(filePath)) {
    result.warnings.push(`Using absolute path: ${filePath}. Consider using relative path.`);
  }

  const invalidChars = /[<>"|?*]/;
  if (invalidChars.test(filePath)) {
    result.valid = false;
    result.errors.push(`Path contains invalid characters: ${filePath.match(invalidChars)[0]}`);
  }

  if (filePath.includes('//') || filePath.includes('..')) {
    result.warnings.push('Path contains // or .. which may cause issues');
  }

  const ext = path.extname(filePath);
  result.context.extension = ext;
  if (!ext) {
    result.warnings.push(`File has no extension: ${filePath}`);
  }

  return result;
}

/**
 * Get surrounding line context for a line number.
 *
 * @param {string} filePath
 * @param {number} lineNumber
 * @param {number} contextLines
 * @returns {Promise<object>}
 */
export async function getLineContext(filePath, lineNumber, contextLines = 5) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const start = Math.max(0, lineNumber - contextLines - 1);
    const end = Math.min(lines.length, lineNumber + contextLines);

    const context = [];
    for (let index = start; index < end; index += 1) {
      context.push({
        line: index + 1,
        content: lines[index],
        isTarget: index === lineNumber - 1
      });
    }

    return {
      totalLines: lines.length,
      targetLine: lineNumber,
      context,
      surrounding: context
        .filter((entry) => !entry.isTarget)
        .map((entry) => `${entry.line}: ${entry.content}`)
        .join('\n')
    };
  } catch (error) {
    return {
      error: `Could not read context: ${error.message}`,
      totalLines: 0,
      context: []
    };
  }
}

/**
 * Compute a lightweight impact warning from the stored graph.
 *
 * @param {string} filePath
 * @param {string} symbolName
 * @param {string} projectPath
 * @returns {Promise<object>}
 */
export async function validateImpact(filePath, symbolName, projectPath) {
  const result = {
    valid: true,
    warnings: [],
    errors: [],
    context: {}
  };

  if (!projectPath) {
    result.warnings.push('Cannot analyze impact: projectPath not provided');
    return result;
  }

  try {
    const normalizedFilePath = normalizePath(filePath, projectPath);
    const impact = await getFileImpactSummary(projectPath, normalizedFilePath, {
      includeSemantic: true,
      includeAtoms: true
    });

    if (impact.directCount > 0) {
      result.warnings.push(
        `This change will affect ${impact.directCount} files directly${impact.transitiveCount > impact.directCount ? ` and ${impact.transitiveCount} transitively` : ''}`
      );
      result.context.affectedFiles = impact.directDependents.slice(0, 5);
      result.context.transitiveAffectedFiles = impact.transitiveDependents.slice(0, 10);
    }

    if (impact.severity === 'high') {
      result.warnings.push(
        `HIGH IMPACT: ${impact.directCount} direct / ${impact.transitiveCount} transitive files affected. Consider careful review.`
      );
    }

    const highFragilityAtoms = impact.highFragilityAtoms || [];
    if (highFragilityAtoms.length > 0) {
      result.warnings.push(`${highFragilityAtoms.length} fragile atoms in this file (fragility > 0.5)`);
      result.context.fragileAtoms = highFragilityAtoms.slice(0, 5).map((atom) => atom.name);
    }
  } catch (error) {
    result.warnings.push(`Could not analyze impact: ${error.message}`);
  }

  return result;
}

/**
 * Full validation before editing a file.
 *
 * @param {object} params
 * @param {string} params.filePath
 * @param {string|null} params.symbolName
 * @param {number|null} params.lineNumber
 * @param {string|null} params.projectPath
 * @returns {Promise<object>}
 */
export async function validateBeforeEdit({ filePath, symbolName = null, lineNumber = null, projectPath = null }) {
  logger.debug(`Validating edit operation: ${filePath}${symbolName ? `::${symbolName}` : ''}`);

  const combined = {
    valid: true,
    warnings: [],
    errors: [],
    context: {
      validationsPerformed: [],
      filePath,
      symbolName
    }
  };

  const existsValidation = await validateFileExists(filePath, projectPath);
  combined.valid = combined.valid && existsValidation.valid;
  combined.warnings.push(...existsValidation.warnings);
  combined.errors.push(...existsValidation.errors);
  combined.context.fileExists = existsValidation.context.exists;
  combined.context.validationsPerformed.push('fileExists');

  if (!combined.valid) {
    logger.warn(`Validation failed: ${combined.errors.join(', ')}`);
    return combined;
  }

  const pathValidation = validatePath(filePath);
  combined.valid = combined.valid && pathValidation.valid;
  combined.warnings.push(...pathValidation.warnings);
  combined.errors.push(...pathValidation.errors);
  combined.context.validationsPerformed.push('path');

  if (symbolName && projectPath) {
    const duplicatesValidation = await validateNoDuplicates(filePath, symbolName, projectPath);
    combined.valid = combined.valid && duplicatesValidation.valid;
    combined.warnings.push(...duplicatesValidation.warnings);
    combined.errors.push(...duplicatesValidation.errors);
    combined.context.validationsPerformed.push('duplicates');
  }

  if (lineNumber && combined.context.fileExists) {
    const context = await getLineContext(filePath, lineNumber);
    combined.context.lineContext = context;
    combined.context.validationsPerformed.push('lineContext');
    logger.debug(`Context around line ${lineNumber}:\n${context.surrounding}`);
  }

  if (projectPath) {
    const impactValidation = await validateImpact(filePath, symbolName, projectPath);
    combined.warnings.push(...impactValidation.warnings);
    combined.context.validationsPerformed.push('impact');
  }

  logger.debug(`Validation complete: ${combined.context.validationsPerformed.join(' -> ')}`);
  if (combined.warnings.length > 0) {
    logger.debug(`Warnings: ${combined.warnings.length}`);
    combined.warnings.forEach((warning) => logger.debug(`  ${warning}`));
  }
  if (combined.errors.length > 0) {
    logger.debug(`Errors: ${combined.errors.length}`);
    combined.errors.forEach((error) => logger.debug(`  ${error}`));
  }

  return combined;
}

/**
 * Validate before writing a new file.
 *
 * @param {object} params
 * @param {string} params.filePath
 * @returns {Promise<object>}
 */
export async function validateBeforeWrite({ filePath }) {
  logger.debug(`Validating write operation: ${filePath}`);

  const result = {
    valid: true,
    warnings: [],
    errors: [],
    context: {
      validationsPerformed: []
    }
  };

  const pathValidation = validatePath(filePath);
  result.valid = result.valid && pathValidation.valid;
  result.warnings.push(...pathValidation.warnings);
  result.errors.push(...pathValidation.errors);
  result.context.validationsPerformed.push('path');

  try {
    await fs.access(filePath);
    result.warnings.push(`File already exists: ${filePath}. Will overwrite.`);
    result.context.alreadyExists = true;
  } catch {
    result.context.alreadyExists = false;
  }
  result.context.validationsPerformed.push('existsCheck');

  const parentDir = path.dirname(filePath);
  try {
    await fs.access(parentDir);
    result.context.parentExists = true;
  } catch {
    result.warnings.push(`Parent directory does not exist: ${parentDir}. Will be created.`);
    result.context.parentExists = false;
  }
  result.context.validationsPerformed.push('parentDir');

  logger.debug(`Validation complete: ${result.context.validationsPerformed.join(' -> ')}`);

  return result;
}

export default {
  validateFileExists,
  validateNoDuplicates,
  validatePath,
  getLineContext,
  validateImpact,
  validateBeforeEdit,
  validateBeforeWrite
};
