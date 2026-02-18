/**
 * Tool: explain_value_flow
 * Explica el flujo de datos de un símbolo
 * Muestra: inputs → symbol → outputs → consumers
 */

import { analyzeValueFlow } from './lib/analysis/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:explain:value:flow');



export async function explain_value_flow(args, context) {
  const { filePath, symbolName, maxDepth = 2 } = args;
  const { projectPath, server } = context;
  
  logger.error(`[Tool] explain_value_flow("${filePath}", "${symbolName}")`);
  
  if (!filePath || !symbolName) {
    return {
      error: 'Missing required parameters: filePath and symbolName',
      example: 'explain_value_flow({ filePath: "src/utils/helper.js", symbolName: "calculateTotal" })'
    };
  }
  
  try {
    // Verificar si el servidor está listo
    if (!server?.initialized) {
      return {
        warning: 'Server is still initializing, using available data',
        initialized: false
      };
    }
    
    const flow = await analyzeValueFlow(projectPath, filePath, symbolName);
    
    if (flow.error) {
      return {
        error: flow.error,
        filePath,
        symbolName,
        suggestion: 'Verify the symbol exists and is exported'
      };
    }
    
    // Construir visualización del flujo
    const flowDiagram = {
      node: {
        id: `${filePath}::${symbolName}`,
        label: symbolName,
        type: flow.type,
        file: filePath
      },
      inputs: flow.inputs?.map(p => ({
        name: p.name,
        type: p.type,
        optional: p.optional,
        source: 'external'
      })) || [],
      outputs: flow.outputs?.map(o => ({
        statement: o.statement,
        inferredType: o.type
      })) || [],
      dependencies: flow.dependencies || [],
      consumers: flow.consumers || []
    };
    
    // Calcular métricas de riesgo
    const riskScore = {
      propagationRisk: 'low',
      cascadeDepth: 0,
      explanation: ''
    };
    
    if (flow.consumers?.length > 5) {
      riskScore.propagationRisk = 'high';
      riskScore.cascadeDepth = 1;
      riskScore.explanation = `Modifying this symbol could affect ${flow.consumers.length} consumers`;
    } else if (flow.consumers?.length > 0) {
      riskScore.propagationRisk = 'medium';
      riskScore.explanation = `Modifying this symbol affects ${flow.consumers.length} consumers`;
    } else if (flow.consumers?.length === 0 && flow.dependencies?.length > 5) {
      riskScore.propagationRisk = 'medium';
      riskScore.cascadeDepth = 0;
      riskScore.explanation = `This symbol depends on ${flow.dependencies.length} other functions but has no known consumers`;
    } else {
      riskScore.propagationRisk = 'low';
      riskScore.cascadeDepth = 0;
      riskScore.explanation = 'Isolated component with minimal propagation risk';
    }
    
    return {
      symbol: symbolName,
      file: filePath,
      type: flow.type,
      signature: {
        inputs: flow.inputs || [],
        hasReturnType: (flow.outputs?.length || 0) > 0
      },
      flow: flowDiagram,
      risk: riskScore,
      summary: {
        totalInputs: flow.inputs?.length || 0,
        totalOutputs: flow.outputs?.length || 0,
        totalDependencies: flow.dependencies?.length || 0,
        totalConsumers: flow.consumers?.length || 0,
        riskLevel: riskScore.propagationRisk
      },
      recommendations: generateRecommendations(flow, riskScore)
    };
    
  } catch (error) {
    logger.error(`Error in explain_value_flow: ${error.message}`);
    return {
      error: error.message,
      filePath,
      symbolName
    };
  }
}

/**
 * Genera recomendaciones basadas en el análisis del flujo
 */
function generateRecommendations(flow, riskScore) {
  const recommendations = [];
  
  // Recomendación basada en tipo de símbolo
  if (flow.type === 'function') {
    if (flow.inputs?.length > 5) {
      recommendations.push({
        type: 'info',
        message: 'High arity function detected',
        suggestion: 'Consider grouping related parameters into objects for easier evolution'
      });
    }
    
    if (flow.inputs?.length === 0) {
      recommendations.push({
        type: 'info',
        message: 'No-input function',
        suggestion: 'Consider if this function should be idempotent or have side effects'
      });
    }
    
    if (flow.outputs?.length === 0) {
      recommendations.push({
        type: 'warning',
        message: 'No return statements found',
        suggestion: 'This function may mutate state instead of returning values'
      });
    }
  }
  
  // Recomendación basada en dependencias
  if (flow.dependencies?.length > 10) {
    recommendations.push({
      type: 'warning',
      message: 'High coupling detected',
      suggestion: 'This symbol has many dependencies, changes may have wide impact'
    });
  }
  
  // Recomendación basada en consumidores
  if (flow.consumers?.length > 5) {
    recommendations.push({
      type: 'warning',
      message: 'Widely consumed symbol',
      suggestion: 'Changes should be backward-compatible. Consider versioning'
    });
  }
  
  // Recomendación basada en riesgo
  if (riskScore.propagationRisk === 'low') {
    recommendations.push({
      type: 'success',
      message: 'Safe to modify',
      suggestion: 'Low propagation risk, changes have limited scope'
    });
  }
  
  return recommendations;
}
