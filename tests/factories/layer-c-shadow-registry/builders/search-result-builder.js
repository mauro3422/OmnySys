/**
 * @fileoverview Search Result Builder - Builder para crear objetos SearchResult
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