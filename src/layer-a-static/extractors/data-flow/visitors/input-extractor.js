/**
 * @fileoverview Input Extractor - Extrae inputs (parámetros) de funciones
 * 
 * Detecta:
 * - Parámetros posicionales: function(a, b)
 * - Parámetros con default: function(a = 1)
 * - Destructuring: function({ name, email })
 * - Rest params: function(...args)
 * 
 * Y sus usos en el cuerpo de la función.
 * 
 * @module extractors/data-flow/visitors/input-extractor
 */

import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:data-flow:input-extractor');

/**
 * Extrae inputs de una función
 */
export class InputExtractor {
  constructor(functionCode, functionName) {
    this.code = functionCode;
    this.functionName = functionName;
    this.inputs = [];
    this.usages = new Map(); // inputName -> usages[]
  }

  /**
   * Extrae todos los inputs del AST de la función
   */
  extract(functionAst) {
    try {
      // Encontrar el nodo de la función
      const functionNode = this.findFunctionNode(functionAst);
      if (!functionNode) {
        logger.debug(`No function node found in ${this.functionName}`);
        return [];
      }

      // Extraer parámetros
      this.extractParameters(functionNode);

      // Encontrar usos de cada parámetro
      this.findUsages(functionNode);

      // Combinar inputs con sus usos
      return this.buildInputsWithUsages();

    } catch (error) {
      logger.warn(`Error extracting inputs: ${error.message}`);
      return [];
    }
  }

  /**
   * Encuentra el nodo de función en el AST
   */
  findFunctionNode(ast) {
    // Si ya es un nodo de función, retornarlo
    if (ast && (ast.type === 'FunctionDeclaration' || 
                ast.type === 'FunctionExpression' || 
                ast.type === 'ArrowFunctionExpression')) {
      return ast;
    }

    // Buscar en el body del programa
    if (ast && ast.type === 'File' && ast.program) {
      const body = ast.program.body || [];
      for (const node of body) {
        if (node.type === 'FunctionDeclaration') {
          return node;
        }
        if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'FunctionDeclaration') {
          return node.declaration;
        }
        if (node.type === 'ExportDefaultDeclaration' && 
            (node.declaration?.type === 'FunctionDeclaration' || 
             node.declaration?.type === 'FunctionExpression' ||
             node.declaration?.type === 'ArrowFunctionExpression')) {
          return node.declaration;
        }
      }
    }

