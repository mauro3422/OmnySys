import { createLogger } from '../utils/logger.js';

const logger = createLogger('OmnySys:advanced:extractors');


/**
 * @deprecated Este archivo es un wrapper de compatibilidad.
 * Por favor usa: import { detectAllAdvancedConnections } from '../layer-a-static/extractors/communication/index.js';
 */

logger.warn('⚠️  DEPRECATED: Importing from layer-b-semantic/advanced-extractors.js');
logger.warn('   Please update imports to: layer-a-static/extractors/communication/index.js');

export * from '../layer-a-static/extractors/communication/index.js';
