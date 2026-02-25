/**
 * @fileoverview Resolver - Alias Configuration
 *
 * Lee configuración de aliases de package.json, tsconfig.json, jsconfig.json.
 *
 * @module layer-a-static/resolver/resolver-aliases
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Lee aliases de package.json imports
 * @param {string} projectRoot - Raíz del proyecto
 * @returns {Promise<object>}
 */
async function readPackageJsonImports(projectRoot) {
  const aliases = {};

  try {
    const packagePath = path.join(projectRoot, 'package.json');
    const content = await fs.readFile(packagePath, 'utf-8');
    const pkg = JSON.parse(content);

    if (pkg.imports) {
      for (const [importPath, target] of Object.entries(pkg.imports)) {
        const cleanAlias = importPath.replace(/\*$/, '').replace(/^#/, '');
        const cleanTarget = (typeof target === 'string' ? target : target?.default || target?.require || target?.import || '')
          .replace(/\*$/, '');

        if (cleanAlias && cleanTarget) {
          aliases['#' + cleanAlias] = cleanTarget;
          aliases[cleanAlias] = cleanTarget;
        }
      }
    }
  } catch {
    // package.json no existe o no tiene imports
  }

  return aliases;
}

/**
 * Lee aliases de tsconfig.json o jsconfig.json
 * @param {string} projectRoot - Raíz del proyecto
 * @param {string} configType - 'tsconfig' o 'jsconfig'
 * @returns {Promise<object>}
 */
async function readConfigPaths(projectRoot, configType) {
  const aliases = {};

  try {
    const configPath = path.join(projectRoot, `${configType}.json`);
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);

    if (config.compilerOptions?.paths) {
      for (const [alias, paths] of Object.entries(config.compilerOptions.paths)) {
        const cleanAlias = alias.replace('/*', '');
        const cleanPath = paths[0]?.replace('/*', '') || '';
        if (cleanAlias && cleanPath) {
          aliases[cleanAlias] = cleanPath;
        }
      }
    }
  } catch {
    // Config no existe o no es válido
  }

  return aliases;
}

/**
 * Lee todas las configuraciones de aliases
 * @param {string} projectRoot - Raíz del proyecto
 * @returns {Promise<object>}
 */
export async function readAliasConfig(projectRoot) {
  const [packageAliases, tsAliases, jsAliases] = await Promise.all([
    readPackageJsonImports(projectRoot),
    readConfigPaths(projectRoot, 'tsconfig'),
    readConfigPaths(projectRoot, 'jsconfig')
  ]);

  return { ...packageAliases, ...tsAliases, ...jsAliases };
}

export default readAliasConfig;
