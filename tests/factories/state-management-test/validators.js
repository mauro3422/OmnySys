/**
 * @fileoverview State Management Test Factory - Validators
 */

export const StateManagementValidators = {
  /**
   * Validate extraction result structure
   */
  isValidExtractionResult(result) {
    return result && 
           typeof result === 'object' &&
           (Array.isArray(result.selectors) || Array.isArray(result.slices) || 
            Array.isArray(result.contexts) || Array.isArray(result.providers) ||
            Array.isArray(result.consumers));
  },

  /**
   * Validate slice structure
   */
  isValidSlice(slice) {
    return slice && 
           typeof slice.name === 'string' &&
           typeof slice.type === 'string' &&
           typeof slice.line === 'number';
  },

  /**
   * Validate selector structure
   */
  isValidSelector(selector) {
    return selector && 
           typeof selector.type === 'string' &&
           typeof selector.line === 'number' &&
           (selector.body === undefined || typeof selector.body === 'string');
  },

  /**
   * Validate context structure
   */
  isValidContext(context) {
    return context && 
           typeof context.type === 'string' &&
           typeof context.line === 'number';
  },

  /**
   * Validate connection structure
   */
  isValidConnection(connection) {
    return connection && 
           typeof connection.id === 'string' &&
           typeof connection.sourceFile === 'string' &&
           typeof connection.targetFile === 'string' &&
           typeof connection.type === 'string' &&
           typeof connection.confidence === 'number';
  },

  /**
   * Validate has required Redux fields
   */
  hasReduxFields(result) {
    return result &&
           Array.isArray(result.selectors) &&
           Array.isArray(result.actions) &&
           Array.isArray(result.reducers) &&
           Array.isArray(result.stores) &&
           Array.isArray(result.thunks);
  },

  /**
   * Validate has required Context fields
   */
  hasContextFields(result) {
    return result &&
           Array.isArray(result.contexts) &&
           Array.isArray(result.providers) &&
           Array.isArray(result.consumers);
  }
};


