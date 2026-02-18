/**
 * @fileoverview Layer C Shadow Registry Factory
 * 
 * Builders para testing del sistema de shadow registry y lineage tracking
 * 
 * @module tests/factories/layer-c-shadow-registry
 */

import { ShadowStatus, EvolutionType } from '../../../src/layer-c-memory/shadow-registry/types.js';

/**
 * Builder para crear objetos Shadow
 */
export class ShadowBuilder {
  constructor() {
    this.shadow = {
      shadowId: 'shadow_test123',
      originalId: 'src/test.js::testFunction',
      status: ShadowStatus.DELETED,
      replacedBy: null,
      bornAt: '2024-01-01T00:00:00.000Z',
      diedAt: new Date().toISOString(),
      lifespan: 30,
      dna: {
        id: 'dna_test123',
        structuralHash: 'hash_struct_123',
        patternHash: 'hash_pattern_123',
        flowType: 'sync',
        operationSequence: ['read', 'transform', 'write'],
        complexityScore: 5,
        semanticFingerprint: 'sem_fp_123'
      },
      metadata: {
        name: 'testFunction',
        dataFlow: { inputs: [], outputs: [] },
        filePath: 'src/test.js',
        lineNumber: 1,
        isExported: true
      },
      lineage: {
        parentShadowId: null,
        childShadowIds: [],
        evolutionType: null,
        generation: 0
      },
      inheritance: {
        connections: [],
        connectionCount: 0,
        vibrationScore: 0,
        rupturedConnections: []
      },
      death: {
        reason: 'file_deleted',
        commitsInvolved: [],
        riskIntroduced: 0,
        replacementId: null
      }
    };
  }

  withShadowId(id) {
    this.shadow.shadowId = id;
    return this;
  }

  withOriginalId(id) {
    this.shadow.originalId = id;
    return this;
  }

  withAtomId(id) {
    this.shadow.originalId = id;
    return this;
  }

  withReason(reason) {
    this.shadow.death.reason = reason;
    return this;
  }

  withReplacementId(id) {
    this.shadow.replacedBy = id;
    this.shadow.death.replacementId = id;
    return this;
  }

  withDNA(dna) {
    this.shadow.dna = { ...this.shadow.dna, ...dna };
    return this;
  }

  withStatus(status) {
    this.shadow.status = status;
    return this;
  }

  withLifespan(days) {
    this.shadow.lifespan = days;
    return this;
  }

  withMetadata(metadata) {
    this.shadow.metadata = { ...this.shadow.metadata, ...metadata };
    return this;
  }

  withLineage(lineage) {
    this.shadow.lineage = { ...this.shadow.lineage, ...lineage };
    return this;
  }

  withInheritance(inheritance) {
    this.shadow.inheritance = { ...this.shadow.inheritance, ...inheritance };
    return this;
  }

  asDead() {
    this.shadow.status = ShadowStatus.DELETED;
    this.shadow.replacedBy = null;
    this.shadow.death.replacementId = null;
    return this;
  }

  asReplaced() {
    this.shadow.status = ShadowStatus.REPLACED;
    this.shadow.replacedBy = 'src/new.js::newFunction';
    this.shadow.death.replacementId = 'src/new.js::newFunction';
    return this;
  }

  asZombie() {
    this.shadow.status = ShadowStatus.DELETED;
    this.shadow.inheritance.vibrationScore = 100;
    this.shadow.inheritance.connectionCount = 5;
    this.shadow.inheritance.connections = [
      { target: 'src/other.js::func1', strength: 0.9 },
      { target: 'src/other.js::func2', strength: 0.8 }
    ];
    return this;
  }

  asMerged() {
    this.shadow.status = ShadowStatus.MERGED;
    this.shadow.replacedBy = 'src/merged.js::mergedFunction';
    return this;
  }

  asSplit() {
    this.shadow.status = ShadowStatus.SPLIT;
    this.shadow.lineage.childShadowIds = ['shadow_split1', 'shadow_split2'];
    return this;
  }

  withParent(parentId) {
    this.shadow.lineage.parentShadowId = parentId;
    this.shadow.lineage.generation = 1;
    return this;
  }

  withChildren(childIds) {
    this.shadow.lineage.childShadowIds = Array.isArray(childIds) ? childIds : [childIds];
    return this;
  }

