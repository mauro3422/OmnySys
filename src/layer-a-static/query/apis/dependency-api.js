/**
 * @fileoverview Dependency API
 *
 * API especializada para grafos de dependencias
 * Análisis transitivo y grafos de importación
 *
 * @module query/apis/dependency-api
 * @version 1.0.0
 * @since 2026-02-11
 */

export {
  getDependencyGraph,
  getTransitiveDependents
} from '../queries/dependency-query.js';
