/**
 * Schema Loader
 * Loads the enhanced system map JSON schema
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, '../../../../schema/enhanced-system-map.schema.json');

export const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
