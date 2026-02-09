/**
 * @fileoverview Output Extractor - Extrae outputs de funciones
 * 
 * Detecta:
 * - Return statements: return x
 * - Side effects: await saveX(), console.log()
 * - Throws: throw new Error()
 * - Implicit returns en arrow functions
 * 
 * @module extractors/data-flow/visitors/output-extractor
 */

import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:data-flow:output-extractor');

/**
 * Extrae outputs de una función
 */
export class OutputExtractor {
  constructor(functionCode, transformations) {
    this.code = functionCode;
    this.transformations = transformations || [];
    this.outputs = [];
    this.hasReturn = false;
    this.hasSideEffect = false;
  }

  /**
   * Extrae todos los outputs
   */
  extract(functionAst) {
    try {
      const functionNode = this.findFunctionNode(functionAst);
      if (!functionNode) return [];

      const body = functionNode.body;
      if (!body) return [];

      // Arrow function con expresión directa
      if (body.type !== 'BlockStatement') {
        this.extractImplicitReturn(body);
        return this.outputs;
      }

      // Procesar statements buscando returns y side effects
      this.processStatements(body.body || []);

      // Si no hay return explícito, es undefined
      if (!this.hasReturn) {
        this.outputs.push({
          type: 'return',
          value: 'undefined',
          shape: 'undefined',
          implicit: true,
          line: functionNode.loc?.end?.line
        });
      }

      return this.outputs;

    } catch (error) {
      logger.warn(`Error extracting outputs: ${error.message}`);
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
   * Procesa statements buscando outputs
   */
  processStatements(statements) {
    for (const stmt of statements) {
      this.processStatement(stmt);
    }
  }

  /**
   * Procesa un statement individual
   */
  processStatement(stmt) {
    switch (stmt.type) {
      case 'ReturnStatement':
        this.extractReturn(stmt);
        break;
      case 'ThrowStatement':
        this.extractThrow(stmt);
        break;
      case 'ExpressionStatement':
        this.extractSideEffect(stmt.expression);
        break;
      case 'IfStatement':
        this.processIfStatement(stmt);
        break;
      case 'TryStatement':
        this.processTryStatement(stmt);
        break;
      case 'SwitchStatement':
        this.processSwitchStatement(stmt);
        break;
      case 'BlockStatement':
        this.processStatements(stmt.body);
        break;
      case 'ForStatement':
      case 'ForOfStatement':
      case 'ForInStatement':
      case 'WhileStatement':
      case 'DoWhileStatement':
        this.processLoop(stmt);
        break;
    }
  }

  /**
   * Extrae un return statement
   */
  extractReturn(returnStmt) {
    this.hasReturn = true;
    
    const arg = returnStmt.argument;
    
    // return; (undefined implícito)
    if (!arg) {
      this.outputs.push({
        type: 'return',
        value: 'undefined',
        shape: 'undefined',
        line: returnStmt.loc?.start?.line
      });
      return;
    }

    const sources = this.extractSources(arg);
    const shape = this.inferShape(arg);

    this.outputs.push({
      type: 'return',
      value: this.nodeToString(arg),
      shape: shape,
      sources: sources,
      properties: this.extractProperties(arg),
      line: returnStmt.loc?.start?.line
    });
  }

  /**
   * Extrae un throw statement
   */
  extractThrow(throwStmt) {
    const arg = throwStmt.argument;
    const errorType = arg?.type === 'NewExpression' 
      ? this.getCalleeName(arg.callee)
      : (arg?.type || 'Error');

    this.outputs.push({
      type: 'throw',
      errorType: errorType,
      message: this.extractErrorMessage(arg),
      line: throwStmt.loc?.start?.line
    });
  }

  /**
   * Extrae side effects de una expresión
   */
  extractSideEffect(expr) {
    // Llamada a función que puede tener side effects
    if (expr.type === 'CallExpression' || expr.type === 'AwaitExpression') {
      const callExpr = expr.type === 'AwaitExpression' ? expr.argument : expr;
      
      if (callExpr.type === 'CallExpression') {
        const calleeName = this.getCalleeName(callExpr.callee);
        
        // Detectar side effects conocidos
        if (this.isSideEffectCall(calleeName, callExpr)) {
          this.hasSideEffect = true;
          
          const sources = [];
          for (const arg of callExpr.arguments) {
            const name = this.getIdentifierName(arg);
            if (name) sources.push(name);
            
            // Spread
            if (arg.type === 'SpreadElement') {
              const spreadName = this.getIdentifierName(arg.argument);
              if (spreadName) sources.push(`...${spreadName}`);
            }
          }

          this.outputs.push({
            type: 'side_effect',
            target: calleeName,
            operation: this.classifySideEffect(calleeName),
            sources: sources,
            isAsync: expr.type === 'AwaitExpression',
            line: expr.loc?.start?.line
          });
        }
      }
    }

    // Assignment que muta: obj.prop = value
    if (expr.type === 'AssignmentExpression') {
      const target = this.getAssignmentTarget(expr.left);
      if (target && target.includes('.')) {
        this.hasSideEffect = true;
        const sources = this.extractSources(expr.right);
        
        this.outputs.push({
          type: 'side_effect',
          target: target,
          operation: 'property_mutation',
          sources: sources,
          line: expr.loc?.start?.line
        });
      }
    }

    // Delete: delete obj.prop
    if (expr.type === 'UnaryExpression' && expr.operator === 'delete') {
      const target = this.getAssignmentTarget(expr.argument);
      if (target) {
        this.hasSideEffect = true;
        this.outputs.push({
          type: 'side_effect',
          target: target,
          operation: 'deletion',
          line: expr.loc?.start?.line
        });
      }
    }
  }

  /**
   * Determina si una llamada tiene side effects
   */
  isSideEffectCall(calleeName, callExpr) {
    if (!calleeName) return false;

    // APIs conocidas con side effects
    const sideEffectPatterns = [
      // Console
      /^console\./,
      // Storage
      /^localStorage\./,
      /^sessionStorage\./,
      // Fetch/HTTP
      /^fetch$/,
      /^(get|post|put|delete|patch)$/,
      // DB
      /\.(save|create|update|delete|insert|remove|destroy)$/,
      // DOM
      /^(document\.write|document\.append|document\.insert)/,
      // React/Vue state
      /^(setState|forceUpdate|dispatch)$/,
      /\.(setState|commit|dispatch|emit)$/,
      // Event emitters
      /\.(emit|broadcast)$/,
      // File system
      /fs\./,
      // Process
      /process\.exit/
    ];

    if (sideEffectPatterns.some(pattern => pattern.test(calleeName))) {
      return true;
    }

    // Verificar si es un método sobre una variable que vimos mutar
    if (calleeName.includes('.')) {
      const objectName = calleeName.split('.')[0];
      const methodName = calleeName.split('.').pop();
      
      const mutatingMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 
                               'sort', 'reverse', 'fill', 'copyWithin'];
      if (mutatingMethods.includes(methodName)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Clasifica el tipo de side effect
   */
  classifySideEffect(calleeName) {
    if (!calleeName) return 'unknown';

    if (calleeName.startsWith('console.')) return 'logging';
    if (calleeName.startsWith('localStorage.') || calleeName.startsWith('sessionStorage.')) return 'storage';
    if (calleeName === 'fetch' || /^(get|post|put|delete|patch)$/.test(calleeName)) return 'network';
    if (/\.(save|create|update|delete|insert|remove|destroy)$/.test(calleeName)) return 'persistence';
    if (/\.(emit|broadcast)$/.test(calleeName)) return 'event_emission';
    if (/\.(setState|commit|dispatch)$/.test(calleeName)) return 'state_mutation';
    if (/\.write/.test(calleeName) || /\.append/.test(calleeName)) return 'io';

    return 'unknown';
  }

  /**
   * Extrae return implícito de arrow function
   */
  extractImplicitReturn(expr) {
    this.hasReturn = true;
    const sources = this.extractSources(expr);
    const shape = this.inferShape(expr);

    this.outputs.push({
      type: 'return',
      value: this.nodeToString(expr),
      shape: shape,
      sources: sources,
      properties: this.extractProperties(expr),
      implicit: true,
      line: expr.loc?.start?.line
    });
  }

  /**
   * Procesa if statement
   */
  processIfStatement(stmt) {
    this.processStatement(stmt.consequent);
    if (stmt.alternate) {
      this.processStatement(stmt.alternate);
    }
  }

  /**
   * Procesa try statement
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
   * Procesa switch statement
   */
  processSwitchStatement(stmt) {
    for (const case_ of stmt.cases) {
      for (const stmt_ of case_.consequent) {
        this.processStatement(stmt_);
      }
    }
  }

  /**
   * Procesa loops
   */
  processLoop(loop) {
    this.processStatement(loop.body);
  }

  /**
   * Extrae fuentes de un nodo
   */
  extractSources(node) {
    const sources = [];
    
    const collect = (n) => {
      if (!n) return;

      if (n.type === 'Identifier') {
        sources.push(n.name);
      } else if (n.type === 'ThisExpression') {
        sources.push('this');
      } else if (n.type === 'MemberExpression') {
        const path = this.getMemberPath(n);
        if (path) sources.push(path);
      } else {
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
    return [...new Set(sources)];
  }

  /**
   * Infiere el shape del return
   */
  inferShape(node) {
    if (!node) return 'undefined';

    if (node.type === 'ObjectExpression') {
      const props = node.properties
        .filter(p => p.type === 'ObjectProperty')
        .map(p => p.key.name || p.key.value);
      return `{ ${props.join(', ')} }`;
    }

    if (node.type === 'ArrayExpression') {
      return `[${node.elements.length}]`;
    }

    if (node.type === 'Identifier') {
      return node.name;
    }

    if (node.type === 'StringLiteral') return 'string';
    if (node.type === 'NumericLiteral') return 'number';
    if (node.type === 'BooleanLiteral') return 'boolean';
    if (node.type === 'NullLiteral') return 'null';

    if (node.type === 'CallExpression') {
      const name = this.getCalleeName(node.callee);
      return `<${name}()>`;
    }

    if (node.type === 'AwaitExpression') {
      return `<Promise>`;
    }

    return 'expression';
  }

  /**
   * Extrae propiedades de un objeto return
   */
  extractProperties(node) {
    if (node.type === 'ObjectExpression') {
      return node.properties
        .filter(p => p.type === 'ObjectProperty')
        .map(p => ({
          name: p.key.name || p.key.value,
          value: this.nodeToString(p.value)
        }));
    }
    return [];
  }

  /**
   * Extrae mensaje de error
   */
  extractErrorMessage(node) {
    if (node?.type === 'NewExpression' && node.arguments.length > 0) {
      const firstArg = node.arguments[0];
      if (firstArg.type === 'StringLiteral') {
        return firstArg.value;
      }
    }
    return null;
  }

  /**
   * Helpers
   */
  getMemberPath(node) {
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'ThisExpression') return 'this';
    if (node.type === 'MemberExpression') {
      const object = this.getMemberPath(node.object);
      const property = node.computed 
        ? this.getIdentifierName(node.property) || '[computed]'
        : (node.property.name || node.property.value);
      return object ? `${object}.${property}` : null;
    }
    return null;
  }

  getCalleeName(node) {
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'MemberExpression') return this.getMemberPath(node);
    return '<anonymous>';
  }

  getIdentifierName(node) {
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'ThisExpression') return 'this';
    return null;
  }

  getAssignmentTarget(node) {
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'MemberExpression') return this.getMemberPath(node);
    return null;
  }

  nodeToString(node) {
    // Simplificado - en producción usaría astring o similar
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'StringLiteral') return `"${node.value}"`;
    if (node.type === 'NumericLiteral') return String(node.value);
    if (node.type === 'BooleanLiteral') return String(node.value);
    if (node.type === 'NullLiteral') return 'null';
    return `<${node.type}>`;
  }
}

export default OutputExtractor;
