/**
 * @deprecated Use ./storage-manager/index.js directly
 *
 * Storage Manager - Backward Compatibility Wrapper
 *
 * This file re-exports all functionality from the modularized storage-manager.
 * Please update your imports to use the new structure:
 *
 *   import { saveMetadata, loadMolecule } from './storage-manager/index.js';
 *
 * Or import from specific modules for tree-shaking:
 *
 *   import { saveMetadata } from './storage-manager/files/index.js';
 *   import { loadMolecule } from './storage-manager/molecules/index.js';
 */

export {
  // Utils
  calculateFileHash,
  // Setup / Directory
  createDataDirectory,
  getDataDirectory,
  hasExistingAnalysis,
  // File Operations
  saveMetadata,
  saveFileAnalysis,
  saveConnections,
  saveRiskAssessment,
  savePartitionedSystemMap,
  // Molecule Operations
  saveMolecule,
  loadMolecule,
  // Atom Operations
  saveAtom,
  loadAtoms
} from './storage-manager/index.js';
