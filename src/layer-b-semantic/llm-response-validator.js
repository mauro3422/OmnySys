import { createLogger } from '../utils/logger.js';

const logger = createLogger('OmnySys:llm:response:validator');


/**
 * llm-response-validator.js
 * 
 * ⚠️ DEPRECATED: Este archivo es un re-export para backward compatibility.
 * 
 * El código se ha movido a:
 *   src/layer-b-semantic/validators/
 * 
 * Nueva estructura:
 *   - constants.js                - SSOT: patrones, métodos, thresholds
 *   - extractors/                 - Extracción de datos reales
 *     - storage-extractor.js      - localStorage keys
 *     - event-extractor.js        - Event names
 *     - global-extractor.js       - Variables globales
 *   - validators/                 - Validación de respuestas LLM
 *     - storage-validator.js      - Validación de storage keys
 *     - event-validator.js        - Validación de event names
 *     - file-validator.js         - Validación de paths
 *     - global-validator.js       - Validación de globals
 *   - sanitizers/                 - Sanitización de respuestas
 *     - response-sanitizer.js     - Limpieza general
 *     - false-positive-filter.js  - Filtrado de falsos positivos
 *   - utils/                      - Utilidades
 *     - pattern-checkers.js       - Verificadores de patrones
 *     - timeout-calculator.js     - Cálculo de timeouts
 *   - index.js                    - Facade API pública
 * 
 * @deprecated Use `import { ... } from './validators/index.js'` instead
 */

logger.warn('⚠️  DEPRECATED: Importing from llm-response-validator.js');
logger.warn('   Please update imports to: validators/index.js');

export * from './validators/index.js';
