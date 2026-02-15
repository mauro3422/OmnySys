/**
 * @fileoverview molecular-chains-test.factory.js
 * 
 * Test Factory for Pipeline Molecular Chains
 * Provides builders for creating test data for chain building, argument mapping,
 * and graph construction scenarios.
 * 
 * @module tests/factories/molecular-chains
 */

// ============================================================================
// ChainBuilder - Factory for molecular chains
// ============================================================================

export class ChainBuilderFactory {
  constructor() {
    this.atoms = [];
    this.chainId = 0;
  }

  /**
   * Create a simple atom
   */
  createAtom(overrides = {}) {
    const id = overrides.id || `atom_${Date.now()}_${this.atoms.length}`;
    const atom = {
      id,
      name: overrides.name || `function_${this.atoms.length}`,
      type: overrides.type || 'function',
      isExported: overrides.isExported ?? false,
      line: overrides.line || 1,
      column: overrides.column || 0,
      complexity: overrides.complexity || 1,
      hasSideEffects: overrides.hasSideEffects ?? false,
      calledBy: overrides.calledBy || [],
      calls: overrides.calls || [],
      dataFlow: {
        inputs: overrides.inputs || [],
        outputs: overrides.outputs || [],
        transformations: overrides.transformations || []
      },
      ...overrides
    };
    this.atoms.push(atom);
    return atom;
  }

  /**
   * Create an entry point atom (exported function)
   */
  createEntryPoint(name, overrides = {}) {
    return this.createAtom({
      name,
      isExported: true,
      calledBy: [],
      ...overrides
    });
  }

  /**
   * Create an intermediate function (called by others, calls others)
   */
  createIntermediate(name, calledBy, calls, overrides = {}) {
    return this.createAtom({
      name,
      calledBy: calledBy.map(c => typeof c === 'string' ? `file::${c}` : c),
      calls: calls.map(c => ({
        name: typeof c === 'string' ? c : c.name,
        type: 'internal',
        line: 1,
        ...(typeof c === 'object' ? c : {})
      })),
      ...overrides
    });
  }

  /**
   * Create an exit function (leaf node, doesn't call internal functions)
   */
  createExit(name, calledBy, overrides = {}) {
    return this.createAtom({
      name,
      calledBy: calledBy.map(c => typeof c === 'string' ? `file::${c}` : c),
      calls: [],
      ...overrides
    });
  }

  /**
   * Create a complex multi-step chain scenario
   */
  createMultiStepChain(steps, options = {}) {
    const atoms = [];
    const entryName = steps[0];
    
    // Create entry point
    const entry = this.createEntryPoint(entryName, {
      calls: steps.slice(1).map(s => ({ name: s })),
      ...options.entryOverrides
    });
    atoms.push(entry);

    // Create intermediate steps
    for (let i = 1; i < steps.length - 1; i++) {
      const step = this.createIntermediate(
        steps[i],
        [steps[i - 1]],
        [{ name: steps[i + 1] }],
        options.stepOverrides?.[i - 1] || {}
      );
      atoms.push(step);
    }

    // Create exit point
    if (steps.length > 1) {
      const exit = this.createExit(
        steps[steps.length - 1],
        [steps[steps.length - 2]],
        options.exitOverrides || {}
      );
      atoms.push(exit);
    }

    return { atoms, entry, steps };
  }

  /**
   * Create a chain with branches (one function calls multiple)
   */
  createBranchingChain(entryName, branches, options = {}) {
    const entry = this.createEntryPoint(entryName, {
      calls: branches.map(b => typeof b === 'string' ? { name: b } : b),
      ...options.entryOverrides
    });

    const branchAtoms = branches.map((branch, i) => {
      const branchName = typeof branch === 'string' ? branch : branch.name;
      return this.createExit(branchName, [entryName], {
        ...options.branchOverrides?.[i]
      });
    });

    return { atoms: [entry, ...branchAtoms], entry, branches: branchAtoms };
  }

