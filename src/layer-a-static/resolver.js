import fs from 'fs/promises';
import path from 'path';

/**
 * Resolver - Resuelve rutas de imports a paths absolutos
 *
 * Responsabilidad:
 * - Resolver imports relativos (./utils → src/utils.js)
 * - Resolver aliases (tsconfig.json)
 * - Detectar imports de node_modules
 * - Manejar edge cases (sin extensión, index.js, etc.)
 */

const SUPPORTED_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.json'];

/**
 * Lee aliases de package.json (imports), tsconfig.json o jsconfig.json
 *
 * @param {string} projectRoot - Raíz del proyecto
 * @returns {Promise<object>} - Mapa de aliases { "@": "src", "components": "src/components" }
 */
async function readAliasConfig(projectRoot) {
  const aliases = {};

  // 1. Primero: Leer package.json imports (Node.js subpath imports)
  // Esto es el estándar moderno y debería tener prioridad
  try {
    const packagePath = path.join(projectRoot, 'package.json');
    const content = await fs.readFile(packagePath, 'utf-8');
    const pkg = JSON.parse(content);

    if (pkg.imports) {
      for (const [importPath, target] of Object.entries(pkg.imports)) {
        // Convertir "#config/*" → "#config" y "./src/config/*" → "./src/config"
        const cleanAlias = importPath.replace(/\*$/, '').replace(/^#/, '');
        const cleanTarget = (typeof target === 'string' ? target : target?.default || target?.require || target?.import || '')
          .replace(/\*$/, '');
        
        if (cleanAlias && cleanTarget) {
          // Guardar sin el # para consistencia con el resto del código
          aliases['#' + cleanAlias] = cleanTarget;
          // También guardar sin # por si se usa de otra forma
          aliases[cleanAlias] = cleanTarget;
        }
      }
    }
  } catch {
    // package.json no existe o no tiene imports
  }

  // 2. Segundo: Intentar leer tsconfig.json (para compatibilidad)
  try {
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
    const content = await fs.readFile(tsconfigPath, 'utf-8');
    const tsconfig = JSON.parse(content);

    if (tsconfig.compilerOptions?.paths) {
      for (const [alias, paths] of Object.entries(tsconfig.compilerOptions.paths)) {
        const cleanAlias = alias.replace('/*', '');
        const cleanPath = paths[0]?.replace('/*', '') || '';
        if (cleanAlias && cleanPath) {
          aliases[cleanAlias] = cleanPath;
        }
      }
    }
  } catch {
    // tsconfig.json no existe o no es válido, intentar jsconfig.json
    try {
      const jsconfigPath = path.join(projectRoot, 'jsconfig.json');
      const content = await fs.readFile(jsconfigPath, 'utf-8');
      const jsconfig = JSON.parse(content);

      if (jsconfig.compilerOptions?.paths) {
        for (const [alias, paths] of Object.entries(jsconfig.compilerOptions.paths)) {
          const cleanAlias = alias.replace('/*', '');
          const cleanPath = paths[0]?.replace('/*', '') || '';
          if (cleanAlias && cleanPath) {
            aliases[cleanAlias] = cleanPath;
          }
        }
      }
    } catch {
      // Ambos fallan - sin aliases adicionales
    }
  }

  return aliases;
}

/**
 * Verifica si un archivo existe en el filesystem
 *
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Busca el archivo con diferentes extensiones
 *
 * @param {string} basePath - Ruta (puede tener extensión o no)
 * @returns {Promise<string|null>} - Ruta del archivo encontrado o null
 */
async function findFileWithExtension(basePath) {
  // Primero: verificar si el archivo ya existe tal cual está
  if (await fileExists(basePath)) {
    return basePath;
  }

  // Si tiene extensión conocida, no intentar agregar más
  const hasExtension = SUPPORTED_EXTENSIONS.some(ext => basePath.endsWith(ext));
  if (hasExtension) {
    return null;
  }

  // Intentar con diferentes extensiones
  for (const ext of SUPPORTED_EXTENSIONS) {
    const filePath = basePath + ext;
    if (await fileExists(filePath)) {
      return filePath;
    }
  }

  // Intentar con index.js, index.ts, etc.
  for (const ext of SUPPORTED_EXTENSIONS) {
    const indexPath = path.join(basePath, `index${ext}`);
    if (await fileExists(indexPath)) {
      return indexPath;
    }
  }

  return null;
}

/**
 * Normaliza una ruta a relativa del proyecto
 *
 * @param {string} filePath - Ruta absoluta
 * @param {string} projectRoot - Raíz del proyecto
 * @returns {string} - Ruta normalizada relativa al proyecto
 */
function normalizeToProjectRelative(filePath, projectRoot) {
  const normalized = path.normalize(filePath);
  const relative = path.relative(projectRoot, normalized);
  return relative.replace(/\\/g, '/');
}

/**
 * Resuelve un import a ruta relativa al proyecto
 *
 * @param {string} importSource - El source del import (ej: "./utils", "react", "@/components/Button")
 * @param {string} fromFile - Ruta del archivo que hace el import (relativa o absoluta)
 * @param {string} projectRoot - Raíz del proyecto
 * @param {object} aliases - Mapa de aliases
 * @returns {Promise<object>} - { resolved: string|null, type: 'local'|'external'|'unresolved', reason: string }
 */
export async function resolveImport(importSource, fromFile, projectRoot, aliases = {}) {
  // Detectar si es un módulo externo
  if (!importSource.startsWith('.') && !importSource.startsWith('/')) {
    // Chequear si es un alias
    const aliasMatch = Object.keys(aliases).find(
      alias => importSource.startsWith(alias)
    );

    if (aliasMatch) {
      // Es un alias - resolver como local
      const relativePath = importSource.replace(aliasMatch, aliases[aliasMatch]);
      const resolved = path.join(projectRoot, relativePath);
      const actual = await findFileWithExtension(resolved);

      if (actual) {
        return {
          resolved: normalizeToProjectRelative(actual, projectRoot),
          type: 'local',
          reason: `Resolved via alias ${aliasMatch}`
        };
      } else {
        return {
          resolved: null,
          type: 'unresolved',
          reason: `Alias ${aliasMatch} resolved but file not found`
        };
      }
    }

    // Es un módulo externo (node_modules, paquete npm, etc.)
    return {
      resolved: null,
      type: 'external',
      reason: `External module: ${importSource}`
    };
  }

  // Es un import relativo o absoluto
  // Primero convertir fromFile a absoluto si es relativo
  const fromFileAbsolute = path.isAbsolute(fromFile)
    ? fromFile
    : path.join(projectRoot, fromFile);

  const fromDir = path.dirname(fromFileAbsolute);
  let resolvedPath;

  if (importSource.startsWith('/')) {
    // Ruta absoluta (desde raíz del proyecto)
    resolvedPath = path.join(projectRoot, importSource);
  } else {
    // Ruta relativa
    resolvedPath = path.resolve(fromDir, importSource);
  }

  // Normalizar la ruta
  resolvedPath = path.normalize(resolvedPath);

  // Verificar si está dentro del proyecto
  const relToProject = path.relative(projectRoot, resolvedPath);
  if (relToProject.startsWith('..')) {
    return {
      resolved: null,
      type: 'external',
      reason: `Path escapes project: ${importSource}`
    };
  }

  // Buscar el archivo
  const actual = await findFileWithExtension(resolvedPath);

  if (actual) {
    return {
      resolved: normalizeToProjectRelative(actual, projectRoot),
      type: 'local',
      reason: `Resolved relative import`
    };
  } else {
    return {
      resolved: null,
      type: 'unresolved',
      reason: `File not found: ${resolvedPath}`
    };
  }
}

/**
 * Resuelve múltiples imports
 *
 * @param {string[]} importSources - Array de sources
 * @param {string} fromFile - Ruta del archivo que hace los imports
 * @param {string} projectRoot - Raíz del proyecto
 * @param {object} aliases - Mapa de aliases
 * @returns {Promise<object[]>}
 */
export async function resolveImports(importSources, fromFile, projectRoot, aliases = {}) {
  const promises = importSources.map(source =>
    resolveImport(source, fromFile, projectRoot, aliases)
  );
  return Promise.all(promises);
}

/**
 * Obtiene la configuración de resolución de todo el proyecto
 *
 * @param {string} projectRoot - Raíz del proyecto
 * @returns {Promise<object>}
 */
export async function getResolutionConfig(projectRoot) {
  const aliases = await readAliasConfig(projectRoot);

  return {
    projectRoot,
    aliases,
    supportedExtensions: SUPPORTED_EXTENSIONS
  };
}
