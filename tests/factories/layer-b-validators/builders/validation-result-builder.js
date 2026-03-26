/**
 * Builder para resultados de validaciÃ³n
 */
export class ValidationResultBuilder {
  constructor() {
    this.result = {
      isValid: true,
      validatedKeys: [],
      validatedEvents: [],
      validatedFiles: [],
      confidence: 0,
      errors: []
    };
  }

  withValidatedKeys(keys) {
    this.result.validatedKeys = Array.isArray(keys) ? keys : [keys];
    return this;
  }

  withValidatedEvents(events) {
    this.result.validatedEvents = Array.isArray(events) ? events : [events];
    return this;
  }

  withValidatedFiles(files) {
    this.result.validatedFiles = Array.isArray(files) ? files : [files];
    return this;
  }

  withConfidence(confidence) {
    this.result.confidence = confidence;
    return this;
  }

  withError(message) {
    this.result.isValid = false;
    this.result.errors.push(message);
    return this;
  }

  asValid() {
    this.result.isValid = true;
    this.result.confidence = 0.9;
    return this;
  }

  asInvalid(reason = 'Validation failed') {
    this.result.isValid = false;
    this.result.errors.push(reason);
    this.result.confidence = 0;
    return this;
  }

  build() {
    return { ...this.result };
  }

  static create() {
    return new ValidationResultBuilder();
  }
}
