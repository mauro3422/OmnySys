/**
 * @fileoverview path-utils.js
 *
 * Utilidades puras para normalizar y clasificar paths de archivo.
 * Sin dependencias de infra — usable desde cualquier layer.
 *
 * @module shared/utils/path-utils
 */

/**
 * Normaliza un path para comparación consistente.
 * @param {string} filePath
 * @param {string} [projectPath]
 * @returns {string}
 */
export function normalizePath(filePath, projectPath = null) {
  if (!filePath) return '';

  let normalized = String(filePath);

  if (projectPath) {
    const projectPrefix = projectPath.replace(/\\/g, '/');
    normalized = normalized.replace(projectPrefix, '');
  }

  normalized = normalized.replace(/\\/g, '/');
  normalized = normalized.replace(/^\//, '');
  normalized = normalized.replace(/\/$/, '');

  return normalized;
}

/**
 * Normaliza un path para comparaciones por identidad de archivo.
 * Mantiene el path relativo, pero unifica separadores y quita la extensión.
 * @param {string} filePath
 * @returns {string}
 */
export function normalizeComparablePath(filePath) {
  return normalizePath(filePath).replace(/\.[jt]sx?$/i, '');
}

/**
 * Compara dos paths para ver si referencian el mismo archivo.
 * @param {string} path1
 * @param {string} path2
 * @param {string} [projectPath]
 * @returns {boolean}
 */
export function arePathsEqual(path1, path2, projectPath = null) {
  return normalizePath(path1, projectPath) === normalizePath(path2, projectPath);
}

/**
 * Detecta si un path corresponde a un archivo de test.
 * @param {string} filePath
 * @returns {boolean}
 */
export function isTestFile(filePath) {
  if (!filePath) return false;

  const normalized = filePath.toLowerCase();
  const testPatterns = [
    /\btest\b/,
    /\btests\b/,
    /\.test\./,
    /\.spec\./,
    /\b__tests__\b/,
    /\btest-cases\b/,
    /\bscenario-\w+\b/,
    /\bsmoke-test\b/,
    /\bintegration-test\b/,
    /\bunit-test\b/
  ];

  return testPatterns.some(pattern => pattern.test(normalized));
}

/**
 * Detecta si un path corresponde a un script/utility.
 * @param {string} filePath
 * @returns {boolean}
 */
export function isScriptFile(filePath) {
  if (!filePath) return false;

  const normalized = filePath.toLowerCase();
  if (normalized.startsWith('scripts/')) return true;
  if (/^(install|setup|run|start|stop|build|deploy|clean)/.test(normalized)) return true;

  return false;
}

/**
 * Clasifica un archivo según su propósito en el proyecto.
 * @param {string} filePath
 * @returns {{ type: string, description: string, priority?: string, extractable?: boolean }}
 */
/**
 * 🆕 Función de prueba - valida si un path es absoluto
 * @param {string} filePath
 * @returns {boolean}
 */
export function isAbsolutePath(filePath) {
  if (!filePath) return false;
  return filePath.startsWith('/') || /^[a-zA-Z]:/.test(filePath);
}

/**
 * 🆕 Función de prueba - extrae la extensión del archivo
 * @param {string} filePath
 * @returns {string}
 */
export function getFileExtension(filePath) {
  if (!filePath) return '';
  const lastDot = filePath.lastIndexOf('.');
  return lastDot > 0 ? filePath.slice(lastDot) : '';
}

function isConfigFile(normalizedPath) {
  return normalizedPath.includes('config') || /\.(config|rc)\./.test(normalizedPath);
}

function isCoreFile(normalizedPath) {
  return normalizedPath.startsWith('src/core/') || normalizedPath.startsWith('src/lib/');
}

function isFeatureFile(normalizedPath) {
  return normalizedPath.startsWith('src/features/') || normalizedPath.startsWith('src/modules/');
}

function isUiFile(normalizedPath) {
  return normalizedPath.includes('components') || normalizedPath.includes('ui/');
}

function isDocumentationRootFile(normalizedPath) {
  return normalizedPath.startsWith('docs/') || normalizedPath.startsWith('readme');
}

function isDocumentationExtension(normalizedPath) {
  return /\.(md|markdown|txt|rst|adoc)$/i.test(normalizedPath);
}

function resolveFileClassification(filePath, normalized) {
  if (isTestFile(filePath)) {
    return { type: 'test', description: 'Test file - validates functionality', priority: 'low' };
  }

  if (isScriptFile(filePath)) {
    return { type: 'script', description: 'Utility script - automation/task runner', priority: 'medium' };
  }

  if (isConfigFile(normalized)) {
    return { type: 'config', description: 'Configuration file - project settings', priority: 'high' };
  }

  if (isCoreFile(normalized)) {
    return { type: 'core', description: 'Core library - fundamental functionality', priority: 'critical' };
  }

  if (isFeatureFile(normalized)) {
    return { type: 'feature', description: 'Feature module - domain logic', priority: 'high' };
  }

  if (isUiFile(normalized)) {
    return { type: 'ui', description: 'UI Component - presentation layer', priority: 'medium' };
  }

  if (isDocumentationRootFile(normalized)) {
    return { type: 'documentation', description: 'Documentation - reference material', priority: 'low' };
  }

  if (isDocumentationExtension(normalized)) {
    return {
      type: 'documentation',
      description: 'Documentation file - knowledge and reference',
      priority: 'low',
      extractable: false
    };
  }

  return {
    type: 'source',
    description: 'Source code - general implementation',
    priority: 'medium',
    extractable: true
  };
}

export function classifyFile(filePath) {
  if (!filePath) {
    return { type: 'unknown', description: 'Unknown file type' };
  }

  return resolveFileClassification(filePath, filePath.toLowerCase());
}
