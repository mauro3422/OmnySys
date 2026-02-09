/**
 * @fileoverview Visitor A - Inputs (Parámetros)
 * 
 * PASO A del patrón A-B-C:
 * Detecta los parámetros de la función y cómo se usan
 * 
 * Detecta:
 * - FunctionDeclaration/ArrowFunctionExpression params
 * - Property access: param.property
 * - Destructuring: const { a, b } = param
 * - Spread: { ...param }
 * 
 * @module data-flow/visitors/a-inputs-visitor
 * @phase A
 */

export function aInputsVisitor(context) {
  return {
    // Detectar declaración de función
    FunctionDeclaration(path) {
      extractParams(path, context);
    },
    
    // Detectar arrow function
    ArrowFunctionExpression(path) {
      // Solo si es top-level (no inline callbacks)
      if (isTopLevelFunction(path)) {
        extractParams(path, context);
      }
    },
    
    // Detectar método de clase
    MethodDefinition(path) {
      if (path.node.key?.name) {
        extractParams(path, context);
      }
    },
    
    // Detectar acceso a propiedad: user.email
    MemberExpression(path) {
      const { node } = path;
      
      // Verificar si el objeto es un parámetro
      if (node.object?.name && context.scope.isParam(node.object.name)) {
        const usage = {
          type: 'property_access',
          target: node.object.name,
          property: node.property?.name || node.property?.value,
          line: node.loc?.start?.line,
          column: node.loc?.start?.column
        };
        
        context.scope.addUsage(usage);
      }
    },
    
    // Detectar destructuring: const { name, email } = user
    VariableDeclarator(path) {
      const { node } = path;
      
      // Destructuring de objeto
      if (node.id?.type === 'ObjectPattern' && node.init?.name) {
        if (context.scope.isParam(node.init.name)) {
          // Registrar cada propiedad desestructurada
          node.id.properties.forEach((prop, index) => {
            if (prop.type === 'ObjectProperty') {
              const varName = prop.value?.name || prop.key?.name;
              context.scope.registerVariable(varName, {
                source: node.init.name,
                destructured: true,
                property: prop.key?.name,
                line: node.loc?.start?.line
              });
              
              // Registrar uso del parámetro original
              context.scope.addUsage({
                type: 'destructured',
                target: node.init.name,
                property: prop.key?.name,
                line: node.loc?.start?.line
              });
            }
          });
        }
      }
      
      // Destructuring de array
      if (node.id?.type === 'ArrayPattern' && node.init?.name) {
        if (context.scope.isParam(node.init.name)) {
          node.id.elements.forEach((elem, index) => {
            if (elem?.name) {
              context.scope.registerVariable(elem.name, {
                source: node.init.name,
                destructured: true,
                index,
                line: node.loc?.start?.line
              });
            }
          });
        }
      }
    },
    
    // Detectar spread operator: { ...order }
    SpreadElement(path) {
      const { node } = path;
      
      if (node.argument?.name && context.scope.isParam(node.argument.name)) {
        context.scope.addUsage({
          type: 'spread',
          target: node.argument.name,
          line: node.loc?.start?.line
        });
      }
    }
  };
}

/**
 * Extrae parámetros de una función
 */
function extractParams(path, context) {
  const { node } = path;
  
  node.params.forEach((param, index) => {
    let paramInfo;
    
    // Parámetro simple: function(a, b)
    if (param.type === 'Identifier') {
      paramInfo = {
        name: param.name,
        position: index,
        type: 'simple'
      };
    }
    // Destructuring: function({ a, b })
    else if (param.type === 'ObjectPattern') {
      paramInfo = {
        name: `param_${index}`, // Nombre genérico
        position: index,
        type: 'destructured',
        properties: param.properties.map(p => p.key?.name || p.value?.name)
      };
    }
    // Rest params: function(...args)
    else if (param.type === 'RestElement') {
      paramInfo = {
        name: param.argument?.name || `rest_${index}`,
        position: index,
        type: 'rest'
      };
    }
    // Default values: function(a = 1)
    else if (param.type === 'AssignmentPattern') {
      paramInfo = {
        name: param.left?.name || `param_${index}`,
        position: index,
        type: 'with_default',
        defaultValue: extractDefaultValue(param.right)
      };
    }
    
    if (paramInfo) {
      context.inputs.push(paramInfo);
      context.scope.registerParam(paramInfo);
    }
  });
}

/**
 * Verifica si una función es top-level (no callback inline)
 */
function isTopLevelFunction(path) {
  // No es callback de map/filter/etc inline
  const parent = path.parent;
  return !(
    parent?.type === 'CallExpression' &&
    parent.callee?.property?.name?.match(/^(map|filter|reduce|forEach|find|some|every)$/)
  );
}

/**
 * Extrae valor default para logging
 */
function extractDefaultValue(node) {
  if (node.type === 'Literal') {
    return node.value;
  }
  if (node.type === 'Identifier') {
    return node.name;
  }
  return '[complex]';
}
