/**
 * @fileoverview repository-factory.js
 * 
 * Factory para crear instancias de repositorios.
 * Permite cambiar entre SQLite y JSON via feature flag.
 * 
 * @module storage/repository/repository-factory
 */

import { SQLiteAdapter } from './adapters/sqlite-adapter.js';
import { JsonAdapter } from './adapters/json-adapter.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:Storage:RepositoryFactory');

/**
 * Lee la configuracion de storage del environment o config
 * Default: SQLite (compilado y listo)
 */
function getStorageConfig() {
  // Default: SQLite (compilado). Para usar JSON: OMNY_SQLITE=false
  const useSQLite = process.env.OMNY_SQLITE !== 'false';
  
  const dualWrite = process.env.OMNY_DUAL_WRITE === 'true';
  
  return {
    useSQLite,
    dualWrite,
    adapter: useSQLite ? 'sqlite' : 'json'
  };
}

/**
 * Factory para crear repositorios
 */
export class RepositoryFactory {
  static instance = null;
  
  /**
   * Crea o retorna una instancia singleton del repositorio
   * @param {string} projectPath - Ruta del proyecto
   * @returns {AtomRepository} Instancia del repositorio
   */
  static getInstance(projectPath) {
    if (RepositoryFactory.instance) {
      return RepositoryFactory.instance;
    }
    
    const config = getStorageConfig();
    
    logger.info(`[RepositoryFactory] Creating ${config.adapter} repository`);
    
    let adapter;
    
    if (config.useSQLite) {
      adapter = new SQLiteAdapter();
    } else {
      adapter = new JsonAdapter();
    }
    
    adapter.initialize(projectPath);
    
    RepositoryFactory.instance = adapter;
    
    logger.info(`[RepositoryFactory] Repository created: ${config.adapter}`);
    
    return adapter;
  }
  
  /**
   * Fuerza la creacion de un nuevo repositorio (para testing)
   * @param {string} projectPath - Ruta del proyecto  
   * @param {string} type - 'sqlite' o 'json'
   * @returns {AtomRepository}
   */
  static create(projectPath, type = 'auto') {
    // Resetear instancia
    RepositoryFactory.instance = null;
    
    if (type === 'auto') {
      return RepositoryFactory.getInstance(projectPath);
    }
    
    let adapter;
    
    if (type === 'sqlite') {
      adapter = new SQLiteAdapter();
    } else {
      adapter = new JsonAdapter();
    }
    
    adapter.initialize(projectPath);
    RepositoryFactory.instance = adapter;
    
    return adapter;
  }
  
  /**
   * Obtiene la instancia actual sin inicializar
   * @returns {AtomRepository|null}
   */
  static getCurrent() {
    return RepositoryFactory.instance;
  }
  
  /**
   * Resetea la instancia singleton
   */
  static reset() {
    RepositoryFactory.instance = null;
  }
  
  /**
   * Cierra el repositorio actual
   */
  static close() {
    if (RepositoryFactory.instance) {
      RepositoryFactory.instance.close();
      RepositoryFactory.instance = null;
    }
  }
}

/**
 * Funcion helper para obtener el repositorio
 * @param {string} projectPath - Ruta del proyecto
 * @returns {AtomRepository}
 */
export function getRepository(projectPath) {
  return RepositoryFactory.getInstance(projectPath);
}

export default RepositoryFactory;