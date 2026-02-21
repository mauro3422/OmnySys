#!/usr/bin/env node
/**
 * @fileoverview omny-tools-data.js
 * 
 * Data loaders para omny-tools. Carga átomos, system-map e index desde .omnysysdata/
 * 
 * @module scripts/omny-tools-data
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_PATH, '.omnysysdata');

// Cache
let _atoms = null;
let _systemMap = null;
let _index = null;

/**
 * Carga todos los átomos desde .omnysysdata/atoms/
 * @returns {Promise<Map>} - Mapa de átomos por ID
 */
export async function loadAtoms() {
  if (_atoms) return _atoms;
  
  _atoms = new Map();
  const atomsDir = path.join(DATA_DIR, 'atoms');
  
  await scanAtomsDir(atomsDir, _atoms);
  return _atoms;
}

/**
 * Escanea directorio de átomos recursivamente
 * @param {string} dir - Directorio a escanear
 * @param {Map} atomsMap - Mapa para almacenar átomos
 */
async function scanAtomsDir(dir, atomsMap) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanAtomsDir(fullPath, atomsMap);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const data = JSON.parse(content);
          if (data.id) atomsMap.set(data.id, data);
        } catch {}
      }
    }
  } catch {}
}

/**
 * Carga el system-map desde .omnysysdata/system-map.json
 * @returns {Promise<Object>} - System map
 */
export async function loadSystemMap() {
  if (_systemMap) return _systemMap;
  
  try {
    const content = await fs.readFile(path.join(DATA_DIR, 'system-map.json'), 'utf-8');
    _systemMap = JSON.parse(content);
  } catch {
    _systemMap = { files: {} };
  }
  return _systemMap;
}

/**
 * Carga el index desde .omnysysdata/index.json
 * @returns {Promise<Object>} - Index
 */
export async function loadIndex() {
  if (_index) return _index;
  
  try {
    const content = await fs.readFile(path.join(DATA_DIR, 'index.json'), 'utf-8');
    _index = JSON.parse(content);
  } catch {
    _index = {};
  }
  return _index;
}

/**
 * Invalida el cache de datos
 */
export function invalidateCache() {
  _atoms = null;
  _systemMap = null;
  _index = null;
}

/**
 * Obtiene la ruta del directorio de datos
 * @returns {string} - Ruta a .omnysysdata/
 */
export function getDataDir() {
  return DATA_DIR;
}
