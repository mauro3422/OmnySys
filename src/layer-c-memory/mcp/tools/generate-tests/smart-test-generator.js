/**
 * @fileoverview Smart Test Generator
 * 
 * Generador inteligente de tests que usa el grafo de conocimiento
 * del sistema para crear tests que siguen las convenciones del proyecto.
 * 
 * @module mcp/tools/generate-tests/smart-test-generator
 */

import { createLogger } from '../../../../utils/logger.js';
import { resolveFactory, resolveFactoryImportPath } from './factory-catalog.js';

const logger = createLogger('OmnySys:smart-test-generator');

/**
 * Genera código de test inteligente para una clase
 * Usa metadatos del sistema para determinar imports, ubicación y estructura
 */
export async function generateSmartClassTests(classInfo, filePath, projectPath, impactMap, options = {}) {
  const { 
    includeChainingTests = true, 
    includeImmutabilityTests = true,
    maxTests = 50 // Limitar para no saturar
  } = options;
  
  const className = classInfo.name;
  
  logger.info(`[SmartGenerator] Generating smart tests for ${className}`);
  
  // 1. Determinar el import path correcto usando factory catalog
  const importInfo = determineImportPath(filePath, className, projectPath);
  
  // 2. Filtrar métodos que realmente pertenecen a esta clase
  const validMethods = filterValidMethods(classInfo.methods || [], className, impactMap);
  const validStaticMethods = filterValidMethods(classInfo.staticMethods || [], className, impactMap);
  
  // 3. Determinar ubicación sugerida del test
  const testLocation = suggestTestLocation(filePath, className, projectPath);
  
  // 4. Calcular métricas antes de generar
  const builderMethods = validMethods.filter(m => m.name.startsWith('with')).slice(0, 10);
  const hasBuildMethod = validMethods.some(m => m.name === 'build');
  
  // 5. Generar código
  let code = generateTestFileHeader(importInfo, className);
  
  code += generateDescribeBlock(className, () => {
    let testCode = '';
    
    // Constructor tests
    testCode += generateConstructorTests(className);
    
    // Builder method tests (limitados)
    if (builderMethods.length > 0) {
      testCode += generateBuilderMethodsTests(builderMethods, className);
    }
    
    // Build method tests
    if (hasBuildMethod) {
      testCode += generateBuildMethodTests(className);
    }
    
    // Chaining tests
    if (includeChainingTests && builderMethods.length > 0) {
      testCode += generateChainingTests(builderMethods.slice(0, 5), className);
    }
    
    // Immutability tests
    if (includeImmutabilityTests && hasBuildMethod) {
      testCode += generateImmutabilityTests(className);
    }
    
    // Static factory tests (limitados)
    if (validStaticMethods.length > 0) {
      testCode += generateStaticFactoryTests(validStaticMethods.slice(0, 5), className);
    }
    
    return testCode;
  });
  
  return {
    code,
    testLocation,
    importInfo,
    metrics: {
      totalTests: countTests(code),
      constructorTests: 1,
      builderMethodTests: builderMethods.length,
      chainingTests: includeChainingTests && builderMethods.length > 0 ? 1 : 0,
      immutabilityTests: includeImmutabilityTests && hasBuildMethod ? 2 : 0,
      staticTests: Math.min(validStaticMethods.length, 5)
    },
    recommendations: generateRecommendations(validMethods, validStaticMethods, className)
  };
}

/**
 * Determina el path de import correcto basado en el factory catalog
 * Usa aliases del proyecto (#tests/, #src/, etc.)
 */
function determineImportPath(filePath, className, projectPath) {
  // Intentar resolver usando factory catalog
  const factoryEntry = resolveFactory(filePath);
  
  if (factoryEntry) {
    return {
      type: 'factory',
      path: factoryEntry.factoryPath,
      importPath: `#${factoryEntry.factoryPath.replace('.js', '').replace(/\//g, '/')}`,
      builderName: className
    };
  }
  
  // Para factories de test, usar alias #tests/
  if (filePath.includes('tests/factories/')) {
    // Verificar si existe un index.js
    const hasIndex = filePath.includes('/builders.js') || filePath.includes('/index.js');
    const basePath = filePath.replace('tests/', '#tests/').replace('.js', '');
    
    return {
      type: 'test-factory',
      path: filePath,
      importPath: hasIndex ? `${basePath}/index` : basePath,
      builderName: className
    };
  }
  
  // Para código fuente en src/, usar alias #
  if (filePath.startsWith('src/')) {
    return {
      type: 'source',
      path: filePath,
      importPath: `#${filePath.replace('src/', '').replace('.js', '')}`,
      builderName: className
    };
  }
  
  // Fallback: sugerir crear factory
  return {
    type: 'suggested',
    path: filePath,
    importPath: `#${filePath.replace('.js', '')}`,
    builderName: className,
    suggestion: `Consider creating a factory in tests/factories/ for ${className}`
  };
}

