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
