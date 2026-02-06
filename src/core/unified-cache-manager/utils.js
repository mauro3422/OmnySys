import crypto from 'crypto';
import { ChangeType } from './constants.js';

/**
 * Calcula hash del contenido
 */
export function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Detecta el tipo de cambio entre dos versiones del código
 * @param {string} oldCode - Código anterior
 * @param {string} newCode - Código nuevo
 * @param {object} oldAnalysis - Análisis anterior (si existe)
 * @returns {ChangeType}
 */
export function detectChangeType(oldCode, newCode, oldAnalysis = null) {
  // Si no hay análisis previo, es un archivo nuevo
  if (!oldAnalysis) {
    return ChangeType.SEMANTIC;
  }

  // Normalizar código (quitar espacios, comentarios)
  const normalize = (code) => code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Comentarios multilinea
    .replace(/\/\/.*$/gm, '')        // Comentarios single line
    .replace(/\s+/g, ' ')             // Múltiples espacios
    .trim();

  const oldNormalized = normalize(oldCode);
  const newNormalized = normalize(newCode);

  // Si es idéntico normalizado, es cosmético
  if (oldNormalized === newNormalized) {
    return ChangeType.COSMETIC;
  }

  // Detectar cambios en imports/exports
  const oldImports = extractImports(oldCode);
  const newImports = extractImports(newCode);
  const oldExports = extractExports(oldCode);
  const newExports = extractExports(newCode);

  const importsChanged = JSON.stringify(oldImports) !== JSON.stringify(newImports);
  const exportsChanged = JSON.stringify(oldExports) !== JSON.stringify(newExports);

  // Detectar cambios en localStorage/events/globales
  const oldSemantic = extractSemanticPatterns(oldCode);
  const newSemantic = extractSemanticPatterns(newCode);
  const semanticChanged = JSON.stringify(oldSemantic) !== JSON.stringify(newSemantic);

  if (importsChanged || exportsChanged) {
    return ChangeType.CRITICAL; // Cambia la API del archivo
  }

  if (semanticChanged) {
    return ChangeType.SEMANTIC; // Cambia las conexiones
  }

  return ChangeType.STATIC; // Cambió lógica interna pero no conexiones
}

/**
 * Extrae imports del código (simplificado)
 */
function extractImports(code) {
  const imports = [];
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }
  return imports.sort();
}

/**
 * Extrae exports del código (simplificado)
 */
function extractExports(code) {
  const exports = [];
  const exportRegex = /export\s+(?:default\s+)?(?:function|class|const|let|var)?\s*(\w+)/g;
  let match;
  while ((match = exportRegex.exec(code)) !== null) {
    exports.push(match[1]);
  }
  return exports.sort();
}

/**
 * Extrae patrones semánticos clave
 */
function extractSemanticPatterns(code) {
  return {
    localStorage: {
      reads: [...code.matchAll(/localStorage\.getItem\(['"]([^'"]+)['"]\)/g)].map(m => m[1]),
      writes: [...code.matchAll(/localStorage\.setItem\(['"]([^'"]+)['"]\)/g)].map(m => m[1])
    },
    events: {
      listeners: [...code.matchAll(/addEventListener\(['"]([^'"]+)['"]/g)].map(m => m[1]),
      emitters: [...code.matchAll(/dispatchEvent\(['"]([^'"]+)['"]/g)].map(m => m[1])
    },
    globals: [...code.matchAll(/window\.(\w+)/g)].map(m => m[1])
  };
}
