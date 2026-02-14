/**
 * @fileoverview Atom validation logic
 * @module verification/validators/integrity/validators/atom-validator
 */

import fs from 'fs/promises';
import path from 'path';
import { Severity, IssueCategory, DataSystem } from '../../../types/index.js';
import { ATOM_REQUIRED_FIELDS } from '../constants/index.js';
import { getJsonFiles } from '../utils/file-scanner.js';

/**
 * Valida archivos de átomos
 * @param {string} atomsDir - Directorio de átomos
 * @param {Function} addIssue - Callback para agregar issues
 */
export async function validateAtoms(atomsDir, addIssue) {
  try {
    const atomFiles = await getJsonFiles(atomsDir);

    for (const atomFile of atomFiles) {
      const fullPath = path.join(atomsDir, atomFile);
      await validateAtomFile(fullPath, atomFile, addIssue);
    }

    return atomFiles.length;
  } catch (error) {
    addIssue({
      category: IssueCategory.STRUCTURE,
      severity: Severity.CRITICAL,
      system: DataSystem.ATOMS,
      path: atomsDir,
      message: `Cannot read atoms directory: ${error.message}`
    });
    return 0;
  }
}

/**
 * Valida un archivo de átomo individual
 * @param {string} fullPath - Ruta completa del archivo
 * @param {string} relativePath - Ruta relativa
 * @param {Function} addIssue - Callback para agregar issues
 */
async function validateAtomFile(fullPath, relativePath, addIssue) {
  try {
    const content = await fs.readFile(fullPath, 'utf-8');

    // 1. Verificar JSON válido
    let atom;
    try {
      atom = JSON.parse(content);
    } catch (parseError) {
      addIssue({
        category: IssueCategory.INTEGRITY,
        severity: Severity.CRITICAL,
        system: DataSystem.ATOMS,
        path: relativePath,
        message: `Invalid JSON: ${parseError.message}`,
        suggestion: 'Re-run analysis to regenerate this atom'
      });
      return;
    }

    // 2. Verificar campos requeridos
    const missingFields = ATOM_REQUIRED_FIELDS.filter(field => !(field in atom));
    if (missingFields.length > 0) {
      addIssue({
        category: IssueCategory.COMPLETENESS,
        severity: Severity.HIGH,
        system: DataSystem.ATOMS,
        path: relativePath,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        expected: ATOM_REQUIRED_FIELDS.join(', '),
        actual: Object.keys(atom).join(', ')
      });
    }

    // 3. Verificar tipos de datos
    if (atom.complexity !== undefined && typeof atom.complexity !== 'number') {
      addIssue({
        category: IssueCategory.INTEGRITY,
        severity: Severity.MEDIUM,
        system: DataSystem.ATOMS,
        path: relativePath,
        message: `Invalid type for 'complexity': expected number, got ${typeof atom.complexity}`,
        expected: 'number',
        actual: typeof atom.complexity
      });
    }

    // 4. Verificar archetype válido
    if (atom.archetype && typeof atom.archetype === 'object') {
      if (!atom.archetype.type) {
        addIssue({
          category: IssueCategory.COMPLETENESS,
          severity: Severity.MEDIUM,
          system: DataSystem.ATOMS,
          path: relativePath,
          message: 'Archetype missing type field',
          suggestion: 'Archetype should have type, severity, and confidence'
        });
      }
    }

  } catch (error) {
    addIssue({
      category: IssueCategory.INTEGRITY,
      severity: Severity.HIGH,
      system: DataSystem.ATOMS,
      path: relativePath,
      message: `Failed to read atom: ${error.message}`
    });
  }
}
