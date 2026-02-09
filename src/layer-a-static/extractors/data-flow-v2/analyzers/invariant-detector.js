/**
 * @fileoverview Invariant Detector - Detecta propiedades garantizadas del código
 * 
 * Analiza el grafo de transformaciones para encontrar:
 * - Type invariants: "x siempre es number después de línea 12"
 * - Range invariants: "total siempre >= 0"
 * - Null-safety: "obj nunca es null después del check"
 * - Pureza de funciones
 * - Idempotencia
 * 
 * @module data-flow-v2/analyzers/invariant-detector
 */

export class InvariantDetector {
  constructor(graph) {
    this.graph = graph;
    this.invariants = [];
  }

  /**
   * Detecta todas las invariantes en el grafo
   */
  detect() {
    this.detectTypeInvariants();
    this.detectRangeInvariants();
    this.detectNullSafety();
    this.detectPurity();
    this.detectIdempotence();

    return this.invariants;
  }

  /**
   * Detecta invariantes de tipo
   * 
   * Ejemplo: "total es number porque viene de price * quantity"
   */
  detectTypeInvariants() {
    for (const node of this.graph.nodes) {
      // Inferir tipo basado en la operación
      let inferredType = null;
      let confidence = 0;
      let evidence = [];

      switch (node.type) {
        case 'ADD':
        case 'SUBTRACT':
        case 'MULTIPLY':
        case 'DIVIDE':
          inferredType = 'number';
          confidence = 0.9;
          evidence = this.getArithmeticEvidence(node);
          break;

        case 'AND':
        case 'OR':
        case 'NOT':
        case 'EQUALS':
        case 'GREATER_THAN':
          inferredType = 'boolean';
          confidence = 1.0;
          evidence = [{ check: 'logical_operation', result: 'boolean' }];
          break;

        case 'OBJECT_CREATE':
          inferredType = 'object';
          confidence = 1.0;
          evidence = [{ check: 'object_literal', properties: node.properties?.propCount }];
          break;

        case 'ARRAY_CREATE':
          inferredType = 'array';
          confidence = 1.0;
          evidence = [{ check: 'array_literal', elements: node.properties?.elementCount }];
          break;

        case 'MAP':
        case 'FILTER':
          inferredType = 'array';
          confidence = 0.95;
          evidence = [{ check: 'array_method', method: node.type, returns: 'array' }];
          break;

        case 'FUNCTION_CALL':
          // Intentar inferir del nombre de la función
          inferredType = this.inferTypeFromFunction(node);
          if (inferredType) {
            confidence = 0.7;
            evidence = [{ check: 'function_name', function: node.properties?.functionName }];
          }
          break;
      }

      if (inferredType && node.output?.name) {
        this.invariants.push({
          type: 'TYPE_INVARIANT',
          variable: node.output.name,
          inferredType,
          confidence,
          evidence,
          location: node.location,
          nodeId: node.id
        });
      }
    }
  }

  /**
   * Detecta invariantes de rango (ej: siempre positivo)
   */
  detectRangeInvariants() {
    for (const node of this.graph.nodes) {
      // Solo operaciones aritméticas pueden tener invariantes de rango
      if (!['ADD', 'MULTIPLY', 'DIVIDE'].includes(node.type)) continue;

      const inputs = node.inputs || [];
      let rangeInvariant = null;
      let confidence = 0;
      let evidence = [];

      // Analizar inputs
      const areInputsPositive = inputs.every(input => 
        this.isPositiveInvariant(input.name)
      );

      if (areInputsPositive) {
        switch (node.type) {
          case 'ADD':
            rangeInvariant = 'POSITIVE';
            confidence = 1.0;
            evidence = [{ rule: 'positive + positive = positive' }];
            break;

          case 'MULTIPLY':
            rangeInvariant = 'POSITIVE';
            confidence = 1.0;
            evidence = [{ rule: 'positive × positive = positive' }];
            break;

          case 'DIVIDE':
            // Dividir por cero es problema
            const divisorIsNonZero = inputs[1] && 
              this.isNonZeroInvariant(inputs[1].name);
            
            if (divisorIsNonZero) {
              rangeInvariant = 'POSITIVE';
              confidence = 0.9;
              evidence = [
                { rule: 'positive ÷ positive = positive' },
                { check: 'divisor_is_nonzero', passed: true }
              ];
            } else {
              rangeInvariant = 'POSITIVE_OR_INFINITY';
              confidence = 0.8;
              evidence = [
                { rule: 'positive ÷ positive = positive' },
                { warning: 'divisor_could_be_zero' }
              ];
            }
            break;
        }
      }

      if (rangeInvariant && node.output?.name) {
        this.invariants.push({
          type: 'RANGE_INVARIANT',
          variable: node.output.name,
          invariant: rangeInvariant,
          confidence,
          evidence,
          location: node.location,
          nodeId: node.id
        });
      }
    }
  }

