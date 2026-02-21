/**
 * Constructor test generator
 * @module mcp/tools/generate-tests/smart-test-generator/constructor-tests
 */

/**
 * Genera tests de constructor
 * @param {string} className - Class name
 * @returns {string} - Generated test code
 */
export function generateConstructorTests(className) {
  return `  describe('constructor', () => {
    it('should create instance with default values', () => {
      const builder = new ${className}();
      expect(builder).toBeInstanceOf(${className});
    });
  });

`;
}
