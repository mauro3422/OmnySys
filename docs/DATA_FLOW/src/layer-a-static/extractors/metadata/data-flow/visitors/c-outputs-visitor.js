/**
 * @fileoverview Visitor C - Outputs
 * 
 * PASO C del patrón A-B-C:
 * Detecta los outputs de la función (returns y side effects)
 * 
 * Detecta:
 * - Returns: return x, return { ... }
 * - Side effects: funciones que modifican estado externo
 *   - fetch(), axios.* - llamadas de red
 *   - localStorage.*, sessionStorage.* - storage
 *   - console.* - logging
 *   - document.*, window.* - DOM
 *   - setTimeout, setInterval - timers
 *   - emit(), dispatch() - eventos
 *   - writeFile, fs.* - I/O de archivo
 * 
 * @module data-flow/visitors/c-outputs-visitor
 * @phase C
 */

// Lista de funciones que son side effects conocidos
const SIDE_EFFECT_FUNCTIONS = {
  // Network
  'fetch': 'network',
  'axios.get': 'network',
  'axios.post': 'network',
  'axios.put': 'network',
  'axios.delete': 'network',
  'XMLHttpRequest': 'network',
  
  // Storage
  'localStorage.setItem': 'storage_write',
  'localStorage.getItem': 'storage_read',
  'localStorage.removeItem': 'storage_delete',
  'sessionStorage.setItem': 'storage_write',
  'sessionStorage.getItem': 'storage_read',
  
  // Console
  'console.log': 'logging',
  'console.warn': 'logging',
  'console.error': 'logging',
  'console.info': 'logging',
  'console.debug': 'logging',
  'console.table': 'logging',
  
  // DOM
  'document.getElementById': 'dom_read',
  'document.querySelector': 'dom_read',
  'document.querySelectorAll': 'dom_read',
  'document.createElement': 'dom_create',
  'document.write': 'dom_write',
  'window.alert': 'ui_alert',
  'window.confirm': 'ui_confirm',
  'window.prompt': 'ui_prompt',
  
  // Timers
  'setTimeout': 'timer',
  'setInterval': 'timer',
  'clearTimeout': 'timer',
  'clearInterval': 'timer',
  
  // Events
  'emit': 'event_emit',
  'dispatch': 'event_dispatch',
  'addEventListener': 'event_listen',
  'removeEventListener': 'event_listen',
  
  // File System (Node)
  'fs.readFile': 'filesystem_read',
  'fs.readFileSync': 'filesystem_read',
  'fs.writeFile': 'filesystem_write',
  'fs.writeFileSync': 'filesystem_write',
  'fs.appendFile': 'filesystem_write',
  
  // Database comunes
  'db.collection': 'database',
  'db.find': 'database_read',
  'db.insert': 'database_write',
  'db.update': 'database_write',
  'db.delete': 'database_write',
  
  // Email/Notifications
  'sendMail': 'email',
  'sendEmail': 'email',
  'sendNotification': 'notification',
  
  // Process (Node)
  'process.exit': 'process_control',
  'process.kill': 'process_control'
};

export function cOutputsVisitor(context) {
  return {
    // Detectar returns
    ReturnStatement(path) {
      const { node } = path;
      
      context.outputs.push({
        type: 'return',
        data: extractReturnValue(node.argument, context),
        line: node.loc?.start?.line,
        hasValue: node.argument !== null
      });
    },
    
    // Detectar side effects en llamadas
    CallExpression(path) {
      const { node } = path;
      const calleeName = extractCalleeName(node.callee);
      
      // Verificar si es un side effect conocido
      const sideEffectType = detectSideEffect(calleeName, node);
      
      if (sideEffectType) {
        context.outputs.push({
          type: 'side_effect',
          category: sideEffectType,
          target: calleeName,
          args: node.arguments?.length || 0,
          line: node.loc?.start?.line,
          isAsync: context.scope.isAsync || calleeName.startsWith?.('await')
        });
      }
      
      // Detectar await
      if (path.parent?.type === 'AwaitExpression') {
        context.scope.isAsync = true;
      }
    },
    
    // Detectar throw (también es un output)
    ThrowStatement(path) {
      const { node } = path;
      
      context.outputs.push({
        type: 'throw',
        error: extractErrorInfo(node.argument, context),
        line: node.loc?.start?.line
      });
    }
  };
}

