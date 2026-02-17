/**
 * @fileoverview Layer B Lineage Validator Factory
 * 
 * Builders para testing de validación de lineage
 * 
 * @module tests/factories/layer-b-lineage
 */

/**
 * Builder para átomos de lineage
 */
export class AtomBuilder {
  constructor() {
    this.atom = {
      id: 'func-123',
      name: 'validateUser',
      dna: {
        id: 'dna-123',
        flowType: 'transform',
        purity: 'pure',
        complexity: 3,
        complexityScore: 5,
        structuralHash: 'abc123',
        patternHash: 'def456',
        operationSequence: ['read', 'transform', 'write']
      },
      dataFlow: {
        inputs: [{ name: 'user', type: 'object' }],
        outputs: [{ type: 'boolean' }],
        transformations: [{ operation: 'validation' }]
      },
      semantic: {
        verb: 'validate',
        domain: 'business',
        entity: 'user',
        operationType: 'check'
      },
      filePath: '/src/utils.js',
      lineNumber: 42,
      isExported: true
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

  withDNA(dna) {
    this.atom.dna = { ...this.atom.dna, ...dna };
    return this;
  }

  withFlowType(flowType) {
    this.atom.dna.flowType = flowType;
    return this;
  }

  withDataFlow(dataFlow) {
    this.atom.dataFlow = { ...this.atom.dataFlow, ...dataFlow };
    return this;
  }

  withInputs(inputs) {
    this.atom.dataFlow.inputs = inputs;
    return this;
  }

  withOutputs(outputs) {
    this.atom.dataFlow.outputs = outputs;
    return this;
  }

  withTransformations(transformations) {
    this.atom.dataFlow.transformations = transformations;
    return this;
  }

  withSemantic(semantic) {
    this.atom.semantic = { ...this.atom.semantic, ...semantic };
    return this;
  }

  withVerb(verb) {
    this.atom.semantic.verb = verb;
    return this;
  }

  withoutDNA() {
    delete this.atom.dna;
    return this;
  }

  withoutSemantic() {
    delete this.atom.semantic;
    return this;
  }

  withoutDataFlow() {
    delete this.atom.dataFlow;
    return this;
  }

  asInvalid() {
    this.atom.id = null;
    this.atom.name = null;
    return this;
  }

  asVoidFunction() {
    this.atom.dataFlow.outputs = [];
    this.atom.dataFlow.transformations = [];
    return this;
  }

  asReadOperation() {
    this.atom.dna.flowType = 'read';
    this.atom.semantic.verb = 'get';
    this.atom.dataFlow.transformations = [{ operation: 'read' }];
    return this;
  }

  asWriteOperation() {
    this.atom.dna.flowType = 'persist';
    this.atom.semantic.verb = 'update';
    this.atom.dataFlow.transformations = [{ operation: 'write', hasSideEffects: true }];
    return this;
  }

  build() {
    return { ...this.atom };
  }

  static create() {
    return new AtomBuilder();
  }
}

/**
 * Builder para shadows (sombras)
 */
export class ShadowBuilder {
  constructor() {
    this.shadow = {
      shadowId: 'shadow-1',
      originalId: 'func-123',
      dna: {
        id: 'dna-shadow-1',
        flowType: 'transform',
        purity: 'pure',
        complexityScore: 5,
        structuralHash: 'abc123',
        patternHash: 'def456',
        operationSequence: ['read', 'transform', 'write']
      },
      diedAt: Date.now(),
      metadata: {
        name: 'validateUser',
        semantic: {
          verb: 'validate',
          domain: 'business'
        }
      }
    };
  }

  withId(shadowId) {
    this.shadow.shadowId = shadowId;
    return this;
  }

  withOriginalId(originalId) {
    this.shadow.originalId = originalId;
    return this;
  }

  withDNA(dna) {
    this.shadow.dna = { ...this.shadow.dna, ...dna };
    return this;
  }

  withMetadata(metadata) {
    this.shadow.metadata = { ...this.shadow.metadata, ...metadata };
    return this;
  }

  asExpired() {
    this.shadow.diedAt = Date.now() - 86400000; // 1 day ago
    return this;
  }

  build() {
    return { ...this.shadow };
  }

  static create() {
    return new ShadowBuilder();
  }
}

/**
 * Exportación default
 */
export default {
  AtomBuilder,
  ShadowBuilder
};