  /**
   * Create a chain with converging calls (multiple functions call one)
   */
  createConvergingChain(sourceNames, targetName, options = {}) {
    const sources = sourceNames.map((name, i) => 
      this.createEntryPoint(name, {
        calls: [{ name: targetName }],
        ...options.sourceOverrides?.[i]
      })
    );

    const target = this.createIntermediate(
      targetName,
      sourceNames,
      [],
      options.targetOverrides || {}
    );

    return { atoms: [...sources, target], sources, target };
  }

  /**
   * Create a diamond pattern: A -> B,C -> D
   */
  createDiamondChain(a, b, c, d, options = {}) {
    const atomA = this.createEntryPoint(a, {
      calls: [{ name: b }, { name: c }],
      ...options.aOverrides
    });

    const atomB = this.createIntermediate(b, [a], [{ name: d }], options.bOverrides || {});
    const atomC = this.createIntermediate(c, [a], [{ name: d }], options.cOverrides || {});

    const atomD = this.createExit(d, [b, c], options.dOverrides || {});

    return {
      atoms: [atomA, atomB, atomC, atomD],
      a: atomA, b: atomB, c: atomC, d: atomD
    };
  }

  /**
   * Create circular dependency chain
   */
  createCircularChain(names, options = {}) {
    const atoms = names.map((name, i) => {
      const nextIndex = (i + 1) % names.length;
      return this.createAtom({
        name,
        calledBy: [`file::${names[(i - 1 + names.length) % names.length]}`],
        calls: [{ name: names[nextIndex], type: 'internal' }],
        ...options.overrides?.[i]
      });
    });
    return { atoms };
  }

  /**
   * Create chain with external dependencies
   */
  createChainWithExternalDeps(entryName, externalCalls, internalCalls = [], options = {}) {
    const entry = this.createEntryPoint(entryName, {
      calls: [
        ...externalCalls.map(c => ({ name: c, type: 'external' })),
        ...internalCalls.map(c => ({ name: c, type: 'internal' }))
      ],
      ...options.overrides
    });

    const internalAtoms = internalCalls.map((name, i) => 
      this.createExit(name, [entryName], options.internalOverrides?.[i])
    );

    return { atoms: [entry, ...internalAtoms], entry, internalAtoms };
  }

  /**
   * Create chain with data transformations
   */
  createChainWithTransforms(entryName, steps, transforms, options = {}) {
    const atoms = [];
    
    // Entry with transformations
    const entry = this.createEntryPoint(entryName, {
      calls: steps.slice(1).map(s => ({ name: s })),
      dataFlow: {
        inputs: options.inputs || [{ name: 'input', type: 'simple' }],
        outputs: [{ type: 'return' }],
        transformations: transforms[0] || []
      },
      ...options.entryOverrides
    });
    atoms.push(entry);

    // Intermediate steps with transformations
    for (let i = 1; i < steps.length; i++) {
      const atom = this.createAtom({
        name: steps[i],
        calledBy: [`file::${steps[i - 1]}`],
        calls: i < steps.length - 1 ? [{ name: steps[i + 1] }] : [],
        dataFlow: {
          inputs: [{ name: 'param', type: 'simple' }],
          outputs: [{ type: 'return' }],
          transformations: transforms[i] || []
        },
        ...options.stepOverrides?.[i - 1]
      });
      atoms.push(atom);
    }

    return { atoms, entry, steps };
  }

  /**
   * Get all created atoms
   */
  getAtoms() {
    return this.atoms;
  }

  /**
   * Reset factory state
   */
  reset() {
    this.atoms = [];
    this.chainId = 0;
    return this;
  }
}

// ============================================================================
// ArgumentMapperBuilder - Factory for argument mapping test data
// ============================================================================

export class ArgumentMapperBuilder {
  constructor() {
    this.caller = null;
    this.callee = null;
    this.callInfo = null;
  }

