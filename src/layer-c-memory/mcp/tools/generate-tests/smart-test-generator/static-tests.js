/**
 * Static factory test generator
 * @module mcp/tools/generate-tests/smart-test-generator/static-tests
 */

/**
 * Genera tests de métodos estáticos factory
 * @param {Array} methods - Array of static methods
 * @param {string} className - Class name
 * @returns {string} - Generated test code
 */
export function generateStaticFactoryTests(methods, className) {
  let code = `  describe('static factory methods', () => {
`;
  
  methods.forEach(method => {
    code += `    it('should create instance via ${method.name}', () => {
      const result = ${className}.${method.name}();
      expect(result).toBeInstanceOf(${className});
    });

`;
  });
  
  code += `  });

`;
  return code;
}
