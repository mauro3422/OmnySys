import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:ast:analyzer');


/**
 * @fileoverview ast-analyzer.js
 * 
 * ⚠️ DEPRECATED: This file is now a re-export for backward compatibility.
 * 
 * The code has been split into:
 *   - analysis/call-graph-analyzer.js     - findCallSites
 *   - analysis/signature-analyzer.js      - analyzeFunctionSignature  
 *   - analysis/value-flow-analyzer.js     - analyzeValueFlow
 *   - analysis/index.js                   - All exports
 * 
 * @deprecated Use `import { ... } from './analysis/index.js'` instead
 */

logger.warn('⚠️  DEPRECATED: Importing from ast-analyzer.js');
logger.warn('   Please update imports to: ./analysis/index.js');

export {
  findCallSites,
  analyzeFunctionSignature,
  analyzeValueFlow
} from './analysis/index.js';