  /**
   * Create a caller atom with arguments
   */
  withCaller(name, overrides = {}) {
    this.caller = {
      id: `file::${name}`,
      name,
      type: 'function',
      isExported: true,
      dataFlow: {
        inputs: overrides.inputs || [],
        outputs: overrides.outputs || [],
        transformations: overrides.transformations || []
      },
      calls: [],
      ...overrides
    };
    return this;
  }

  /**
   * Create a callee atom with parameters
   */
  withCallee(name, overrides = {}) {
    this.callee = {
      id: `file::${name}`,
      name,
      type: 'function',
      dataFlow: {
        inputs: overrides.inputs || [],
        outputs: overrides.outputs || [],
        transformations: overrides.transformations || []
      },
      ...overrides
    };
    return this;
  }

  /**
   * Define call information
   */
  withCallInfo(overrides = {}) {
    this.callInfo = {
      name: overrides.name || this.callee?.name || 'callee',
      type: 'internal',
      line: overrides.line || 1,
      column: overrides.column || 0,
      args: overrides.args || [],
      ...overrides
    };
    return this;
  }

  /**
   * Add simple argument (identifier)
   */
  withIdentifierArg(name, overrides = {}) {
    const arg = {
      type: 'Identifier',
      name,
      ...overrides
    };
    this.callInfo = this.callInfo || { args: [] };
    this.callInfo.args.push(arg);
    return this;
  }

  /**
   * Add member expression argument (obj.prop)
   */
  withMemberArg(object, property, overrides = {}) {
    const arg = {
      type: 'MemberExpression',
      object: { name: object },
      property,
      ...overrides
    };
    this.callInfo = this.callInfo || { args: [] };
    this.callInfo.args.push(arg);
    return this;
  }

  /**
   * Add call expression argument (func())
   */
  withCallArg(callee, args = [], overrides = {}) {
    const arg = {
      type: 'CallExpression',
      callee,
      arguments: args,
      ...overrides
    };
    this.callInfo = this.callInfo || { args: [] };
    this.callInfo.args.push(arg);
    return this;
  }

  /**
   * Add literal argument
   */
  withLiteralArg(value, overrides = {}) {
    const arg = {
      type: 'Literal',
      value,
      ...overrides
    };
    this.callInfo = this.callInfo || { args: [] };
    this.callInfo.args.push(arg);
    return this;
  }

  /**
   * Add spread argument (...args)
   */
  withSpreadArg(name, overrides = {}) {
    const arg = {
      type: 'spread',
      name,
      ...overrides
    };
    this.callInfo = this.callInfo || { args: [] };
    this.callInfo.args.push(arg);
    return this;
  }

  /**
   * Set callee parameters
   */
  withParams(params) {
    if (!this.callee) {
      throw new Error('Callee must be defined before setting params');
    }
    this.callee.dataFlow.inputs = params.map((p, i) => 
      typeof p === 'string' 
        ? { name: p, type: 'simple', position: i }
        : { name: p.name, type: p.type || 'simple', position: i, ...p }
    );
    return this;
  }

  /**
   * Set caller transformations
   */
  withCallerTransforms(transforms) {
    if (!this.caller) {
      throw new Error('Caller must be defined before setting transforms');
    }
    this.caller.dataFlow.transformations = transforms.map(t => 
      typeof t === 'string'
        ? { type: t, from: 'input', to: 'output' }
        : t
    );
    return this;
  }

  /**
   * Create direct pass mapping (no transformation)
   */
  static createDirectPass() {
    return new ArgumentMapperBuilder()
      .withCaller('caller', { inputs: [{ name: 'data', type: 'simple' }] })
      .withCallee('callee', { inputs: [{ name: 'param', type: 'simple' }] })
      .withCallInfo({ args: [{ type: 'Identifier', name: 'data' }] });
  }

