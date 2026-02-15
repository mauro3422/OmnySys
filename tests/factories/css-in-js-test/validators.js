/**
 * @fileoverview CSS-in-JS Test Factory - Validators
 */

export const CSSInJSValidators = {
  /**
   * Validate styled component structure
   */
  isValidStyledComponent(component) {
    return component &&
           typeof component.type === 'string' &&
           typeof component.line === 'number';
  },

  /**
   * Validate theme structure
   */
  isValidTheme(theme) {
    return theme &&
           typeof theme.type === 'string' &&
           typeof theme.line === 'number';
  },

  /**
   * Validate global style structure
   */
  isValidGlobalStyle(globalStyle) {
    return globalStyle &&
           typeof globalStyle.type === 'string' &&
           typeof globalStyle.line === 'number' &&
           typeof globalStyle.css === 'string';
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


