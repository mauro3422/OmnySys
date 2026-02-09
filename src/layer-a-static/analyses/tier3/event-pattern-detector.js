import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:event:pattern:detector');


/**
 * event-pattern-detector.js
 * 
 * ⚠️ DEPRECATED: Este archivo es un re-export para backward compatibility.
 * 
 * El código se ha movido a:
 *   src/layer-a-static/analyses/tier3/event-detector/
 * 
 * Nueva estructura:
 *   - constants.js              - SSOT: patrones, tipos, severidades
 *   - parser.js                 - Configuración Babel parser
 *   - ast-utils.js              - Utilidades AST
 *   - detector.js               - detectEventPatterns
 *   - event-indexer.js          - Indexación de eventos
 *   - bus-owner-detector.js     - Detección de propietarios de bus
 *   - severity-calculator.js    - Cálculo de severidad
 *   - connection-generator.js   - Generación de conexiones
 *   - index.js                  - Facade API pública
 * 
 * @deprecated Use `import { ... } from './event-detector/index.js'` instead
 */

logger.warn('⚠️  DEPRECATED: Importing from event-pattern-detector.js');
logger.warn('   Please update imports to: analyses/tier3/event-detector/index.js');

export * from './event-detector/index.js';
