/**
 * @fileoverview Atom Builder - Builder para crear objetos Atom
 */

export class AtomBuilder {
  constructor() {
    this.atom = {
      id: 'src/test.js::testFunction',
      name: 'testFunction',
      filePath: 'src/test.js',
      lineNumber: 1,
      isExported: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      dataFlow: {
        inputs: ['param1', 'param2'],
        outputs: ['returnValue'],
        sideEffects: []
      },
      dna: null,
      ancestry: null,
      semantic: null
    };
  }

  withId(id) {
    this.atom.id = id;
    return this;
  }

  withName(name) {
    this.atom.name = name;
    return this;
  }

  withFile(filePath) {
    this.atom.filePath = filePath;
    const parts = filePath.split('::');
    if (parts.length === 1) {
      this.atom.id = `${filePath}::${this.atom.name}`;
    }
    return this;
  }

  withDataFlow(dataFlow) {
    this.atom.dataFlow = { ...this.atom.dataFlow, ...dataFlow };
    return this;
  }

  withAncestry(ancestry) {
    this.atom.ancestry = ancestry;
    return this;
  }

  withDNA(dna) {
    this.atom.dna = dna;
    return this;
  }

  withSemantic(semantic) {
    this.atom.semantic = semantic;
    return this;
  }

  withLineNumber(line) {
    this.atom.lineNumber = line;
    return this;
  }

  asExported() {
    this.atom.isExported = true;
    return this;
  }

  asInternal() {
    this.atom.isExported = false;
    return this;
  }

  asFunction() {
    this.atom.dataFlow = {
      inputs: ['params'],
      outputs: ['result'],
      sideEffects: []
    };
    return this;
  }

  asVariable() {
    this.atom.dataFlow = {
      inputs: [],
      outputs: ['value'],
      sideEffects: []
    };
    return this;
  }

  asAsync() {
    this.atom.dataFlow = {
      inputs: ['params'],
      outputs: ['promise'],
      sideEffects: ['async_operation']
    };
    if (this.atom.dna) {
      this.atom.dna.flowType = 'async';
    }
    return this;
  }

  withInputs(inputs) {
    this.atom.dataFlow.inputs = Array.isArray(inputs) ? inputs : [inputs];
    return this;
  }

  withOutputs(outputs) {
    this.atom.dataFlow.outputs = Array.isArray(outputs) ? outputs : [outputs];
    return this;
  }

  withSideEffects(effects) {
    this.atom.dataFlow.sideEffects = Array.isArray(effects) ? effects : [effects];
    return this;
  }

  build() {
    return { ...this.atom };
  }

  static create() {
    return new AtomBuilder();
  }
}