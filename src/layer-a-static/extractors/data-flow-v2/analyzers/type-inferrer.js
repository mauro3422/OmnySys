/**
 * @fileoverview Type Inferrer - Infiere tipos a través del grafo
 * 
 * Propaga tipos desde inputs hasta outputs, aplicando reglas
 * de transformación para determinar tipos intermedios.
 * 
 * @module data-flow-v2/analyzers/type-inferrer
 */

export class TypeInferrer {
  constructor(graph) {
    this.graph = graph;
    this.typeMap = new Map(); // nodeId -> type
    this.typeRules = this.initializeTypeRules();
  }

  /**
   * Inicializa reglas de tipos para cada operación
   */
  initializeTypeRules() {
    return {
      // Aritmética
      ADD: { in: ['number', 'number'], out: 'number' },
      SUBTRACT: { in: ['number', 'number'], out: 'number' },
      MULTIPLY: { in: ['number', 'number'], out: 'number' },
      DIVIDE: { in: ['number', 'number'], out: 'number' },
      MODULO: { in: ['number', 'number'], out: 'number' },
      POWER: { in: ['number', 'number'], out: 'number' },
      
      // Lógica
      AND: { in: ['boolean', 'boolean'], out: 'boolean' },
      OR: { in: ['boolean', 'boolean'], out: 'boolean' },
      NOT: { in: ['boolean'], out: 'boolean' },
      EQUALS: { in: ['any', 'any'], out: 'boolean' },
      GREATER_THAN: { in: ['number', 'number'], out: 'boolean' },
      LESS_THAN: { in: ['number', 'number'], out: 'boolean' },
      
      // Estructural
      PROPERTY_ACCESS: { in: ['object', 'string'], out: 'any' },
      ARRAY_INDEX: { in: ['array', 'number'], out: 'any' },
      OBJECT_CREATE: { in: ['properties'], out: 'object' },
      ARRAY_CREATE: { in: ['elements'], out: 'array' },
      
      // Funcional
      MAP: { in: ['array', 'function'], out: 'array' },
      FILTER: { in: ['array', 'predicate'], out: 'array' },
      REDUCE: { in: ['array', 'reducer', 'any'], out: 'any' },
      FIND: { in: ['array', 'predicate'], out: 'element|null' },
      SOME: { in: ['array', 'predicate'], out: 'boolean' },
      EVERY: { in: ['array', 'predicate'], out: 'boolean' },
      
      // Control
      CONDITIONAL_BRANCH: { in: ['boolean'], out: 'void' },
      TERNARY: { in: ['boolean', 'any', 'any'], out: 'union' },
      
      // String operations (implícitos)
      CONCAT: { in: ['string', 'string'], out: 'string' },
      
      // Defaults
      FUNCTION_CALL: { in: ['arguments'], out: 'unknown' },
      ASSIGN: { in: ['any'], out: 'any' }
    };
  }

  /**
   * Infiere todos los tipos en el grafo
   */
  infer() {
    const iterations = 5; // Máximo de pasadas para converger
    
    for (let i = 0; i < iterations; i++) {
      let changed = false;
      
      for (const node of this.graph.nodes) {
        const inferredType = this.inferNodeType(node);
        
        if (inferredType && this.typeMap.get(node.id) !== inferredType) {
          this.typeMap.set(node.id, inferredType);
          changed = true;
        }
      }
      
      if (!changed) break; // Convergió
    }

    return this.buildTypeFlow();
  }

  /**
   * Infiere tipo de un nodo específico
   */
  inferNodeType(node) {
    const rule = this.typeRules[node.type];
    
    if (!rule) {
      // Sin regla específica, intentar heurísticas
      return this.inferHeuristicType(node);
    }

    // Verificar compatibilidad de inputs
    const inputTypes = (node.inputs || []).map(input => 
      this.resolveInputType(input)
    );

    // Si hay tipos incompatibles, marcar error potencial
    if (this.hasTypeMismatch(inputTypes, rule.in)) {
      return {
        type: rule.out,
        warning: 'TYPE_MISMATCH',
        expected: rule.in,
        actual: inputTypes
      };
    }

    // Inferir tipo de salida
    if (rule.out === 'union' && node.type === 'TERNARY') {
      // Para ternarios, unión de tipos de ramas
      return this.inferUnionType(node);
    }

    if (rule.out === 'any' && node.type === 'PROPERTY_ACCESS') {
      // Para property access, no podemos saber sin análisis adicional
      return 'any';
    }

    return rule.out;
  }