  withEvolutionType(type) {
    this.shadow.lineage.evolutionType = type;
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
 * Builder para crear objetos Atom
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

/**
 * Builder para crear objetos Lineage
 */
export class LineageBuilder {
  constructor() {
    this.lineage = {
      parentShadowId: null,
      childShadowIds: [],
      evolutionType: null,
      generation: 0
    };
  }

  withParent(parentId) {
    this.lineage.parentShadowId = parentId;
    return this;
  }

  withChild(childId) {
    this.lineage.childShadowIds.push(childId);
    return this;
  }

  withChildren(childIds) {
    this.lineage.childShadowIds = Array.isArray(childIds) ? childIds : [childIds];
    return this;
  }

  withAncestors(ancestors) {
    this._ancestors = Array.isArray(ancestors) ? ancestors : [ancestors];
    return this;
  }

  withDescendants(descendants) {
    this.lineage.childShadowIds = Array.isArray(descendants) ? descendants : [descendants];
    return this;
  }

  withEvolutionType(type) {
    this.lineage.evolutionType = type;
    return this;
  }

  withGeneration(gen) {
    this.lineage.generation = gen;
    return this;
  }

  asGenesis() {
    this.lineage.generation = 0;
    this.lineage.parentShadowId = null;
    return this;
  }

  asFirstGeneration() {
    this.lineage.generation = 1;
    return this;
  }

  asSecondGeneration() {
    this.lineage.generation = 2;
    return this;
  }

  asRefactored() {
    this.lineage.evolutionType = EvolutionType.REFACTOR;
    return this;
  }

  asRenamed() {
    this.lineage.evolutionType = EvolutionType.RENAMED;
    return this;
  }

  asDomainChanged() {
    this.lineage.evolutionType = EvolutionType.DOMAIN_CHANGE;
    return this;
  }

  build() {
    const result = { ...this.lineage };
    if (this._ancestors) {
      result.ancestors = this._ancestors;
    }
    return result;
  }

  static create() {
    return new LineageBuilder();
  }
}

/**
 * Builder para crear objetos SearchResult
 */
export class SearchResultBuilder {
  constructor() {
    this.result = {
      shadow: null,
      similarity: 0.85
    };
  }

  withShadow(shadow) {
    this.result.shadow = shadow;
    return this;
  }

  withSimilarity(score) {
    this.result.similarity = score;
    return this;
  }

  asHighMatch() {
    this.result.similarity = 0.95;
    return this;
  }

  asMediumMatch() {
    this.result.similarity = 0.80;
    return this;
  }

  asLowMatch() {
    this.result.similarity = 0.75;
    return this;
  }

  asNoMatch() {
    this.result.similarity = 0;
    this.result.shadow = null;
    return this;
  }

  withShadowId(id) {
    if (!this.result.shadow) {
      this.result.shadow = { shadowId: id };
    } else {
      this.result.shadow.shadowId = id;
    }
    return this;
  }

  build() {
    return { ...this.result };
  }

  static create() {
    return new SearchResultBuilder();
  }
}

/**
 * Builder para crear objetos Ancestry
 */
export class AncestryBuilder {
  constructor() {
    this.ancestry = {
      replaced: null,
      lineage: [],
      generation: 0,
      vibrationScore: 0,
      strongConnections: [],
      warnings: []
    };
  }

  withReplaced(shadowId) {
    this.ancestry.replaced = shadowId;
    return this;
  }

  withLineage(lineage) {
    this.ancestry.lineage = Array.isArray(lineage) ? lineage : [lineage];
    return this;
  }

  withGeneration(gen) {
    this.ancestry.generation = gen;
    return this;
  }

  withVibrationScore(score) {
    this.ancestry.vibrationScore = score;
    return this;
  }

  withStrongConnections(connections) {
    this.ancestry.strongConnections = Array.isArray(connections) ? connections : [connections];
    return this;
  }

  withWarnings(warnings) {
    this.ancestry.warnings = Array.isArray(warnings) ? warnings : [warnings];
    return this;
  }

  withSimilar(similarity) {
    this.ancestry.similarity = similarity;
    return this;
  }

  withConfidence(confidence) {
    this.ancestry.confidence = confidence;
    return this;
  }

  asGenesis() {
    this.ancestry.generation = 0;
    this.ancestry.lineage = [];
    this.ancestry.replaced = null;
    this.ancestry.genesis = true;
    return this;
  }

  asInherited() {
    this.ancestry.generation = 1;
    this.ancestry.replaced = 'shadow_parent123';
    this.ancestry.lineage = ['shadow_parent123'];
    return this;
  }

  asMultiGenerational(generations) {
    this.ancestry.generation = generations;
    this.ancestry.lineage = Array.from({ length: generations }, (_, i) => `shadow_gen${i}`);
    return this;
  }

  withHighVibration() {
    this.ancestry.vibrationScore = 100;
    this.ancestry.strongConnections = [
      { target: 'src/api.js::handler', strength: 0.95 },
      { target: 'src/db.js::query', strength: 0.90 }
    ];
    return this;
  }

  withLowVibration() {
    this.ancestry.vibrationScore = 10;
    this.ancestry.strongConnections = [];
    return this;
  }

  withRupturedConnections() {
    this.ancestry.warnings = ['Ruptured connection: src/old.js::deprecated'];
    return this;
  }

  build() {
    return { ...this.ancestry };
  }

  static create() {
    return new AncestryBuilder();
  }
}

export default {
  ShadowBuilder,
  AtomBuilder,
  LineageBuilder,
  SearchResultBuilder,
  AncestryBuilder
};
