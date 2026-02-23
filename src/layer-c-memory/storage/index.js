/**
 * Storage Manager - All data stored in SQLite
 *
 * Estructura de datos:
 * .omnysysdata/
 *   ├── omnysys.db              (SQLite database with all data)
 *   ├── omnysys.db-wal          (Write-ahead log)
 *   └── omnysys.db-shm          (Shared memory)
 *
 * All operations go through the SQLite repository pattern.
 * JSON file generation has been removed.
 */

// Utils
export { calculateFileHash } from './utils/index.js';

// Setup / Directory
export {
  createDataDirectory,
  getDataDirectory,
  hasExistingAnalysis
} from './setup/index.js';

// File Operations (kept for backwards compatibility)
export { savePartitionedSystemMap } from './files/index.js';

// Molecule Operations
export {
  saveMolecule,
  loadMolecule
} from './molecules/index.js';

// Atom Operations (all SQLite-based)
export {
  saveAtom,
  loadAtoms,
  getAllAtoms,
  queryAtoms,
  getAsyncAtoms,
  getExportedAtoms,
  getAtomsByArchetype,
  getAtomsByPurpose,
  getComplexAtoms,
  getAtomsInFile,
  getAtomsByName
} from './atoms/index.js';
