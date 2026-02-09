/**
 * @fileoverview Data Flow Extractor v2 - Entry Point
 * 
 * Orquesta la extracción exhaustiva de data flow:
 * 1. Recorre AST con visitors especializados
 * 2. Construye grafo de transformaciones
 * 3. Detecta invariantes
 * 4. Genera output en múltiples formatos
 * 
 * @module data-flow-v2/core/index
 * @version 2.0.0
 */

import { GraphBuilder } from './graph-builder.js';
import { detectSideEffectTransform, detectFunctionalTransform, getTransformByOperator } from './transform-registry.js';

// Visitors
import { ExpressionVisitor } from '../visitors/expression-visitor.js';
import { CallVisitor } from '../visitors/call-visitor.js';
import { ControlFlowVisitor } from '../visitors/control-flow-visitor.js';
import { DataStructuresVisitor } from '../visitors/data-structures-visitor.js';

// Analyzers
import { InvariantDetector } from '../analyzers/invariant-detector.js';
import { TypeInferrer } from '../analyzers/type-inferrer.js';

// Output formatters
import { RealFormatter } from '../output/real-formatter.js';
import { StandardizedFormatter } from '../output/standardized-formatter.js';
import { GraphFormatter } from '../output/graph-formatter.js';

// Utils
import { ScopeManager } from '../utils/scope-manager.js';
import { PatternIndexManager } from '../utils/pattern-index-manager.js';

/**
 * Extrae data flow completo de una función
 * 
 * @param {Object} ast - AST de Babel
 * @param {string} code - Código fuente
 * @param {string} functionName - Nombre de la función
 * @param {string} filePath - Ruta del archivo
 * @returns {Object} - Data flow completo con múltiples formatos
 */
export async function extractDataFlow(ast, code, functionName, filePath) {
  const startTime = Date.now();
  
  // Inicializar componentes
  const builder = new GraphBuilder();
  const scopeManager = new ScopeManager();
  const context = {
    builder,
    scope: scopeManager,
    code,
    functionName,
    filePath,
    transforms: [],
    invariants: []
  };

  // PASO 0: Extraer parámetros de función como INPUTS
  extractFunctionParameters(ast, builder, context);

  // PASO 1: Recorrer AST con visitors
  const visitors = [
    new ExpressionVisitor(context),
    new CallVisitor(context),
    new ControlFlowVisitor(context),
    new DataStructuresVisitor(context)
  ];

  // Ejecutar cada visitor
  for (const visitor of visitors) {
    visitor.visit(ast);
  }

  // PASO 2: Construir grafo
  const graph = builder.build();

  // PASO 3: Detectar invariantes
  const invariantDetector = new InvariantDetector(graph);
  const invariants = invariantDetector.detect();

  // PASO 4: Inferir tipos
  const typeInferrer = new TypeInferrer(graph);
  const typeFlow = typeInferrer.infer();

  // PASO 5: Generar outputs en múltiples formatos
  const realFormatter = new RealFormatter(graph, invariants, typeFlow);
  const standardizedFormatter = new StandardizedFormatter(graph, functionName);
  const graphFormatter = new GraphFormatter(graph);

  const result = {
    // Formato 1: Datos reales (para humanos/debugging)
    real: realFormatter.format(),
    
    // Formato 2: Estandarizado (para ML/entrenamiento)
    standardized: standardizedFormatter.format(),
    
    // Formato 3: Grafo completo (para análisis profundo)
    graph: graphFormatter.format(),
    
    // Metadata
    _meta: {
      version: '2.0.0',
      extractedAt: new Date().toISOString(),
      processingTime: Date.now() - startTime,
      confidence: calculateConfidence(graph, invariants),
      stats: {
        totalTransforms: graph.meta.totalNodes,
        totalEdges: graph.meta.totalEdges,
        invariantsDetected: invariants.length,
        hasSideEffects: graph.meta.hasSideEffects,
        hasAsync: graph.meta.hasAsync
      }
    }
  };

  // PASO 6: Actualizar índice de patrones (async, no bloquea)
  const patternManager = new PatternIndexManager();
  patternManager.updateIndex(result.standardized, {
    atomId: `${filePath}::${functionName}`,
    graph: result.graph
  });

  return result;
}

