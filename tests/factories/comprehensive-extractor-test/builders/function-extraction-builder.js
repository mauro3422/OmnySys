/**
 * @fileoverview Function Extraction Builder
 * 
 * Builder for function extraction test scenarios.
 * 
 * @module tests/factories/comprehensive-extractor-test/builders/function-extraction-builder
 */

export class FunctionExtractionBuilder {
  constructor() {
    this.code = '';
    this.functions = [];
  }

  withFunction(name, params = [], options = {}) {
    const {
      body = 'return null;',
      async = false,
      generator = false,
      exported = false,
      returnType = null
    } = options;

    const funcDef = {
      name,
      params,
      async,
      generator,
      exported,
      returnType
    };

    this.functions.push(funcDef);

    const exportStr = exported ? 'export ' : '';
    const asyncStr = async ? 'async ' : '';
    const genStr = generator ? '* ' : '';
    const paramStr = params.join(', ');
    const returnTypeStr = returnType ? `: ${returnType}` : '';

    this.code += `${exportStr}${asyncStr}function${genStr} ${name}(${paramStr})${returnTypeStr} {
  ${body}
}

`;

    return this;
  }

  withArrowFunction(name, params = [], options = {}) {
    const {
      body = 'null',
      async = false,
      exported = false,
      block = true
    } = options;

    const exportStr = exported ? 'export ' : '';
    const asyncStr = async ? 'async ' : '';
    const paramStr = params.join(', ');
    
    if (block) {
      this.code += `${exportStr}const ${name} = ${asyncStr}(${paramStr}) => {
  return ${body};
};

`;
    } else {
      this.code += `${exportStr}const ${name} = ${asyncStr}(${paramStr}) => ${body};

`;
    }

    return this;
  }

  withFunctionExpression(name, params = [], options = {}) {
    const {
      body = 'return null;',
      async = false,
      exported = false
    } = options;

    const exportStr = exported ? 'export ' : '';
    const asyncStr = async ? 'async ' : '';
    const paramStr = params.join(', ');

    this.code += `${exportStr}const ${name} = ${asyncStr}function(${paramStr}) {
  ${body}
};

`;

    return this;
  }

  withHigherOrderFunction(name, options = {}) {
    const { exported = false } = options;
    const exportStr = exported ? 'export ' : '';

    this.code += `${exportStr}function ${name}(fn) {
  return function(x) {
    return fn(x);
  };
}

`;

    return this;
  }

  withRecursiveFunction(name, param, options = {}) {
    const { exported = false } = options;
    const exportStr = exported ? 'export ' : '';

    this.code += `${exportStr}function ${name}(${param}) {
  if (${param} <= 1) return 1;
  return ${param} * ${name}(${param} - 1);
}

`;

    return this;
  }

  withComplexFunction(name, options = {}) {
    const {
      params = ['a', 'b', 'c'],
      complexity = 'medium',
      exported = false
    } = options;

    let body;
    switch (complexity) {
      case 'low':
        body = 'return a;';
        break;
      case 'medium':
        body = `if (a > 0) {
    return b + c;
  }
  for (let i = 0; i < 10; i++) {
    console.log(i);
  }
  return a;`;
        break;
      case 'high':
        body = `if (a > 0) {
    if (b > 0) {
      return c;
    } else if (b < 0) {
      return -c;
    }
  }
  switch (c) {
    case 1: return a;
    case 2: return b;
    default: return 0;
  }`;
        break;
      default:
        body = 'return null;';
    }

    return this.withFunction(name, params, { body, exported });
  }

  build() {
    return {
      code: this.code,
      functions: this.functions
    };
  }

  static simpleFunction(name = 'simpleFn') {
    return new FunctionExtractionBuilder()
      .withFunction(name, ['x', 'y'], { body: 'return x + y;' })
      .build();
  }

  static asyncFunction(name = 'asyncFn') {
    return new FunctionExtractionBuilder()
      .withFunction(name, ['url'], { async: true, body: 'return fetch(url);' })
      .build();
  }

  static generatorFunction(name = 'genFn') {
    return new FunctionExtractionBuilder()
      .withFunction(name, [], { generator: true, body: 'yield 1; yield 2; yield 3;' })
      .build();
  }

  static allFunctionTypes() {
    return new FunctionExtractionBuilder()
      .withFunction('regularFn', ['a'], { body: 'return a;' })
      .withArrowFunction('arrowFn', ['b'], { body: 'b * 2' })
      .withFunctionExpression('exprFn', ['c'], { body: 'return c;' })
      .withFunction('asyncFn', ['url'], { async: true, body: 'return fetch(url);' })
      .withFunction('genFn', [], { generator: true, body: 'yield 1;' })
      .build();
  }
}

export default FunctionExtractionBuilder;
