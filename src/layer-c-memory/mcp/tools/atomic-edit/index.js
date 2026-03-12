/**
 * @fileoverview atomic-edit - Entry Point
 *
 * MCP Tool: atomic_edit + atomic_write
 * Edita y crea archivos con validacion atomica completa usando el grafo
 *
 * Modularizado desde atomic-edit.js (1616 lineas -> 7 archivos)
 */

import { atomic_write } from './atomic-writer-tool.js';
import { atomic_edit } from './atomic-editor-tool.js';

export { atomic_edit, atomic_write };
export default { atomic_edit, atomic_write };
