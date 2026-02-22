/**
 * @fileoverview Lineage Builder - Builder para crear objetos Lineage
 */

import { EvolutionType } from '../../../../src/layer-c-memory/shadow-registry/types.js';

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