/**
 * @fileoverview Type Inferrer - Infiere tipos a través del grafo
 * 
 * Propaga tipos desde inputs hasta outputs, aplicando reglas
 * de transformación para determinar tipos intermedios.
 * 
 * @module data-flow-v2/analyzers/type-inferrer
 */

import { initializeTypeRules } from './inferrers/type-rules.js';
import { inferNodeType } from './inferrers/node-inferrer.js';
import { buildTypeFlow } from './detectors/flow-builder.js';

export class TypeInferrer {
  constructor(graph) {
    this.graph = graph;
    this.typeMap = new Map(); // nodeId -> type
    this.typeRules = initializeTypeRules();
  }

  /**
   * Infiere todos los tipos en el grafo
   */
  infer() {
    const iterations = 5; // Máximo de pasadas para converger
    
    for (let i = 0; i < iterations; i++) {
      let changed = false;
      
      for (const node of this.graph.nodes) {
        const inferredType = inferNodeType(node, this.typeRules, this.typeMap, this.graph);
        
        if (inferredType && this.typeMap.get(node.id) !== inferredType) {
          this.typeMap.set(node.id, inferredType);
          changed = true;
        }
      }
      
      if (!changed) break; // Convergió
    }

    return buildTypeFlow(this.typeMap, this.graph);
  }
}

export default TypeInferrer;
