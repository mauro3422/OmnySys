/**
 * @fileoverview Argument Mapper - Mapea argumentos a parámetros
 * 
 * Analiza cómo los argumentos de una función caller
 * se mapean a los parámetros de una función callee.
 * 
 * Ejemplo:
 *   Caller: processOrder(order)
 *   Call: calculateTotal(order.items)
 *   Callee: calculateTotal(items)
 *   
 *   Mapeo: order.items (arg) → items (param) [property_access]
 * 
 * @module molecular-chains/argument-mapper
 */

export class ArgumentMapper {
  constructor(callerAtom, calleeAtom, callInfo) {
    this.caller = callerAtom;
    this.callee = calleeAtom;
    this.call = callInfo;
  }

  /**
   * Mapea todos los argumentos a parámetros
   */
  map() {
    const mappings = [];
    
    const callerArgs = this.call.args || [];
    const calleeParams = this.callee.dataFlow?.inputs || [];
    
    for (let i = 0; i < Math.max(callerArgs.length, calleeParams.length); i++) {
      const arg = callerArgs[i];
      const param = calleeParams[i];
      
      if (arg && param) {
        const mapping = this.mapArgumentToParam(arg, param, i);
        mappings.push(mapping);
      }
    }

    return {
      caller: this.caller.name,
      callee: this.callee.name,
      callSite: this.call.line || 0,
      mappings,
      
      // Metadata
      totalArgs: callerArgs.length,
      totalParams: calleeParams.length,
      hasSpread: callerArgs.some(a => a.type === 'spread'),
      hasDestructuring: calleeParams.some(p => p.type === 'destructured')
    };
  }

  /**
   * Mapea un argumento específico a un parámetro
   */
  mapArgumentToParam(arg, param, position) {
    const mapping = {
      position,
      
      // Argumento (desde caller)
      argument: {
        code: this.extractArgumentCode(arg),
        type: arg.type || 'unknown',
        variable: this.extractRootVariable(arg)
      },
      
      // Parámetro (en callee)
      parameter: {
        name: param.name,
        type: param.type || 'simple',
        position: param.position || position
      },
      
      // Transformación aplicada
      transform: this.detectTransform(arg, param),
      
      // Metadata
      confidence: this.calculateConfidence(arg, param)
    };

    return mapping;
  }

  /**
   * Extrae código del argumento
   */
  extractArgumentCode(arg) {
    if (typeof arg === 'string') return arg;
    if (arg.name) return arg.name;
    if (arg.code) return arg.code;
    
    // Reconstruir código
    if (arg.type === 'MemberExpression') {
      return `${arg.object}.${arg.property}`;
    }
    
    if (arg.type === 'CallExpression') {
      const args = (arg.arguments || []).map(a => this.extractArgumentCode(a)).join(', ');
      return `${arg.callee}(${args})`;
    }
    
    return '[expression]';
  }

  /**
   * Extrae la variable raíz de un argumento
   */
  extractRootVariable(arg) {
    if (arg.type === 'Identifier') {
      return arg.name;
    }
    
    if (arg.type === 'MemberExpression') {
      // Para order.items, retorna order
      return arg.object?.name || arg.object;
    }
    
    if (arg.variable) {
      return arg.variable;
    }
    
    return null;
  }

  /**
   * Detecta qué transformación se aplica
   */
  detectTransform(arg, param) {
    // Caso 1: Property access
    // order.items → items (accediendo a propiedad)
    if (arg.type === 'MemberExpression') {
      return {
        type: 'PROPERTY_ACCESS',
        from: arg.object?.name || arg.object,
        property: arg.property?.name || arg.property,
        description: `${arg.object?.name}.${arg.property} → ${param.name}`
      };
    }

    // Caso 2: Direct pass
    // order → order (sin transformación)
    if (arg.name === param.name || 
        (arg.variable && arg.variable === param.name)) {
      return {
        type: 'DIRECT_PASS',
        description: `${arg.name} → ${param.name}`
      };
    }

    // Caso 3: Expression
    // calculateSubtotal(order) → items (resultado de expresión)
    if (arg.type === 'CallExpression') {
      return {
        type: 'CALL_RESULT',
        call: arg.callee,
        description: `${arg.callee}() → ${param.name}`
      };
    }

    // Caso 4: Literal
    // 100 → amount
    if (arg.type === 'Literal') {
      return {
        type: 'LITERAL',
        value: arg.value,
        description: `${arg.value} → ${param.name}`
      };
    }

    // Caso 5: Spread
    // ...args → params
    if (arg.type === 'SpreadElement') {
      return {
        type: 'SPREAD',
        source: arg.argument?.name,
        description: `...${arg.argument?.name} → ${param.name}`
      };
    }

    // Default
    return {
      type: 'UNKNOWN',
      description: `[${arg.type}] → ${param.name}`
    };
  }

