import fs from 'fs/promises';
import path from 'path';
import glob from 'fast-glob';

/**
 * Scanner - Encuentra todos los archivos del proyecto a analizar
 *
 * Responsabilidad:
 * - Recorrer directorios recursivamente
 * - Filtrar por extensión (.js, .ts, .jsx, .tsx)
 * - Ignorar carpetas (node_modules, dist, build, .git, etc.)
 * - Detectar estructura del proyecto
 */

// Extensiones que analizamos
const SUPPORTED_EXTENSIONS = ['js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs'];

// Carpetas que siempre ignoramos
const IGNORED_DIRS = [
  // Generated/build
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  'tmp',
  'temp',
  '.next',
  '.nuxt',
  '.turbo',

  // OmnySys analysis data (no re-analyze)
  '.omnysysdata',
  '.aver',  // Legacy - mantener por compatibilidad
  'omnysysdata',

  // Version control
  '.git',
  '.gitignore',

  // IDE/editor
  '.idea',
  '.vscode',
  '.vscode-insiders',
  '.sublime-project',
  '.sublime-workspace',
  '.DS_Store',

  // OS/env
  'node_modules/.bin',
  '.env',
  '.env.local',
  '.env.*.local',

  // Package managers
  '.pnp',
  '.pnp.js',
  'yarn.lock',
  'pnpm-lock.yaml',

  // Caches
  '.eslintcache',
  '.prettierignore',
  '.cache',
  '.parcel-cache',
  '.next/cache',
  '.nuxt/.cache'
];

/**
 * Lee el archivo .averignore y retorna los patrones de exclusión
 *
 * @param {string} rootPath - Ruta del proyecto
 * @returns {Promise<string[]>} - Array de patrones de exclusión
 */
async function readAverIgnore(rootPath) {
  const averignorePath = path.join(rootPath, '.averignore');

  try {
    const content = await fs.readFile(averignorePath, 'utf-8');
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')); // Ignorar comentarios y líneas vacías

    return lines;
  } catch {
    // .averignore no existe o no puede leerse, retornar array vacío
    return [];
  }
}

/**
 * Escanea un proyecto y retorna lista de archivos
 *
 * @param {string} rootPath - Ruta del proyecto (puede ser relativa o absoluta)
 * @param {object} options - Opciones
 *   - includePatterns: string[] - Patrones adicionales a incluir
 *   - excludePatterns: string[] - Patrones a excluir
 *   - returnAbsolute: boolean - Si retornar rutas absolutas (default: false, retorna proyecto-relativas)
 *   - readAverIgnore: boolean - Leer .averignore del proyecto (default: true)
 * @returns {Promise<string[]>} - Array de rutas de archivos encontrados
 */
export async function scanProject(rootPath, options = {}) {
  const {
    includePatterns = [],
    excludePatterns = [],
    returnAbsolute = false,
    readAverIgnore: shouldReadAverIgnore = true
  } = options;

  // Convertir rootPath a absoluto
  const absoluteRootPath = path.isAbsolute(rootPath)
    ? rootPath
    : path.resolve(process.cwd(), rootPath);

  // Construir patterns de glob
  const extensions = SUPPORTED_EXTENSIONS.map(ext => `**/*.${ext}`);

  // Patrones por defecto
  const defaultInclude = extensions;

  // Patrones a excluir
  const defaultExclude = IGNORED_DIRS.map(dir => `**/${dir}/**`);

  // Leer .averignore si está habilitado
  let userExcludePatterns = [];
  if (shouldReadAverIgnore) {
    userExcludePatterns = await readAverIgnore(absoluteRootPath);
  }

  const includePatterns_final = [...defaultInclude, ...includePatterns];
  const excludePatterns_final = [
    ...defaultExclude,
    ...userExcludePatterns.map(p => p.startsWith('!') ? p : `**/${p}/**`),
    ...excludePatterns
  ];

  try {
    // Usar fast-glob para encontrar archivos
    const files = await glob(includePatterns_final, {
      cwd: absoluteRootPath,
      ignore: excludePatterns_final,
      absolute: false,
      dot: false
    });

    if (returnAbsolute) {
      // Retornar rutas absolutas
      const absolutePaths = files.map(file => path.join(absoluteRootPath, file));
      return absolutePaths.sort();
    } else {
      // Retornar rutas normalizadas (forward slashes, relativas al proyecto)
      return files.map(f => f.replace(/\\/g, '/')).sort();
    }
  } catch (error) {
    console.error(`Error scanning project at ${absoluteRootPath}:`, error);
    return [];
  }
}

/**
 * Detecta el tipo de proyecto (package.json, tsconfig.json, etc.)
 *
 * @param {string} rootPath - Ruta del proyecto
 * @returns {Promise<object>} - Información del proyecto
 */
export async function detectProjectInfo(rootPath) {
  const info = {
    hasPackageJson: false,
    hasTsConfig: false,
    hasJsConfig: false,
    useTypeScript: false,
    packageJson: null
  };

  try {
    // Verificar package.json
    const packageJsonPath = path.join(rootPath, 'package.json');
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      info.packageJson = JSON.parse(content);
      info.hasPackageJson = true;
    } catch {
      // No existe package.json
    }

    // Verificar tsconfig.json
    const tsconfigPath = path.join(rootPath, 'tsconfig.json');
    try {
      await fs.stat(tsconfigPath);
      info.hasTsConfig = true;
      info.useTypeScript = true;
    } catch {
      // No existe
    }

    // Verificar jsconfig.json
    const jsconfigPath = path.join(rootPath, 'jsconfig.json');
    try {
      await fs.stat(jsconfigPath);
      info.hasJsConfig = true;
    } catch {
      // No existe
    }

  } catch (error) {
    console.error('Error detecting project info:', error);
  }

  return info;
}

/**
 * CLI: Ejecutar scanner desde línea de comandos
 *
 * Uso:
 *   node src/layer-a-static/scanner.js /path/to/project
 */

// Ejecutar como CLI si se invoca directamente
const isMainModule = process.argv[1]?.includes('scanner.js') || false;
if (isMainModule) {
  const projectPath = process.argv[2] || process.cwd();

  console.log(`📁 Scanning project: ${projectPath}\n`);

  const projectInfo = await detectProjectInfo(projectPath);
  console.log('📋 Project Info:');
  console.log(`  - Has package.json: ${projectInfo.hasPackageJson}`);
  console.log(`  - Has tsconfig.json: ${projectInfo.hasTsConfig}`);
  console.log(`  - Uses TypeScript: ${projectInfo.useTypeScript}`);
  console.log('');

  const files = await scanProject(projectPath);
  console.log(`✅ Found ${files.length} files to analyze:\n`);
  files.forEach(file => console.log(`  - ${file}`));
}
