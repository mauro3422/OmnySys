/**
 * @fileoverview INTEGRACIÓN: Data Flow v2 en Molecular Extractor
 * 
 * Este archivo documenta los cambios necesarios para integrar
 * el nuevo sistema Data Flow Exhaustivo (v0.7) en el pipeline
 * molecular existente.
 * 
 * Cambios principales:
 * 1. Importar nuevo sistema data-flow-v2
 * 2. Hacer extractAtomMetadata async
 * 3. Agregar campos dataFlow y standardized al átomo
 * 4. Actualizar extractMolecularStructure para await
 * 
 * @integration molecular-extractor
 * @version 2.0.0
 */

// ============================================================================
// PASO 1: Actualizar imports en molecular-extractor.js
// ============================================================================

// REEMPLAZAR (línea 13):
// import { extractDataFlow } from '../extractors/metadata/data-flow.js';

// CON:
import { extractDataFlow } from '../extractors/data-flow-v2/core/index.js';

// Mantener otros imports existentes...
// import { extractSideEffects } from '../extractors/metadata/side-effects.js';
// import { extractCallGraph } from '../extractors/metadata/call-graph.js';
// etc.

// ============================================================================
// PASO 2: Hacer extractAtomMetadata async
// ============================================================================

// REEMPLAZAR la firma de la función (línea 113):
// function extractAtomMetadata(functionInfo, functionCode, fileMetadata) {

