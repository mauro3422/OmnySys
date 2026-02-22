/**
 * @fileoverview Shared State Detector
 * Detecta acceso a estado global (window.*, global.*)
 *
 * Responsabilidad:
 * - Encontrar todas las referencias a window.* y global.*
 * - Clasificar como READ o WRITE
 * - Guardar línea, función y contexto
 * - Retornar conexiones semánticas entre archivos que acceden al mismo estado
 *
 * @module shared-state-detector
 */

import { parseGlobalState } from './parsers/index.js';
import { generateSharedStateConnections } from './generators/index.js';

export { parseGlobalState, generateSharedStateConnections };

export default {
  parseGlobalState,
  generateSharedStateConnections
};