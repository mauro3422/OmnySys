/**
 * @fileoverview atom-repository.js
 * 
 * Interface base para repositorios de atomos.
 * Define el contrato que deben implementar todos los adaptadores
 * (SQLite, JSON, Hybrid, etc.)
 * 
 * @module storage/repository/atom-repository
 */

/**
 * Interface: AtomRepository
 * 
 * Todos los adaptadores deben implementar estos metodos.
 * Esto permite cambiar entre JSON y SQLite sin cambiar el codigo consumidor.
 */
export class AtomRepository {
  /**
   * Inicializa el repositorio
   * @param {string} projectPath - Ruta del proyecto
   * @returns {Promise<void>}
   */
  async initialize(projectPath) {
    throw new Error('Method initialize() must be implemented');
  }

  /**
   * Obtiene un atomo por su ID
   * @param {string} id - ID del atomo (formato: filePath::name)
   * @returns {Promise<Object|null>} Atomo o null si no existe
   */
  async getById(id) {
    throw new Error('Method getById() must be implemented');
  }

  /**
   * Obtiene un atomo por archivo y nombre
   * @param {string} filePath - Ruta del archivo
   * @param {string} name - Nombre del atomo
   * @returns {Promise<Object|null>} Atomo o null
   */
  async getByFileAndName(filePath, name) {
    throw new Error('Method getByFileAndName() must be implemented');
  }

  /**
   * Obtiene todos los atomos de un archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<Array>} Lista de atomos
   */
  async getByFile(filePath) {
    throw new Error('Method getByFile() must be implemented');
  }

  /**
   * Guarda un atomo (crea o actualiza)
   * @param {Object} atom - Atomo a guardar
   * @returns {Promise<Object>} Atomo guardado
   */
  async save(atom) {
    throw new Error('Method save() must be implemented');
  }

  /**
   * Guarda multiples atomos en batch
   * @param {Array<Object>} atoms - Atomos a guardar
   * @returns {Promise<Array>} Atomos guardados
   */
  async saveMany(atoms) {
    throw new Error('Method saveMany() must be implemented');
  }

  /**
   * Elimina un atomo por ID
   * @param {string} id - ID del atomo
   * @returns {Promise<boolean>} True si se elimino
   */
  async delete(id) {
    throw new Error('Method delete() must be implemented');
  }

  /**
   * Elimina todos los atomos de un archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<number>} Cantidad eliminada
   */
  async deleteByFile(filePath) {
    throw new Error('Method deleteByFile() must be implemented');
  }

  /**
   * Query flexible con filtros
   * @param {Object} filter - Filtros de busqueda
   * @param {Object} options - Opciones (limit, offset, sort)
   * @returns {Promise<Array>} Atomos que coinciden
   */
  async query(filter = {}, options = {}) {
    throw new Error('Method query() must be implemented');
  }

  /**
   * Obtiene todos los atomos
   * @param {Object} options - Opciones de paginacion
   * @returns {Promise<Array>} Todos los atomos
   */
  async getAll(options = {}) {
    throw new Error('Method getAll() must be implemented');
  }

  /**
   * Busca atomos por nombre (partial match)
   * @param {string} name - Nombre a buscar
   * @returns {Promise<Array>} Atomos encontrados
   */
  async findByName(name) {
    throw new Error('Method findByName() must be implemented');
  }

  /**
   * Busca atomos por arquetipo
   * @param {string} archetypeType - Tipo de arquetipo
   * @param {Object} options - Opciones
   * @returns {Promise<Array>} Atomos del arquetipo
   */
  async findByArchetype(archetypeType, options = {}) {
    throw new Error('Method findByArchetype() must be implemented');
  }

  /**
   * Busca atomos por proposito
   * @param {string} purposeType - Tipo de proposito
   * @returns {Promise<Array>} Atomos con ese proposito
   */
  async findByPurpose(purposeType) {
    throw new Error('Method findByPurpose() must be implemented');
  }

  /**
   * Obtiene el call graph de un atomo
   * @param {string} id - ID del atomo
   * @param {Object} options - Opciones (depth, direction)
   * @returns {Promise<Object>} Grafo de llamadas
   */
  async getCallGraph(id, options = {}) {
    throw new Error('Method getCallGraph() must be implemented');
  }

  /**
   * Obtiene los callers de un atomo
   * @param {string} id - ID del atomo
   * @returns {Promise<Array>} Lista de callers
   */
  async getCallers(id) {
    throw new Error('Method getCallers() must be implemented');
  }

  /**
   * Obtiene los callees de un atomo
   * @param {string} id - ID del atomo
   * @returns {Promise<Array>} Lista de callees
   */
  async getCallees(id) {
    throw new Error('Method getCallees() must be implemented');
  }

  /**
   * Guarda una relacion entre atomos
   * @param {string} sourceId - ID del atomo origen
   * @param {string} targetId - ID del atomo destino
   * @param {string} relationType - Tipo de relacion
   * @param {Object} metadata - Metadata adicional
   * @returns {Promise<void>}
   */
  async saveRelation(sourceId, targetId, relationType, metadata = {}) {
    throw new Error('Method saveRelation() must be implemented');
  }

  /**
   * Actualiza los vectores matematicos de un atomo
   * @param {string} id - ID del atomo
   * @param {Object} vectors - Vectores a actualizar
   * @returns {Promise<void>}
   */
  async updateVectors(id, vectors) {
    throw new Error('Method updateVectors() must be implemented');
  }

  /**
   * Busca atomos similares basado en DNA
   * @param {string} id - ID del atomo de referencia
   * @param {Object} options - Opciones (threshold, limit)
   * @returns {Promise<Array>} Atomos similares con score
   */
  async findSimilar(id, options = {}) {
    throw new Error('Method findSimilar() must be implemented');
  }

  /**
   * Obtiene estadisticas de la base de datos
   * @returns {Promise<Object>} Estadisticas
   */
  async getStats() {
    throw new Error('Method getStats() must be implemented');
  }

  /**
   * Verifica si existe un atomo
   * @param {string} id - ID a verificar
   * @returns {Promise<boolean>}
   */
  async exists(id) {
    throw new Error('Method exists() must be implemented');
  }

  /**
   * Cierra el repositorio
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('Method close() must be implemented');
  }
}

export default AtomRepository;