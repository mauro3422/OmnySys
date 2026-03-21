import path from 'path';
import { getAllAtoms } from '../utils.js';

export function scanModuleAtoms(modules, predicate, mapper) {
  return (modules || []).flatMap(module =>
    (getAllAtoms(module) || [])
      .filter(atom => predicate(atom))
      .map(atom => mapper(module, atom))
  );
}

export function buildHandlerContext(module, atom, functionName = atom?.name) {
  return {
    module: module.moduleName,
    file: atom?.filePath ? path.basename(atom.filePath) : 'unknown',
    function: functionName || 'unknown'
  };
}
