/**
 * @fileoverview Validaciones pre y post edit
 */

import path from 'path';
import fs from 'fs/promises';
import { createLogger } from '../../../../utils/logger.js';
import { extractImportsFromCode } from './exports.js';
import { findCallersEfficient } from './search.js';

const logger = createLogger('OmnySys:atomic:validators');

async function loadPackageImports(projectPath) {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const raw = await fs.readFile(packageJsonPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed?.imports && typeof parsed.imports === 'object' ? parsed.imports : {};
  } catch {
    return {};
  }
}

function normalizeImportTargets(target) {
  if (!target) {
    return [];
  }

  if (Array.isArray(target)) {
    return target.flatMap(normalizeImportTargets);
  }

  if (typeof target === 'string') {
    return [target];
  }

  if (typeof target === 'object') {
    return Object.values(target).flatMap(normalizeImportTargets);
  }

  return [];
}

function resolvePackageImportTargets(importPath, packageImports) {
  if (!importPath.startsWith('#')) {
    return [];
  }

  if (Object.prototype.hasOwnProperty.call(packageImports, importPath)) {
    return normalizeImportTargets(packageImports[importPath]);
  }

  for (const [specifier, target] of Object.entries(packageImports)) {
    if (!specifier.includes('*')) {
      continue;
    }

    const [prefix, suffix = ''] = specifier.split('*');
    if (!importPath.startsWith(prefix) || !importPath.endsWith(suffix)) {
      continue;
    }

    const wildcardValue = importPath.slice(prefix.length, importPath.length - suffix.length);
    return normalizeImportTargets(target).map((entry) => entry.replace('*', wildcardValue));
  }

  return [];
}

/**
 * Helper local para verificar existencia de archivos físicos durante edición
 */
async function checkImportExists(importPath, sourceFile, projectPath) {
  try {
    if (importPath.startsWith('#')) {
      const packageImports = await loadPackageImports(projectPath);
      const targets = resolvePackageImportTargets(importPath, packageImports);
      if (targets.length === 0) {
        return { exists: false, attemptedPaths: [`package.json#imports missing mapping for ${importPath}`] };
      }

      const attemptedPaths = [];
      for (const target of targets) {
        if (!target || typeof target !== 'string') {
          continue;
        }

        const resolvedTarget = target.startsWith('.')
          ? path.resolve(projectPath, target)
          : path.resolve(projectPath, target.replace(/^\//, ''));
        const attempts = [resolvedTarget, `${resolvedTarget}.js`, `${resolvedTarget}.ts`, path.join(resolvedTarget, 'index.js')];
        attemptedPaths.push(...attempts);

        for (const attempt of attempts) {
          try {
            await fs.access(attempt);
            return { exists: true, attemptedPaths };
          } catch { }
        }
      }

      return { exists: false, attemptedPaths };
    }

    if (!importPath.startsWith('.')) {
      return { exists: true, attemptedPaths: [] };
    }

    const target = path.resolve(path.dirname(sourceFile), importPath);
    const attempts = [target, target + '.js', target + '.ts', path.join(target, 'index.js')];

    for (const attempt of attempts) {
      try {
        await fs.access(attempt);
        return { exists: true, attemptedPaths: attempts };
      } catch { }
    }
    return { exists: false, attemptedPaths: attempts };
  } catch (e) {
    return { exists: false, attemptedPaths: [importPath] };
  }
}

/**
 * Valida que todos los imports en el nuevo código existan
 */
export async function validateImportsInEdit(filePath, newString, projectPath) {
  const imports = extractImportsFromCode(newString);
  const brokenImports = [];

  for (const importPath of imports) {
    if (importPath.startsWith('.') || importPath.startsWith('#')) {
      const check = await checkImportExists(importPath, filePath, projectPath);
      if (!check.exists) {
        brokenImports.push({
          import: importPath,
          attemptedPaths: check.attemptedPaths,
          suggestion: `Verificar que el módulo "${importPath}" exista. Intentado: ${check.attemptedPaths.slice(0, 3).join(', ')}`
        });
      }
    }
  }

  return brokenImports;
}

/**
 * Valida post-edit de forma OPTIMIZADA
 * Solo analiza callers de funciones modificadas
 */
export async function validatePostEditOptimized(filePath, projectPath, previousAtoms, currentAtoms) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    brokenCallers: [],
    affectedFiles: 0,
    debugInfo: {
      currentAtomsCount: currentAtoms.length,
      previousAtomsCount: previousAtoms.length,
      atoms: []
    }
  };

  try {
    const modifiedAtoms = currentAtoms.filter(current => {
      const previous = previousAtoms.find(p => p.name === current.name);
      if (!previous) return false;

      const currentRequired = (current.signature?.params || []).filter(p => !p.optional).length;
      const previousRequired = (previous.signature?.params || []).filter(p => !p.optional).length;

      return currentRequired !== previousRequired;
    });

    if (modifiedAtoms.length === 0) {
      logger.info('[PostEditOptimized] No signature changes detected');
      return result;
    }

    logger.info(`[PostEditOptimized] Checking ${modifiedAtoms.length} modified functions`);

    for (const atom of modifiedAtoms) {
      const requiredParams = (atom.signature?.params || []).filter(p => !p.optional).length;
      const signatureDesc = atom.signature?.params?.map(p => p.name + (p.optional ? '?' : '')).join(', ') || '';

      const callers = await findCallersEfficient(atom.name, projectPath, filePath);

      // Buscar también llamadas internas dentro del mismo archivo (usando el código nuevo)
      for (const currentAtom of currentAtoms) {
        const calls = currentAtom.calls || [];
        for (const call of calls) {
          if (call.callee === atom.name || call.target === atom.name || call.name === atom.name) {
            const argumentCount = call.argumentCount !== undefined ? call.argumentCount :
              (call.args ? call.args.length : (call.arguments ? call.arguments.length : 0));
            callers.push({
              name: currentAtom.name,
              filePath: filePath,
              line: call.line || currentAtom.line,
              code: call.code || JSON.stringify(call),
              argumentCount: argumentCount
            });
          }
        }
      }

      logger.info(`[PostEditOptimized] ${atom.name}: ${callers.length} callers found (including internal)`);

      for (const caller of callers) {
        logger.warn(`[Validator] Caller ${caller.name} (${caller.filePath}): args=${caller.argumentCount}, required=${requiredParams}`);
        if (caller.argumentCount !== undefined && caller.argumentCount < requiredParams) {
          logger.error(`[Validator] Broken call detected in ${caller.filePath}:${caller.line}`);
          result.valid = false;

          const proposal = {
            file: caller.filePath,
            symbol: caller.name,
            line: caller.line,
            reason: `Missing arguments for ${atom.name}(${signatureDesc})`,
            oldCode: caller.code,
            // Sugerencia dinámica basada en la diferencia de argumentos
            newCode: caller.code // El agente o usuario puede usar esto como base para el fix
          };

          result.brokenCallers.push({
            ...proposal,
            severity: 'critical'
          });
        }
      }
    }

    result.affectedFiles = new Set(result.brokenCallers.map(c => c.file)).size;
    // Si hay fallos, el LLM recibirá los brokenCallers con su contexto

  } catch (error) {
    logger.error(`[PostEditOptimized] Error: ${error.message}`);
    result.errors.push(`Validation error: ${error.message}`);
  }

  return result;
}
