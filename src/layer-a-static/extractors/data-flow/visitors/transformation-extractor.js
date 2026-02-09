/**
 * @fileoverview Transformation Extractor - Extrae transformaciones de datos
 * 
 * Detecta:
 * - Asignaciones: const x = y
 * - Llamadas a funciones: const x = foo(y)
 * - Operaciones aritméticas: const x = a + b
 * - Property access: const x = obj.prop
 * - Condicionales: const x = cond ? a : b
 * 
 * @module extractors/data-flow/visitors/transformation-extractor
 */

import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:data-flow:transformation-extractor');

/**
 * Extrae transformaciones de una función
 */
export class TransformationExtractor {
  constructor(functionCode, inputs) {
    this.code = functionCode;
    this.inputs = inputs || [];
    this.transformations = [];
    this.inputNames = new Set(inputs.map(i => i.name));
    // También trackear nombres locales de destructured inputs
    inputs.forEach(i => {
      if (i.properties) {
        i.properties.forEach(p => this.inputNames.add(p.local));
      }
    });
    this.definedVariables = new Set();
  }

  /**
   * Extrae todas las transformaciones
   */
  extract(functionAst) {
    try {
      const functionNode = this.findFunctionNode(functionAst);
      if (!functionNode) return [];

      const body = functionNode.body;
      if (!body) return [];

      // Para arrow functions con expression directa: x => x + 1
      if (body.type !== 'BlockStatement') {
        this.extractExpressionTransformation(body, 'implicit_return');
        return this.transformations;
      }

      // Procesar cada statement
      const statements = body.body || [];
      for (const stmt of statements) {
        this.processStatement(stmt);
      }

      return this.transformations;

    } catch (error) {
      logger.warn(`Error extracting transformations: ${error.message}`);
      return [];
    }
  }

  /**
   * Encuentra el nodo de función
   */
  findFunctionNode(ast) {
    if (ast && (ast.type === 'FunctionDeclaration' || 
                ast.type === 'FunctionExpression' || 
                ast.type === 'ArrowFunctionExpression')) {
      return ast;
    }

    if (ast?.type === 'File' && ast.program) {
      const body = ast.program.body || [];
      for (const node of body) {
        if (node.type === 'FunctionDeclaration') return node;
        if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'FunctionDeclaration') {
          return node.declaration;
        }
        if (node.type === 'ExportDefaultDeclaration') {
          const decl = node.declaration;
          if (decl?.type === 'FunctionDeclaration' || 
              decl?.type === 'FunctionExpression' ||
              decl?.type === 'ArrowFunctionExpression') {
            return decl;
          }
        }
      }
    }

