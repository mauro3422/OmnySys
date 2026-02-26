/**
 * @fileoverview loader.js - Data loading for validate-graph-system
 */
import { readAllAtoms } from '../utils/script-utils.js';
import fs from 'fs/promises';
import path from 'path';

export async function loadAuditData(rootPath) {
  const atoms = await readAllAtoms(rootPath);
  const systemMap = await readSystemMap(rootPath);
  return { atoms, systemMap };
}

export async function readSystemMap(rootPath) {
  const mapPath = path.join(rootPath, '.omnysysdata', 'system-map.json');
  try {
    const content = await fs.readFile(mapPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}
