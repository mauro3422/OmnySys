/**
 * @fileoverview Path Utilities
 * 
 * SSOT for tunnel vision logger file paths
 * 
 * @module tunnel-vision-logger/utils/paths
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, '../../..');

export const TUNNEL_VISION_LOG = path.join(
  PROJECT_ROOT,
  '.omnysysdata',
  'tunnel-vision-events.jsonl'
);

export const TUNNEL_VISION_STATS = path.join(
  PROJECT_ROOT,
  '.omnysysdata',
  'tunnel-vision-stats.json'
);
