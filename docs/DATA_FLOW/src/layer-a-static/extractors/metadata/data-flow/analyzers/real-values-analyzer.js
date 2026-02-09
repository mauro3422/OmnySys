/**
 * @fileoverview Real Values Analyzer - Construye dataFlow con valores reales
 * 
 * Toma el contexto acumulado por los visitors y construye la estructura
 * final de dataFlow con nombres reales del código (no tokens).
 * 
 * Output para humanos/debugging.
 * 
 * @module data-flow/analyzers/real-values-analyzer
 */

export class RealValuesAnalyzer {
  constructor(context) {
    this.context = context;
  }
  
  /**
   * Construye la estructura dataFlow completa
   */
  build() {
    return {
      inputs: this.buildInputs(),
      transformations: this.buildTransformations(),
      outputs: this.buildOutputs(),
      
      // Metadata derivada
      flowType: this.detectFlowType(),
      complexity: this.calculateComplexity(),
      hasSideEffects: this.hasSideEffects(),
      isAsync: this.context.scope.isAsync || false
    };
  }
  
  /**
   * Construye la sección de inputs
   */
  buildInputs() {
    return this.context.inputs.map(input => ({
      name: input.name,
      position: input.position,
      type: input.type || 'simple',
      ...(input.properties && { properties: input.properties }),
      ...(input.defaultValue && { defaultValue: input.defaultValue }),
      usages: this.context.scope.getUsagesFor(input.name).map(u => ({
        type: u.type,
        ...(u.property && { property: u.property }),
        ...(u.target && { passedTo: u.target }),
        line: u.line
      }))
    }));
  }
  
  /**
   * Construye la sección de transformations
   */
  buildTransformations() {
    return this.context.transforms.map((t, index) => {
      const base = {
        step: index + 1,
        to: t.to,
        type: t.type,
        line: t.line
      };
      
      // Agregar campos específicos según el tipo
      switch (t.type) {
        case 'function_call':
          return {
            ...base,
            from: this.simplifyOperands(t.from),
            via: t.via,
            isAsync: t.isAsync || false
          };
          
        case 'arithmetic':
          return {
            ...base,
            from: this.simplifyOperands(t.operands),
            operation: t.operation
          };
          
        case 'property_access':
          return {
            ...base,
            from: t.from?.name || t.from,
            property: t.property
          };
          
        case 'ternary':
          return {
            ...base,
            condition: this.simplifyOperand(t.condition),
            trueValue: this.simplifyOperand(t.trueBranch),
            falseValue: this.simplifyOperand(t.falseBranch)
          };
          
        case 'object_merge':
          return {
            ...base,
            spreadFrom: t.spreadFrom?.map(s => s?.name || s),
            properties: t.properties?.map(p => ({
              key: p.key,
              value: this.simplifyOperand(p.value)
            }))
          };
          
        default:
          return {
            ...base,
            ...(t.from && { from: this.simplifyOperand(t.from) }),
            ...(t.operation && { operation: t.operation })
          };
      }
    });
  }
  
  /**
   * Construye la sección de outputs
   */
  buildOutputs() {
    return this.context.outputs.map((o, index) => {
      const base = {
        step: index + 1,
        type: o.type,
        line: o.line
      };
      
      switch (o.type) {
        case 'return':
          return {
            ...base,
            ...(o.data?.shape && { shape: o.data.shape }),
            ...(o.data?.properties && { properties: o.data.properties }),
            hasValue: o.hasValue
          };
          
        case 'side_effect':
          return {
            ...base,
            category: o.category,
            target: o.target,
            isAsync: o.isAsync || false
          };
          
        case 'throw':
          return {
            ...base,
            errorType: o.error?.type,
            ...(o.error?.message && { message: o.error.message })
          };
          
        default:
          return base;
      }
    });
  }
  
  /**
   * Detecta el tipo de flujo de datos
   */
  detectFlowType() {
    const hasInputs = this.context.inputs.length > 0;
    const hasTransforms = this.context.transforms.length > 0;
    const hasReturns = this.context.outputs.some(o => o.type === 'return');
    const hasSideEffects = this.context.outputs.some(o => o.type === 'side_effect');
    
    // Sin inputs ni outputs = función vacía
    if (!hasInputs && !hasReturns && !hasSideEffects) {
      return 'empty';
    }
    
    // Solo inputs, sin transforms ni outputs = no-op
    if (hasInputs && !hasTransforms && !hasReturns && !hasSideEffects) {
      return 'no-op';
    }
    
    // Inputs → Return (sin side effects ni transforms complejos)
    if (hasInputs && hasReturns && !hasSideEffects && !hasTransforms) {
      return 'pass-through';
    }
    
    // Solo lectura de datos
    if (hasInputs && hasReturns && !hasSideEffects) {
      const hasReadOps = this.context.transforms.some(t => 
        t.type === 'function_call' && /get|read|fetch|find|query/i.test(t.via)
      );
      
      if (hasReadOps && !hasTransforms) {
        return 'read-only';
      }
    }
    
    // Solo escritura de datos
    if (hasInputs && !hasReturns && hasSideEffects) {
      return 'write-only';
    }
    
    // Inputs → Transforms → Side Effects (sin return útil)
    if (hasInputs && hasTransforms && hasSideEffects && !hasReturns) {
      return 'transform-persist';
    }
    
    // Inputs → Transforms → Return (sin side effects)
    if (hasInputs && hasTransforms && hasReturns && !hasSideEffects) {
      return 'transform-return';
    }
    
    // Inputs → Read → Transform → Persist → Return
    if (hasInputs && hasTransforms && hasReturns && hasSideEffects) {
      return 'read-transform-persist';
    }
    
    // Tiene throw
    if (this.context.outputs.some(o => o.type === 'throw')) {
      return 'validation-gate';
    }
    
    return 'mixed';
  }
  
  /**
   * Calcula complejidad del data flow
   */
  calculateComplexity() {
    let complexity = 0;
    
    // +1 por cada transformación
    complexity += this.context.transforms.length;
    
    // +2 por cada side effect
    complexity += this.context.outputs.filter(o => o.type === 'side_effect').length * 2;
    
    // +1 por cada input con múltiples usos
    complexity += this.context.inputs.filter(i => 
      this.context.scope.getUsagesFor(i.name).length > 1
    ).length;
    
    return complexity;
  }
  
  /**
   * Verifica si tiene side effects
   */
  hasSideEffects() {
    return this.context.outputs.some(o => o.type === 'side_effect');
  }
  
  // Helpers
  
  simplifyOperands(operands) {
    if (!Array.isArray(operands)) {
      return this.simplifyOperand(operands);
    }
    return operands.map(o => this.simplifyOperand(o));
  }
  
  simplifyOperand(op) {
    if (!op) return null;
    
    if (typeof op === 'string') return op;
    
    if (op.name) return op.name;
    if (op.value !== undefined) return op.value;
    if (op.type === 'property_access') {
      return `${this.simplifyOperand(op.object)}.${op.property}`;
    }
    
    return `[${op.type}]`;
  }
}