  /**
   * Detecta null-safety (checks de null/undefined)
   */
  detectNullSafety() {
    // Buscar patrones de null-check
    for (const node of this.graph.nodes) {
      if (node.type === 'CONDITIONAL_BRANCH' || node.type === 'TERNARY') {
        const condition = node.inputs?.[0];
        
        if (condition && this.isNullCheck(condition)) {
          // Encontrar variables que se vuelven non-null después del check
          const checkedVar = this.extractCheckedVariable(condition);
          
          if (checkedVar) {
            this.invariants.push({
              type: 'NULL_SAFETY',
              variable: checkedVar,
              invariant: 'NON_NULL_AFTER_CHECK',
              confidence: 0.95,
              evidence: [
                { check: 'null_check', condition: condition.code },
                { location: node.location }
              ],
              location: node.location,
              nodeId: node.id
            });
          }
        }
      }
    }
  }

  /**
   * Detecta pureza de funciones
   */
  detectPurity() {
    // Analizar cada función (en este contexto, cada grafo es una función)
    
    const hasSideEffects = this.graph.meta.hasSideEffects;
    const hasAsync = this.graph.meta.hasAsync;
    const sideEffectNodes = this.graph.nodes.filter(n => 
      n.category === 'side_effect' || n.properties?.hasSideEffects
    );

    let purity = 'PURE';
    let confidence = 1.0;
    let evidence = [];

    if (hasSideEffects) {
      purity = 'IMPURE';
      confidence = 1.0;
      evidence = sideEffectNodes.map(n => ({
        type: 'side_effect',
        operation: n.type,
        location: n.location
      }));
    } else if (hasAsync) {
      purity = 'EFFECTIVELY_PURE';
      confidence = 0.9;
      evidence = [{ type: 'async', note: 'async but no side effects' }];
    } else {
      evidence = [{ type: 'no_side_effects', check: 'passed' }];
    }

    this.invariants.push({
      type: 'PURITY_INVARIANT',
      function: 'current_function', // Se reemplazará con nombre real
      purity,
      confidence,
      evidence,
      sideEffects: sideEffectNodes.map(n => n.type)
    });
  }

  /**
   * Detecta idempotencia (f(x) = f(f(x)))
   */
  detectIdempotence() {
    // Funciones que típicamente son idempotentes
    const idempotentPatterns = [
      { pattern: /^format/, confidence: 0.8 },
      { pattern: /^normalize/, confidence: 0.8 },
      { pattern: /^trim/, confidence: 0.9 },
      { pattern: /^toLower/, confidence: 0.9 },
      { pattern: /^toUpper/, confidence: 0.9 },
      { pattern: /^parse/, confidence: 0.7 },
      { pattern: /^validate/, confidence: 0.6 }
    ];

    for (const node of this.graph.nodes) {
      if (node.type === 'FUNCTION_CALL' && node.properties?.functionName) {
        const funcName = node.properties.functionName;
        
        for (const { pattern, confidence } of idempotentPatterns) {
          if (pattern.test(funcName)) {
            this.invariants.push({
              type: 'IDEMPOTENCE_INVARIANT',
              function: funcName,
              invariant: 'LIKELY_IDEMPOTENT',
              confidence,
              evidence: [
                { pattern: pattern.source, match: true },
                { note: 'Common idempotent pattern' }
              ],
              location: node.location,
              nodeId: node.id
            });
            break;
          }
        }
      }
    }
  }

  // Helper methods

  getArithmeticEvidence(node) {
    const evidence = [];
    const inputs = node.inputs || [];

    for (const input of inputs) {
      if (input.type === 'variable') {
        evidence.push({
          variable: input.name,
          type: this.getVariableType(input.name)
        });
      } else if (input.type === 'literal') {
        evidence.push({
          literal: input.value,
          type: typeof input.value
        });
      }
    }

    return evidence;
  }

  getVariableType(varName) {
    // Buscar en invariantes de tipo ya detectadas
    const invariant = this.invariants.find(i => 
      i.type === 'TYPE_INVARIANT' && i.variable === varName
    );
    return invariant?.inferredType || 'unknown';
  }

  isPositiveInvariant(varName) {
    // Verificar si ya detectamos que esta variable es positiva
    return this.invariants.some(i => 
      i.type === 'RANGE_INVARIANT' &&
      i.variable === varName &&
      i.invariant === 'POSITIVE'
    );
  }

  isNonZeroInvariant(varName) {
    // Verificar si sabemos que no es cero
    // Por ahora, solo variables que vienen de multiplicación de positivos
    return false; // Placeholder
  }

  isNullCheck(condition) {
    if (!condition.code) return false;
    
    const nullChecks = [
      /!=\s*null/,
      /!==\s*null/,
      /!=\s*undefined/,
      /!==\s*undefined/,
      /\?\?/, // Nullish coalescing
      /\?\./ // Optional chaining
    ];

    return nullChecks.some(pattern => pattern.test(condition.code));
  }

  extractCheckedVariable(condition) {
    // Extraer variable del check de null
    // Ej: "user != null" → "user"
    if (!condition.code) return null;
    
    const match = condition.code.match(/^(\w+)\s*[!=]/);
    return match ? match[1] : null;
  }

  inferTypeFromFunction(node) {
    const funcName = node.properties?.functionName?.toLowerCase() || '';
    
    if (/get|find|read|fetch|load/.test(funcName)) return 'any';
    if (/calculate|compute|sum|count/.test(funcName)) return 'number';
    if (/parsejson|json\.parse/.test(funcName)) return 'object';
    if (/parseint/.test(funcName)) return 'number';
    if (/parsefloat/.test(funcName)) return 'number';
    if (/stringify/.test(funcName)) return 'string';
    
    return null;
  }
}

export default InvariantDetector;
