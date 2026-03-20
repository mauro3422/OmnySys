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
    this.molecules = molecules;
    this.connections = connections;
    this.moleculeByFile = new Map(molecules.map(m => [path.basename(m.filePath), m]));
    this.functionNames = buildFunctionNameIndex(molecules);
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
    return (this.molecules || []).flatMap(molecule =>
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

    const outgoing = this.connections.filter(connection =>
      connection.from.function === entry.name &&
      !visited.has(`${connection.from.function}->${connection.to.function}`)
    );

    for (const conn of outgoing) {
      visited.add(`${conn.from.function}->${conn.to.function}`);

      const calleeMol = this.moleculeByFile.get(conn.to.file);
      const calleeAtom = calleeMol?.atoms?.find(atom => atom.name === conn.to.function);

      if (calleeAtom) {
        const subChain = this.traceChain(
          { ...calleeAtom, filePath: calleeMol.filePath },
          visited
        );
        chain.push(...subChain.slice(1));
      }
    }

    return chain;
  }
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
