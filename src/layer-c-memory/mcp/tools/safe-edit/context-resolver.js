/**
 * @fileoverview context-resolver.js
 *
 * Obtiene contexto exacto de edición usando las APIs oficiales del sistema.
 * Usa query/apis/file-api.js para consistencia con el resto del sistema.
 */

import { findAtomByLine } from '#layer-c/query/apis/file-api.js';
import path from 'path';

/**
 * Obtiene contexto de edición para una línea específica
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @param {number} lineNumber - Línea objetivo (1-based)
 * @param {number} linesBefore - Líneas antes a incluir
 * @param {number} linesAfter - Líneas después a incluir
 * @returns {Promise<Object>} Contexto de edición
 */
export async function getEditContext({
  projectPath,
  filePath,
  lineNumber,
  linesBefore = 3,
  linesAfter = 3
}) {
  try {
    const normalizedFilePath = filePath.replace(/\\/g, '/');

    // 1. Buscar el átomo que contiene esa línea usando la API pública ✅
    const atom = await findAtomByLine(projectPath, normalizedFilePath, lineNumber);

    // 2. Leer el archivo completo para obtener el contexto de líneas
    const fs = await import('fs/promises');
    const fullPath = path.join(projectPath, filePath);
    const content = await fs.readFile(fullPath, 'utf8');
    const allLines = content.split('\n');

    if (!atom) {
      // Si no hay átomo, devolver contexto genérico
      return buildGenericContext(allLines, lineNumber, linesBefore, linesAfter, filePath);
    }

    // 3. Extraer contexto dentro del rango del átomo
    const atomLines = allLines.slice(atom.lineStart - 1, atom.lineEnd);
    const targetIndexInAtom = lineNumber - atom.lineStart;
    
    const contextStart = Math.max(0, targetIndexInAtom - linesBefore);
    const contextEnd = Math.min(atomLines.length, targetIndexInAtom + linesAfter + 1);
    
    const contextLines = atomLines.slice(contextStart, contextEnd);
    const exactLine = atomLines[targetIndexInAtom] || '';

    // 4. Detectar indentación
    const indentation = detectIndentation(exactLine);

    // 5. Devolver contexto estructurado
    return {
      atomId: atom.id,
      atomName: atom.name,
      atomType: atom.atom_type,
      purposeType: atom.purpose_type,
      semanticFingerprint: atom.dna?.semanticFingerprint || null,
      atomRange: {
        start: atom.lineStart,
        end: atom.lineEnd
      },
      targetLine: lineNumber,
      exactLine,
      fullContext: contextLines.join('\n'),
      contextLines,
      indentation,
      suggestedOldString: exactLine,
      lineRange: {
        start: atom.lineStart + contextStart,
        end: atom.lineStart + contextEnd - 1
      },
      source: 'atom_context'
    };
  } catch (error) {
    throw new Error(`Failed to get edit context: ${error.message}`);
  }
}

/**
 * Construye contexto genérico cuando no hay átomo
 */
function buildGenericContext(allLines, lineNumber, linesBefore, linesAfter, filePath) {
  const contextStart = Math.max(0, lineNumber - linesBefore - 1);
  const contextEnd = Math.min(allLines.length, lineNumber + linesAfter);
  
  const contextLines = allLines.slice(contextStart, contextEnd);
  const targetIndex = lineNumber - 1;
  const exactLine = allLines[targetIndex] || '';
  const indentation = detectIndentation(exactLine);

  return {
    atomId: null,
    atomName: null,
    atomType: null,
    purposeType: null,
    semanticFingerprint: null,
    atomRange: null,
    targetLine: lineNumber,
    exactLine,
    fullContext: contextLines.join('\n'),
    contextLines,
    indentation,
    suggestedOldString: exactLine,
    lineRange: {
      start: contextStart + 1,
      end: contextEnd
    },
    source: 'generic_context'
  };
}

/**
 * Detecta la indentación de una línea
 */
function detectIndentation(line) {
  const match = line.match(/^(\s+)/);
  if (!match) return '';
  
  const whitespace = match[1];
  if (whitespace.includes('\t')) return '\t';
  
  // Contar espacios
  const spaceCount = whitespace.length;
  if (spaceCount % 4 === 0) return '    ';  // 4 espacios
  if (spaceCount % 2 === 0) return '  ';    // 2 espacios
  return whitespace;  // Whatever it is
}

/**
 * Busca un patrón dentro del contexto y devuelve el match exacto
 * @param {string} context - Texto donde buscar
 * @param {string} pattern - Patrón a buscar (puede ser regex o texto plano)
 * @returns {string|null} Match encontrado o null
 */
export function findInContext(context, pattern) {
  if (!pattern || !context) return null;
  
  // Si el patrón ya es el string completo (tiene saltos de línea o es largo), usarlo
  if (pattern.includes('\n') || pattern.length > 50) {
    return pattern;
  }
  
  // Escapar caracteres especiales de regex si parece texto plano
  const needsEscape = !/[.*+?^${}()|[\]\\]/.test(pattern);
  const regexPattern = needsEscape 
    ? pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    : pattern;
  
  const regex = new RegExp(regexPattern, 'm');
  const match = context.match(regex);
  
  return match ? match[0] : null;
}

/**
 * Obtiene todos los átomos de un archivo para contexto extendido
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Array>} Lista de átomos
 */
export async function getFileAtoms(projectPath, filePath) {
  try {
    const { loadAtoms } = await import('#layer-c/storage/index.js');
    const normalizedFilePath = filePath.replace(/\\/g, '/');
    
    const atoms = await loadAtoms(projectPath, normalizedFilePath);
    return atoms;
  } catch (error) {
    throw new Error(`Failed to load atoms: ${error.message}`);
  }
}
