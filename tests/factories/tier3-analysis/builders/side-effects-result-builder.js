/**
 * @fileoverview SideEffectsResultBuilder - Builder for side effects detection results
 */

export class SideEffectsResultBuilder {
  constructor() {
    this.sideEffects = {
      hasGlobalAccess: false,
      modifiesDOM: false,
      makesNetworkCalls: false,
      usesLocalStorage: false,
      accessesWindow: false,
      modifiesGlobalState: false,
      hasEventListeners: false,
      usesTimers: false
    };
    this.details = {
      globalAccessLocations: [],
      domModificationLocations: [],
      networkCallLocations: [],
      storageAccessLocations: [],
      globalStateModificationLocations: [],
      eventListenerLocations: [],
      timerLocations: []
    };
    this.severity = 'low';
  }

  withGlobalAccess(object = 'window', property = 'test') {
    this.sideEffects.hasGlobalAccess = true;
    this.sideEffects.accessesWindow = object === 'window';
    this.details.globalAccessLocations.push({ object, property });
    return this;
  }

  withDOMModification(method = 'getElementById') {
    this.sideEffects.modifiesDOM = true;
    this.details.domModificationLocations.push({ method });
    return this;
  }

  withNetworkCall(api = 'fetch') {
    this.sideEffects.makesNetworkCalls = true;
    this.details.networkCallLocations.push({ api });
    return this;
  }

  withStorageAccess(storage = 'localStorage') {
    this.sideEffects.usesLocalStorage = true;
    this.details.storageAccessLocations.push({ storage });
    return this;
  }

  withGlobalStateModification(target = 'window.config') {
    this.sideEffects.modifiesGlobalState = true;
    this.details.globalStateModificationLocations.push({ target });
    return this;
  }

  withEventListener(method = 'addEventListener') {
    this.sideEffects.hasEventListeners = true;
    this.details.eventListenerLocations.push({ method });
    return this;
  }

  withTimer(timer = 'setTimeout') {
    this.sideEffects.usesTimers = true;
    this.details.timerLocations.push({ timer });
    return this;
  }

  withSeverity(severity) {
    this.severity = severity;
    return this;
  }

  build() {
    const count = Object.values(this.sideEffects).filter(v => v === true).length;
    return {
      sideEffects: this.sideEffects,
      details: this.details,
      severity: this.severity,
      count
    };
  }

  static create() {
    return new SideEffectsResultBuilder();
  }
}
