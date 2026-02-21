/**
 * Builder methods test generator
 * @module mcp/tools/generate-tests/smart-test-generator/builder-tests
 */

/**
 * Genera tests de métodos builder con valores específicos
 * @param {Array} methods - Array of builder methods
 * @param {string} className - Class name
 * @returns {string} - Generated test code
 */
export function generateBuilderMethodsTests(methods, className) {
  let code = `  describe('builder methods', () => {
`;
  
  methods.forEach(method => {
    const propertyName = method.name.replace(/^with/, '');
    const testValue = generateTestValueForProperty(propertyName);
    
    code += `    it('should configure ${propertyName} correctly', () => {
      const builder = new ${className}();
      const result = builder.${method.name}(${testValue});
      expect(result).toBe(builder); // Returns this for chaining
    });

`;
  });
  
  code += `  });

`;
  return code;
}

/**
 * Genera un valor de test apropiado basado en el nombre de la propiedad
 * @param {string} propertyName - Property name
 * @returns {string} - Generated test value
 */
function generateTestValueForProperty(propertyName) {
  const lower = propertyName.toLowerCase();
  
  // Booleanos
  if (lower.includes('enabled') || lower.includes('disabled') || 
      lower.includes('active') || lower.includes('valid')) {
    return 'true';
  }
  
  // Números
  if (lower.includes('count') || lower.includes('size') || 
      lower.includes('limit') || lower.includes('timeout')) {
    return '100';
  }
  
  // Strings comunes
  if (lower.includes('name') || lower.includes('type')) {
    return `'test-${lower}'`;
  }
  
  if (lower.includes('path') || lower.includes('file')) {
    return `'src/test/file.js'`;
  }
  
  if (lower.includes('source') || lower.includes('code')) {
    return `'const x = 1;'`;
  }
  
  // Arrays
  if (lower.includes('list') || lower.includes('items') || lower.endsWith('s')) {
    return '[]';
  }
  
  // Objetos
  if (lower.includes('config') || lower.includes('options') || lower.includes('data')) {
    return '{}';
  }
  
  // Funciones
  if (lower.includes('callback') || lower.includes('handler')) {
    return '() => {}';
  }
  
  // Default
  return '/* value */';
}