  /**
   * Create transform mapping (argument is transformed before passing)
   */
  static createWithTransform() {
    return new ArgumentMapperBuilder()
      .withCaller('caller', {
        inputs: [{ name: 'raw', type: 'simple' }],
        transformations: [{ type: 'MAP', from: 'raw', to: 'processed' }]
      })
      .withCallee('callee', { inputs: [{ name: 'param', type: 'simple' }] })
      .withCallInfo({ args: [{ type: 'Identifier', name: 'processed' }] });
  }

  /**
   * Create destructuring parameter mapping
   */
  static createDestructuringMapping() {
    return new ArgumentMapperBuilder()
      .withCaller('caller')
      .withCallee('callee', {
        inputs: [
          { name: 'config', type: 'destructured', properties: ['a', 'b'] }
        ]
      })
      .withCallInfo({ args: [{ type: 'Identifier', name: 'config' }] });
  }

  /**
   * Build the mapping test data
   */
  build() {
    return {
      caller: this.caller,
      callee: this.callee,
      callInfo: this.callInfo
    };
  }
}

// ============================================================================
// GraphNodeBuilder - Factory for graph node test data
// ============================================================================

export class GraphNodeBuilder {
  constructor() {
    this.nodes = [];
    this.atoms = [];
    this.chains = [];
  }

  /**
   * Add an atom as a node
   */
  withAtom(atom, overrides = {}) {
    const node = {
      id: atom.id,
      function: atom.name,
      type: overrides.type || 'unknown',
      inputs: atom.dataFlow?.inputs?.map(i => ({ ...i })) || [],
      outputs: atom.dataFlow?.outputs?.map(o => ({ ...o })) || [],
      complexity: atom.complexity || 0,
      hasSideEffects: atom.hasSideEffects || false,
      isExported: atom.isExported || false,
      chains: [],
      position: overrides.position || {},
      ...overrides
    };
    this.nodes.push(node);
    this.atoms.push(atom);
    return this;
  }

  /**
   * Add an entry node
   */
  withEntryNode(name, overrides = {}) {
    const atom = this.createMockAtom(name, { 
      isExported: true,
      ...overrides.atom
    });
    return this.withAtom(atom, { type: 'entry', ...overrides.node });
  }

  /**
   * Add an exit node
   */
  withExitNode(name, overrides = {}) {
    const atom = this.createMockAtom(name, { 
      calls: [],
      ...overrides.atom
    });
    return this.withAtom(atom, { type: 'exit', ...overrides.node });
  }

  /**
   * Add an intermediate node
   */
  withIntermediateNode(name, overrides = {}) {
    const atom = this.createMockAtom(name, {
      calledBy: ['file::caller'],
      calls: [{ name: 'callee', type: 'internal' }],
      ...overrides.atom
    });
    return this.withAtom(atom, { type: 'intermediate', ...overrides.node });
  }

  /**
   * Add an isolated node
   */
  withIsolatedNode(name, overrides = {}) {
    const atom = this.createMockAtom(name, {
      calledBy: [],
      calls: [],
      ...overrides.atom
    });
    return this.withAtom(atom, { type: 'isolated', ...overrides.node });
  }

  /**
   * Associate chains with nodes
   */
  withChains(chainIds) {
    if (this.nodes.length > 0) {
      this.nodes[this.nodes.length - 1].chains = chainIds;
    }
    return this;
  }

  /**
   * Set position in chains for last node
   */
  withPosition(position) {
    if (this.nodes.length > 0) {
      this.nodes[this.nodes.length - 1].position = position;
    }
    return this;
  }

  /**
   * Create a mock atom
   */
  createMockAtom(name, overrides = {}) {
    return {
      id: `file::${name}`,
      name,
      type: 'function',
      isExported: overrides.isExported ?? false,
      line: 1,
      column: 0,
      complexity: overrides.complexity || 1,
      hasSideEffects: overrides.hasSideEffects ?? false,
      calledBy: overrides.calledBy || [],
      calls: overrides.calls || [],
      dataFlow: {
        inputs: overrides.inputs || [],
        outputs: overrides.outputs || [],
        transformations: overrides.transformations || []
      },
      ...overrides
    };
  }

