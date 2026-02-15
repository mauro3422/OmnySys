/**
 * @fileoverview Static Extractor Test Factory - Validators
 */

export const StaticValidators = {
  /**
   * Validate route structure
   */
  isValidRoute(route) {
    return route &&
           typeof route.route === 'string' &&
           typeof route.line === 'number';
  },

  /**
   * Validate env var structure
   */
  isValidEnvVar(envVar) {
    return envVar &&
           typeof envVar.name === 'string' &&
           typeof envVar.line === 'number';
  },

  /**
   * Validate event structure
   */
  isValidEvent(event) {
    return event &&
           typeof event.event === 'string' &&
           typeof event.line === 'number';
  },

  /**
   * Validate storage structure
   */
  isValidStorage(storage) {
    return storage &&
           typeof storage.key === 'string' &&
           typeof storage.line === 'number';
  },

  /**
   * Validate global structure
   */
  isValidGlobal(global) {
    return global &&
           typeof global.property === 'string' &&
           typeof global.line === 'number';
  },

  /**
   * Validate connection structure
   */
  isValidConnection(connection) {
    return connection &&
           typeof connection.id === 'string' &&
           typeof connection.sourceFile === 'string' &&
           typeof connection.targetFile === 'string' &&
           typeof connection.type === 'string';
  }
};
