/**
 * @fileoverview Comprehensive Extractor Test Factory - Validation
 */

export class ExtractionValidator {
  static isValidExtractionResult(result) {
    return result !== null && 
           result !== undefined && 
           typeof result === 'object' &&
           !result.error;
  }

  static hasFunctions(result) {
    return result.functions && 
           Array.isArray(result.functions.functions);
  }

  static hasClasses(result) {
    return result.classes && 
           Array.isArray(result.classes.classes);
  }

  static hasImports(result) {
    return result.imports && 
           Array.isArray(result.imports.all);
  }

  static hasExports(result) {
    return result.exports && 
           Array.isArray(result.exports.all);
  }

  static hasMetadata(result) {
    return result.basic && 
           typeof result.basic === 'object';
  }

  static hasMetrics(result) {
    return result.metrics && 
           typeof result.metrics === 'object';
  }

  static hasPatterns(result) {
    return result.patterns && 
           typeof result.patterns === 'object';
  }

  static validateCompleteness(result, minCompleteness = 0) {
    return result._meta && 
           typeof result._meta.completeness === 'number' &&
           result._meta.completeness >= minCompleteness;
  }

  static validateFunction(func) {
    return func &&
           typeof func.name === 'string' &&
           typeof func.start === 'number';
  }

  static validateClass(cls) {
    return cls &&
           typeof cls.name === 'string' &&
           typeof cls.start === 'number';
  }

  static validateImport(imp) {
    return imp &&
           typeof imp.source === 'string' &&
           typeof imp.type === 'string';
  }

  static validateExport(exp) {
    return exp &&
           (typeof exp.name === 'string' || Array.isArray(exp.names));
  }
}

// ============================================
// TEST CONSTANTS
// ============================================

export const TestConstants = {
  VALID_JS_FILE: 'test/file.js',
  VALID_TS_FILE: 'test/file.ts',
  VALID_TSX_FILE: 'test/file.tsx',
  VALID_JSX_FILE: 'test/file.jsx',
  
  DETAIL_LEVELS: {
    MINIMAL: 'minimal',
    STANDARD: 'standard',
    DETAILED: 'detailed'
  },

  EXTRACTOR_TYPES: {
    FUNCTIONS: 'functions',
    CLASSES: 'classes',
    IMPORTS: 'imports',
    EXPORTS: 'exports'
  },

  IMPORT_TYPES: {
    NAMED: 'NamedImport',
    DEFAULT: 'DefaultImport',
    NAMESPACE: 'NamespaceImport',
    SIDE_EFFECT: 'SideEffectImport',
    COMMONJS: 'CommonJSRequire'
  },

  EXPORT_TYPES: {
    NAMED: 'NamedExport',
    DEFAULT: 'DefaultExport',
    RE_EXPORT: 'ReExport',
    EXPORT_ALL: 'ExportAll',
    COMMONJS: 'CommonJSExport'
  },

  PATTERNS: {
    SINGLETON: 'singleton',
    FACTORY: 'factory',
    BARREL: 'barrel',
    REACT: 'react'
  }
};

// ============================================
// MOCK UTILITIES
// ============================================

/**
 * Create mock extraction results for testing
 */
export function createMockExtractionResult(options = {}) {
  const {
    hasFunctions = true,
    hasClasses = true,
    hasImports = true,
    hasExports = true,
    hasMetrics = true,
    hasPatterns = true,
    completeness = 100
  } = options;

  const result = {
    basic: {
      filePath: 'test/mock.js',
      size: 1000,
      lineCount: 50,
      hasImports: hasImports,
      hasExports: hasExports,
      isTestFile: false,
      isConfigFile: false,
      isTypeScript: false,
      isJSX: false
    },
    _meta: {
      extractorCount: 0,
      extractionTime: 10,
      completeness,
      timestamp: new Date().toISOString(),
      version: '3.0.0-test'
    },
    needsLLM: completeness < 50
  };

  if (hasFunctions) {
    result.functions = {
      functions: [],
      arrowFunctions: [],
      totalCount: 0,
      asyncCount: 0,
      _metadata: { success: true }
    };
    result.asyncPatterns = {
      hasAsyncAwait: false,
      hasPromises: false,
      asyncFunctionCount: 0,
      awaitCount: 0
    };
    result._meta.extractorCount++;
  }

  if (hasClasses) {
    result.classes = {
      classes: [],
      count: 0,
      inheritanceDepth: 0,
      _metadata: { success: true }
    };
    result._meta.extractorCount++;
  }

  if (hasImports) {
    result.imports = {
      all: [],
      named: [],
      defaultImports: [],
      namespace: [],
      sideEffect: [],
      commonjs: [],
      dynamicImports: [],
      metrics: {},
      _metadata: { success: true }
    };
    result._meta.extractorCount++;
  }

  if (hasExports) {
    result.exports = {
      all: [],
      named: [],
      defaultExport: null,
      reExports: [],
      exportAll: [],
      assignments: [],
      patterns: {},
      metrics: {},
      _metadata: { success: true }
    };
    result._meta.extractorCount++;
  }

  if (hasMetrics) {
    result.metrics = {
      totalConstructs: 0,
      complexity: { cyclomatic: 0, cognitive: 0 },
      maintainability: { score: 100, factors: [] }
    };
  }

  if (hasPatterns) {
    result.patterns = {
      architectural: [],
      structural: [],
      behavioral: []
    };
  }

  return result;
}
