/**
 * @fileoverview Data Structures Visitor - Detecta estructuras de datos
 * 
 * Detecta:
 * - ObjectExpression: { a: 1, b: 2 }
 * - ArrayExpression: [1, 2, 3]
 * - SpreadElement: ...obj, ...arr
 * - ObjectPattern: const { a, b } = obj
 * - ArrayPattern: const [a, b] = arr
 * 
 * @module data-flow-v2/visitors/data-structures-visitor
 */

export class DataStructuresVisitor {
  constructor(context) {
    this.context = context;
    this.builder = context.builder;
    this.scope = context.scope;
  }

  visit(ast) {
    this.traverse(ast, {
      ObjectExpression: (path) => this.visitObjectExpression(path),
      ArrayExpression: (path) => this.visitArrayExpression(path),
      SpreadElement: (path) => this.visitSpreadElement(path),
      ObjectPattern: (path) => this.visitObjectPattern(path),
      ArrayPattern: (path) => this.visitArrayPattern(path)
    });
  }

  traverse(node, visitors, path = []) {
    if (!node || typeof node !== 'object') return;

    const nodeType = node.type;
    if (visitors[nodeType]) {
      visitors[nodeType]({ node, path });
    }

    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'loc') continue;
      
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach((c, i) => this.traverse(c, visitors, [...path, key, i]));
      } else if (child && typeof child === 'object') {
        this.traverse(child, visitors, [...path, key]);
      }
    }
  }

  visitObjectExpression({ node }) {
    // { prop1: value1, prop2: value2, ...spread }
    
    const properties = [];
    const spreads = [];

    for (const prop of node.properties || []) {
      if (prop.type === 'ObjectProperty') {
        properties.push({
          key: prop.key?.name || prop.key?.value,
          value: this.extractValue(prop.value),
          shorthand: prop.shorthand,
          computed: prop.computed
        });
      } else if (prop.type === 'SpreadElement') {
        spreads.push({
          source: this.extractValue(prop.argument),
          type: 'object_spread'
        });
      }
    }

    const nodeId = this.builder.addNode({
      type: 'OBJECT_CREATE',
      category: 'structural',
      standardToken: 'STRUCT_OBJ',
      inputs: [
        ...spreads.map(s => s.source),
        ...properties.map(p => p.value)
      ],
      output: {
        name: this.getAssignmentTarget(node),
        type: 'object',
        shape: properties.map(p => p.key).join(', ')
      },
      properties: {
        isPure: true,
        propCount: properties.length,
        spreadCount: spreads.length,
        hasComputed: properties.some(p => p.computed)
      },
      location: node.loc
    });

    this.context.transforms.push({
      type: 'OBJECT_LITERAL',
      properties: properties.map(p => p.key),
      spreadCount: spreads.length,
      nodeId,
      line: node.loc?.start?.line
    });
  }

  visitArrayExpression({ node }) {
    // [elem1, elem2, ...spread]
    
    const elements = [];
    const spreads = [];

    for (const [index, elem] of (node.elements || []).entries()) {
      if (!elem) {
        elements.push({ type: 'empty', index });
      } else if (elem.type === 'SpreadElement') {
        spreads.push({
          source: this.extractValue(elem.argument),
          index,
          type: 'array_spread'
        });
      } else {
        elements.push({
          type: 'element',
          index,
          value: this.extractValue(elem)
        });
      }
    }

    this.builder.addNode({
      type: 'ARRAY_CREATE',
      category: 'structural',
      standardToken: 'STRUCT_ARR',
      inputs: [
        ...spreads.map(s => s.source),
        ...elements.filter(e => e.value).map(e => e.value)
      ],
      output: {
        name: this.getAssignmentTarget(node),
        type: 'array',
        length: elements.length
      },
      properties: {
        isPure: true,
        elementCount: elements.length,
        spreadCount: spreads.length,
        hasEmptySlots: elements.some(e => e.type === 'empty')
      },
      location: node.loc
    });
  }

  visitSpreadElement({ node, path }) {
    // ...expression
    // Nota: Esto se maneja típicamente dentro de ObjectExpression o ArrayExpression
    // pero también puede estar en llamadas: func(...args)
    
    const parent = path[path.length - 1];
    const context = parent?.type || 'unknown';
    
    const source = this.extractValue(node.argument);

    this.context.transforms.push({
      type: 'SPREAD',
      context, // 'CallExpression', 'ArrayExpression', 'ObjectExpression'
      source: source.name || source.value || '[expression]',
      line: node.loc?.start?.line
    });
  }

  visitObjectPattern({ node }) {
    // const { a, b: c, ...rest } = obj
    // o parámetro: function({ a, b }) {}
    
    const properties = [];
    let restElement = null;

    for (const prop of node.properties || []) {
      if (prop.type === 'ObjectProperty') {
        properties.push({
          key: prop.key?.name,
          value: prop.value?.name, // Nombre de la variable asignada
          shorthand: prop.shorthand
        });
      } else if (prop.type === 'RestElement') {
        restElement = {
          name: prop.argument?.name,
          type: 'rest'
        };
      }
    }

    // Esto típicamente está en VariableDeclarator o parámetro de función
    // El source vendrá del init de VariableDeclarator
    
    this.context.transforms.push({
      type: 'DESTRUCTURE_OBJECT',
      properties: properties.map(p => p.key),
      hasRest: !!restElement,
      restName: restElement?.name,
      line: node.loc?.start?.line
    });
  }

  visitArrayPattern({ node }) {
    // const [a, b, ...rest] = arr
    // o parámetro: function([a, b]) {}

    const elements = [];
    let restElement = null;

    for (const [index, elem] of (node.elements || []).entries()) {
      if (!elem) {
        elements.push({ type: 'skip', index });
      } else if (elem.type === 'RestElement') {
        restElement = {
          name: elem.argument?.name,
          index
        };
      } else if (elem.type === 'Identifier') {
        elements.push({
          type: 'binding',
          index,
          name: elem.name
        });
        
        // Registrar en scope
        this.scope.registerVariable(elem.name, {
          type: 'destructured',
          source: 'array',
          index
        });
      }
    }

    this.context.transforms.push({
      type: 'DESTRUCTURE_ARRAY',
      bindings: elements.filter(e => e.name).map(e => e.name),
      hasRest: !!restElement,
      restName: restElement?.name,
      line: node.loc?.start?.line
    });
  }

  // Helpers

  extractValue(node) {
    if (!node) return { type: 'undefined' };

    switch (node.type) {
      case 'Identifier':
        return {
          type: 'variable',
          name: node.name,
          isParam: this.scope.isParam(node.name)
        };

      case 'Literal':
        return {
          type: 'literal',
          value: node.value,
          raw: node.raw,
          dataType: typeof node.value
        };

      case 'ObjectExpression':
        return {
          type: 'object_literal',
          description: '{ ... }'
        };

      case 'ArrayExpression':
        return {
          type: 'array_literal',
          description: '[ ... ]',
          length: node.elements?.length || 0
        };

      case 'MemberExpression':
        return {
          type: 'property_access',
          object: node.object?.name,
          property: node.property?.name || node.property?.value,
          computed: node.computed
        };

      case 'SpreadElement':
        return {
          type: 'spread',
          source: this.extractValue(node.argument)
        };

      default:
        return {
          type: node.type,
          description: '[expression]'
        };
    }
  }

  getAssignmentTarget(node) {
    // Intentar encontrar el target de asignación
    // Esto es simplificado - en producción necesitaríamos acceso al AST padre
    return null;
  }
}

export default DataStructuresVisitor;
