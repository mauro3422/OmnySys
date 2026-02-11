/**
 * @fileoverview Project API
 *
 * API especializada para consultas de proyecto
 * Metadata, estadísticas y búsqueda de archivos
 *
 * @module query/apis/project-api
 * @version 1.0.0
 * @since 2026-02-11
 */

export {
  getProjectMetadata,
  getAnalyzedFiles,
  getProjectStats,
  findFiles
} from '../queries/project-query.js';
