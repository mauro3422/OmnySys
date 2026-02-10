/**
 * @fileoverview Data Flow Extractor - Fase 1: Data Flow Atómico
 * 
 * Extrae el flujo de datos de una función:
 * - INPUTS: Parámetros y sus usos
 * - TRANSFORMATIONS: Asignaciones y operaciones
 * - OUTPUTS: Returns y side effects
 * 
 * Parte del Data Flow Fractal - Nivel Átomo
 * 
 * ⚠️ PRINCIPIO CRÍTICO: Los datos extraídos se mantienen con nombres REALES del
 * proyecto. La estandarización (VALIDATE_FUNC, ENTITY_PARAM) es metadata ADICIONAL
 * para entrenamiento de ML, NUNCA un reemplazo de los nombres originales.
 * 
 * Dataset dual:
 * - Real names: "validateUser", "order", "calculateTotal" → Para contexto local
 * - Standardized: "VALIDATE_FUNC", "ENTITY_PARAM", "CALC_FUNC" → Para ML/cross-project
 * 
 * @module extractors/data-flow
 * @version 1.0.0
 * @phase 1 (Atomic Data Flow)
 */

import { parse } from '@babel/parser';
import { createLogger } from '../../../utils/logger.js';
import { InputExtractor } from './visitors/input-extractor.js';
import { TransformationExtractor } from './visitors/transformation-extractor.js';
import { OutputExtractor } from './visitors/output-extractor.js';
import { DataFlowAnalyzer } from './core/data-flow-analyzer.js';

const dataFlowLogger = createLogger('OmnySys:layer-a:data-flow');

/**
 * Extrae el data flow completo de una función
 * 
 * @param {Object} functionNode - AST node de la función (de Babel)
 * @param {string} functionCode - Código fuente de la función
 * @param {string} functionName - Nombre de la función
 * @param {string} filePath - Path del archivo
 * @returns {Promise<Object>} - Data flow estructurado
 */
export async function extractDataFlow(functionNode, functionCode, functionName, filePath) {
  dataFlowLogger.debug(`Extracting data flow for ${functionName}`);
  
  try {
    // Si no tenemos el AST, parsear el código
    let ast = functionNode;
    if (!ast || typeof ast !== 'object') {
      ast = parse(functionCode, { sourceType: 'module' });
    }
    
    // Extraer componentes del data flow
    const inputs = extractInputs(ast, functionCode, functionName);
    const transformations = extractTransformations(ast, functionCode, inputs);
    const outputs = extractOutputs(ast, functionCode, transformations);
    
    // Analizar coherencia del flujo
    const analysis = analyzeFlow(inputs, transformations, outputs);
    
    const dataFlow = {
      // Componentes principales
      inputs,
      transformations,
      outputs,
      
      // Metadata del análisis
      analysis: {
        inputCount: inputs.length,
        transformationCount: transformations.length,
        outputCount: outputs.length,
        hasSideEffects: outputs.some(o => o.type === 'side_effect'),
        hasReturn: outputs.some(o => o.type === 'return'),
        flowCoherence: analysis.coherence,
        unusedInputs: analysis.unusedInputs,
        deadVariables: analysis.deadVariables,
        coverage: analysis.coverage
      },
      
      // Timestamp para invalidación
      extractedAt: new Date().toISOString()
    };
    
    dataFlowLogger.debug(`Data flow extracted: ${inputs.length} inputs, ${transformations.length} transforms, ${outputs.length} outputs`);
    
    return dataFlow;
    
  } catch (error) {
    dataFlowLogger.warn(`Failed to extract data flow for ${functionName}: ${error.message}`);
    // Retornar estructura vacía en lugar de fallar
    return createEmptyDataFlow();
  }
}

/**
 * Extrae inputs (parámetros) de la función
 */
function extractInputs(functionAst, functionCode, functionName) {
  const extractor = new InputExtractor(functionCode, functionName);
  return extractor.extract(functionAst);
}

/**
 * Extrae transformations (asignaciones y operaciones)
 */
function extractTransformations(functionAst, functionCode, inputs) {
  const extractor = new TransformationExtractor(functionCode, inputs);
  return extractor.extract(functionAst);
}

/**
 * Extrae outputs (returns y side effects)
 */
function extractOutputs(functionAst, functionCode, transformations) {
  const extractor = new OutputExtractor(functionCode, transformations);
  return extractor.extract(functionAst);
}

/**
 * Analiza la coherencia del flujo de datos
 */
function analyzeFlow(inputs, transformations, outputs) {
  const analyzer = new DataFlowAnalyzer(inputs, transformations, outputs);
  return analyzer.analyze();
}

/**
 * Crea un data flow vacío (fallback)
 */
function createEmptyDataFlow() {
  return {
    inputs: [],
    transformations: [],
    outputs: [],
    analysis: {
      inputCount: 0,
      transformationCount: 0,
      outputCount: 0,
      hasSideEffects: false,
      hasReturn: false,
      flowCoherence: 0,
      unusedInputs: [],
      deadVariables: [],
      coverage: 0
    },
    extractedAt: new Date().toISOString()
  };
}

/**
 * Función legacy para compatibilidad
 * @deprecated Usar extractDataFlow en su lugar
 */
export function extractDataFlowLegacy(functionCode, functionAst) {
  return extractDataFlow(functionAst, functionCode, 'unknown', 'unknown');
}

// Re-exportar clases para testing avanzado
export { InputExtractor, TransformationExtractor, OutputExtractor, DataFlowAnalyzer };

export default { extractDataFlow, extractDataFlowLegacy };
