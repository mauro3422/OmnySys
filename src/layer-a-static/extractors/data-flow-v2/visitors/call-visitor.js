/**
 * @fileoverview Call Visitor - Detecta llamadas a funciones y side effects
 * 
 * Detecta:
 * - CallExpression: funciones llamadas
 * - Side effects: fetch, localStorage, etc.
 * - AwaitExpression: operaciones async
 * - NewExpression: constructores
 * 
 * @module data-flow-v2/visitors/call-visitor
 */

import { detectSideEffectTransform, detectFunctionalTransform } from '../core/transform-registry.js';

export class CallVisitor {
  constructor(context) {
    this.context = context;
    this.builder = context.builder;
    this.scope = context.scope;
  }

  visit(ast) {
    this.traverse(ast, {
      CallExpression: (path) => this.visitCallExpression(path),
      AwaitExpression: (path) => this.visitAwaitExpression(path),
      NewExpression: (path) => this.visitNewExpression(path)
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

  visitCallExpression({ node }) {
    const calleeName = this.extractCalleeName(node.callee);
    const args = this.extractArguments(node.arguments);

    // Verificar si es un side effect conocido
    const sideEffectTransform = detectSideEffectTransform(calleeName);
    
    if (sideEffectTransform) {
      this.handleSideEffect(node, calleeName, args, sideEffectTransform);
      return;
    }

    // Verificar si es método funcional de array
    const functionalTransform = detectFunctionalTransform(calleeName);
    
    if (functionalTransform) {
      this.handleFunctionalMethod(node, calleeName, args, functionalTransform);
      return;
    }

    // Llamada de función regular
    this.handleRegularCall(node, calleeName, args);
  }

  handleSideEffect(node, calleeName, args, transform) {
    const nodeId = this.builder.addNode({
      type: transform.type,
      category: 'side_effect',
      standardToken: transform.standardToken,
      inputs: args,
      output: {
        name: this.getAssignmentTarget(node),
        type: 'promise' // Muchos side effects son async
      },
      properties: {
        isPure: false,
        hasSideEffects: true,
        isAsync: transform.async,
        mutatesExternal: transform.mutatesExternal,
        idempotent: transform.idempotent,
        functionName: calleeName
      },
      location: node.loc
    });

    // Registrar como output del grafo
    this.context.transforms.push({
      type: 'SIDE_EFFECT',
      subtype: transform.type,
      function: calleeName,
      args,
      nodeId,
      line: node.loc?.start?.line
    });
  }

  handleFunctionalMethod(node, calleeName, args, transform) {
    // Método de array: items.map(fn), items.filter(fn), etc.
    
    // El primer argumento es el array (objeto antes del punto)
    const arrayObj = this.extractOperand(node.callee?.object);
    
    const nodeId = this.builder.addNode({
      type: transform.type,
      category: 'functional',
      standardToken: transform.standardToken,
      inputs: [
        { ...arrayObj, role: 'array' },
        ...args.map((arg, i) => ({ ...arg, role: i === 0 ? 'callback' : 'index' }))
      ],
      output: {
        name: this.getAssignmentTarget(node),
        type: 'array' // Resultado de map/filter/etc
      },
      properties: {
        isPure: transform.purity,
        method: transform.method
      },
      location: node.loc
    });

    this.context.transforms.push({
      type: 'FUNCTIONAL',
      method: transform.method,
      array: arrayObj,
      args,
      nodeId,
      line: node.loc?.start?.line
    });
  }

  handleRegularCall(node, calleeName, args) {
    // Llamada de función regular
    const isAsync = this.isInAsyncContext(node);
    
    const nodeId = this.builder.addNode({
      type: 'FUNCTION_CALL',
      category: 'call',
      standardToken: 'CALL_FUNC',
      inputs: args,
      output: {
        name: this.getAssignmentTarget(node),
        type: 'unknown' // Se inferirá si conocemos la función
      },
      properties: {
        isPure: 'unknown', // Requiere análisis interprocedural
        functionName: calleeName,
        isAsync
      },
      location: node.loc
    });

    this.context.transforms.push({
      type: 'CALL',
      function: calleeName,
      args,
      isAsync,
      nodeId,
      line: node.loc?.start?.line
    });
  }

  visitAwaitExpression({ node }) {
    // Marcar el contexto como async
    this.scope.setAsync(true);

    // La expresión await envuelve otra expresión
    if (node.argument) {
      // Si es una llamada, ya fue manejada por CallVisitor
      // Pero marcamos que está en contexto async
      this.context.transforms.forEach(t => {
        if (t.line === node.argument?.loc?.start?.line) {
          t.isAwaited = true;
        }
      });
    }
  }

  visitNewExpression({ node }) {
    const calleeName = this.extractCalleeName(node.callee);
    const args = this.extractArguments(node.arguments);

    this.builder.addNode({
      type: 'CONSTRUCTOR_CALL',
      category: 'instantiation',
      standardToken: 'NEW_OBJ',
      inputs: args,
      output: {
        name: this.getAssignmentTarget(node),
        type: calleeName // Instancia de la clase
      },
      properties: {
        isPure: false, // Constructor puede tener side effects
        constructor: calleeName
      },
      location: node.loc
    });
  }

  /**
   * Extrae nombre de la función llamada
   */
  extractCalleeName(callee) {
    if (callee.type === 'Identifier') {
      return callee.name;
    }
    
    if (callee.type === 'MemberExpression') {
      const object = this.extractCalleeName(callee.object);
      const property = callee.property?.name || '[computed]';
      return `${object}.${property}`;
    }

    return '[anonymous]';
  }

  /**
   * Extrae argumentos de la llamada
   */
  extractArguments(args) {
    if (!args) return [];
    
    return args.map((arg, index) => this.extractArgument(arg, index));
  }

  extractArgument(arg, index) {
    switch (arg.type) {
      case 'Identifier':
        return {
          type: 'variable',
          name: arg.name,
          position: index,
          isParam: this.scope.isParam(arg.name)
        };

      case 'Literal':
        return {
          type: 'literal',
          value: arg.value,
          raw: arg.raw,
          position: index
        };

      case 'ObjectExpression':
        return {
          type: 'object_literal',
          properties: arg.properties?.length || 0,
          position: index
        };

      case 'ArrayExpression':
        return {
          type: 'array_literal',
          elements: arg.elements?.length || 0,
          position: index
        };

      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
        return {
          type: 'callback',
          position: index,
          isFunction: true
        };

      default:
        return {
          type: arg.type,
          position: index,
          description: '[expression]'
        };
    }
  }

  extractOperand(node) {
    if (!node) return { type: 'unknown' };

    if (node.type === 'Identifier') {
      return {
        type: 'variable',
        name: node.name,
        isParam: this.scope.isParam(node.name)
      };
    }

    if (node.type === 'Literal') {
      return {
        type: 'literal',
        value: node.value,
        raw: node.raw
      };
    }

    if (node.type === 'MemberExpression') {
      return {
        type: 'property_access',
        object: node.object?.name,
        property: node.property?.name
      };
    }

    return { type: node.type };
  }

  /**
   * Obtiene el target de asignación (si aplica)
   */
  getAssignmentTarget(node) {
    // Buscar en el contexto padre si hay una asignación
    // Esto es una simplificación - en la implementación real
    // necesitaríamos acceso al contexto padre del AST
    return null;
  }

  /**
   * Verifica si estamos en contexto async
   */
  isInAsyncContext(node) {
    return this.scope.isAsync || false;
  }
}

export default CallVisitor;
