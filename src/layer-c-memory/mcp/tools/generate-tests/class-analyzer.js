/**
 * @fileoverview Class Analyzer for Test Generation
 * 
 * Analiza clases y genera tests específicos para el patrón builder
 * y otros patrones de clase comunes.
 * 
 * @module mcp/tools/generate-tests/class-analyzer
 */

import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:class-analyzer');

/**
 * Analiza una clase y genera tests sugeridos para sus métodos
 * Especializado en el patrón builder
 */
export async function analyzeClassForTests(classInfo, projectPath) {
  const tests = [];
  const methods = classInfo.methods || [];
  const staticMethods = classInfo.staticMethods || [];
  const className = classInfo.name;
  
  logger.info(`[ClassAnalyzer] Analyzing class: ${className} with ${methods.length} methods`);
  
  // Test 1: Constructor
  tests.push(...createConstructorTests(classInfo));
  
  // Test 2: Métodos de builder (withX)
  const builderMethods = methods.filter(m => m.name.startsWith('with'));
  tests.push(...createBuilderMethodTests(builderMethods, className));
  
  // Test 3: Método build
  const buildMethod = methods.find(m => m.name === 'build');
  if (buildMethod) {
    tests.push(...createBuildMethodTests(buildMethod, classInfo));
  }
  
  // Test 4: Métodos estáticos (factory methods)
  tests.push(...createStaticMethodTests(staticMethods, className));
  
  // Test 5: Tests de chaining (que métodos retornen this)
  if (builderMethods.length > 0) {
    tests.push(...createChainingTests(builderMethods, className));
  }
  
  // Test 6: Tests de inmutabilidad (que no muten el builder)
  tests.push(...createImmutabilityTests(classInfo, methods));
  
  // Deduplicate by test name
  const seen = new Set();
  return tests.filter(t => {
    if (seen.has(t.name)) return false;
    seen.add(t.name);
    return true;
  });
}

/**
 * Crea tests para el constructor
 */
function createConstructorTests(classInfo) {
  const tests = [];
  const className = classInfo.name;
  
  tests.push({
    name: `should create ${className} instance with default values`,
    type: 'constructor',
    description: 'Constructor con valores por defecto',
    priority: 'high',
    setup: `const builder = new ${className}();`,
    assertion: `expect(builder).toBeInstanceOf(${className});`,
    method: 'constructor'
  });
  
  // Si el constructor recibe parámetros
  if (classInfo.constructorParams && classInfo.constructorParams.length > 0) {
    tests.push({
      name: `should create ${className} instance with provided values`,
      type: 'constructor',
      description: 'Constructor con valores proporcionados',
      priority: 'high',
      setup: `const builder = new ${className}(/* params */);`,
      assertion: `expect(builder).toBeInstanceOf(${className});`,
      method: 'constructor'
    });
  }
  
  return tests;
}

/**
 * Crea tests para métodos de builder (withX)
 */
function createBuilderMethodTests(methods, className) {
  return methods.map(method => ({
    name: `should set ${method.name.slice(4)} correctly`,
    type: 'builder-method',
    description: `Método ${method.name} configura el valor correctamente`,
    priority: 'high',
    setup: `const builder = new ${className}();`,
    action: `const result = builder.${method.name}(/* value */);`,
    assertion: `expect(result).toBe(builder); // Returns this for chaining`,
    method: method.name
  }));
}

/**
 * Crea tests para el método build
 */
function createBuildMethodTests(buildMethod, classInfo) {
  const tests = [];
  const className = classInfo.name;
  
  tests.push({
    name: 'should build valid object with default values',
    type: 'build',
    description: 'Build retorna objeto válido con valores por defecto',
    priority: 'high',
    setup: `const builder = new ${className}();`,
    action: 'const result = builder.build();',
    assertion: 'expect(result).toBeDefined();',
    method: 'build'
  });
  
  tests.push({
    name: 'should build object with configured values',
    type: 'build',
    description: 'Build retorna objeto con valores configurados',
    priority: 'high',
    setup: `const builder = new ${className}();\n// Configure builder`,
    action: 'const result = builder.build();',
    assertion: 'expect(result).toBeDefined();',
    method: 'build'
  });
  
  return tests;
}

