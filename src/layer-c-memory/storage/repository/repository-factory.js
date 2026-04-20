/**
 * @fileoverview repository-factory.js
 * 
 * Factory para crear instancias de repositorios.
 * 
 * @module storage/repository/repository-factory
 */

import { SQLiteAdapter } from './adapters/adapter.js';
import { createLogger } from '#utils/logger.js';
import { normalizeProjectPath } from './repository-path-utils.js';

const logger = createLogger('OmnySys:Storage:RepositoryFactory');
const REPOSITORY_FACTORY_INSTANCE_KEY = Symbol.for('omnysys.repository.factory.instance');

function getSharedInstance() {
  return globalThis[REPOSITORY_FACTORY_INSTANCE_KEY] || null;
}

function setSharedInstance(instance) {
  globalThis[REPOSITORY_FACTORY_INSTANCE_KEY] = instance || null;
}

/**
 * Factory para crear instancias de repositorios
 * 
 * Diseñado para desacoplar el uso del repositorio de su implementación concreta.
 * CENTRALIZACIÓN: Fuerza el uso de SQLite para estandarización.
 */
export class RepositoryFactory {
  /**
   * Obtiene la instancia singleton del repositorio
   * @param {string} projectPath - Ruta del proyecto para inicializar el DB
   * @returns {AtomRepository}
   */
  static getInstance(projectPath = process.cwd()) {
    const normalizedProjectPath = normalizeProjectPath(projectPath);
    let instance = getSharedInstance();

    if (!instance) {
      instance = this.create('sqlite', normalizedProjectPath);
      setSharedInstance(instance);
      return instance;
    }

    if (instance.projectPath && normalizeProjectPath(instance.projectPath) !== normalizedProjectPath) {
      try {
        instance.close();
      } catch {
        // Best effort: replace stale singleton with a fresh repository.
      }
      instance = this.create('sqlite', normalizedProjectPath);
      setSharedInstance(instance);
      return instance;
    }

    if (!instance.initialized || !instance.db || instance.db.open === false) {
      instance.initialize(normalizedProjectPath);
    }

    return instance;
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
    adapter.initialize(normalizeProjectPath(projectPath));

    logger.debug(`[RepositoryFactory] Created SQLite repository at: ${projectPath}`);
    return adapter;
  }

  /**
   * Obtiene la instancia actual sin inicializar
   * @returns {AtomRepository|null}
   */
  static getCurrent() {
    return getSharedInstance();
  }

  /**
   * Resetea la instancia singleton
   */
  static reset() {
    setSharedInstance(null);
  }

  /**
   * Cierra el repositorio actual
   */
  static close() {
    const instance = getSharedInstance();
    if (instance) {
      instance.close();
      setSharedInstance(null);
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
