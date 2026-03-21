/**
 * @fileoverview Chain Builder
 *
 * Builds internal execution chains for modules.
 *
 * @module module-analyzer/chains/chain-builder
 * @version 1.0.0
 */

import path from 'path';

export class ChainBuilder {
  constructor(molecules, connections) {
    this.molecules = molecules || [];
    this.connections = connections || [];
    this.moleculeByFile = buildMoleculeIndex(this.molecules);
    this.atomsByFile = buildAtomIndex(this.molecules);
    this.connectionsByFunction = buildConnectionIndex(this.connections);
    this.functionNames = buildFunctionNameIndex(this.molecules);
  }

  build() {
    const visited = new Set();

    return this.findEntries().flatMap(entry => {
      const chain = this.traceChain(entry, visited);
      if (chain.length <= 1) {
        return [];
      }

      return [{
        id: `module_chain_${visited.size}`,
        entryFunction: entry.name,
        entryFile: path.basename(entry.filePath),
        steps: chain,
        totalSteps: chain.length,
        isAsync: chain.some(step => step.isAsync),
        hasSideEffects: chain.some(step => step.hasSideEffects)
      }];
    });
  }

  findEntries() {
    return this.molecules.flatMap(molecule =>
      collectEntriesForMolecule(molecule, this.functionNames)
    );
  }

  traceChain(entry, visited) {
    const chain = [{
      function: entry.name,
      file: path.basename(entry.filePath),
      atomId: entry.id,
      isAsync: entry.isAsync,
      hasSideEffects: entry.hasSideEffects
    }];

    for (const conn of this.getOutgoingConnections(entry.name, visited)) {
      visited.add(`${conn.from.function}->${conn.to.function}`);

      const calleeMol = this.moleculeByFile.get(conn.to.file);
      const calleeAtom = this.atomsByFile.get(conn.to.file)?.get(conn.to.function);

      if (calleeMol && calleeAtom) {
        const subChain = this.traceChain(
          { ...calleeAtom, filePath: calleeMol.filePath },
          visited
        );
        chain.push(...subChain.slice(1));
      }
    }

    return chain;
  }

  getOutgoingConnections(functionName, visited) {
    return (this.connectionsByFunction.get(functionName) || []).filter(connection =>
      !visited.has(`${connection.from.function}->${connection.to.function}`)
    );
  }
}

function buildMoleculeIndex(molecules) {
  return new Map((molecules || []).map(molecule => [path.basename(molecule.filePath), molecule]));
}

function buildAtomIndex(molecules) {
  const index = new Map();

  for (const molecule of molecules || []) {
    const atoms = new Map();
    for (const atom of molecule.atoms || []) {
      atoms.set(atom.name, atom);
    }
    index.set(path.basename(molecule.filePath), atoms);
  }

  return index;
}

function buildConnectionIndex(connections) {
  const index = new Map();

  for (const connection of connections || []) {
    const functionName = connection.from?.function;
    if (!functionName) continue;

    const bucket = index.get(functionName) || [];
    bucket.push(connection);
    index.set(functionName, bucket);
  }

  return index;
}

function buildFunctionNameIndex(molecules) {
  return new Set((molecules || []).flatMap(molecule =>
    (molecule.atoms || []).map(atom => atom.name)
  ));
}

function collectEntriesForMolecule(molecule, functionNames) {
  return (molecule.atoms || [])
    .filter(atom => atom.isExported || !isCalledByKnownFunction(atom, functionNames))
    .map(atom => ({ ...atom, filePath: molecule.filePath }));
}

function isCalledByKnownFunction(atom, functionNames) {
  return (atom.calledBy || []).some(caller =>
    functionNames.has(caller.split('::').pop())
  );
}

export default ChainBuilder;
