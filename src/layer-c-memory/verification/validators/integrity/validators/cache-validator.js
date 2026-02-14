/**
 * @fileoverview Cache validation logic
 * @module verification/validators/integrity/validators/cache-validator
 */

import fs from 'fs/promises';
import path from 'path';
import { Severity, IssueCategory, DataSystem } from '../../../types/index.js';

/**
 * Valida el índice de cache
 * @param {string} cacheDir - Directorio de cache
 * @param {Function} addIssue - Callback para agregar issues
 */
export async function validateCache(cacheDir, addIssue) {
  const cacheIndex = path.join(cacheDir, 'index.json');

  try {
    const content = await fs.readFile(cacheIndex, 'utf-8');
    const cache = JSON.parse(content);

    if (!cache.entries || typeof cache.entries !== 'object') {
      addIssue({
        category: IssueCategory.INTEGRITY,
        severity: Severity.HIGH,
        system: DataSystem.CACHE,
        path: 'cache/index.json',
        message: 'Cache index missing entries object'
      });
    }

    return true;
  } catch (error) {
    addIssue({
      category: IssueCategory.INTEGRITY,
      severity: Severity.MEDIUM,
      system: DataSystem.CACHE,
      path: 'cache/index.json',
      message: `Cache index issue: ${error.message}`
    });
    return false;
  }
}
