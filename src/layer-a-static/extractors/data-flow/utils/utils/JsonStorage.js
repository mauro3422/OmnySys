/**
 * @fileoverview JsonStorage.js
 * 
 * JSON file storage utilities.
 * 
 * @module data-flow/utils/utils/JsonStorage
 */

import fs from 'fs';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:json:storage');

/**
 * JSON file storage utilities
 */
export class JsonStorage {
  async load(filePath, defaultValue = {}) {
    try {
      if (fs.existsSync(filePath)) {
        const content = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      logger.warn(`Error loading ${filePath}:`, error.message);
    }
    return defaultValue;
  }

  async save(filePath, data) {
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
  }
}

export default JsonStorage;
