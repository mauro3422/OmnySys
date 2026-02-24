/**
 * @fileoverview ChainStepBuilder.js
 * 
 * Builds individual chain steps.
 * 
 * @module molecular-chains/builders/ChainStepBuilder
 */

/**
 * Builds chain steps for atoms
 */
export class ChainStepBuilder {
  constructor(atoms, atomByName) {
    this.atoms = atoms;
    this.atomByName = atomByName;
  }

  /**
   * Create a chain step for an atom
   * @param {Object} atom - Atom data
   * @returns {Object} - Chain step
   */
  create(atom) {
    const dataFlow = atom.dataFlow || {};
    
    return {
      function: atom.name,
      atomId: atom.id,
      
      input: {
        variables: (dataFlow.inputs || []).map(i => i.name),
        source: this.determineInputSource(atom),
        externalDependencies: this.findExternalInputs(atom)
      },
      
      output: {
        variables: (dataFlow.outputs || []).map(o => 
          o.type === 'return' ? 'return' : o.target
        ),
        type: atom.hasSideEffects ? 'mixed' : 'pure',
        usedBy: atom.calledBy || []
      },
      
      internalTransforms: (dataFlow.transformations || []).map(t => ({
        type: t.type || t.operation,
        from: t.from,
        to: t.to,
        line: t.line
      })),
      
      calls: (atom.calls || []).map(c => ({
        function: c.name,
        type: c.type,
        args: c.args || []
      }))
    };
  }

  /**
   * Determine input source
   * @private
   */
  determineInputSource(atom) {
    if (atom.isExported) return 'external';
    if (atom.calledBy?.length > 0) return 'caller_arguments';
    return 'unknown';
  }

  /**
   * Find external inputs
   * @private
   */
  findExternalInputs(atom) {
    const externalInputs = [];
    const inputs = atom.dataFlow?.inputs || [];
    
    for (const input of inputs) {
      const isExternal = !atom.calledBy?.some(callerId => {
        const callerName = callerId.split('::').pop();
        const caller = this.atomByName.get(callerName);
        if (!caller) return false;
        
        return caller.calls?.some(c => 
          c.name === atom.name && 
          (c.args || []).some(arg => {
            const argStr = typeof arg === 'string' ? arg : arg?.name || '';
            return argStr === input.name || argStr.includes(input.name);
          })
        );
      });
      
      if (isExternal) {
        externalInputs.push(input.name);
      }
    }
    
    return externalInputs;
  }
}

export default ChainStepBuilder;
