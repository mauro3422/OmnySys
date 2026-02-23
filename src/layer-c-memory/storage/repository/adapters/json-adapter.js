/**
 * @fileoverview json-adapter.js
 * 
 * Implementacion de AtomRepository usando archivos JSON.
 * Mantiene compatibilidad con el sistema actual.
 * Version sincronica para match con SQLiteAdapter.
 * 
 * @module storage/repository/adapters/json-adapter
 */

import { AtomRepository } from '../atom-repository.js';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { createLogger } from '#utils/logger.js';
import fg from 'fast-glob';

const logger = createLogger('OmnySys:Storage:JsonAdapter');

/**
 * Adaptador JSON - Compatible con sistema legacy
 * Usa archivos JSON en .omnysysdata/atoms/
 * Version sincronica (match con SQLiteAdapter)
 */
export class JsonAdapter extends AtomRepository {
  constructor() {
    super();
    this.basePath = null;
    this.cache = new Map();
    this.initialized = false;
  }

  initialize(projectPath) {
    this.basePath = resolve(projectPath, '.omnysysdata', 'atoms');
    this.initialized = true;
    logger.info(`[JsonAdapter] Initialized at: ${this.basePath}`);
  }

  _getFilePath(id) {
    // ID formato: "src/path/file.js::functionName"
    const [filePath, name] = id.split('::');
    return resolve(this.basePath, filePath, `${name}.json`);
  }

