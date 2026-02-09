/**
 * @fileoverview Chain Builder - Construye chains entre funciones
 * 
 * Conecta el flujo de datos entre funciones dentro de un archivo.
 * 
 * @module molecular-chains/chain-builder
 */

export class ChainBuilder {
  constructor(atoms) {
    this.atoms = atoms;
    this.atomByName = new Map();
    this.atomById = new Map();
    this.chains = [];
    
    // Indexar átomos
    this.indexAtoms();
  }

  /**
   * Indexa átomos por nombre e ID
   */
  indexAtoms() {
    for (const atom of this.atoms) {
      this.atomByName.set(atom.name, atom);
      this.atomById.set(atom.id, atom);
    }
  }

  /**
   * Construye todas las chains moleculares
   */
  build() {
    // Encontrar funciones de entrada (exportadas o con callers externos)
    const entryFunctions = this.findEntryFunctions();
    
    for (const entryAtom of entryFunctions) {
      // Trackear flujo desde cada función de entrada
      const chainsFromEntry = this.traceFromEntry(entryAtom);
      this.chains.push(...chainsFromEntry);
    }

    // Eliminar duplicados y mergear chains relacionadas
    this.mergeRelatedChains();

    return {
      chains: this.chains,
      summary: this.generateSummary()
    };
  }

  /**
   * Encuentra funciones de entrada (entry points)
   */
  findEntryFunctions() {
    return this.atoms.filter(atom => {
      // Es entry si:
      // 1. Está exportada
      if (atom.isExported) return true;
      
      // 2. Tiene callers externos al archivo (no en this.atoms)
      const hasExternalCallers = atom.calledBy?.some(callerId => {
        const callerName = callerId.split('::').pop();
        return !this.atomByName.has(callerName);
      });
      
      if (hasExternalCallers) return true;
      
      // 3. No tiene callers (función huérfana, pero es entry de algo)
      if (!atom.calledBy || atom.calledBy.length === 0) return true;
      
      return false;
    });
  }

