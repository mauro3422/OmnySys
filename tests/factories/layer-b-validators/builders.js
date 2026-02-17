/**
 * @fileoverview Layer B Validators Factory
 * 
 * Builders para testing de validadores de respuestas LLM
 * 
 * @module tests/factories/layer-b-validators
 */

/**
 * Builder para respuestas del LLM
 */
export class LLMResponseBuilder {
  constructor() {
    this.response = {
      localStorageKeys: [],
      eventNames: [],
      connectedFiles: [],
      connectionType: 'none',
      confidence: 0.8,
      reasoning: 'Valid connections detected'
    };
  }

  withLocalStorageKeys(keys) {
    this.response.localStorageKeys = Array.isArray(keys) ? keys : [keys];
    return this;
  }

  withEventNames(events) {
    this.response.eventNames = Array.isArray(events) ? events : [events];
    return this;
  }

  withConnectedFiles(files) {
    this.response.connectedFiles = Array.isArray(files) ? files : [files];
    return this;
  }

  withConnectionType(type) {
    this.response.connectionType = type;
    return this;
  }

  withConfidence(confidence) {
    this.response.confidence = confidence;
    return this;
  }

  withReasoning(reasoning) {
    this.response.reasoning = reasoning;
    return this;
  }

  asLocalStorageConnection() {
    this.response.connectionType = 'localStorage';
    this.response.localStorageKeys = ['userSettings', 'appState'];
    this.response.confidence = 0.9;
    return this;
  }

  asEventConnection() {
    this.response.connectionType = 'event';
    this.response.eventNames = ['user:login', 'app:update'];
    this.response.confidence = 0.85;
    return this;
  }

  asMixedConnection() {
    this.response.connectionType = 'mixed';
    this.response.localStorageKeys = ['sessionData'];
    this.response.eventNames = ['data:change'];
    this.response.confidence = 0.9;
    return this;
  }

  asNoConnection() {
    this.response.connectionType = 'none';
    this.response.localStorageKeys = [];
    this.response.eventNames = [];
    this.response.connectedFiles = [];
    this.response.confidence = 0.1;
    this.response.reasoning = 'No connections found';
    return this;
  }

  withHallucinatedKeys() {
    this.response.localStorageKeys = ['setItem', 'getItem', 'key1', 'userToken'];
    return this;
  }

  withPlaceholderKeys() {
    this.response.localStorageKeys = ['key1', 'key2', 'userData'];
    return this;
  }

  build() {
    return { ...this.response };
  }

  static create() {
    return new LLMResponseBuilder();
  }
}

/**
 * Builder para código fuente de test
 */
export class CodeSampleBuilder {
  constructor() {
    this.code = '';
    this.localStorageKeys = [];
    this.eventNames = [];
    this.globalVars = [];
  }

  withLocalStorageKey(key, operation = 'setItem') {
    this.localStorageKeys.push(key);
    const lines = {
      setItem: `localStorage.setItem('${key}', value);`,
      getItem: `const data = localStorage.getItem('${key}');`,
      removeItem: `localStorage.removeItem('${key}');`,
      bracket: `localStorage['${key}'] = value;`,
      dot: `localStorage.${key} = value;`
    };
    this.code += lines[operation] || lines.setItem;
    this.code += '\n';
    return this;
  }

  withEventListener(eventName, pattern = 'standard') {
    this.eventNames.push(eventName);
    const lines = {
      standard: `element.addEventListener('${eventName}', handler);`,
      remove: `element.removeEventListener('${eventName}', handler);`,
      emit: `eventBus.emit('${eventName}', data);`,
      on: `eventBus.on('${eventName}', handler);`,
      once: `eventBus.once('${eventName}', handler);`
    };
    this.code += lines[pattern] || lines.standard;
    this.code += '\n';
    return this;
  }

  withGlobalVariable(name, object = 'window') {
    this.globalVars.push({ name, object });
    this.code += `${object}.${name} = value;\n`;
    return this;
  }

  withMultipleLocalStorageKeys(count, prefix = 'key') {
    for (let i = 0; i < count; i++) {
      this.withLocalStorageKey(`${prefix}${i}`);
    }
    return this;
  }

  withMultipleEventNames(count, prefix = 'event') {
    for (let i = 0; i < count; i++) {
      this.withEventListener(`${prefix}-${i}`);
    }
    return this;
  }

  build() {
    return {
      code: this.code,
      localStorageKeys: new Set(this.localStorageKeys),
      eventNames: new Set(this.eventNames),
      globalVars: [...this.globalVars]
    };
  }

  static create() {
    return new CodeSampleBuilder();
  }
}

/**
 * Builder para resultados de validación
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
    this.result.validatedFiles = Array.isArray(files) ? files : [keys];
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

/**
 * Builder para configuración de timeouts
 */
export class TimeoutConfigBuilder {
  constructor() {
    this.config = {
      code: '',
      baseTimeout: 20000,
      sizeFactor: 500,
      maxTimeout: 120000
    };
  }

  withCodeLength(length) {
    this.config.code = 'x'.repeat(length);
    return this;
  }

  withBaseTimeout(timeout) {
    this.config.baseTimeout = timeout;
    return this;
  }

  withSizeFactor(factor) {
    this.config.sizeFactor = factor;
    return this;
  }

  withMaxTimeout(timeout) {
    this.config.maxTimeout = timeout;
    return this;
  }

  asSmallFile() {
    this.config.code = 'x'.repeat(500);
    return this;
  }

  asMediumFile() {
    this.config.code = 'x'.repeat(2500);
    return this;
  }

  asLargeFile() {
    this.config.code = 'x'.repeat(10000);
    return this;
  }

  asHugeFile() {
    this.config.code = 'x'.repeat(200000);
    return this;
  }

  build() {
    return { ...this.config };
  }

  static create() {
    return new TimeoutConfigBuilder();
  }
}

/**
 * Exportación default
 */
export default {
  LLMResponseBuilder,
  CodeSampleBuilder,
  ValidationResultBuilder,
  TimeoutConfigBuilder
};