  /**
   * Create multiple nodes at once
   */
  withNodes(count, prefix = 'node') {
    for (let i = 0; i < count; i++) {
      const name = `${prefix}_${i}`;
      const atom = this.createMockAtom(name);
      this.withAtom(atom);
    }
    return this;
  }

  /**
   * Build and return all nodes
   */
  build() {
    return {
      nodes: this.nodes,
      atoms: this.atoms
    };
  }

  /**
   * Build a complete graph structure
   */
  buildGraph() {
    return {
      nodes: this.nodes,
      meta: {
        totalNodes: this.nodes.length,
        entryNodes: this.nodes.filter(n => n.type === 'entry').length,
        exitNodes: this.nodes.filter(n => n.type === 'exit').length,
        intermediateNodes: this.nodes.filter(n => n.type === 'intermediate').length,
        isolatedNodes: this.nodes.filter(n => n.type === 'isolated').length
      }
    };
  }
}

// ============================================================================
// GraphEdgeBuilder - Factory for graph edge test data
// ============================================================================

export class GraphEdgeBuilder {
  constructor() {
    this.edges = [];
    this.mappings = [];
    this.atoms = [];
  }

  /**
   * Add an atom reference
   */
  withAtom(atom) {
    this.atoms.push(atom);
    return this;
  }

  /**
   * Create a direct call edge
   */
  withDirectEdge(from, to, overrides = {}) {
    const fromAtom = this.findAtom(from);
    const toAtom = this.findAtom(to);
    
    const edge = {
      id: `edge_${fromAtom.id}_${toAtom.id}_${overrides.callSite || 1}`,
      from: fromAtom.id,
      to: toAtom.id,
      fromFunction: from,
      toFunction: to,
      type: 'direct_call',
      dataMapping: overrides.dataMapping || [],
      returnFlow: overrides.returnFlow || { isUsed: false, usages: 0 },
      callSite: overrides.callSite || 1,
      totalArgs: overrides.totalArgs || 0,
      totalParams: overrides.totalParams || 0,
      summary: overrides.summary || null,
      ...overrides
    };
    
    this.edges.push(edge);
    
    // Create corresponding mapping
    this.mappings.push({
      caller: from,
      callee: to,
      callSite: edge.callSite,
      mappings: edge.dataMapping.map(m => ({
        argument: { variable: m.source, code: m.source },
        parameter: { name: m.target },
        transform: { type: m.transform || 'DIRECT_PASS' },
        confidence: m.confidence || 1.0
      })),
      returnUsage: edge.returnFlow,
      totalArgs: edge.totalArgs,
      totalParams: edge.totalParams,
      summary: edge.summary
    });
    
    return this;
  }

  /**
   * Create a data transform edge
   */
  withTransformEdge(from, to, transforms, overrides = {}) {
    const dataMapping = transforms.map((t, i) => ({
      source: t.from || `arg_${i}`,
      target: t.to || `param_${i}`,
      transform: t.type || 'TRANSFORM',
      confidence: t.confidence || 0.8
    }));

    return this.withDirectEdge(from, to, {
      type: 'data_transform',
      dataMapping,
      ...overrides
    });
  }

  /**
   * Create a call edge (generic)
   */
  withCallEdge(from, to, overrides = {}) {
    return this.withDirectEdge(from, to, {
      type: 'call',
      ...overrides
    });
  }

  /**
   * Create a return flow edge
   */
  withReturnEdge(from, to, overrides = {}) {
    return this.withDirectEdge(from, to, {
      type: 'return_flow',
      returnFlow: {
        isUsed: true,
        assignedTo: overrides.assignedTo || 'result',
        usages: overrides.usages || 1,
        ...overrides.returnFlow
      },
      ...overrides
    });
  }

