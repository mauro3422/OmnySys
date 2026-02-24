/**
 * @fileoverview script-utils.js
 * 
 * Shared utility functions for analysis scripts
 * 
 * @module scripts/utils/script-utils
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Scan directory recursively for JSON files
 * @param {string} dir - Directory to scan
 * @param {Map} storage - Map to store results
 * @param {Function} processor - Function to process each file
 */
async function scanDir(dir, storage, processor) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanDir(fullPath, storage, processor);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const data = JSON.parse(content);
          processor(data, storage, fullPath);
        } catch {}
      }
    }
  } catch {}
}

/**
 * Read all atoms from .omnysysdata/atoms
 * @param {string} rootPath - Root path of the project
 * @returns {Promise<Map>} Map of atomId -> atomData
 */
export async function readAllAtoms(rootPath) {
  const atomsDir = path.join(rootPath, '.omnysysdata', 'atoms');
  const atoms = new Map();
  
  await scanDir(atomsDir, atoms, (data, storage) => {
    if (data.id) {
      storage.set(data.id, data);
    }
  });
  
  return atoms;
}

/**
 * Read all files from .omnysysdata/files
 * @param {string} rootPath - Root path of the project
 * @returns {Promise<Map>} Map of filePath -> fileData
 */
export async function readAllFiles(rootPath) {
  const filesDir = path.join(rootPath, '.omnysysdata', 'files');
  const files = new Map();
  
  await scanDir(filesDir, files, (data, storage) => {
    const filePath = data.path || data.filePath;
    if (filePath) {
      storage.set(filePath, data);
    }
  });
  
  return files;
}

/**
 * Scan directory recursively for JSON files and return as array
 * @param {string} rootPath - Root path to scan
 * @param {string} subDir - Subdirectory (e.g., 'atoms', 'files')
 * @returns {Promise<Array>} Array of {path, data} objects
 */
export async function scanJsonDir(rootPath, subDir = '.omnysysdata') {
  const baseDir = path.join(rootPath, subDir);
  const results = [];
  
  async function scan(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            results.push({
              path: fullPath,
              data: JSON.parse(content)
            });
          } catch {}
        }
      }
    } catch {}
  }
  
  await scan(baseDir);
  return results;
}

/**
 * Read system map from .omnysysdata
 * @param {string} rootPath - Root path of the project
 * @returns {Promise<Object>} System map data
 */
export async function readSystemMap(rootPath) {
  const systemMapPath = path.join(rootPath, '.omnysysdata', 'system-map.json');
  try {
    const content = await fs.readFile(systemMapPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Scan directory recursively for JSON files and return file paths
 * @param {string} rootPath - Root path to scan
 * @param {string} subDir - Subdirectory (e.g., 'atoms', 'files')
 * @returns {Promise<Array<string>>} Array of file paths
 */
export async function scanJsonFiles(rootPath, subDir = '.omnysysdata') {
  const baseDir = path.join(rootPath, subDir);
  const results = [];
  
  async function scan(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          results.push(fullPath);
        }
      }
    } catch {}
  }
  
  await scan(baseDir);
  return results;
}

/**
 * Read all file paths and their data from .omnysysdata/files
 * @param {string} rootPath - Root path of the project
 * @returns {Promise<Array<{filePath: string, data: Object}>>} Array of file objects
 */
export async function readAllStorageFiles(rootPath) {
  const filesDir = path.join(rootPath, '.omnysysdata', 'files');
  const results = [];
  
  async function scanDir(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const data = JSON.parse(content);
            const filePath = data.path || data.filePath;
            if (filePath) {
              results.push({ filePath, data });
            }
          } catch {}
        }
      }
    } catch {}
  }
  
  await scanDir(filesDir);
  return results;
}

/**
 * Simple logger for scripts
 * @param {string} message - Message to log
 */
export function log(message) {
  console.log(`[script] ${message}`);
}

/**
 * Calculate percentage
 * @param {number} value - Value
 * @param {number} total - Total
 * @returns {string} Formatted percentage
 */
export function pct(value, total) {
  return total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0.0%';
}
