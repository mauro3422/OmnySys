/**
 * @fileoverview Visitor B - Transformations
 * 
 * PASO B del patrón A-B-C:
 * Detecta las transformaciones de datos dentro de la función
 * 
 * Detecta:
 * - Asignaciones: const x = ...
 * - Llamadas a funciones: calculateTotal(items)
 * - Operaciones aritméticas: a + b, a * b
 * - Comparaciones: a > b, a === b
 * - Ternarios: condition ? a : b
 * - Array methods: items.map(), items.filter()
 * 
 * @module data-flow/visitors/b-transforms-visitor
 * @phase B
 */

export function bTransformsVisitor(context) {
  return {
    // Detectar asignaciones: const x = ...
    VariableDeclarator(path) {
      const { node } = path;
      const varName = node.id?.name;
      
      if (!varName) return;
      
      // Registrar variable
      context.scope.registerVariable(varName, {
        line: node.loc?.start?.line,
        type: node.init?.type
      });
      
      // Analizar el valor asignado
      const init = node.init;
      if (!init) return;
      
      const transform = analyzeAssignment(varName, init, context);
      if (transform) {
        context.transforms.push(transform);
      }
    },
    
    // Detectar asignaciones: x = ...
    AssignmentExpression(path) {
      const { node } = path;
      const varName = node.left?.name;
      
      if (varName) {
        const transform = analyzeAssignment(varName, node.right, context, {
          isReassignment: true,
          operator: node.operator
        });
        if (transform) {
          context.transforms.push(transform);
        }
      }
    },
    
    // Detectar updates: x++, x--
    UpdateExpression(path) {
      const { node } = path;
      const varName = node.argument?.name;
      
      if (varName) {
        context.transforms.push({
          type: 'update',
          to: varName,
          operation: node.operator, // '++' o '--'
          line: node.loc?.start?.line
        });
      }
    }
  };
}

/**
 * Analiza una asignación y extrae la transformación
 */
function analyzeAssignment(varName, initNode, context, options = {}) {
  const line = initNode.loc?.start?.line;
  
  // Caso 1: Llamada a función: calculateTotal(order.items)
  if (initNode.type === 'CallExpression') {
    return {
      type: 'function_call',
      to: varName,
      via: extractCalleeName(initNode.callee),
      from: extractArguments(initNode.arguments, context),
      line,
      isAsync: initNode.callee?.name?.startsWith?.('await') || false,
      ...options
    };
  }
  
  // Caso 2: Operación binaria: total - discount
  if (initNode.type === 'BinaryExpression') {
    return {
      type: 'arithmetic',
      to: varName,
      operation: initNode.operator, // '+', '-', '*', '/', etc.
      operands: [
        extractOperand(initNode.left, context),
        extractOperand(initNode.right, context)
      ],
      line,
      ...options
    };
  }
  
  // Caso 3: Operación unaria: -value, !condition
  if (initNode.type === 'UnaryExpression') {
    return {
      type: 'unary',
      to: varName,
      operation: initNode.operator,
      operand: extractOperand(initNode.argument, context),
      line,
      ...options
    };
  }
  
  // Caso 4: Ternario: condition ? a : b
  if (initNode.type === 'ConditionalExpression') {
    return {
      type: 'ternary',
      to: varName,
      condition: extractOperand(initNode.test, context),
      trueBranch: extractOperand(initNode.consequent, context),
      falseBranch: extractOperand(initNode.alternate, context),
      line,
      ...options
    };
  }
  
  // Caso 5: Acceso a propiedad: user.discount
  if (initNode.type === 'MemberExpression') {
    return {
      type: 'property_access',
      to: varName,
      from: extractOperand(initNode.object, context),
      property: initNode.property?.name || initNode.property?.value,
      line,
      ...options
    };
  }
  
  // Caso 6: Objeto: { ...order, total: finalTotal }
  if (initNode.type === 'ObjectExpression') {
    const spreadProps = initNode.properties
      .filter(p => p.type === 'SpreadElement')
      .map(p => extractOperand(p.argument, context));
    
    const regularProps = initNode.properties
      .filter(p => p.type === 'ObjectProperty')
      .map(p => ({
        key: p.key?.name || p.key?.value,
        value: extractOperand(p.value, context)
      }));
    
    return {
      type: 'object_merge',
      to: varName,
      spreadFrom: spreadProps,
      properties: regularProps,
      line,
      ...options
    };
  }
  
  // Caso 7: Array: [a, b, c]
  if (initNode.type === 'ArrayExpression') {
    return {
      type: 'array_literal',
      to: varName,
      elements: initNode.elements.map(e => extractOperand(e, context)),
      line,
      ...options
    };
  }
  
  // Caso 8: Literal o identificador simple
  if (initNode.type === 'Literal' || initNode.type === 'Identifier') {
    return {
      type: 'assignment',
      to: varName,
      from: extractOperand(initNode, context),
      line,
      ...options
    };
  }
  
  // Caso 9: Array method: items.map(x => x.price)
  if (initNode.type === 'CallExpression' && 
      initNode.callee?.type === 'MemberExpression' &&
      ['map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every'].includes(
        initNode.callee.property?.name
      )) {
    return {
      type: 'array_method',
      to: varName,
      method: initNode.callee.property.name,
      from: extractOperand(initNode.callee.object, context),
      line,
      ...options
    };
  }
  
  // Caso no reconocido
  return {
    type: 'unknown_assignment',
    to: varName,
    nodeType: initNode.type,
    line,
    ...options
  };
}

/**
 * Extrae el nombre de una función llamada
 */
function extractCalleeName(callee) {
  if (callee.type === 'Identifier') {
    return callee.name;
  }
  if (callee.type === 'MemberExpression') {
    return `${extractCalleeName(callee.object)}.${callee.property?.name}`;
  }
  return '[anonymous]';
}

/**
 * Extrae los argumentos de una llamada
 */
function extractArguments(args, context) {
  return args.map(arg => extractOperand(arg, context));
}

/**
 * Extrae información de un operando
 */
function extractOperand(node, context) {
  if (!node) return null;
  
  if (node.type === 'Identifier') {
    return {
      type: 'variable',
      name: node.name,
      isParam: context.scope.isParam(node.name)
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
      object: extractOperand(node.object, context),
      property: node.property?.name || node.property?.value
    };
  }
  
  // Para nodos complejos, solo el tipo
  return {
    type: node.type,
    description: '[complex expression]'
  };
}
