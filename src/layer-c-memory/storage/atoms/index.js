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
} from './atom.js';

// 🆕 Sistema de guardado incremental
export { 
  saveAtomIncremental, 
  saveAtomsIncremental 
} from './incremental-atom-saver.js';

export { 
  AtomVersionManager, 
  createVersionManager,
  calculateFieldHashes 
} from './atom-version-manager.js';
