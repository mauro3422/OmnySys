import { createLogger } from '../utils/logger.js';

const logger = createLogger('OmnySys:metadata:extractors');


/**
 * @deprecated Este archivo es un wrapper de compatibilidad.
 * Por favor usa: import { extractAllMetadata } from '../layer-a-static/extractors/metadata/index.js';
 */

logger.warn('⚠️  DEPRECATED: Importing from layer-b-semantic/metadata-extractors.js');
logger.warn('   Please update imports to: layer-a-static/extractors/metadata/index.js');

export * from '../layer-a-static/extractors/metadata/index.js';