  /**
   * Create multiple edges
   */
  withEdges(edges) {
    for (const edge of edges) {
      this.withDirectEdge(edge.from, edge.to, edge);
    }
    return this;
  }

  /**
   * Create a chain of edges
   */
  withChain(functions, overrides = {}) {
    for (let i = 0; i < functions.length - 1; i++) {
      this.withDirectEdge(functions[i], functions[i + 1], {
        callSite: i + 1,
        ...overrides
      });
    }
    return this;
  }

  /**
   * Create branching edges (one to many)
   */
  withBranch(from, tos, overrides = {}) {
    for (let i = 0; i < tos.length; i++) {
      this.withDirectEdge(from, tos[i], {
        callSite: i + 1,
        ...overrides
      });
    }
    return this;
  }

  /**
   * Create converging edges (many to one)
   */
  withConverge(froms, to, overrides = {}) {
    for (let i = 0; i < froms.length; i++) {
      this.withDirectEdge(froms[i], to, {
        callSite: i + 1,
        ...overrides
      });
    }
    return this;
  }

  /**
   * Find atom by name
   */
  findAtom(name) {
    return this.atoms.find(a => a.name === name) || { 
      id: `file::${name}`,
      name
    };
  }

  /**
   * Build edges
   */
  buildEdges() {
    return this.edges;
  }

  /**
   * Build mappings
   */
  buildMappings() {
    return this.mappings;
  }

  /**
   * Build complete structure
   */
  build() {
    return {
      edges: this.edges,
      mappings: this.mappings,
      meta: {
        totalEdges: this.edges.length,
        byType: this.edges.reduce((acc, e) => {
          acc[e.type] = (acc[e.type] || 0) + 1;
          return acc;
        }, {})
      }
    };
  }
}

// ============================================================================
// Test Scenarios - Predefined complex scenarios
// ============================================================================

export class MolecularChainsTestScenarios {
  
  /**
   * Create a simple linear chain: A -> B -> C
   */
  static linearChain() {
    const factory = new ChainBuilderFactory();
    const { atoms } = factory.createMultiStepChain(['A', 'B', 'C']);
    return { factory, atoms, entry: atoms[0], exit: atoms[2] };
  }

  /**
   * Create a branching chain: A -> B, C
   */
  static branchingChain() {
    const factory = new ChainBuilderFactory();
    const { atoms, entry, branches } = factory.createBranchingChain('A', ['B', 'C']);
    return { factory, atoms, entry, branches };
  }

  /**
   * Create converging chain: A -> C, B -> C
   */
  static convergingChain() {
    const factory = new ChainBuilderFactory();
    const { atoms, sources, target } = factory.createConvergingChain(['A', 'B'], 'C');
    return { factory, atoms, sources, target };
  }

  /**
   * Create diamond pattern: A -> B,C -> D
   */
  static diamondPattern() {
    const factory = new ChainBuilderFactory();
    const { atoms, a, b, c, d } = factory.createDiamondChain('A', 'B', 'C', 'D');
    return { factory, atoms, a, b, c, d };
  }

  /**
   * Create deep chain with 10 levels
   */
  static deepChain() {
    const factory = new ChainBuilderFactory();
    const steps = Array.from({ length: 10 }, (_, i) => `step_${i}`);
    const { atoms, entry } = factory.createMultiStepChain(steps);
    return { factory, atoms, entry, steps, depth: steps.length };
  }

  /**
   * Create chain with data transformations
   */
  static chainWithTransforms() {
    const factory = new ChainBuilderFactory();
    const transforms = [
      [{ type: 'PARSE', from: 'input', to: 'parsed' }],
      [{ type: 'VALIDATE', from: 'parsed', to: 'validated' }],
      [{ type: 'TRANSFORM', from: 'validated', to: 'result' }]
    ];
    const { atoms, entry } = factory.createChainWithTransforms(
      'entry',
      ['process', 'validate', 'format'],
      transforms,
      {
        inputs: [{ name: 'rawInput', type: 'string' }]
      }
    );
    return { factory, atoms, entry, transforms };
  }