/**
 * Filtra métodos válidos basado en el impact map
 */
function filterValidMethods(methods, className, impactMap) {
  if (!impactMap || !impactMap.definitions) {
    // Sin impact map, usar todos los métodos
    return methods;
  }
  
  // Obtener nombres de métodos reales desde el impact map
  const validMethodNames = new Set(
    impactMap.definitions
      .filter(d => d.type === 'method' && d.name.startsWith(`${className}.`))
      .map(d => d.name.replace(`${className}.`, ''))
  );
  
  // Filtrar solo métodos que existen en la clase
  return methods.filter(m => validMethodNames.has(m.name));
}

/**
 * Sugiere ubicación para el archivo de test
 */
function suggestTestLocation(sourceFilePath, className, projectPath) {
  const isTestFactory = sourceFilePath.includes('tests/factories/');
  
  if (isTestFactory) {
    // Para factories, tests van junto a los builders o en tests/unit/
    const basePath = sourceFilePath.replace('tests/factories/', '').replace('.js', '');
    return {
      primary: `tests/unit/factories/${basePath}.test.js`,
      alternative: `tests/factories/${basePath}.test.js`,
      reasoning: 'Factories should have unit tests in tests/unit/factories/'
    };
  }
  
  // Para código fuente, seguir estructura mirror
  const relativePath = sourceFilePath.replace(/^src\//, '');
  return {
    primary: `tests/unit/${relativePath.replace('.js', '.test.js')}`,
    alternative: `tests/integration/${relativePath.replace('.js', '.test.js')}`,
    reasoning: 'Follows project structure: tests/unit mirrors src/'
  };
}

/**
 * Genera header del archivo de test
 */
function generateTestFileHeader(importInfo, className) {
  let code = `/**
 * @fileoverview ${className} Tests
 * 
 * Tests auto-generated for ${className}
 * Pattern: ${importInfo.type === 'factory' ? 'Builder' : 'Standard'}
 * 
 * @module ${importInfo.path.replace('.js', '').replace(/\//g, '/')}
 */

import { describe, it, expect } from 'vitest';
`;
  
  if (importInfo.type === 'factory') {
    code += `import { ${className} } from '${importInfo.importPath}';
`;
  } else {
    code += `import { ${className} } from '${importInfo.importPath}';
`;
  }
  
  code += `
`;
  
  return code;
}

/**
 * Genera bloque describe
 */
function generateDescribeBlock(name, contentFn) {
  return `describe('${name}', () => {
${contentFn()}
});
`;
}

/**
 * Genera tests de constructor
 */
function generateConstructorTests(className) {
  return `  describe('constructor', () => {
    it('should create instance with default values', () => {
      const builder = new ${className}();
      expect(builder).toBeInstanceOf(${className});
    });
  });

`;
}

/**
 * Genera tests de métodos builder con valores específicos
 */
function generateBuilderMethodsTests(methods, className) {
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

/**
 * Genera tests del método build
 */
function generateBuildMethodTests(className) {
  return `  describe('build', () => {
    it('should build with default configuration', () => {
      const builder = new ${className}();
      const result = builder.build();
      expect(result).toBeDefined();
    });

    it('should build with custom configuration', () => {
      const builder = new ${className}();
      // Configure builder...
      const result = builder.build();
      expect(result).toBeDefined();
    });
  });

`;
}

/**
 * Genera tests de chaining
 */
function generateChainingTests(methods, className) {
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

/**
 * Genera tests de inmutabilidad
 */
function generateImmutabilityTests(className) {
  return `  describe('immutability', () => {
    it('should not mutate builder on build', () => {
      const builder = new ${className}();
      const before = { ...builder };
      builder.build();
      expect(builder).toEqual(before);
    });

    it('should return new object on each build', () => {
      const builder = new ${className}();
      const result1 = builder.build();
      const result2 = builder.build();
      expect(result1).not.toBe(result2);
    });
  });

`;
}

/**
 * Genera tests de métodos estáticos factory
 */
function generateStaticFactoryTests(methods, className) {
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

/**
 * Cuenta tests en el código generado
 */
function countTests(code) {
  const matches = code.match(/it\(/g);
  return matches ? matches.length : 0;
}

/**
 * Genera recomendaciones basadas en el análisis
 */
function generateRecommendations(methods, staticMethods, className) {
  const recommendations = [];
  
  if (methods.length > 20) {
    recommendations.push(`⚠️ Class has ${methods.length} methods - consider splitting into smaller builders`);
  }
  
  if (!methods.some(m => m.name === 'build')) {
    recommendations.push(`⚠️ No 'build' method found - may not be a builder pattern`);
  }
  
  if (staticMethods.length === 0) {
    recommendations.push(`💡 Consider adding static factory methods (e.g., ${className}.create())`);
  }
  
  return recommendations;
}

export default {
  generateSmartClassTests
};