    return null;
  }

  /**
   * Procesa un statement
   */
  processStatement(stmt) {
    switch (stmt.type) {
      case 'VariableDeclaration':
        this.processVariableDeclaration(stmt);
        break;
      case 'ExpressionStatement':
        this.processExpressionStatement(stmt);
        break;
      case 'IfStatement':
        this.processIfStatement(stmt);
        break;
      case 'TryStatement':
        this.processTryStatement(stmt);
        break;
      case 'ForStatement':
      case 'ForOfStatement':
      case 'ForInStatement':
      case 'WhileStatement':
      case 'DoWhileStatement':
        this.processLoop(stmt);
        break;
      case 'BlockStatement':
        // Recursión en bloques
        for (const subStmt of stmt.body) {
          this.processStatement(subStmt);
        }
        break;
    }
  }

  /**
   * Procesa declaraciones de variables: const x = ...
   */
  processVariableDeclaration(decl) {
    for (const declarator of decl.declarations) {
      const id = declarator.id;
      const init = declarator.init;

      if (!init) continue;

      // Simple assignment: const x = value
      if (id.type === 'Identifier') {
        this.extractTransformation(id.name, init, {
          type: 'assignment',
          line: declarator.loc?.start?.line
        });
      }
      // Destructuring: const { x, y } = obj
      else if (id.type === 'ObjectPattern' || id.type === 'ArrayPattern') {
        this.processDestructuringAssignment(id, init);
      }
    }
  }

  /**
   * Extrae una transformación
   */
  extractTransformation(targetVar, sourceNode, meta = {}) {
    const sources = this.extractSources(sourceNode);
    const operation = this.classifyOperation(sourceNode);

    this.transformations.push({
      to: targetVar,
      from: sources.length === 1 ? sources[0] : sources,
      operation: operation.type,
      operationDetails: operation.details,
      via: operation.via,
      line: meta.line || sourceNode.loc?.start?.line,
      ...meta
    });

    // Trackear variables definidas
    this.definedVariables.add(targetVar);
  }

  /**
   * Extrae las fuentes de un nodo
   */
  extractSources(node) {
    const sources = [];

    const collect = (n) => {
      if (!n) return;

      // Identificador
      if (n.type === 'Identifier') {
        sources.push(n.name);
      }
      // This
      else if (n.type === 'ThisExpression') {
        sources.push('this');
      }
      // Member expression: obj.prop
      else if (n.type === 'MemberExpression') {
        const path = this.getMemberPath(n);
        if (path) sources.push(path);
      }
      // Literal (no es fuente variable)
      else if (n.type === 'StringLiteral' || n.type === 'NumericLiteral' || 
               n.type === 'BooleanLiteral' || n.type === 'NullLiteral') {
        // No agregar - son constantes
      }
      // Recursión en otros nodos
      else {
        for (const key in n) {
          if (key === 'loc' || key === 'type') continue;
          const val = n[key];
          if (Array.isArray(val)) {
            val.forEach(collect);
          } else if (val && typeof val === 'object') {
            collect(val);
          }
        }
      }
    };

    collect(node);
    return [...new Set(sources)]; // Eliminar duplicados
  }

  /**
   * Clasifica el tipo de operación
   */
  classifyOperation(node) {
    // Llamada a función: foo()
    if (node.type === 'CallExpression') {
      const calleeName = this.getCalleeName(node.callee);
      return {
        type: 'function_call',
        via: calleeName,
        details: {
          argumentCount: node.arguments.length
        }
      };
    }

    // Await: await foo()
    if (node.type === 'AwaitExpression') {
      const inner = this.classifyOperation(node.argument);
      return {
        ...inner,
        type: `await_${inner.type}`,
        details: { ...inner.details, isAsync: true }
      };
    }

    // Operación aritmética/binaria: a + b, a - b, etc.
    if (node.type === 'BinaryExpression' || node.type === 'LogicalExpression') {
      return {
        type: 'binary_operation',
        via: node.operator,
        details: { operator: node.operator }
      };
    }

    // Operación unaria: -a, !a
    if (node.type === 'UnaryExpression') {
      return {
        type: 'unary_operation',
        via: node.operator,
        details: { operator: node.operator, prefix: node.prefix }
      };
    }

    // Update: ++a, a++
    if (node.type === 'UpdateExpression') {
      return {
        type: 'update',
        via: node.operator,
        details: { operator: node.operator, prefix: node.prefix }
      };
    }

    // Acceso a propiedad: obj.prop
    if (node.type === 'MemberExpression') {
      const path = this.getMemberPath(node);
      return {
        type: 'property_access',
        via: 'property_access',
        details: { path }
      };
    }

    // Condicional: cond ? a : b
    if (node.type === 'ConditionalExpression') {
      return {
        type: 'conditional',
        via: 'ternary',
        details: {}
      };
    }

    // Array: [a, b, c]
    if (node.type === 'ArrayExpression') {
      return {
        type: 'array_literal',
        via: 'array_constructor',
        details: { elementCount: node.elements.length }
      };
    }

    // Object: { a: 1, b: 2 }
    if (node.type === 'ObjectExpression') {
      return {
        type: 'object_literal',
        via: 'object_constructor',
        details: { propertyCount: node.properties.length }
      };
    }

    // Spread: ...obj
    if (node.type === 'SpreadElement') {
      return {
        type: 'spread',
        via: 'spread_operator',
        details: {}
      };
    }

    // Template literal
    if (node.type === 'TemplateLiteral') {
      return {
        type: 'template_literal',
        via: 'template',
        details: { hasExpressions: node.expressions.length > 0 }
      };
    }

    // New: new Class()
    if (node.type === 'NewExpression') {
      const calleeName = this.getCalleeName(node.callee);
      return {
        type: 'instantiation',
        via: calleeName,
        details: { className: calleeName }
      };
    }

    // Default
    return {
      type: 'assignment',
      via: null,
      details: { nodeType: node.type }
    };
  }

  /**
   * Procesa destructuring en asignación
   */
  processDestructuringAssignment(pattern, init) {
    const sourcePath = this.getMemberPath(init) || 'unknown';

    if (pattern.type === 'ObjectPattern') {
      for (const prop of pattern.properties) {
        if (prop.type === 'ObjectProperty') {
          const key = prop.key.name || prop.key.value;
          let localName = key;

          if (prop.value.type === 'Identifier') {
            localName = prop.value.name;
          } else if (prop.value.type === 'AssignmentPattern') {
            localName = prop.value.left.name;
          }

          this.transformations.push({
            to: localName,
            from: `${sourcePath}.${key}`,
            operation: 'property_access',
            via: 'destructuring',
            line: prop.loc?.start?.line
          });

          this.definedVariables.add(localName);
        }
      }
    } else if (pattern.type === 'ArrayPattern') {
      for (let i = 0; i < pattern.elements.length; i++) {
        const element = pattern.elements[i];
        if (!element) continue;

        let localName = null;
        if (element.type === 'Identifier') {
          localName = element.name;
        } else if (element.type === 'AssignmentPattern') {
          localName = element.left.name;
        }

        if (localName) {
          this.transformations.push({
            to: localName,
            from: `${sourcePath}[${i}]`,
            operation: 'array_index_access',
            via: 'destructuring',
            line: element.loc?.start?.line
          });

          this.definedVariables.add(localName);
        }
      }
    }
  }

  /**
   * Procesa expression statements (reassignments, method calls, etc.)
   */
  processExpressionStatement(stmt) {
    const expr = stmt.expression;

    // Assignment: x = y
    if (expr.type === 'AssignmentExpression') {
      const target = this.getAssignmentTarget(expr.left);
      if (target) {
        this.extractTransformation(target, expr.right, {
          type: 'reassignment',
          line: expr.loc?.start?.line
        });
      }
    }
    // Update expression: x++, x--
    else if (expr.type === 'UpdateExpression') {
      const target = this.getIdentifierName(expr.argument);
      if (target) {
        this.transformations.push({
          to: target,
          from: target,
          operation: 'update',
          via: expr.operator,
          line: expr.loc?.start?.line,
          type: 'update'
        });
      }
    }
    // Método que muta: arr.push(x)
    else if (expr.type === 'CallExpression') {
      this.processMutatingCall(expr);
    }
  }

  /**
   * Procesa llamadas que mutan estado
   */
  processMutatingCall(callExpr) {
    const callee = callExpr.callee;
    if (callee.type !== 'MemberExpression') return;

    const objectName = this.getIdentifierName(callee.object);
    const methodName = callee.property.name || callee.property.value;

    // Métodos mutables comunes
    const mutatingMethods = [
      'push', 'pop', 'shift', 'unshift', 'splice',
      'sort', 'reverse', 'fill', 'copyWithin'
    ];

    if (mutatingMethods.includes(methodName) && objectName) {
      const sources = [];
      for (const arg of callExpr.arguments) {
        const name = this.getIdentifierName(arg);
        if (name) sources.push(name);
      }

      this.transformations.push({
        to: objectName,
        from: sources.length > 0 ? sources : objectName,
        operation: 'mutation',
        via: methodName,
        line: callExpr.loc?.start?.line,
        type: 'mutation',
        details: { method: methodName }
      });
    }
  }

  /**
   * Procesa if statements (para análisis de flujo condicional)
   */
  processIfStatement(stmt) {
    // Procesar consecuente
    this.processStatement(stmt.consequent);
    // Procesar alternativo si existe
    if (stmt.alternate) {
      this.processStatement(stmt.alternate);
    }
  }

  /**
   * Procesa try-catch
   */
  processTryStatement(stmt) {
    this.processStatement(stmt.block);
    if (stmt.handler) {
      this.processStatement(stmt.handler.body);
    }
    if (stmt.finalizer) {
      this.processStatement(stmt.finalizer);
    }
  }

  /**
   * Procesa loops
   */
  processLoop(loop) {
    // Procesar el cuerpo del loop
    this.processStatement(loop.body);
  }

  /**
   * Extrae transformación de expresión (para arrow functions implícitas)
   */
  extractExpressionTransformation(expr, type) {
    const sources = this.extractSources(expr);
    const operation = this.classifyOperation(expr);

    this.transformations.push({
      to: '<return>',
      from: sources.length === 1 ? sources[0] : sources,
      operation: operation.type,
      via: operation.via,
      type: type,
      line: expr.loc?.start?.line
    });
  }

  /**
   * Helper: obtiene el path de un member expression
   */
  getMemberPath(node) {
    if (node.type === 'Identifier') {
      return node.name;
    }
    if (node.type === 'ThisExpression') {
      return 'this';
    }
    if (node.type === 'MemberExpression') {
      const object = this.getMemberPath(node.object);
      const property = node.computed 
        ? this.getIdentifierName(node.property) || '[computed]'
        : (node.property.name || node.property.value);
      return object ? `${object}.${property}` : null;
    }
    return null;
  }

  /**
   * Helper: obtiene nombre de callee
   */
  getCalleeName(node) {
    if (node.type === 'Identifier') {
      return node.name;
    }
    if (node.type === 'MemberExpression') {
      return this.getMemberPath(node);
    }
    return '<anonymous>';
  }

  /**
   * Helper: obtiene nombre de identifier
   */
  getIdentifierName(node) {
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'ThisExpression') return 'this';
    return null;
  }

  /**
   * Helper: obtiene target de asignación
   */
  getAssignmentTarget(node) {
    if (node.type === 'Identifier') {
      return node.name;
    }
    if (node.type === 'MemberExpression') {
      return this.getMemberPath(node);
    }
    return null;
  }
}

export default TransformationExtractor;
