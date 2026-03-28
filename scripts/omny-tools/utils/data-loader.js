/**
 * @fileoverview Data Loader - Carga datos desde SQLite con fallback legacy.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getAllAtoms } from '../../../src/layer-c-memory/storage/index.js';
import { getRepository } from '../../../src/layer-c-memory/storage/repository/repository-factory.js';

const DATA_DIR = '.omnysysdata';
const PROJECT_ROOT = process.cwd();

function readLegacyJson(fileName, fallbackValue) {
  const filePath = join(DATA_DIR, fileName);
  if (!existsSync(filePath)) {
    return fallbackValue;
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return fallbackValue;
  }
}

function atomsToMap(atoms) {
  const map = new Map();

  for (const atom of atoms) {
    if (!atom) continue;
    const key = atom.id || `${atom.filePath || 'unknown'}::${atom.name || 'unknown'}`;
    map.set(key, atom);
  }

  return map;
}

export async function loadAtoms() {
  try {
    const atoms = await getAllAtoms(PROJECT_ROOT, { includeRemoved: true });
    if (Array.isArray(atoms) && atoms.length > 0) {
      return atomsToMap(atoms);
    }
  } catch {
    // Fall through to legacy JSON below.
  }

  const legacyAtoms = readLegacyJson('atoms.json', null);
  if (legacyAtoms && typeof legacyAtoms === 'object') {
    return new Map(Object.entries(legacyAtoms));
  }

  return new Map();
}

export async function loadSystemMap() {
  try {
    const repo = getRepository(PROJECT_ROOT);
    const systemMap = await repo.loadSystemMap();
    if (systemMap && typeof systemMap === 'object' && Object.keys(systemMap).length > 0) {
      return systemMap;
    }
  } catch {
    // Fall through to legacy JSON below.
  }

  return readLegacyJson('system-map.json', { files: {} }) || { files: {} };
}

export async function loadIndex() {
  const legacyIndex = readLegacyJson('index.json', null);
  if (legacyIndex && typeof legacyIndex === 'object') {
    return legacyIndex;
  }

  return { metadata: {} };
}