  getById(id) {
    try {
      const filePath = this._getFilePath(id);
      const content = readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  getByFileAndName(filePath, name) {
    const id = `${filePath}::${name}`;
    return this.getById(id);
  }

  getByFile(filePath) {
    try {
      const dirPath = resolve(this.basePath, filePath);
      const files = readdirSync(dirPath);
      
      const atoms = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = readFileSync(resolve(dirPath, file), 'utf8');
          atoms.push(JSON.parse(content));
        }
      }
      
      return atoms;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  save(atom) {
    const filePath = this._getFilePath(atom.id);
    
    // Asegurar que el directorio existe
    mkdirSync(dirname(filePath), { recursive: true });
    
    // Escribir atomo con timestamp
    const atomToSave = {
      ...atom,
      updatedAt: new Date().toISOString()
    };
    
    writeFileSync(filePath, JSON.stringify(atomToSave, null, 2));
    
    // Actualizar cache
    this.cache.set(atom.id, atomToSave);
    
    logger.debug(`[JsonAdapter] Saved atom: ${atom.id}`);
    
    return atomToSave;
  }

  saveMany(atoms) {
    const results = [];
    for (const atom of atoms) {
      const result = this.save(atom);
      results.push(result);
    }
    return results;
  }

  delete(id) {
    try {
      const filePath = this._getFilePath(id);
      unlinkSync(filePath);
      this.cache.delete(id);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  deleteByFile(filePath) {
    try {
      const dirPath = resolve(this.basePath, filePath);
      const files = readdirSync(dirPath);
      
      let count = 0;
      for (const file of files) {
        if (file.endsWith('.json')) {
          unlinkSync(resolve(dirPath, file));
          count++;
        }
      }
      
      return count;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return 0;
      }
      throw error;
    }
  }

  query(filter = {}, options = {}) {
    // Cargar todos los atomos y filtrar en memoria
    const allAtoms = this.getAll();
    
    let results = allAtoms.filter(atom => {
      if (filter.filePath && atom.file !== filter.filePath && atom.filePath !== filter.filePath) {
        return false;
      }
      
      if (filter.atomType && atom.type !== filter.atomType) {
        return false;
      }
      
      if (filter.archetype && atom.archetype?.type !== filter.archetype) {
        return false;
      }
      
      if (filter.purpose && atom.purpose !== filter.purpose) {
        return false;
      }
      
      if (filter.isExported !== undefined && atom.isExported !== filter.isExported) {
        return false;
      }
      
      if (filter.minComplexity && atom.complexity < filter.minComplexity) {
        return false;
      }
      
      if (filter.maxComplexity && atom.complexity > filter.maxComplexity) {
        return false;
      }
      
      return true;
    });
    
    // Sorting
    if (options.sortBy) {
      const sortField = options.sortBy;
      const sortOrder = options.sortOrder === 'DESC' ? -1 : 1;
      
      results.sort((a, b) => {
        const aVal = a[sortField] || 0;
        const bVal = b[sortField] || 0;
        return (aVal - bVal) * sortOrder;
      });
    }
    
    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || results.length;
    
    return results.slice(offset, offset + limit);
  }

  getAll(options = {}) {
    try {
      // Usar glob para encontrar todos los archivos JSON
      const pattern = resolve(this.basePath, '**/*.json');
      const files = fg.sync(pattern);
      
      const atoms = [];
      for (const file of files) {
        try {
          const content = readFileSync(file, 'utf8');
          atoms.push(JSON.parse(content));
        } catch (error) {
          logger.warn(`[JsonAdapter] Failed to parse ${file}: ${error.message}`);
        }
      }
      
      // Pagination
      if (options.offset || options.limit) {
        const offset = options.offset || 0;
        const limit = options.limit || atoms.length;
        return atoms.slice(offset, offset + limit);
      }
      
      return atoms;
    } catch (error) {
      logger.error(`[JsonAdapter] Error loading atoms: ${error.message}`);
      return [];
    }
  }

  findByName(name) {
    const allAtoms = this.getAll();
    return allAtoms.filter(atom => 
      atom.name?.toLowerCase().includes(name.toLowerCase())
    );
  }

  findByArchetype(archetypeType, options = {}) {
    return this.query({ archetype: archetypeType }, options);
  }

  findByPurpose(purposeType) {
    return this.query({ purpose: purposeType });
  }

  getCallGraph(id, options = {}) {
    const atom = this.getById(id);
    if (!atom) return { rootId: id, nodes: [], edges: [] };
    
    const nodes = [atom];
    const edges = [];
    
    // Callees (llamadas salientes)
    if (atom.calls) {
      for (const call of atom.calls) {
        const calleeName = typeof call === 'string' ? call : call.callee;
        const calleeId = `${atom.filePath?.split('::')[0] || atom.file?.split('::')[0]}::${calleeName}`;
        
        edges.push({
          from: id,
          to: calleeId,
          type: 'calls',
          line: call.line
        });
      }
    }
    
    // Callers (llamadas entrantes)
    if (atom.calledBy) {
      for (const caller of atom.calledBy) {
        edges.push({
          from: caller,
          to: id,
          type: 'calledBy'
        });
      }
    }
    
    return { rootId: id, nodes, edges };
  }

  getCallers(id) {
    const atom = this.getById(id);
    return atom?.calledBy?.map(callerId => ({ id: callerId })) || [];
  }

  getCallees(id) {
    const atom = this.getById(id);
    return atom?.calls?.map(call => ({
      id: typeof call === 'string' ? call : call.callee,
      name: typeof call === 'string' ? call : call.callee,
      line: call.line
    })) || [];
  }

  saveRelation(sourceId, targetId, relationType, metadata = {}) {
    // En JSON, las relaciones se guardan dentro del atomo
    const atom = this.getById(sourceId);
    if (!atom) return;
    
    if (relationType === 'calls') {
      atom.calls = atom.calls || [];
      atom.calls.push({
        callee: targetId,
        ...metadata
      });
    }
    
    this.save(atom);
  }

  updateVectors(id, vectors) {
    const atom = this.getById(id);
    if (!atom) return;
    
    // Agregar vectores al campo derived o crear campo nuevo
    atom.derived = atom.derived || {};
    Object.assign(atom.derived, vectors);
    
    this.save(atom);
  }

  findSimilar(id, options = {}) {
    // En JSON, buscar por DNA hash similarity
    const refAtom = this.getById(id);
    if (!refAtom || !refAtom.dna) return [];
    
    const allAtoms = this.getAll();
    
    return allAtoms
      .filter(atom => atom.id !== id && atom.dna)
      .map(atom => {
        // Calcular similitud simple basada en hashes
        const refHash = refAtom.dna.structuralHash || '';
        const atomHash = atom.dna.structuralHash || '';
        
        // Similitud de Jaccard simple
        const similarity = refHash === atomHash ? 1.0 : 
                          refHash.slice(0, 8) === atomHash.slice(0, 8) ? 0.8 : 0.0;
        
        return { ...atom, similarity };
      })
      .filter(atom => atom.similarity >= (options.threshold || 0.8))
      .slice(0, options.limit || 10);
  }

  getStats() {
    const allAtoms = this.getAll();
    
    return {
      atoms: allAtoms.length,
      relations: allAtoms.reduce((sum, a) => sum + (a.calls?.length || 0), 0),
      files: new Set(allAtoms.map(a => a.file || a.filePath)).size,
      events: 0, // No tracking en JSON
      sizeBytes: 0 // No facil de calcular
    };
  }

  exists(id) {
    const atom = this.getById(id);
    return !!atom;
  }

  close() {
    this.cache.clear();
    this.initialized = false;
    logger.info('[JsonAdapter] Closed');
  }
}

export default JsonAdapter;