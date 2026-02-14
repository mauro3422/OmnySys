/**
 * connections/index.js
 * TypeScript connection detectors - find relationships between types
 */

export { detectInterfaceImplementations } from './implementations.js';
export { detectInterfaceExtensions } from './extensions.js';
export { detectTypeUsages } from './type-usages.js';
export { detectPotentialBreakingChanges } from './breaking-changes.js';
