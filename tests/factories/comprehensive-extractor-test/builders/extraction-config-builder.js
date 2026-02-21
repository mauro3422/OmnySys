/**
 * @fileoverview ExtractionConfigBuilder
 * 
 * Builder para configurar opciones de extracción de código.
 * 
 * @module tests/factories/comprehensive-extractor-test/builders/extraction-config-builder
 */

export class ExtractionConfigBuilder {
  constructor() {
    this.config = {
      extractors: {
        functions: true,
        classes: true,
        imports: true,
        exports: true
      },
      detailLevel: 'standard',
      includeSource: false,
      calculateMetrics: true,
      detectPatterns: true,
      timeout: 30000
    };
  }

  withFunctions(enabled = true) {
    this.config.extractors.functions = enabled;
    return this;
  }

  withClasses(enabled = true) {
    this.config.extractors.classes = enabled;
    return this;
  }

  withImports(enabled = true) {
    this.config.extractors.imports = enabled;
    return this;
  }

  withExports(enabled = true) {
    this.config.extractors.exports = enabled;
    return this;
  }

  withDetailLevel(level) {
    this.config.detailLevel = level;
    return this;
  }

  withMetrics(enabled = true) {
    this.config.calculateMetrics = enabled;
    return this;
  }

  withPatternDetection(enabled = true) {
    this.config.detectPatterns = enabled;
    return this;
  }

  withTimeout(timeout) {
    this.config.timeout = timeout;
    return this;
  }

  withSource(enabled = true) {
    this.config.includeSource = enabled;
    return this;
  }

  build() {
    return { ...this.config };
  }

  static minimal() {
    return new ExtractionConfigBuilder()
      .withDetailLevel('minimal')
      .withMetrics(false)
      .withPatternDetection(false)
      .build();
  }

  static standard() {
    return new ExtractionConfigBuilder().build();
  }

  static detailed() {
    return new ExtractionConfigBuilder()
      .withDetailLevel('detailed')
      .withSource(true)
      .build();
  }

  static functionsOnly() {
    return new ExtractionConfigBuilder()
      .withClasses(false)
      .withImports(false)
      .withExports(false)
      .build();
  }

  static classesOnly() {
    return new ExtractionConfigBuilder()
      .withFunctions(false)
      .withImports(false)
      .withExports(false)
      .build();
  }
}