  /**
   * Calcula confianza del mapeo
   */
  calculateConfidence(arg, param) {
    let confidence = 0.5;

    // +0.3 si tenemos información de tipos
    if (arg.dataType && param.dataType && arg.dataType === param.dataType) {
      confidence += 0.3;
    }

    // +0.2 si es property access (muy común y claro)
    if (arg.type === 'MemberExpression') {
      confidence += 0.2;
    }

    // +0.1 si es paso directo
    if (arg.name === param.name) {
      confidence += 0.1;
    }

    // -0.2 si es spread o destructuring complejo
    if (arg.type === 'SpreadElement' || param.type === 'destructured') {
      confidence -= 0.2;
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Analiza data flow completo entre caller y callee
   */
  analyzeDataFlow() {
    const mapping = this.map();
    
    // Analizar si el return del callee se usa en el caller
    const returnUsage = this.trackReturnUsage();
    
    // Detectar transformaciones encadenadas
    const chainedTransforms = this.detectChainedTransforms(mapping);

    return {
      ...mapping,
      returnUsage,
      chainedTransforms,
      
      // Resumen
      summary: {
        hasDataTransformation: mapping.mappings.some(m => 
          m.transform.type !== 'DIRECT_PASS'
        ),
        hasReturnUsage: returnUsage.isUsed,
        chainComplexity: this.calculateChainComplexity(mapping, returnUsage)
      }
    };
  }

  /**
   * Trackea cómo se usa el return del callee en el caller
   */
  trackReturnUsage() {
    const calleeReturn = this.callee.dataFlow?.outputs?.find(o => 
      o.type === 'return'
    );
    
    if (!calleeReturn) {
      return { isUsed: false, reason: 'no_return' };
    }

    // Buscar en el caller dónde se usa esta llamada
    const callerCode = this.caller.code || '';
    const callLine = this.call.line || 0;
    
    // Verificar si el resultado se asigna a una variable
    const assignmentPattern = new RegExp(
      `(const|let|var)\\s+(\\w+)\\s*=\\s*${this.escapeRegex(this.call.callee || this.callee.name)}`,
      'g'
    );
    
    const assignments = [...callerCode.matchAll(assignmentPattern)];
    
    if (assignments.length > 0) {
      const assignedVar = assignments[0][2];
      
      // Buscar usos de esta variable
      const usages = this.findVariableUsages(assignedVar, callerCode, callLine);
      
      return {
        isUsed: usages.length > 0,
        assignedTo: assignedVar,
        usages: usages,
        line: callLine
      };
    }

    // Verificar si se usa directamente (sin asignar)
    const directUsage = callerCode.includes(this.call.callee || this.callee.name);
    
    return {
      isUsed: directUsage,
      assignedTo: null,
      usages: directUsage ? ['direct_usage'] : [],
      line: callLine
    };
  }

  /**
   * Detecta transformaciones encadenadas
   */
  detectChainedTransforms(mapping) {
    const chains = [];
    
    for (const m of mapping.mappings) {
      // Si el argumento es resultado de otra transformación en el caller
      const callerTransforms = this.caller.dataFlow?.transformations || [];
      
      const sourceTransform = callerTransforms.find(t => 
        t.to === m.argument.variable || 
        t.output?.name === m.argument.variable
      );
      
      if (sourceTransform) {
        chains.push({
          from: `${this.caller.name}.${sourceTransform.type}`,
          to: `${this.callee.name}.input`,
          via: m.argument.variable
        });
      }
    }
    
    return chains;
  }

  /**
   * Calcula complejidad de la chain
   */
  calculateChainComplexity(mapping, returnUsage) {
    let complexity = 0;
    
    // +1 por cada mapping no directo
    complexity += mapping.mappings.filter(m => 
      m.transform.type !== 'DIRECT_PASS'
    ).length;
    
    // +1 si hay uso de return
    if (returnUsage.isUsed) complexity += 1;
    
    // +1 por cada uso del return
    complexity += (returnUsage.usages || []).length;
    
    return complexity;
  }

  /**
   * Encuentra usos de una variable en el código
   */
  findVariableUsages(varName, code, afterLine) {
    const usages = [];
    const lines = code.split('\n');
    
    for (let i = afterLine; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(varName)) {
        usages.push({
          line: i + 1,
          context: line.trim()
        });
      }
    }
    
    return usages;
  }

  /**
   * Escapa caracteres especiales para regex
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export default ArgumentMapper;
