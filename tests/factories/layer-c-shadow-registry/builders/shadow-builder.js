/**
 * @fileoverview Shadow Builder - Builder para crear objetos Shadow
 */

import { ShadowStatus } from '../../../../src/layer-c-memory/shadow-registry/types.js';

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