    return null;
  }

  /**
   * Extrae los parámetros de la función
   */
  extractParameters(functionNode) {
    const params = Array.isArray(functionNode.params) ? functionNode.params : [];
    
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      const input = this.parseParameter(param, i);
      if (input) {
        this.inputs.push(input);
        this.usages.set(input.name, []);
      }
    }
  }

  /**
   * Parsea un parámetro individual
   */
  parseParameter(param, index) {
    // Parámetro simple: function(name)
    if (param.type === 'Identifier') {
      return {
        name: param.name,
        position: index,
        type: 'simple',
        hasDefault: false
      };
    }

    // Parámetro con default: function(name = 'default')
    if (param.type === 'AssignmentPattern') {
      const left = param.left;
      if (left.type === 'Identifier') {
        return {
          name: left.name,
          position: index,
          type: 'simple',
          hasDefault: true,
          defaultValue: this.extractDefaultValue(param.right)
        };
      }
      // Destructuring con default: function({ name } = {})
      if (left.type === 'ObjectPattern' || left.type === 'ArrayPattern') {
        return this.parseDestructuring(left, index, param.right);
      }
    }

    // Destructuring: function({ name, email })
    if (param.type === 'ObjectPattern' || param.type === 'ArrayPattern') {
      return this.parseDestructuring(param, index);
    }

    // Rest parameter: function(...args)
    if (param.type === 'RestElement') {
      const argument = param.argument;
      if (argument.type === 'Identifier') {
        return {
          name: argument.name,
          position: index,
          type: 'rest',
          hasDefault: false,
          isRest: true
        };
      }
    }

    return null;
  }

  /**
   * Parsea destructuring patterns
   */
  parseDestructuring(pattern, index, defaultValue = null) {
    const properties = [];

    if (pattern.type === 'ObjectPattern') {
      for (const prop of pattern.properties) {
        if (prop.type === 'ObjectProperty') {
          const key = prop.key.name || prop.key.value;
          let valueName = key;
          
          // { name: localName }
          if (prop.value.type === 'Identifier') {
            valueName = prop.value.name;
          }
          // { name = defaultValue }
          else if (prop.value.type === 'AssignmentPattern') {
            valueName = prop.value.left.name;
          }

          properties.push({
            original: key,
            local: valueName,
            hasDefault: prop.value.type === 'AssignmentPattern'
          });
        }
      }

      return {
        name: `__destructured_${index}`,
        position: index,
        type: 'destructured-object',
        hasDefault: defaultValue !== null,
        defaultValue: defaultValue ? this.extractDefaultValue(defaultValue) : null,
        properties
      };
    }

    if (pattern.type === 'ArrayPattern') {
      for (let i = 0; i < pattern.elements.length; i++) {
        const element = pattern.elements[i];
        if (element?.type === 'Identifier') {
          properties.push({
            index: i,
            local: element.name,
            hasDefault: false
          });
        }
        // [a = defaultValue]
        else if (element?.type === 'AssignmentPattern') {
          properties.push({
            index: i,
            local: element.left.name,
            hasDefault: true
          });
        }
      }

      return {
        name: `__destructured_${index}`,
        position: index,
        type: 'destructured-array',
        hasDefault: defaultValue !== null,
        properties
      };
    }

    return null;
  }

  /**
   * Extrae el valor default como string
   */
  extractDefaultValue(node) {
    if (!node) return null;
    
    // Literales simples
    if (node.type === 'StringLiteral') return `"${node.value}"`;
    if (node.type === 'NumericLiteral') return String(node.value);
    if (node.type === 'BooleanLiteral') return String(node.value);
    if (node.type === 'NullLiteral') return 'null';
    
    // Array vacío: []
    if (node.type === 'ArrayExpression' && node.elements.length === 0) return '[]';
    
    // Object vacío: {}
    if (node.type === 'ObjectExpression' && node.properties.length === 0) return '{}';
    
    // Para otros casos, retornar tipo
    return `<${node.type}>`;
  }

  /**
   * Encuentra todos los usos de los parámetros
   */
  findUsages(functionNode) {
    const body = functionNode.body;
    if (!body) return;

    this.traverseNode(body);
  }

  /**
   * Traversa recursivamente el AST buscando usos
   */
  traverseNode(node, depth = 0) {
    if (!node || depth > 100) return;

    // Identifier - posible uso
    if (node.type === 'Identifier') {
      this.recordUsage(node.name, {
        type: 'reference',
        line: node.loc?.start?.line
      });
    }

    // MemberExpression: obj.prop
    if (node.type === 'MemberExpression') {
      const objectName = this.getIdentifierName(node.object);
      const propertyName = node.computed 
        ? this.getIdentifierName(node.property)
        : (node.property.name || node.property.value);

      if (objectName) {
        this.recordUsage(objectName, {
          type: 'property_access',
          property: propertyName,
          line: node.loc?.start?.line
        });
      }
    }

    // CallExpression: func(arg)
    if (node.type === 'CallExpression') {
      const calleeName = this.getIdentifierName(node.callee);
      
      // Revisar argumentos para ver si pasan inputs
      node.arguments.forEach((arg, index) => {
        const argName = this.getIdentifierName(arg);
        if (argName) {
          this.recordUsage(argName, {
            type: 'argument_pass',
            toFunction: calleeName,
            argumentPosition: index,
            line: arg.loc?.start?.line
          });
        }
        
        // Spread: ...obj
        if (arg.type === 'SpreadElement') {
          const spreadName = this.getIdentifierName(arg.argument);
          if (spreadName) {
            this.recordUsage(spreadName, {
              type: 'spread',
              toFunction: calleeName,
              line: arg.loc?.start?.line
            });
          }
        }
      });
    }

    // Recursión en propiedades del nodo
    for (const key in node) {
      if (key === 'loc' || key === 'type') continue;
      
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.traverseNode(child, depth + 1));
      } else if (value && typeof value === 'object') {
        this.traverseNode(value, depth + 1);
      }
    }
  }

  /**
   * Registra un uso de un input
   */
  recordUsage(name, usage) {
    // Verificar si name es un input directo
    if (this.usages.has(name)) {
      this.usages.get(name).push(usage);
      return;
    }

    // Verificar si es una propiedad de un destructured input
    for (const [inputName, input] of this.inputs) {
      if (input.type.startsWith('destructured')) {
        const prop = input.properties.find(p => p.local === name);
        if (prop) {
          this.usages.get(inputName).push({
            ...usage,
            destructuredProperty: prop.original || prop.index
          });
          return;
        }
      }
    }
  }

  /**
   * Obtiene el nombre de un identifier (manejando member expressions)
   */
  getIdentifierName(node) {
    if (node.type === 'Identifier') {
      return node.name;
    }
    if (node.type === 'ThisExpression') {
      return 'this';
    }
    return null;
  }

  /**
   * Construye el resultado final con inputs y sus usos
   */
  buildInputsWithUsages() {
    return this.inputs.map(input => ({
      ...input,
      usages: this.usages.get(input.name) || []
    }));
  }
}

export default InputExtractor;
