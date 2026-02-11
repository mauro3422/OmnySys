/**
 * @fileoverview path-utils.js
 * 
 * Utilidades para normalizar y comparar paths
 * Solución robusta para el manejo de paths entre sistemas
 * 
 * @module verification/utils/path-utils
 */

import path from 'path';

/**
 * Normaliza un path para comparación consistente
 * - Convierte a formato relativo
 - Normaliza separadores
 - Mantiene la extensión .js/.ts (importante!)
 * - Solo quita .json de archivos de metadatos
 * 
 * @param {string} filePath - Path a normalizar
 * @param {string} projectPath - Path base del proyecto (opcional)
 * @returns {string} - Path normalizado
 */
export function normalizePath(filePath, projectPath = null) {
  if (!filePath) return '';
  
  let normalized = String(filePath);
  
  // Remover prefijo del proyecto si existe
  if (projectPath) {
    const projectPrefix = projectPath.replace(/\\/g, '/');
    normalized = normalized.replace(projectPrefix, '');
  }
  
  // Normalizar separadores (Windows → Unix)
  normalized = normalized.replace(/\\/g, '/');
  
  // Remover leading slash
  normalized = normalized.replace(/^\//, '');
  
  // Remover trailing slash si existe
  normalized = normalized.replace(/\/$/, '');
  
  return normalized;
}

/**
 * Compara dos paths para ver si son el mismo archivo
 * Maneja diferentes formatos: absolutos, relativos, con/sin extensión
 * 
 * @param {string} path1 - Primer path
 * @param {string} path2 - Segundo path  
 * @param {string} projectPath - Path base del proyecto
 * @returns {boolean} - True si son el mismo archivo
 */
export function arePathsEqual(path1, path2, projectPath = null) {
  const normalized1 = normalizePath(path1, projectPath);
  const normalized2 = normalizePath(path2, projectPath);
  
  return normalized1 === normalized2;
}

/**
 * Detecta si un path corresponde a un archivo de test
 * Los archivos de test tienen patrones específicos
 * 
 * @param {string} filePath - Path a evaluar
 * @returns {boolean} - True si es archivo de test
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
 * Detecta si un path corresponde a un script/utility
 * Scripts son archivos ejecutables en raíz o carpeta scripts/
 * 
 * @param {string} filePath - Path a evaluar
 * @returns {boolean} - True si es script
 */
export function isScriptFile(filePath) {
  if (!filePath) return false;
  
  const normalized = filePath.toLowerCase();
  
  // Scripts típicos
  if (normalized.startsWith('scripts/')) return true;
  if (/^(install|setup|run|start|stop|build|deploy|clean)/.test(normalized)) return true;
  
  return false;
}

/**
 * Clasifica un archivo según su propósito en el proyecto
 * Esto ayuda a entender qué tipo de átomo es y cómo se conecta
 * 
 * @param {string} filePath - Path del archivo
 * @returns {Object} - Clasificación del archivo
 */
export function classifyFile(filePath) {
  if (!filePath) {
    return { type: 'unknown', description: 'Unknown file type' };
  }
  
  const normalized = filePath.toLowerCase();
  
  // Tests
  if (isTestFile(filePath)) {
    return { 
      type: 'test', 
      description: 'Test file - validates functionality',
      priority: 'low'
    };
  }
  
  // Scripts
  if (isScriptFile(filePath)) {
    return { 
      type: 'script', 
      description: 'Utility script - automation/task runner',
      priority: 'medium'
    };
  }
  
  // Configuración
  if (normalized.includes('config') || /\.(config|rc)\./.test(normalized)) {
    return { 
      type: 'config', 
      description: 'Configuration file - project settings',
      priority: 'high'
    };
  }
  
  // Core/Librería
  if (normalized.startsWith('src/core/') || normalized.startsWith('src/lib/')) {
    return { 
      type: 'core', 
      description: 'Core library - fundamental functionality',
      priority: 'critical'
    };
  }
  
  // Features/Módulos
  if (normalized.startsWith('src/features/') || normalized.startsWith('src/modules/')) {
    return { 
      type: 'feature', 
      description: 'Feature module - domain logic',
      priority: 'high'
    };
  }
  
  // UI/Components
  if (normalized.includes('components') || normalized.includes('ui/')) {
    return { 
      type: 'ui', 
      description: 'UI Component - presentation layer',
      priority: 'medium'
    };
  }
  
  // Documentación
  if (normalized.startsWith('docs/') || normalized.startsWith('readme')) {
    return { 
      type: 'documentation', 
      description: 'Documentation - reference material',
      priority: 'low'
    };
  }
  
  // Documentación (Markdown, txt, etc.)
  if (/\.(md|markdown|txt|rst|adoc)$/i.test(normalized)) {
    return { 
      type: 'documentation', 
      description: 'Documentation file - knowledge and reference',
      priority: 'low',
      extractable: false  // No extraer átomos de docs
    };
  }
  
  // Default: código fuente general
  return { 
    type: 'source', 
    description: 'Source code - general implementation',
    priority: 'medium',
    extractable: true
  };
}

export default {
  normalizePath,
  arePathsEqual,
  isTestFile,
  isScriptFile,
  classifyFile
};
