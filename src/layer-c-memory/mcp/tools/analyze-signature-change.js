/**
 * Tool: analyze_signature_change
 * Analiza el impacto de cambiar la firma de una función
 * Predice qué se rompe si agregás/modificás parámetros
 */

import { analyzeFunctionSignature } from './lib/analysis/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:analyze:signature:change');



export async function analyze_signature_change(args, context) {
  const { filePath, symbolName, newSignature } = args;
  const { projectPath, server } = context;
  
  logger.error(`[Tool] analyze_signature_change("${filePath}", "${symbolName}")`);
  
  if (!filePath || !symbolName) {
    return {
      error: 'Missing required parameters: filePath and symbolName',
      example: 'analyze_signature_change({ filePath: "src/utils/helper.js", symbolName: "formatDate", newSignature: "formatDate(date, format)" })'
    };
  }
  
  try {
    const result = await analyzeFunctionSignature(
      projectPath,
      filePath,
      symbolName,
      newSignature
    );
    
    if (result.error) {
      return {
        error: result.error,
        filePath,
        symbolName,
        suggestion: 'Verify the symbol exists and is exported'
      };
    }
    
    // Calcular impacto
    const impact = {
      currentSignature: result.currentSignature,
      proposedSignature: newSignature,
      breakingChangesCount: result.breakingChanges?.length || 0,
      safeToChange: (result.breakingChanges?.length || 0) === 0
    };
    
    // Resumen por severidad
    const bySeverity = {
      critical: result.breakingChanges?.filter(b => 
        b.issue === 'Too many arguments'
      ).length || 0,
      high: result.breakingChanges?.filter(b =>
        b.issue === 'Uses removed required parameters'
      ).length || 0,
      medium: 0,
      low: 0
    };
    
    // Generar recomendaciones específicas
    const recommendations = [];
    
    if (impact.safeToChange) {
      recommendations.push({
        type: 'success',
        message: '✅ The signature change appears safe',
        details: 'No call sites detected that would break'
      });
    } else {
      recommendations.push({
        type: 'warning',
        message: `⚠️ ${impact.breakingChangesCount} breaking changes detected`,
        action: 'Review the breaking changes below before proceeding'
      });
      
      if (bySeverity.critical > 0) {
        recommendations.push({
          type: 'critical',
          message: `Critical: ${bySeverity.critical} call(s) pass too many arguments`,
          suggestion: 'Make the new parameter optional or change existing parameters'
        });
      }
      
      if (bySeverity.high > 0) {
        recommendations.push({
          type: 'high',
          message: `High: ${bySeverity.high} call(s) depend on removed parameters`,
          suggestion: 'Update these call sites or add backward compatibility'
        });
      }
    }
    
    return {
      symbol: symbolName,
      definedIn: filePath,
      impact,
      currentUsage: {
        totalCallSites: result.usages?.length || 0,
        uniqueFiles: [...new Set(result.usages?.map(u => u.file) || [])].length
      },
      breakingChanges: result.breakingChanges || [],
      bySeverity,
      recommendations,
      migration: impact.safeToChange ? null : {
        strategy: 'gradual',
        steps: [
          '1. Make new parameters optional (add default values)',
          '2. Deploy with backward-compatible signature',
          '3. Update call sites that use removed parameters',
          '4. Once all call sites updated, make parameters required'
        ]
      }
    };
    
  } catch (error) {
    logger.error(`Error in analyze_signature_change: ${error.message}`);
    return {
      error: error.message,
      filePath,
      symbolName
    };
  }
}