  /**
   * Infiere tipo usando heurísticas cuando no hay regla específica
   */
  inferHeuristicType(node) {
    // Basado en el nombre de la función llamada
    if (node.properties?.functionName) {
      return this.inferTypeFromFunctionName(node.properties.functionName);
    }

    // Basado en el contexto
    if (node.category === 'side_effect') {
      if (node.properties?.async) return 'promise';
      return 'void';
    }

    // Default
    return 'unknown';
  }

  /**
   * Infiere tipo desde nombre de función
   */
  inferTypeFromFunctionName(name) {
    const lower = name.toLowerCase();
    
    if (/calculate|compute|sum|count|total|avg|mean/.test(lower)) {
      return 'number';
    }
    
    if (/find|get|load|fetch|read/.test(lower)) {
      return 'any'; // Podría ser cualquier cosa
    }
    
    if (/validate|check|is|has|can|should/.test(lower)) {
      return 'boolean';
    }
    
    if (/format|stringify|toString|join/.test(lower)) {
      return 'string';
    }
    
    if (/parse|deserialize/.test(lower)) {
      return 'object'; // Asumimos objeto parseado
    }
    
    return 'unknown';
  }

  /**
   * Resuelve el tipo de un input
   */
  resolveInputType(input) {
    if (!input) return 'unknown';

    if (input.type === 'literal') {
      return typeof input.value;
    }

    if (input.type === 'variable' && input.name) {
      // Buscar en nodos anteriores que produzcan esta variable
      const producerNode = this.findProducerNode(input.name);
      if (producerNode) {
        return this.typeMap.get(producerNode.id) || 'unknown';
      }
      
      // Si es parámetro, mirar el tipo declarado (si hay)
      if (input.isParam) {
        return 'any'; // Parámetros son any hasta que se use
      }
    }

    return input.type || 'unknown';
  }

  /**
   * Encuentra el nodo que produce una variable
   */
  findProducerNode(varName) {
    return this.graph.nodes.find(node => 
      node.output?.name === varName
    );
  }

  /**
   * Verifica si hay mismatch de tipos
   */
  hasTypeMismatch(actualTypes, expectedTypes) {
    // Simplificación - en producción sería más sofisticado
    return false;
  }

  /**
   * Infiere tipo unión para ternarios
   */
  inferUnionType(node) {
    const inputs = node.inputs || [];
    if (inputs.length < 3) return 'unknown';

    const trueType = this.resolveInputType(inputs[1]);
    const falseType = this.resolveInputType(inputs[2]);

    if (trueType === falseType) {
      return trueType;
    }

    return {
      type: 'union',
      types: [trueType, falseType],
      simplified: this.simplifyUnion([trueType, falseType])
    };
  }

  /**
   * Simplifica unión de tipos
   */
  simplifyUnion(types) {
    const unique = [...new Set(types)];
    
    if (unique.length === 1) return unique[0];
    if (unique.length === 2 && unique.includes('null')) {
      return `${unique.find(t => t !== 'null')}|null`;
    }
    
    return unique.join(' | ');
  }

  /**
   * Construye el flujo de tipos completo
   */
  buildTypeFlow() {
    const typeFlow = {
      nodes: [],
      variables: new Map(),
      summary: {
        totalNodes: this.graph.nodes.length,
        typedNodes: 0,
        unknownNodes: 0,
        typeMismatches: []
      }
    };

    for (const [nodeId, type] of this.typeMap) {
      const node = this.graph.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      const typeInfo = {
        nodeId,
        type,
        variable: node.output?.name,
        operation: node.type,
        location: node.location
      };

      typeFlow.nodes.push(typeInfo);

      if (node.output?.name) {
        typeFlow.variables.set(node.output.name, type);
      }

      // Contar estadísticas
      if (type === 'unknown' || (typeof type === 'object' && type.warning)) {
        typeFlow.summary.unknownNodes++;
      } else {
        typeFlow.summary.typedNodes++;
      }

      if (typeof type === 'object' && type.warning === 'TYPE_MISMATCH') {
        typeFlow.summary.typeMismatches.push(typeInfo);
      }
    }

    // Convertir Map a objeto para JSON
    typeFlow.variables = Object.fromEntries(typeFlow.variables);

    return typeFlow;
  }
}

export default TypeInferrer;