  /**
   * Create chain with argument mapping scenarios
   */
  static argumentMappingScenario() {
    const builder = ArgumentMapperBuilder.createDirectPass();
    const data = builder.build();
    return { builder, ...data };
  }

  /**
   * Create chain with complex argument flows
   */
  static complexArgumentFlow() {
    const builder = new ArgumentMapperBuilder()
      .withCaller('processData', {
        inputs: [
          { name: 'config', type: 'object' },
          { name: 'items', type: 'array' }
        ],
        transformations: [
          { type: 'MAP', from: 'items', to: 'processedItems' },
          { type: 'MERGE', from: 'config', to: 'mergedConfig' }
        ]
      })
      .withCallee('transformItems', {
        inputs: [
          { name: 'data', type: 'simple' },
          { name: 'options', type: 'destructured', properties: ['filter', 'sort'] }
        ]
      })
      .withCallInfo({
        args: [
          { type: 'Identifier', name: 'processedItems' },
          { type: 'Identifier', name: 'mergedConfig' }
        ]
      });
    
    return { builder, ...builder.build() };
  }

  /**
   * Create graph with multiple node types
   */
  static multiTypeGraph() {
    const builder = new GraphNodeBuilder()
      .withEntryNode('main')
      .withIntermediateNode('process')
      .withIntermediateNode('validate')
      .withExitNode('save')
      .withIsolatedNode('helper');
    
    return { builder, ...builder.buildGraph() };
  }

  /**
   * Create graph with complex edges
   */
  static complexEdgeGraph() {
    const nodeBuilder = new GraphNodeBuilder()
      .withEntryNode('api')
      .withIntermediateNode('service')
      .withIntermediateNode('repository')
      .withExitNode('database');
    
    const { atoms } = nodeBuilder.build();
    
    const edgeBuilder = new GraphEdgeBuilder();
    atoms.forEach(a => edgeBuilder.withAtom(a));
    
    edgeBuilder
      .withDirectEdge('api', 'service', {
        callSite: 10,
        dataMapping: [{ source: 'request', target: 'params', transform: 'DIRECT_PASS', confidence: 1.0 }],
        returnFlow: { isUsed: true, assignedTo: 'result', usages: 1 }
      })
      .withTransformEdge('service', 'repository', [
        { type: 'MAP', from: 'params', to: 'query', confidence: 0.9 }
      ])
      .withDirectEdge('repository', 'database', {
        dataMapping: [{ source: 'query', target: 'sql', transform: 'DIRECT_PASS', confidence: 1.0 }]
      });
    
    return { nodeBuilder, edgeBuilder, ...edgeBuilder.build() };
  }

  /**
   * Create complete cross-function scenario
   */
  static completeCrossFunctionScenario() {
    const chainFactory = new ChainBuilderFactory();
    const { atoms: chainAtoms } = chainFactory.createDiamondChain(
      'controller', 'serviceA', 'serviceB', 'repository'
    );

    const nodeBuilder = new GraphNodeBuilder();
    chainAtoms.forEach(atom => nodeBuilder.withAtom(atom));
    const { nodes } = nodeBuilder.build();

    const edgeBuilder = new GraphEdgeBuilder();
    chainAtoms.forEach(atom => edgeBuilder.withAtom(atom));
    
    edgeBuilder
      .withBranch('controller', ['serviceA', 'serviceB'])
      .withConverge(['serviceA', 'serviceB'], 'repository');

    return {
      chainFactory,
      nodeBuilder,
      edgeBuilder,
      atoms: chainAtoms,
      nodes,
      edges: edgeBuilder.buildEdges(),
      mappings: edgeBuilder.buildMappings()
    };
  }
}

