import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:static:extractors');


/**
 * static-extractors.js
 * 
 * ⚠️ DEPRECATED: Este archivo es un re-export para backward compatibility.
 * 
 * El código se ha movido a:
 *   src/layer-a-static/extractors/static/
 * 
 * Nueva estructura:
 *   - constants.js        - SSOT: patrones, tipos
 *   - utils.js            - getLineNumber, isNativeWindowProp
 *   - storage-extractor.js   - localStorage/sessionStorage
 *   - events-extractor.js    - Event listeners/emitters
 *   - globals-extractor.js   - Variables globales
 *   - storage-connections.js - Conexiones por storage
 *   - events-connections.js  - Conexiones por eventos
 *   - globals-connections.js - Conexiones por globales
 *   - index.js            - Facade API pública
 * 
 * @deprecated Use `import { ... } from './static/index.js'` instead
 */

logger.warn('⚠️  DEPRECATED: Importing from static-extractors.js');
logger.warn('   Please update imports to: extractors/static/index.js');

export * from './static/index.js';
