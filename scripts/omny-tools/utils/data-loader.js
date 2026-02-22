/**
 * @fileoverview Data Loader - Carga datos de .omnysysdata/
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = '.omnysysdata';

export async function loadAtoms() {
  const atomsPath = join(DATA_DIR, 'atoms.json');
  if (!existsSync(atomsPath)) {
    console.error('❌ No se encontró atoms.json. Ejecuta el análisis primero.');
    process.exit(1);
  }
  
  const data = JSON.parse(readFileSync(atomsPath, 'utf-8'));
  return new Map(Object.entries(data));
}

export async function loadSystemMap() {
  const mapPath = join(DATA_DIR, 'system-map.json');
  if (!existsSync(mapPath)) {
    return { files: {} };
  }
  
  return JSON.parse(readFileSync(mapPath, 'utf-8'));
}

export async function loadIndex() {
  const indexPath = join(DATA_DIR, 'index.json');
  if (!existsSync(indexPath)) {
    return { metadata: {} };
  }
  
  return JSON.parse(readFileSync(indexPath, 'utf-8'));
}