  /**
   * Trackea el flujo desde una función de entrada
   */
  traceFromEntry(entryAtom, visited = new Set()) {
    const chains = [];
    
    if (visited.has(entryAtom.id)) return chains; // Evitar ciclos
    visited.add(entryAtom.id);

    // Construir chain base desde entry
    const baseChain = this.buildChainFromAtom(entryAtom, visited);
    if (baseChain.steps.length > 0) {
      chains.push(baseChain);
    }

    // Para cada llamada interna, trackear recursivamente
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
   * Construye una chain desde un átomo específico
   */
  buildChainFromAtom(atom, visited) {
    const chain = {
      id: this.generateChainId(),
      entryFunction: atom.name,
      exitFunction: atom.name,
      steps: [],
      totalFunctions: 0,
      totalTransforms: 0,
      hasSideEffects: false,
      complexity: 0
    };

    // Agregar paso para este átomo
    const step = this.createChainStep(atom);
    chain.steps.push(step);
    chain.totalFunctions = 1;
    chain.totalTransforms = atom.dataFlow?.transformations?.length || 0;
    chain.hasSideEffects = atom.hasSideEffects || false;
    chain.complexity = atom.complexity || 0;

    // Si tiene calls internos, expandir
    for (const call of atom.calls || []) {
      if (call.type === 'internal') {
        const calleeAtom = this.atomByName.get(call.name);
        if (calleeAtom && !visited.has(calleeAtom.id)) {
          const calleeChain = this.buildChainFromAtom(calleeAtom, visited);
          
          // Mergear chain del callee
          chain.steps.push(...calleeChain.steps.slice(1)); // Evitar duplicar
          chain.exitFunction = calleeChain.exitFunction;
          chain.totalFunctions += calleeChain.totalFunctions;
          chain.totalTransforms += calleeChain.totalTransforms;
          chain.hasSideEffects = chain.hasSideEffects || calleeChain.hasSideEffects;
          chain.complexity += calleeChain.complexity;
        }
      }
    }

    return chain;
  }

  /**
   * Crea un paso de chain para un átomo
   */
  createChainStep(atom) {
    const dataFlow = atom.dataFlow || {};
    
    return {
      function: atom.name,
      atomId: atom.id,
      
      // Input
      input: {
        variables: (dataFlow.inputs || []).map(i => i.name),
        source: this.determineInputSource(atom),
        externalDependencies: this.findExternalInputs(atom)
      },
      
      // Output
      output: {
        variables: (dataFlow.outputs || []).map(o => 
          o.type === 'return' ? 'return' : o.target
        ),
        type: atom.hasSideEffects ? 'mixed' : 'pure',
        usedBy: atom.calledBy || []
      },
      
      // Transforms internas
      internalTransforms: (dataFlow.transformations || []).map(t => ({
        type: t.type || t.operation,
        from: t.from,
        to: t.to,
        line: t.line
      })),
      
      // Calls a otras funciones
      calls: (atom.calls || []).map(c => ({
        function: c.name,
        type: c.type,
        args: c.args || []
      }))
    };
  }

  /**
   * Determina la fuente de los inputs
   */
  determineInputSource(atom) {
    // Si es exportada, input viene de externo
    if (atom.isExported) return 'external';
    
    // Si tiene callers, input viene de argumentos de esos callers
    if (atom.calledBy?.length > 0) {
      return 'caller_arguments';
    }
    
    return 'unknown';
  }

  /**
   * Encuentra inputs que vienen de fuera del archivo
   */
  findExternalInputs(atom) {
    const externalInputs = [];
    const inputs = atom.dataFlow?.inputs || [];
    
    for (const input of inputs) {
      // Si es parámetro y no viene de ninguna función interna, es externo
      const isExternal = !atom.calledBy?.some(callerId => {
        const callerName = callerId.split('::').pop();
        const caller = this.atomByName.get(callerName);
        if (!caller) return false;
        
        // Verificar si caller pasa este input
        return caller.calls?.some(c => 
          c.name === atom.name && 
          (c.args || []).some(arg => 
            arg.name === input.name || arg.includes(input.name)
          )
        );
      });
      
      if (isExternal) {
        externalInputs.push(input.name);
      }
    }
    
    return externalInputs;
  }

  /**
   * Mergea chains relacionadas
   */
  mergeRelatedChains() {
    // Agrupar chains que comparten el mismo entry function
    const byEntry = new Map();
    
    for (const chain of this.chains) {
      if (!byEntry.has(chain.entryFunction)) {
        byEntry.set(chain.entryFunction, []);
      }
      byEntry.get(chain.entryFunction).push(chain);
    }
    
    // Para cada grupo, mergear si tienen overlap
    const mergedChains = [];
    
    for (const [entryFn, chains] of byEntry) {
      if (chains.length === 1) {
        mergedChains.push(chains[0]);
      } else {
        // Mergear chains
        const merged = this.mergeChainGroup(chains);
        mergedChains.push(merged);
      }
    }
    
    this.chains = mergedChains;
  }

  /**
   * Mergea un grupo de chains
   */
  mergeChainGroup(chains) {
    // Tomar la chain más larga como base
    const base = chains.reduce((longest, current) => 
      current.steps.length > longest.steps.length ? current : longest
    );
    
    // Mergear steps de otras chains
    for (const chain of chains) {
      if (chain === base) continue;
      
      for (const step of chain.steps) {
        if (!base.steps.find(s => s.atomId === step.atomId)) {
          base.steps.push(step);
        }
      }
    }
    
    // Recalcular métricas
    base.totalFunctions = new Set(base.steps.map(s => s.function)).size;
    base.totalTransforms = base.steps.reduce((sum, s) => 
      sum + s.internalTransforms.length, 0
    );
    base.hasSideEffects = base.steps.some(s => 
      s.output.type === 'mixed' || s.output.type === 'side_effect'
    );
    base.complexity = base.steps.reduce((sum, s) => 
      sum + (s.internalTransforms.length * 2), 0
    );
    
    return base;
  }

  /**
   * Genera ID único para chain
   */
  generateChainId() {
    return `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Genera resumen de chains
   */
  generateSummary() {
    return {
      totalChains: this.chains.length,
      totalFunctions: new Set(this.chains.flatMap(c => 
        c.steps.map(s => s.function)
      )).size,
      avgChainLength: this.chains.reduce((sum, c) => sum + c.steps.length, 0) / this.chains.length,
      maxComplexity: Math.max(...this.chains.map(c => c.complexity), 0),
      chainsWithSideEffects: this.chains.filter(c => c.hasSideEffects).length
    };
  }
}

export default ChainBuilder;
