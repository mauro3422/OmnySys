/**
 * @fileoverview paths.js
 * 
 * Storage path definitions
 * 
 * @module core/tunnel-vision-logger/storage/paths
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../../..');

/**
 * Ruta del log de eventos de tunnel vision
 */
export const TUNNEL_VISION_LOG = path.join(
  PROJECT_ROOT,
  '.omnysysdata',
  'tunnel-vision-events.jsonl'
);

/**
 * Ruta del resumen de estadísticas
 */
export const TUNNEL_VISION_STATS = path.join(
  PROJECT_ROOT,
  '.omnysysdata',
  'tunnel-vision-stats.json'
);
