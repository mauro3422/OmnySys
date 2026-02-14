/**
 * @fileoverview Chain Builder
 * 
 * Construye chains de ejecución internas del módulo.
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
  }

  build() {
    const chains = [];
    const visited = new Set();
    const entries = this.findEntries();
    
    for (const entry of entries) {
      const chain = this.traceChain(entry, visited);
      if (chain.length > 1) {
        chains.push({
          id: `module_chain_${chains.length}`,
          entryFunction: entry.name,
          entryFile: path.basename(entry.filePath),
          steps: chain,
          totalSteps: chain.length,
          isAsync: chain.some(s => s.isAsync),
          hasSideEffects: chain.some(s => s.hasSideEffects)
        });
      }
    }
    
    return chains;
  }

  findEntries() {
    const entries = [];
    const functionNames = new Set(this.molecules.flatMap(m => 
      (m.atoms || []).map(a => a.name)
    ));
    
    for (const mol of this.molecules) {
      for (const atom of mol.atoms || []) {
        if (atom.isExported) {
          entries.push({ ...atom, filePath: mol.filePath });
        } else if (!atom.calledBy?.some(caller => 
          functionNames.has(caller.split('::').pop())
        )) {
          entries.push({ ...atom, filePath: mol.filePath });
        }
      }
    }
    
    return entries;
  }

  traceChain(entry, visited) {
    const chain = [{
      function: entry.name,
      file: path.basename(entry.filePath),
      atomId: entry.id,
      isAsync: entry.isAsync,
      hasSideEffects: entry.hasSideEffects
    }];
    
    const outgoing = this.connections.filter(c =>
      c.from.function === entry.name &&
      !visited.has(`${c.from.function}->${c.to.function}`)
    );
    
    for (const conn of outgoing) {
      visited.add(`${conn.from.function}->${conn.to.function}`);
      
      const calleeMol = this.moleculeByFile.get(conn.to.file);
      const calleeAtom = calleeMol?.atoms?.find(a => a.name === conn.to.function);
      
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

export default ChainBuilder;
