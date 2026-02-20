/**
 * Storage Manager - Gestiona el guardado particionado de datos de análisis
 *
 * Estructura de datos:
 * .omnysysdata/
 *   ├── index.json              (metadata + índice ligero)
 *   ├── files/
 *   │   └── {relative-path}/    (espejo de estructura del proyecto)
 *   │       └── file.json
 *   ├── connections/
 *   │   ├── shared-state.json
 *   │   └── event-listeners.json
 *   ├── risks/
 *   │   └── assessment.json
 *   ├── molecules/              (estructuras moleculares)
 *   ├── atoms/                  (análisis atómico)
 *   └── cache.json              (cache de análisis)
 */

// Utils
export { calculateFileHash } from './utils/index.js';

// Setup / Directory
export {
  createDataDirectory,
  getDataDirectory,
  hasExistingAnalysis
} from './setup/index.js';

// File Operations
export {
  saveMetadata,
  saveFileAnalysis,
  saveConnections,
  saveRiskAssessment,
  savePartitionedSystemMap
} from './files/index.js';

// Molecule Operations
export {
  saveMolecule,
  loadMolecule
} from './molecules/index.js';

// Atom Operations
export {
  saveAtom,
  loadAtoms,
  getAllAtoms
} from './atoms/index.js';