// ============================================================================
// Test Validators
// ============================================================================

export class MolecularChainsValidators {
  
  /**
   * Validate a chain structure
   */
  static validateChain(chain) {
    if (!chain) return false;
    if (!chain.id) return false;
    if (!chain.entryFunction) return false;
    if (!chain.exitFunction) return false;
    if (!Array.isArray(chain.steps)) return false;
    if (chain.steps.length === 0) return false;
    
    for (const step of chain.steps) {
      if (!this.validateStep(step)) return false;
    }
    
    return true;
  }

  /**
   * Validate a chain step
   */
  static validateStep(step) {
    if (!step) return false;
    if (!step.function) return false;
    if (!step.atomId) return false;
    if (!step.input) return false;
    if (!step.output) return false;
    if (!Array.isArray(step.internalTransforms)) return false;
    if (!Array.isArray(step.calls)) return false;
    return true;
  }

  /**
   * Validate mapping result
   */
  static validateMapping(mapping) {
    if (!mapping) return false;
    if (!mapping.caller) return false;
    if (!mapping.callee) return false;
    if (!Array.isArray(mapping.mappings)) return false;
    if (typeof mapping.totalArgs !== 'number') return false;
    if (typeof mapping.totalParams !== 'number') return false;
    return true;
  }

  /**
   * Validate graph node
   */
  static validateNode(node) {
    if (!node) return false;
    if (!node.id) return false;
    if (!node.function) return false;
    if (!node.type) return false;
    if (!Array.isArray(node.chains)) return false;
    return true;
  }

  /**
   * Validate graph edge
   */
  static validateEdge(edge) {
    if (!edge) return false;
    if (!edge.id) return false;
    if (!edge.from) return false;
    if (!edge.to) return false;
    if (!edge.fromFunction) return false;
    if (!edge.toFunction) return false;
    if (!edge.type) return false;
    return true;
  }

  /**
   * Validate graph structure
   */
  static validateGraph(graph) {
    if (!graph) return false;
    if (!Array.isArray(graph.nodes)) return false;
    if (!Array.isArray(graph.edges)) return false;
    if (!graph.meta) return false;
    if (typeof graph.meta.totalNodes !== 'number') return false;
    if (typeof graph.meta.totalEdges !== 'number') return false;
    
    for (const node of graph.nodes) {
      if (!this.validateNode(node)) return false;
    }
    
    for (const edge of graph.edges) {
      if (!this.validateEdge(edge)) return false;
    }
    
    return true;
  }
}

// ============================================================================
// Test Constants
// ============================================================================

export const MolecularChainsTestConstants = {
  CHAIN_TYPES: {
    LINEAR: 'linear',
    BRANCHING: 'branching',
    CONVERGING: 'converging',
    DIAMOND: 'diamond',
    CIRCULAR: 'circular'
  },
  
  NODE_TYPES: {
    ENTRY: 'entry',
    EXIT: 'exit',
    INTERMEDIATE: 'intermediate',
    ISOLATED: 'isolated'
  },
  
  EDGE_TYPES: {
    DIRECT_CALL: 'direct_call',
    DATA_TRANSFORM: 'data_transform',
    CALL: 'call',
    RETURN_FLOW: 'return_flow'
  },
  
  TRANSFORM_TYPES: {
    DIRECT_PASS: 'DIRECT_PASS',
    MAP: 'MAP',
    FILTER: 'FILTER',
    REDUCE: 'REDUCE',
    PARSE: 'PARSE',
    VALIDATE: 'VALIDATE',
    TRANSFORM: 'TRANSFORM'
  }
};

// Default export
export default {
  ChainBuilderFactory,
  ArgumentMapperBuilder,
  GraphNodeBuilder,
  GraphEdgeBuilder,
  MolecularChainsTestScenarios,
  MolecularChainsValidators,
  MolecularChainsTestConstants
};
