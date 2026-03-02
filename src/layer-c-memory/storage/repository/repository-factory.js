/**
 * @fileoverview repository-factory.js
 * 
 * Factory para crear instancias de repositorios.
 * 
 * @module storage/repository/repository-factory
 */

import { SQLiteAdapter } from './adapters/sqlite-adapter.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:Storage:RepositoryFactory');

/**
 * Factory para crear instancias de repositorios
 * 
 * Diseñado para desacoplar el uso del repositorio de su implementación concreta.
 * CENTRALIZACIÓN: Fuerza el uso de SQLite para estandarización.
 */
export class RepositoryFactory {
  static instance = null;

  /**
   * Obtiene la instancia singleton del repositorio
   * @param {string} projectPath - Ruta del proyecto para inicializar el DB
   * @returns {AtomRepository}
   */
  static getInstance(projectPath = process.cwd()) {
    if (!this.instance) {
      this.instance = this.create('sqlite', projectPath);
    }
    return this.instance;
  }

  /**
   * Crea una instancia de repositorio segun el tipo
   * @param {string} type - 'sqlite' (único soportado)
   * @param {string} projectPath - Ruta del base
   * @returns {AtomRepository}
   */
  static create(type = 'sqlite', projectPath = process.cwd()) {
    // Solo soportamos SQLite
    if (type !== 'sqlite') {
      logger.warn(`[RepositoryFactory] Type '${type}' is no longer supported. Forcing 'sqlite'.`);
    }

    const adapter = new SQLiteAdapter();
    adapter.initialize(projectPath);

    logger.debug(`[RepositoryFactory] Created SQLite repository at: ${projectPath}`);
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