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

export function classifyFile(filePath) {
  if (!filePath) {
    return { type: 'unknown', description: 'Unknown file type' };
  }

  const normalized = filePath.toLowerCase();

  if (isTestFile(filePath)) {
    return { type: 'test', description: 'Test file - validates functionality', priority: 'low' };
  }

  if (isScriptFile(filePath)) {
    return { type: 'script', description: 'Utility script - automation/task runner', priority: 'medium' };
  }

  if (normalized.includes('config') || /\.(config|rc)\./.test(normalized)) {
    return { type: 'config', description: 'Configuration file - project settings', priority: 'high' };
  }

  if (normalized.startsWith('src/core/') || normalized.startsWith('src/lib/')) {
    return { type: 'core', description: 'Core library - fundamental functionality', priority: 'critical' };
  }

  if (normalized.startsWith('src/features/') || normalized.startsWith('src/modules/')) {
    return { type: 'feature', description: 'Feature module - domain logic', priority: 'high' };
  }

  if (normalized.includes('components') || normalized.includes('ui/')) {
    return { type: 'ui', description: 'UI Component - presentation layer', priority: 'medium' };
  }

  if (normalized.startsWith('docs/') || normalized.startsWith('readme')) {
    return { type: 'documentation', description: 'Documentation - reference material', priority: 'low' };
  }

  if (/\.(md|markdown|txt|rst|adoc)$/i.test(normalized)) {
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
