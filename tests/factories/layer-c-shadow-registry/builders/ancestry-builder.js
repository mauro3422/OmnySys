/**
 * @fileoverview Ancestry Builder - Builder para crear objetos Ancestry
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