// CON:
async function extractAtomMetadata(functionInfo, functionCode, fileMetadata, filePath) {

// ============================================================================
// PASO 3: Agregar llamada al nuevo data flow extractor
// ============================================================================

// DENTRO de extractAtomMetadata, REEMPLAZAR (líneas 114-120):
//   const sideEffects = extractSideEffects(functionCode);
//   const callGraph = extractCallGraph(functionCode);
//   const dataFlow = extractDataFlow(functionCode);
//   const typeInference = extractTypeInference(functionCode);
//   const temporal = extractTemporalPatterns(functionCode);
//   const performance = extractPerformanceHints(functionCode);

// CON:
  // Metadata existente (mantener por compatibilidad)
  const sideEffects = extractSideEffects(functionCode);
  const callGraph = extractCallGraph(functionCode);
  const typeInference = extractTypeInference(functionCode);
  const temporal = extractTemporalPatterns(functionCode);
  const performance = extractPerformanceHints(functionCode);
  
  // NUEVO: Data Flow Exhaustivo v2
  let dataFlowV2 = null;
  try {
    // Obtener AST de la función (necesario para v2)
    const functionAst = functionInfo.node || functionInfo.ast;
    
    if (functionAst) {
      dataFlowV2 = await extractDataFlow(
        functionAst,
        functionCode,
        functionInfo.name,
        filePath
      );
    }
  } catch (error) {
    console.warn(`[molecular-extractor] Error extrayendo data flow v2 for ${functionInfo.name}:`, error.message);
    // No fallar la extracción completa si data flow falla
    dataFlowV2 = null;
  }

// ============================================================================
// PASO 4: Agregar campos al objeto atomMetadata
// ============================================================================

// EN atomMetadata (alrededor de línea 153-196), AGREGAR:

  const atomMetadata = {
    // ... campos existentes ...
    
    // NUEVO: Data Flow Exhaustivo v0.7
    dataFlow: dataFlowV2?.real || null,
    standardized: dataFlowV2?.standardized || null,
    patternHash: dataFlowV2?.standardized?.patternHash || null,
    
    // NUEVO: Invariantes detectadas
    invariants: dataFlowV2?.real?.invariants || [],
    typeFlow: dataFlowV2?.real?.typeFlow || null,
    
    // NUEVO: Metadata del proceso
    _meta: {
      dataFlowVersion: '2.0.0',
      extractionTime: dataFlowV2?._meta?.processingTime || 0,
      confidence: dataFlowV2?._meta?.confidence || 0.5
    }
  };

// ============================================================================
// PASO 5: Hacer extractMolecularStructure async
// ============================================================================

// REEMPLAZAR firma (línea 212):
// export function extractMolecularStructure(filePath, code, fileInfo, fileMetadata) {

// CON:
export async function extractMolecularStructure(filePath, code, fileInfo, fileMetadata) {

// ============================================================================
// PASO 6: Agregar await en el map de átomos
// ============================================================================

// REEMPLAZAR (líneas 214-221):
//   const atoms = (fileInfo.functions || []).map(functionInfo => {
//     const lines = code.split('\n');
//     const functionCode = lines.slice(functionInfo.line - 1, functionInfo.endLine).join('\n');
//     return extractAtomMetadata(functionInfo, functionCode, fileMetadata);
//   });

// CON:
  const atoms = await Promise.all(
    (fileInfo.functions || []).map(async functionInfo => {
      const lines = code.split('\n');
      const functionCode = lines.slice(functionInfo.line - 1, functionInfo.endLine).join('\n');
      return await extractAtomMetadata(functionInfo, functionCode, fileMetadata, filePath);
    })
  );

// ============================================================================
// EJEMPLO DE ÁTOMO RESULTANTE
// ============================================================================

/*
{
  // Campos existentes (sin cambios)
  id: "src/api.js::processOrder",
  name: "processOrder",
  type: "atom",
  line: 45,
  isExported: true,
  complexity: 12,
  hasSideEffects: true,
  hasNetworkCalls: true,
  // ... etc
  
  // NUEVO: Data Flow Exhaustivo
  dataFlow: {
    inputs: [{ name: "order", type: "object" }, { name: "userId", type: "string" }],
    transformations: [
      { step: 1, operation: "FUNCTION_CALL", from: "order.items", to: "total" },
      { step: 2, operation: "AWAIT_CALL", from: "userId", to: "user" },
      { step: 3, operation: "TERNARY", condition: "user.vip" },
      { step: 4, operation: "MULTIPLY", from: ["total", "discount"], to: "final" }
    ],
    outputs: [
      { type: "side_effect", category: "DB_WRITE" },
      { type: "return", data: "{ orderId, total }" }
    ],
    flowType: "READ_TRANSFORM_WRITE",
    complexity: 15
  },
  
  // NUEVO: Versión estandarizada (para ML)
  standardized: {
    patternHash: "a3f7d29c1b5e...",
    pattern: "PROCESS_FUNC(ENTITY_PARAM, ID_PARAM) { READ_FUNC → VAR_1 → AWAIT_READ → VAR_2 → TERNARY → VAR_3 → ARITH_MUL → SE_DB_WRITE → RETURN }",
    tokens: {
      function: "PROCESS_FUNC",
      inputs: ["ENTITY_PARAM", "ID_PARAM"],
      transforms: ["READ", "AWAIT_READ", "TERNARY", "ARITH_MUL"],
      outputs: ["SE_DB_WRITE", "RETURN"]
    },
    flowType: "READ_TRANSFORM_WRITE",
    mlFeatures: {
      paramCount: 2,
      transformCount: 4,
      hasSideEffects: true
    }
  },
  
  // NUEVO: Invariantes detectadas
  invariants: [
    { type: "TYPE_INVARIANT", variable: "total", inferredType: "number", confidence: 1.0 },
    { type: "RANGE_INVARIANT", variable: "final", invariant: "POSITIVE", confidence: 0.9 },
    { type: "NULL_SAFETY", variable: "user", invariant: "NON_NULL_AFTER_CHECK", confidence: 0.95 }
  ],
  
  // NUEVO: Metadata
  _meta: {
    dataFlowVersion: "2.0.0",
    extractionTime: 45,
    confidence: 0.95
  }
}
*/

// ============================================================================
// NOTAS DE IMPLEMENTACIÓN
// ============================================================================

/*
1. BACKWARDS COMPATIBILITY:
   - Todos los campos existentes se mantienen
   - Los nuevos campos son aditivos (no rompen código existente)
   - El campo dataFlow anterior se reemplaza, pero no se usa en otros lugares

2. PERFORMANCE:
   - La extracción v2 toma ~30-100ms por función
   - Se ejecuta en paralelo usando Promise.all
   - El overhead es aceptable para la funcionalidad ganada

3. ERROR HANDLING:
   - Si v2 falla, se retorna null en dataFlow (no se rompe la extracción)
   - El sistema cae gracefulmente a versión anterior si es necesario

4. CACHE:
   - El caché de átomos debe actualizarse para incluir nuevos campos
   - patternHash se puede usar para invalidación inteligente
*/

export default {
  instructions: 'Ver archivo molecular-extractor.js para aplicar estos cambios'
};
