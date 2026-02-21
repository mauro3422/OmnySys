/**
 * @fileoverview ClassExtractionBuilder
 * 
 * Builder para escenarios de extracción de clases.
 * 
 * @module tests/factories/comprehensive-extractor-test/builders/class-extraction-builder
 */

export class ClassExtractionBuilder {
  constructor() {
    this.code = '';
    this.classes = [];
  }

  withClass(name, options = {}) {
    const {
      extends: superClass = null,
      implements: interfaces = [],
      abstract = false,
      exported = false,
      methods = [],
      properties = [],
      decorators = []
    } = options;

    const classDef = {
      name,
      superClass,
      interfaces,
      abstract,
      exported,
      methods,
      properties,
      decorators
    };

    this.classes.push(classDef);
    
    // Generate code
    const exportStr = exported ? 'export ' : '';
    const abstractStr = abstract ? 'abstract ' : '';
    const extendsStr = superClass ? ` extends ${superClass}` : '';
    const implementsStr = interfaces.length > 0 
      ? ` implements ${interfaces.join(', ')}` 
      : '';

    let code = '';
    
    // Add decorators
    decorators.forEach(d => {
      code += `@${d}${d.includes('(') ? '' : '()'}\n`;
    });

    code += `${exportStr}${abstractStr}class ${name}${extendsStr}${implementsStr} {\n`;
    
    // Add properties
    properties.forEach(prop => {
      const staticStr = prop.static ? 'static ' : '';
      const readonlyStr = prop.readonly ? 'readonly ' : '';
      const privateStr = prop.private ? '#' : '';
      const typeStr = prop.type ? `: ${prop.type}` : '';
      code += `  ${staticStr}${readonlyStr}${privateStr}${prop.name}${typeStr};\n`;
    });

    if (properties.length > 0) code += '\n';

    // Add constructor
    if (!methods.find(m => m.name === 'constructor')) {
      code += `  constructor() {}\n\n`;
    }

    // Add methods
    methods.forEach(method => {
      const staticStr = method.static ? 'static ' : '';
      const asyncStr = method.async ? 'async ' : '';
      const privateStr = method.private ? '#' : '';
      const abstractStr = method.abstract ? 'abstract ' : '';
      const overrideStr = method.override ? 'override ' : '';
      const params = method.params?.join(', ') || '';
      const returnType = method.returnType ? `: ${method.returnType}` : '';
      
      if (method.kind === 'get' || method.kind === 'set') {
        code += `  ${staticStr}${abstractStr}${overrideStr}${method.kind} ${method.name}(${params})${returnType} {\n    ${method.body || 'return this._value;'}\n  }\n\n`;
      } else if (method.name === 'constructor') {
        code += `  ${method.name}(${params}) {\n    ${method.body || ''}\n  }\n\n`;
      } else {
        code += `  ${staticStr}${asyncStr}${abstractStr}${overrideStr}${privateStr}${method.name}(${params})${returnType} {\n    ${method.body || 'return null;'}\n  }\n\n`;
      }
    });

    code += `}\n\n`;
    this.code += code;
    
    return this;
  }

  withInheritanceChain(chain) {
    // chain: ['Base', 'Middle', 'Derived']
    for (let i = 0; i < chain.length; i++) {
      const name = chain[i];
      const superClass = i > 0 ? chain[i - 1] : null;
      this.withClass(name, { extends: superClass });
    }
    return this;
  }

  withMixin(className, mixinName, baseClass) {
    this.code += `class ${className} extends ${mixinName}(${baseClass}) {}\n\n`;
    return this;
  }

  withInterface(name, methods = []) {
    let code = `interface ${name} {\n`;
    methods.forEach(m => {
      const params = m.params?.join(', ') || '';
      const returnType = m.returnType || 'void';
      code += `  ${m.name}(${params}): ${returnType};\n`;
    });
    code += `}\n\n`;
    this.code += code;
    return this;
  }

  build() {
    return {
      code: this.code,
      classes: this.classes
    };
  }

  static simpleClass(name = 'SimpleClass') {
    return new ClassExtractionBuilder()
      .withClass(name, {
        methods: [{ name: 'method1', params: [] }]
      })
      .build();
  }

  static classWithInheritance(name = 'ChildClass') {
    return new ClassExtractionBuilder()
      .withClass('ParentClass', { methods: [{ name: 'parentMethod', params: [] }] })
      .withClass(name, { 
        extends: 'ParentClass',
        methods: [{ name: 'childMethod', params: [] }]
      })
      .build();
  }

  static abstractClass(name = 'AbstractBase') {
    return new ClassExtractionBuilder()
      .withClass(name, {
        abstract: true,
        methods: [
          { name: 'abstractMethod', params: [], abstract: true },
          { name: 'concreteMethod', params: [], body: 'return 1;' }
        ]
      })
      .build();
  }

  static classWithAllFeatures(name = 'FullClass') {
    return new ClassExtractionBuilder()
      .withClass(name, {
        exported: true,
        implements: ['Interface1', 'Interface2'],
        decorators: ['Component', 'Injectable'],
        properties: [
          { name: 'publicProp', type: 'string' },
          { name: 'privateProp', private: true, type: 'number' },
          { name: 'staticProp', static: true, type: 'boolean' }
        ],
        methods: [
          { name: 'constructor', params: ['props'] },
          { name: 'publicMethod', params: ['a', 'b'], body: 'return a + b;' },
          { name: 'privateMethod', private: true, params: [], body: 'return;' },
          { name: 'staticMethod', static: true, params: [], body: 'return "static";' },
          { name: 'asyncMethod', async: true, params: ['url'], body: 'return fetch(url);' },
          { name: 'getter', kind: 'get', params: [], body: 'return this._value;' },
          { name: 'setter', kind: 'set', params: ['value'], body: 'this._value = value;' }
        ]
      })
      .build();
  }
}