/**
 * Crea tests para métodos estáticos (factory methods)
 */
function createStaticMethodTests(methods, className) {
  return methods.map(method => ({
    name: `should create instance via ${method.name}`,
    type: 'static-factory',
    description: `Método estático ${method.name} crea instancia correctamente`,
    priority: 'high',
    setup: '',
    action: `const result = ${className}.${method.name}(/* params */);`,
    assertion: `expect(result).toBeInstanceOf(${className});`,
    method: method.name
  }));
}

/**
 * Crea tests de chaining (que métodos retornen this)
 */
function createChainingTests(methods, className) {
  const tests = [];
  
  // Test individual de chaining para cada método
  methods.forEach(method => {
    tests.push({
      name: `should return this for chaining from ${method.name}`,
      type: 'chaining',
      description: `${method.name} retorna this para chaining`,
      priority: 'medium',
      setup: `const builder = new ${className}();`,
      action: `const result = builder.${method.name}(/* value */);`,
      assertion: 'expect(result).toBe(builder);',
      method: method.name
    });
  });
  
  // Test de chaining múltiple
  if (methods.length > 1) {
    const chain = methods.slice(0, 3).map(m => `.${m.name}(/* value */)`).join('');
    tests.push({
      name: 'should support method chaining',
      type: 'chaining',
      description: 'Múltiples métodos pueden encadenarse',
      priority: 'medium',
      setup: `const builder = new ${className}();`,
      action: `const result = builder${chain};`,
      assertion: 'expect(result).toBe(builder);',
      method: 'chaining'
    });
  }
  
  return tests;
}

/**
 * Crea tests de inmutabilidad
 */
function createImmutabilityTests(classInfo, methods) {
  const tests = [];
  const className = classInfo.name;
  const builderMethods = methods.filter(m => m.name.startsWith('with'));
  
  if (builderMethods.length === 0) return tests;
  
  tests.push({
    name: 'should not mutate builder when calling build',
    type: 'immutability',
    description: 'Build no muta el estado del builder',
    priority: 'medium',
    setup: `const builder = new ${className}();\nconst original = { ...builder };`,
    action: 'builder.build();',
    assertion: 'expect(builder).toEqual(original);',
    method: 'immutability'
  });
  
  // Test que build retorna objeto nuevo cada vez
  tests.push({
    name: 'should return new object on each build call',
    type: 'immutability',
    description: 'Cada llamada a build retorna nueva instancia',
    priority: 'medium',
    setup: `const builder = new ${className}();`,
    action: 'const result1 = builder.build();\nconst result2 = builder.build();',
    assertion: 'expect(result1).not.toBe(result2);',
    method: 'immutability'
  });
  
  return tests;
}

/**
 * Detecta si una clase sigue el patrón builder
 */
export function isBuilderPattern(classInfo) {
  const methods = classInfo.methods || [];
  const hasWithMethods = methods.some(m => m.name.startsWith('with'));
  const hasBuildMethod = methods.some(m => m.name === 'build');
  
  return hasWithMethods && hasBuildMethod;
}

/**
 * Extrae información de métodos de una clase desde el código fuente
 */
export function extractClassMethods(sourceCode, className) {
  const methods = [];
  const staticMethods = [];
  
  // Regex simple para detectar métodos (mejorado con AST en producción)
  const methodRegex = /(?:(static)\s+)?(\w+)\s*\([^)]*\)\s*{/g;
  
  let match;
  while ((match = methodRegex.exec(sourceCode)) !== null) {
    const isStatic = !!match[1];
    const methodName = match[2];
    
    // Ignorar constructor
    if (methodName === 'constructor') continue;
    
    const methodInfo = {
      name: methodName,
      isStatic,
      line: sourceCode.substring(0, match.index).split('\n').length
    };
    
    if (isStatic) {
      staticMethods.push(methodInfo);
    } else {
      methods.push(methodInfo);
    }
  }
  
  return { methods, staticMethods };
}

export default {
  analyzeClassForTests,
  isBuilderPattern,
  extractClassMethods
};
