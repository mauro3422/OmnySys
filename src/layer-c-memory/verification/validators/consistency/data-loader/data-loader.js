/**
 * @fileoverview Data Loader
 * 
 * Carga datos desde el filesystem (.omnysysdata/).
 * Maneja atoms, files y connections.
 * 
 * @module consistency/data-loader/data-loader
 * @version 1.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:consistency:data-loader');

/**
 * Data Loader - Carga datos de verificación
 */
export class DataLoader {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.cache = {
      atoms: new Map(),
      files: new Map(),
      connections: []
    };
  }
  
  /**
   * Carga todos los datos
   * @returns {Object} - Cache con datos cargados
   */
  async loadAll() {
    logger.debug('Loading all data for comparison...');
    
    await Promise.all([
      this.loadAtoms(),
      this.loadFiles(),
      this.loadConnections()
    ]);
    
    logger.debug(`Loaded: ${this.cache.atoms.size} atoms, ${this.cache.files.size} files, ${this.cache.connections.length} connections`);
    
    return this.cache;
  }
  
  /**
   * Carga átomos
   */
  async loadAtoms() {
    const atomsDir = path.join(this.dataDir, 'atoms');
    
    try {
      const atomFiles = await this.getJsonFiles(atomsDir);
      
      for (const atomFile of atomFiles) {
        const fullPath = path.join(atomsDir, atomFile);
        const content = await fs.readFile(fullPath, 'utf-8');
        const atom = JSON.parse(content);
        this.cache.atoms.set(atom.id, atom);
      }
      
      logger.debug(`Loaded ${this.cache.atoms.size} atoms`);
    } catch (error) {
      logger.warn('Could not load atoms:', error.message);
    }
  }
  
  /**
   * Carga archivos
   */
  async loadFiles() {
    const filesDir = path.join(this.dataDir, 'files');
    
    try {
      const fileJsons = await this.getJsonFiles(filesDir);
      
      for (const fileJson of fileJsons) {
        const fullPath = path.join(filesDir, fileJson);
        const content = await fs.readFile(fullPath, 'utf-8');
        const fileData = JSON.parse(content);
        const key = fileData.path || fileJson.replace('.json', '');
        this.cache.files.set(key, fileData);
      }
      
      logger.debug(`Loaded ${this.cache.files.size} files`);
    } catch (error) {
      logger.warn('Could not load files:', error.message);
    }
  }
  
  /**
   * Carga conexiones
   */
  async loadConnections() {
    const connectionsDir = path.join(this.dataDir, 'connections');
    
    try {
      const connFiles = await fs.readdir(connectionsDir);
      
      for (const connFile of connFiles) {
        if (connFile.endsWith('.json')) {
          const fullPath = path.join(connectionsDir, connFile);
          const content = await fs.readFile(fullPath, 'utf-8');
          const connData = JSON.parse(content);
          
          if (connData.connections) {
            this.cache.connections.push(...connData.connections);
          }
        }
      }
      
      logger.debug(`Loaded ${this.cache.connections.length} connections`);
    } catch (error) {
      logger.debug('No connections loaded');
    }
  }
  
  /**
   * Obtiene todos los archivos JSON recursivamente
   * @param {string} dir - Directorio a escanear
   * @param {string} baseDir - Directorio base para paths relativos
   * @returns {Array<string>} - Lista de paths relativos
   */
  async getJsonFiles(dir, baseDir = dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getJsonFiles(fullPath, baseDir);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          files.push(path.relative(baseDir, fullPath));
        }
      }
    } catch (error) {
      // Directorio no existe o vacío
    }
    
    return files;
  }
  
  /**
   * Obtiene cache de átomos
   * @returns {Map} - Cache de átomos
   */
  getAtoms() {
    return this.cache.atoms;
  }
  
  /**
   * Obtiene cache de archivos
   * @returns {Map} - Cache de archivos
   */
  getFiles() {
    return this.cache.files;
  }
  
  /**
   * Obtiene cache de conexiones
   * @returns {Array} - Cache de conexiones
   */
  getConnections() {
    return this.cache.connections;
  }
  
  /**
   * Obtiene átomo por ID
   * @param {string} id - ID del átomo
   * @returns {Object|undefined} - Átomo o undefined
   */
  getAtom(id) {
    return this.cache.atoms.get(id);
  }
  
  /**
   * Obtiene archivo por path
   * @param {string} filePath - Path del archivo
   * @returns {Object|undefined} - Archivo o undefined
   */
  getFile(filePath) {
    return this.cache.files.get(filePath);
  }
  
  /**
   * Limpia el cache
   */
  clear() {
    this.cache.atoms.clear();
    this.cache.files.clear();
    this.cache.connections = [];
  }
  
  /**
   * Obtiene estadísticas de datos cargados
   * @returns {Object} - Estadísticas
   */
  getStats() {
    return {
      atoms: this.cache.atoms.size,
      files: this.cache.files.size,
      connections: this.cache.connections.length
    };
  }
}

export default DataLoader;
