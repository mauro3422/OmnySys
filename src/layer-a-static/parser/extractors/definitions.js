/**
 * @fileoverview definitions.js
 * 
 * Extrae definiciones (funciones, clases, variables)
 * 
 * @module parser/extractors/definitions
 */

import { getFileId, isExportedFunction, findCallsInFunction } from '../helpers.js';

/**
 * Extrae definición de función
 * @param {Object} nodePath - Path de Babel
 * @param {string} filePath - Ruta del archivo
 * @param {Object} fileInfo - Info del archivo acumulada
 * @returns {Object} - Definición de función
 */
export function extractFunctionDefinition(nodePath, filePath, fileInfo) {
  const node = nodePath.node;
  
  fileInfo.definitions.push({
    type: 'function',
    name: node.id.name,
    params: node.params.length
  });

  const functionCalls = findCallsInFunction(nodePath);
  const isExported = isExportedFunction(node, fileInfo);

  fileInfo.functions.push({
    id: `${getFileId(filePath)}::${node.id.name}`,
    name: node.id.name,
    line: node.loc?.start.line || 0,
    endLine: node.loc?.end.line || 0,
    params: node.params.map(p => p.name || ''),
    isExported: isExported,
    calls: functionCalls,
    node: node  // Incluir nodo AST para análisis de data flow
  });

  return fileInfo;
}

/**
 * Extrae definición de clase
 * @param {Object} nodePath - Path de Babel
 * @param {Object} fileInfo - Info del archivo acumulada
 * @returns {Object} - Definición de clase
 */
export function extractClassDefinition(nodePath, fileInfo) {
  const node = nodePath.node;
  
  if (node.id) {
    fileInfo.definitions.push({
      type: 'class',
      name: node.id.name
    });
  }

  return fileInfo;
}

/**
 * Extrae variables exportadas (constantes y objetos)
 * @param {Object} nodePath - Path de Babel
 * @param {Object} fileInfo - Info del archivo acumulada
 * @returns {Object} - Info actualizada
 */
export function extractVariableExports(nodePath, fileInfo) {
  const node = nodePath.node;

  // Solo nos interesan las constantes
  if (node.kind !== 'const') return fileInfo;

  node.declarations.forEach(declarator => {
    if (declarator.id.type === 'Identifier') {
      const name = declarator.id.name;
      const init = declarator.init;

      // Detectar si es un objeto (potencial estado mutable)
      if (init && init.type === 'ObjectExpression') {
        // Analizar propiedades para distinguir enums de estado mutable
        const propertyDetails = init.properties.map(prop => {
          if (prop.type === 'ObjectProperty') {
            const keyName = prop.key.name || prop.key.value;
            const valueType = prop.value?.type;
            
            // Detectar tipo de propiedad
            if (valueType === 'FunctionExpression' || valueType === 'ArrowFunctionExpression') {
              return { name: keyName, type: 'function', risk: 'high' };
            } else if (valueType === 'ObjectExpression') {
              return { name: keyName, type: 'nested_object', risk: 'medium' };
            } else if (valueType === 'ArrayExpression') {
              return { name: keyName, type: 'array', risk: 'medium' };
            } else {
              // Valores literales (string, number, boolean) - bajo riesgo
              return { name: keyName, type: 'literal', risk: 'low' };
            }
          }
          return { name: 'unknown', type: 'unknown', risk: 'medium' };
        });
        
        // Calcular riesgo basado en tipos de propiedades
        const highRiskProps = propertyDetails.filter(p => p.risk === 'high').length;
        const mediumRiskProps = propertyDetails.filter(p => p.risk === 'medium').length;
        const lowRiskProps = propertyDetails.filter(p => p.risk === 'low').length;
        
        // Determinar tipo de objeto
        let objectType = 'unknown';
        let riskLevel = 'medium';
        
        if (highRiskProps > 0) {
          // Tiene métodos = estado mutable potencial
          objectType = 'state';
          riskLevel = 'high';
        } else if (mediumRiskProps > 0 && lowRiskProps === 0) {
          // Solo objetos/arrays anidados = estructura de datos
          objectType = 'data_structure';
          riskLevel = 'medium';
        } else if (lowRiskProps > 0 && highRiskProps === 0 && mediumRiskProps === 0) {
          // Solo valores literales = enum/constantes
          objectType = 'enum';
          riskLevel = 'low';
        } else {
          // Mixto
          objectType = 'mixed';
          riskLevel = mediumRiskProps > lowRiskProps ? 'medium' : 'low';
        }
        
        fileInfo.objectExports.push({
          name: name,
          line: declarator.loc?.start.line || 0,
          isMutable: true,
          properties: init.properties.length,
          propertyDetails: propertyDetails.slice(0, 20), // Limitar a 20 propiedades
          objectType: objectType,
          riskLevel: riskLevel,
          highRiskCount: highRiskProps,
          mediumRiskCount: mediumRiskProps,
          lowRiskCount: lowRiskProps,
          warning: riskLevel === 'high' 
            ? 'Exported mutable state with methods - potential shared state'
            : riskLevel === 'medium'
            ? 'Exported data structure - monitor usage'
            : 'Exported enum/constants - low risk'
        });
      }
      // Otras constantes exportadas
      else {
        fileInfo.constantExports.push({
          name: name,
          line: declarator.loc?.start.line || 0,
          valueType: init ? init.type : 'unknown'
        });
      }
    }
  });

  return fileInfo;
}
