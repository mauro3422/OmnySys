export { 
  saveAtom, 
  loadAtoms, 
  getAllAtoms,
  queryAtoms,
  getAsyncAtoms,
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

export {
  getAtomHistoryArchiveDb,
  closeAtomHistoryArchiveDb,
  shutdownAtomHistoryArchiveStorage,
  persistAtomVersionArchiveSnapshot,
  persistAtomVersionArchiveBatch,
  loadAtomVersionArchiveHistory
} from '../../../shared/compiler/atom-history-archive.js';
