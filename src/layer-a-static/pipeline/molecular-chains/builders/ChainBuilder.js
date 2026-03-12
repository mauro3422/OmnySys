/**
 * @fileoverview ChainBuilder.js
 * 
 * Builds chains between functions connecting data flow within a file.
 * 
 * @module molecular-chains/builders/ChainBuilder
 */

import { ChainIdGenerator } from './ChainIdGenerator.js';
import { ChainSummaryBuilder } from './ChainSummaryBuilder.js';
import { ChainStepBuilder } from './ChainStepBuilder.js';
import {
  createBaseChain,
  extendChainWithCallee,
  groupChainsByEntry,
  mergeUniqueChainSteps
} from './ChainBuilderHelpers.js';

/**
 * Builds molecular chains between functions
 */
export class ChainBuilder {
  constructor(atoms) {
    this.atoms = atoms;
    this.atomByName = new Map();
    this.atomById = new Map();
    this.chains = [];
    this.idGenerator = new ChainIdGenerator();
    this.stepBuilder = new ChainStepBuilder(atoms, this.atomByName);
    this.summaryBuilder = new ChainSummaryBuilder();
    
    this.indexAtoms();
  }

  /**
   * Index atoms by name and ID
   * @private
   */
  indexAtoms() {
    for (const atom of this.atoms) {
      this.atomByName.set(atom.name, atom);
      this.atomById.set(atom.id, atom);
    }
  }

  /**
   * Build all molecular chains
   * @returns {Object} - Built chains with summary
   */
  build() {
    const entryFunctions = this.findEntryFunctions();
    
    for (const entryAtom of entryFunctions) {
      const chainsFromEntry = this.traceFromEntry(entryAtom);
      this.chains.push(...chainsFromEntry);
    }

    this.mergeRelatedChains();

    return {
      chains: this.chains,
      summary: this.summaryBuilder.build(this.chains)
    };
  }

  /**
   * Find entry functions (entry points)
   * @returns {Array} - Entry function atoms
   */
  findEntryFunctions() {
    return this.atoms.filter(atom => {
      if (atom.isExported) return true;
      
      const hasExternalCallers = atom.calledBy?.some(callerId => {
        const callerName = callerId.split('::').pop();
        return !this.atomByName.has(callerName);
      });
      
      if (hasExternalCallers) return true;
      if (!atom.calledBy || atom.calledBy.length === 0) return true;
      
      return false;
    });
  }

  /**
   * Trace flow from an entry point
   * @param {Object} entryAtom - Entry atom
   * @param {Set} visited - Visited atom IDs
   * @returns {Array} - Chains from entry
   */
  traceFromEntry(entryAtom, visited = new Set()) {
    const chains = [];
    
    if (visited.has(entryAtom.id)) return chains;
    visited.add(entryAtom.id);

    const baseChain = this.buildChainFromAtom(entryAtom, visited);
    if (baseChain.steps.length > 0) {
      chains.push(baseChain);
    }

    for (const call of entryAtom.calls || []) {
      if (call.type === 'internal') {
        const calleeAtom = this.atomByName.get(call.name);
        if (calleeAtom) {
          const subChains = this.traceFromEntry(calleeAtom, new Set(visited));
          chains.push(...subChains);
        }
      }
    }

    return chains;
  }

  /**
   * Build a chain from a specific atom
   * @param {Object} atom - Starting atom
   * @param {Set} visited - Visited atom IDs
   * @returns {Object} - Chain object
   */
  buildChainFromAtom(atom, visited) {
    visited.add(atom.id);
    const chain = createBaseChain(this.idGenerator, atom, this.stepBuilder);

    for (const call of atom.calls || []) {
      if (call.type === 'internal') {
        const calleeAtom = this.atomByName.get(call.name);
        if (calleeAtom && !visited.has(calleeAtom.id)) {
          const calleeChain = this.buildChainFromAtom(calleeAtom, visited);

          extendChainWithCallee(chain, calleeChain);
        }
      }
    }

    return chain;
  }

  /**
   * Merge related chains
   * @private
   */
  mergeRelatedChains() {
    const byEntry = groupChainsByEntry(this.chains);
    const mergedChains = [];
    
    for (const [entryFn, chains] of byEntry) {
      if (chains.length === 1) {
        mergedChains.push(chains[0]);
      } else {
        const merged = this.mergeChainGroup(chains);
        mergedChains.push(merged);
      }
    }
    
    this.chains = mergedChains;
  }

  /**
   * Merge a group of chains
   * @param {Array} chains - Chains to merge
   * @returns {Object} - Merged chain
   */
  mergeChainGroup(chains) {
    const base = chains.reduce((longest, current) => 
      current.steps.length > longest.steps.length ? current : longest
    );

    mergeUniqueChainSteps(base, chains);
    this.summaryBuilder.recalculateMetrics(base);
    return base;
  }
}

export default ChainBuilder;
