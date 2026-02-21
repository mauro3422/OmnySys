/**
 * Chaining test generator
 * @module mcp/tools/generate-tests/smart-test-generator/chaining-tests
 */

/**
 * Genera tests de chaining
 * @param {Array} methods - Array of builder methods
 * @param {string} className - Class name
 * @returns {string} - Generated test code
 */
export function generateChainingTests(methods, className) {
  const chain = methods.slice(0, 3).map(m => `.${m.name}(/* value */)`).join('');
  
  return `  describe('chaining', () => {
    it('should support method chaining', () => {
      const builder = new ${className}();
      const result = builder${chain};
      expect(result).toBe(builder);
    });
  });

`;
}
