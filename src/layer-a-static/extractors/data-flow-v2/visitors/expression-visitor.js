/**
 * @fileoverview Expression Visitor - Detecta expresiones aritméticas y lógicas
 * 
 * Detecta:
 * - BinaryExpression: a + b, a - b, a * b, etc.
 * - UnaryExpression: -a, !a, typeof a
 * - LogicalExpression: a && b, a || b
 * - AssignmentExpression: a = b, a += b
 * 
 * @module data-flow-v2/visitors/expression-visitor
 */

import { getTransformByOperator } from '../core/transform-registry.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:expression:visitor');



export class ExpressionVisitor {
  constructor(context) {
    this.context = context;
    this.builder = context.builder;
    this.scope = context.scope;
  }

  visit(ast) {
    // Recorrer AST buscando expresiones
    this.traverse(ast, {
      BinaryExpression: (path) => this.visitBinaryExpression(path),
      UnaryExpression: (path) => this.visitUnaryExpression(path),
      LogicalExpression: (path) => this.visitLogicalExpression(path),
      AssignmentExpression: (path) => this.visitAssignmentExpression(path),
      UpdateExpression: (path) => this.visitUpdateExpression(path)
    });
  }

  traverse(ast, visitors) {
    // Implementación simple de traverse
    // En producción usar @babel/traverse
    this.walkNode(ast, visitors);
  }

  walkNode(node, visitors, path = []) {
    if (!node || typeof node !== 'object') return;

    const nodeType = node.type;
    if (visitors[nodeType]) {
      visitors[nodeType]({ node, path });
    }

    // Recorrer hijos
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'loc') continue;
      
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach((c, i) => this.walkNode(c, visitors, [...path, key, i]));
      } else if (child && typeof child === 'object') {
        this.walkNode(child, visitors, [...path, key]);
      }
    }
  }

  visitBinaryExpression({ node }) {
    const transform = getTransformByOperator(node.operator);
    
    if (!transform) {
      logger.warn(`[ExpressionVisitor] Unknown operator: ${node.operator}`);
      return;
    }

    // Extraer operandos
    const left = this.extractOperand(node.left);
    const right = this.extractOperand(node.right);

    // Crear nodo en el grafo
    const nodeId = this.builder.addNode({
      type: transform.type,
      category: transform.category,
      standardToken: transform.standardToken,
      inputs: [left, right],
      output: null, // Se asignará cuando se use el resultado
      properties: {
        isPure: transform.purity,
        commutative: transform.commutative
      },
      location: node.loc
    });

    // Registrar transformación
    this.context.transforms.push({
      type: transform.type,
      operator: node.operator,
      left,
      right,
      nodeId,
      line: node.loc?.start?.line
    });
  }

  visitUnaryExpression({ node }) {
    let transformType;
    let standardToken;

    switch (node.operator) {
      case '-':
        transformType = 'UNARY_MINUS';
        standardToken = 'ARITH_UMINUS';
        break;
      case '+':
        transformType = 'UNARY_PLUS';
        standardToken = 'ARITH_UPLUS';
        break;
      case '!':
        transformType = 'NOT';
        standardToken = 'LOGIC_NOT';
        break;
      case 'typeof':
        transformType = 'TYPEOF';
        standardToken = 'OPER_TYPEOF';
        break;
      default:
        return;
    }

    const operand = this.extractOperand(node.argument);

    this.builder.addNode({
      type: transformType,
      category: node.operator === '!' ? 'logical' : 'arithmetic',
      standardToken,
      inputs: [operand],
      output: null,
      properties: { isPure: true, unary: true },
      location: node.loc
    });
  }

  visitLogicalExpression({ node }) {
    const operatorMap = {
      '&&': { type: 'AND', token: 'LOGIC_AND' },
      '||': { type: 'OR', token: 'LOGIC_OR' }
    };

    const op = operatorMap[node.operator];
    if (!op) return;

    const left = this.extractOperand(node.left);
    const right = this.extractOperand(node.right);

    this.builder.addNode({
      type: op.type,
      category: 'logical',
      standardToken: op.token,
      inputs: [left, right],
      output: null,
      properties: { 
        isPure: true, 
        commutative: true,
        shortCircuit: true 
      },
      location: node.loc
    });
  }

  visitAssignmentExpression({ node }) {
    const left = this.extractOperand(node.left);
    const right = this.extractOperand(node.right);

    // Determinar tipo de asignación
    let transformType = 'ASSIGN';
    let isCompound = false;

    if (node.operator !== '=') {
      // +=, -=, *=, etc.
      isCompound = true;
      const baseOp = node.operator.slice(0, -1); // '+' de '+=', etc.
      const baseTransform = getTransformByOperator(baseOp);
      if (baseTransform) {
        transformType = baseTransform.type;
      }
    }

    const nodeId = this.builder.addNode({
      type: transformType,
      category: isCompound ? 'arithmetic' : 'assignment',
      standardToken: isCompound ? 'ARITH_COMPOUND' : 'ASSIGN',
      inputs: [left, right],
      output: {
        name: left.name || left.value,
        type: 'any' // Se inferirá después
      },
      properties: { 
        isPure: false, // Asignación muta estado
        isCompound 
      },
      location: node.loc
    });

    // Registrar en scope
    if (left.name) {
      this.scope.registerVariable(left.name, {
        nodeId,
        type: 'assigned',
        line: node.loc?.start?.line
      });
    }
  }

  visitUpdateExpression({ node }) {
    const transformType = node.operator === '++' ? 'INCREMENT' : 'DECREMENT';
    const standardToken = node.operator === '++' ? 'ARITH_INC' : 'ARITH_DEC';
    
    const operand = this.extractOperand(node.argument);

    this.builder.addNode({
      type: transformType,
      category: 'arithmetic',
      standardToken,
      inputs: [operand],
      output: {
        name: operand.name,
        type: 'number'
      },
      properties: { 
        isPure: false, // Muta la variable
        prefix: node.prefix 
      },
      location: node.loc
    });
  }

  /**
   * Extrae información de un operando
   */
  extractOperand(node) {
    if (!node) return { type: 'unknown', value: null };

    switch (node.type) {
      case 'Identifier':
        return {
          type: 'variable',
          name: node.name,
          isParam: this.scope.isParam(node.name),
          isKnown: this.scope.isKnown(node.name)
        };

      case 'Literal':
        return {
          type: 'literal',
          value: node.value,
          raw: node.raw,
          dataType: typeof node.value
        };

      case 'MemberExpression':
        return {
          type: 'property_access',
          object: node.object?.name,
          property: node.property?.name || node.property?.value,
          computed: node.computed
        };

      case 'CallExpression':
        return {
          type: 'call_result',
          callee: this.extractCallee(node.callee),
          args: node.arguments?.length || 0
        };

      case 'BinaryExpression':
      case 'UnaryExpression':
        return {
          type: 'expression',
          expressionType: node.type,
          operator: node.operator
        };

      default:
        return {
          type: node.type,
          description: '[complex expression]'
        };
    }
  }

  extractCallee(callee) {
    if (callee.type === 'Identifier') {
      return callee.name;
    }
    if (callee.type === 'MemberExpression') {
      return `${this.extractCallee(callee.object)}.${callee.property?.name}`;
    }
    return '[anonymous]';
  }
}

export default ExpressionVisitor;