/**
 * Extrae parámetros de función y los registra como nodos INPUT
 */
function extractFunctionParameters(ast, builder, context) {
  // Buscar declaración de función en el AST
  const functionNode = findFunctionNode(ast);
  
  if (!functionNode || !functionNode.params) {
    return;
  }

  // Registrar cada parámetro como INPUT
  functionNode.params.forEach((param, index) => {
    const paramName = extractParamName(param);
    
    if (paramName) {
      // Crear nodo INPUT
      const nodeId = builder.addNode({
        type: 'INPUT',
        category: 'input',
        standardToken: 'INPUT_PARAM',
        inputs: [],
        output: {
          name: paramName,
          type: inferParamType(param)
        },
        properties: {
          isPure: true,
          isParameter: true,
          position: index,
          destructured: param.type === 'ObjectPattern' || param.type === 'ArrayPattern'
        },
        location: param.loc
      });
      
      // Registrar en el scope
      builder.scope.set(paramName, nodeId);
      
      // Agregar a transforms del contexto
      context.transforms.push({
        type: 'INPUT',
        name: paramName,
        position: index,
        nodeId
      });
    }
  });
}

/**
 * Encuentra el nodo de función en el AST
 */
function findFunctionNode(ast) {
  // El AST debería ser el cuerpo de la función o la función misma
  if (ast.type === 'FunctionDeclaration' || 
      ast.type === 'FunctionExpression' || 
      ast.type === 'ArrowFunctionExpression') {
    return ast;
  }
  
  // Buscar en el body si existe
  if (ast.body && (ast.body.type === 'FunctionDeclaration' || 
                   ast.body.type === 'FunctionExpression' || 
                   ast.body.type === 'ArrowFunctionExpression')) {
    return ast.body;
  }
  
  return null;
}

/**
 * Extrae el nombre de un parámetro
 */
function extractParamName(param) {
  switch (param.type) {
    case 'Identifier':
      return param.name;
    case 'ObjectPattern':
      // Destructuring: { a, b } -> "props"
      return 'destructured_obj';
    case 'ArrayPattern':
      // Destructuring: [a, b] -> "array"
      return 'destructured_arr';
    case 'AssignmentPattern':
      // Default value: x = 5
      return extractParamName(param.left);
    case 'RestElement':
      // Rest: ...args
      return param.argument?.name || 'rest_args';
    default:
      return null;
  }
}

/**
 * Infiere el tipo de un parámetro
 */
function inferParamType(param) {
  // TypeScript type annotation
  if (param.typeAnnotation && param.typeAnnotation.typeAnnotation) {
    const typeAnnotation = param.typeAnnotation.typeAnnotation;
    if (typeAnnotation.type === 'TSStringKeyword') return 'string';
    if (typeAnnotation.type === 'TSNumberKeyword') return 'number';
    if (typeAnnotation.type === 'TSBooleanKeyword') return 'boolean';
    if (typeAnnotation.type === 'TSArrayType') return 'array';
    if (typeAnnotation.type === 'TSObjectKeyword') return 'object';
  }
  
  // Default value inference
  if (param.type === 'AssignmentPattern' && param.right) {
    const right = param.right;
    if (right.type === 'StringLiteral') return 'string';
    if (right.type === 'NumericLiteral') return 'number';
    if (right.type === 'BooleanLiteral') return 'boolean';
    if (right.type === 'ArrayExpression') return 'array';
    if (right.type === 'ObjectExpression') return 'object';
  }
  
  return 'any';
}

/**
 * Calcula confidence score del análisis
 */
function calculateConfidence(graph, invariants) {
  let confidence = 0.5; // Base

  // +0.2 si tenemos grafo completo
  if (graph.meta.totalNodes > 0) confidence += 0.2;

  // +0.1 si detectamos invariantes
  if (invariants.length > 0) confidence += 0.1;

  // +0.1 si no hay side effects (más fácil de analizar)
  if (!graph.meta.hasSideEffects) confidence += 0.1;

  // +0.1 si no hay async (más determinístico)
  if (!graph.meta.hasAsync) confidence += 0.1;

  return Math.min(confidence, 1.0);
}

export default extractDataFlow;
