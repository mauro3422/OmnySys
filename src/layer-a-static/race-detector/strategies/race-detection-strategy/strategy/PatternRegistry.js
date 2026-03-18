/**
 * @fileoverview PatternRegistry.js
 * 
 * Re-export of the unified PatternRegistry
 * 
 * @module race-detector/strategies/race-detection-strategy/strategy/PatternRegistry
 */

import { PatternRegistry } from '../patterns/PatternRegistry.js';

/** Default registry instance */
export const defaultRegistry = new PatternRegistry();

// Initialize legacy defaults
defaultRegistry.setSeverity('WW', 'high');
defaultRegistry.setSeverity('RW', 'high');
defaultRegistry.setSeverity('IE', 'critical');
defaultRegistry.setSeverity('EH', 'medium');

defaultRegistry.registerMitigations('WW', ['locking', 'atomic-operations', 'immutable-state']);
defaultRegistry.registerMitigations('RW', ['locking', 'read-copy-update', 'version-control']);
defaultRegistry.registerMitigations('IE', ['double-checked-locking', 'initialization-queue', 'eager-init']);
defaultRegistry.registerMitigations('EH', ['event-serialization', 'event-queue', 'state-snapshot']);

export { PatternRegistry };
export default PatternRegistry;