/**
 * Detecta si una llamada es un side effect
 */
function detectSideEffect(calleeName, node) {
  // Check exact match
  if (SIDE_EFFECT_FUNCTIONS[calleeName]) {
    return SIDE_EFFECT_FUNCTIONS[calleeName];
  }
  
  // Check partial match (e.g., "axios.get" matches "axios")
  for (const [pattern, type] of Object.entries(SIDE_EFFECT_FUNCTIONS)) {
    if (calleeName.startsWith(pattern) || pattern.startsWith(calleeName)) {
      return type;
    }
  }
  
  // Heurísticas adicionales
  
  // Funciones que terminan en set/Save/Write probablemente modifican estado
  if (/\.(set|save|write|update|delete|remove|add|create|insert)$/i.test(calleeName)) {
    return 'state_modification';
  }
  
  // Funciones que terminan en get/Read/Find probablemente leen
  if (/\.(get|read|find|fetch|load|query)$/i.test(calleeName)) {
    return 'state_read';
  }
  
  // Funciones que terminan en send/emit/dispatch son comunicación
  if (/\.(send|emit|dispatch|publish|notify)$/i.test(calleeName)) {
    return 'communication';
  }
  
  // Funciones con new probablemente crean objetos con side effects
  if (node.callee?.type === 'NewExpression') {
    return 'object_creation';
  }
  
  return null;
}

/**
 * Extrae información del valor de retorno
 */
function extractReturnValue(node, context) {
  if (!node) {
    return { type: 'undefined' };
  }
  
  // Literal
  if (node.type === 'Literal') {
    return {
      type: 'literal',
      value: node.value,
      raw: node.raw
    };
  }
  
  // Variable
  if (node.type === 'Identifier') {
    return {
      type: 'variable',
      name: node.name,
      isParam: context.scope.isParam(node.name)
    };
  }
  
  // Objeto: { orderId: order.id, total }
  if (node.type === 'ObjectExpression') {
    const properties = node.properties.map(p => {
      if (p.type === 'ObjectProperty') {
        return {
          key: p.key?.name || p.key?.value,
          value: extractReturnValue(p.value, context)
        };
      }
      if (p.type === 'SpreadElement') {
        return {
          type: 'spread',
          from: extractReturnValue(p.argument, context)
        };
      }
      return null;
    }).filter(Boolean);
    
    return {
      type: 'object',
      properties,
      shape: properties.map(p => p.key || p.type).join(', ')
    };
  }
  
  // Array: [a, b, c]
  if (node.type === 'ArrayExpression') {
    return {
      type: 'array',
      elements: node.elements.map(e => extractReturnValue(e, context)),
      length: node.elements.length
    };
  }
  
  // Llamada: calculateTotal(items)
  if (node.type === 'CallExpression') {
    return {
      type: 'call_result',
      callee: extractCalleeName(node.callee),
      args: node.arguments?.length || 0
    };
  }
  
  // Expresión condicional: condition ? a : b
  if (node.type === 'ConditionalExpression') {
    return {
      type: 'conditional',
      condition: '[expression]',
      hasBranches: true
    };
  }
  
  // Por defecto
  return {
    type: node.type,
    description: '[complex expression]'
  };
}

/**
 * Extrae información del error en throw
 */
function extractErrorInfo(node, context) {
  if (node.type === 'NewExpression' && node.callee?.name === 'Error') {
    const message = node.arguments?.[0];
    return {
      type: 'Error',
      message: message?.type === 'Literal' ? message.value : '[dynamic]'
    };
  }
  
  if (node.type === 'Identifier') {
    return {
      type: 'variable',
      name: node.name
    };
  }
  
  return {
    type: 'unknown'
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
    const object = extractCalleeName(callee.object);
    const property = callee.property?.name || '[computed]';
    return `${object}.${property}`;
  }
  
  return '[anonymous]';
}
