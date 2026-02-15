/**
 * @fileoverview definitions.js
 * 
 * Extrae definiciones (funciones, clases, variables)
 * V2: Soporte completo para todos los tipos de funciones
 * 
 * @module parser/extractors/definitions
 */

import { getFileId, isExportedFunction, findCallsInFunction } from '../helpers.js';

/**
 * Extrae definición de función (cualquier tipo)
 * @param {Object} nodePath - Path de Babel
 * @param {string} filePath - Ruta del archivo
 * @param {Object} fileInfo - Info del archivo acumulada
 * @param {string} functionType - Tipo: 'declaration' | 'method' | 'arrow' | 'expression'
 * @param {string} className - Nombre de la clase (solo para métodos)
 * @returns {Object} - Definición de función
 */
export function extractFunctionDefinition(nodePath, filePath, fileInfo, functionType = 'declaration', className = null) {
  const node = nodePath.node;
  
  // Determinar nombre según tipo
  let functionName;
  if (functionType === 'method' && node.key) {
    functionName = node.key.name || node.key.value;
  } else if (node.id) {
    functionName = node.id.name;
  } else {
    functionName = 'anonymous';
  }
  
  // Construir ID único
  const fullName = className ? `${className}.${functionName}` : functionName;
  const functionId = `${getFileId(filePath)}::${fullName}`;
  
  fileInfo.definitions.push({
    type: functionType === 'method' ? 'method' : 'function',
    name: fullName,
    className: className,
    params: node.params?.length || 0
  });

  const functionCalls = findCallsInFunction(nodePath);
  const isExported = isExportedFunction(node, fileInfo);

  fileInfo.functions.push({
    id: functionId,
    name: functionName,
    fullName: fullName,
    type: functionType,
    className: className,
    line: node.loc?.start.line || 0,
    endLine: node.loc?.end.line || 0,
    params: (node.params || []).map(p => p.name || p.left?.name || 'param'),
    isExported: isExported,
    isAsync: node.async || false,
    isGenerator: node.generator || false,
    calls: functionCalls,
    node: node
  });

  return fileInfo;
}

/**
 * Extrae arrow function
 * @param {Object} nodePath - Path de Babel
 * @param {string} filePath - Ruta del archivo
 * @param {Object} fileInfo - Info del archivo acumulada
 */
export function extractArrowFunction(nodePath, filePath, fileInfo) {
  const node = nodePath.node;
  
  // Handle both direct ArrowFunctionExpression and VariableDeclarator containing one
  let arrowNode = node;
  let functionName = 'arrow';
  
  if (node.type === 'VariableDeclarator' && node.init?.type === 'ArrowFunctionExpression') {
    arrowNode = node.init;
    functionName = node.id?.name || 'arrow';
  } else if (node.type === 'ArrowFunctionExpression') {
    functionName = node.id?.name || 'arrow';
  }
  
  fileInfo.definitions.push({
    type: 'arrow',
    name: functionName,
    params: arrowNode.params?.length || 0
  });

  const functionCalls = findCallsInFunction(nodePath);
  const functionId = `${getFileId(filePath)}::${functionName}`;

  fileInfo.functions.push({
    id: functionId,
    name: functionName,
    fullName: functionName,
    type: 'arrow',
    className: null,
    line: arrowNode.loc?.start.line || 0,
    endLine: arrowNode.loc?.end.line || 0,
    params: (arrowNode.params || []).map(p => p.name || p.left?.name || 'param'),
    isExported: false,
    isAsync: arrowNode.async || false,
    isGenerator: false,
    calls: functionCalls,
    node: arrowNode
  });

  return fileInfo;
}

/**
 * Extrae function expression
 * @param {Object} nodePath - Path de Babel
 * @param {string} filePath - Ruta del archivo
 * @param {Object} fileInfo - Info del archivo acumulada
 */
export function extractFunctionExpression(nodePath, filePath, fileInfo) {
  const node = nodePath.node;
  const name = node.id?.name || 'expression';
  
  fileInfo.definitions.push({
    type: 'expression',
    name: name,
    params: node.params?.length || 0
  });

  const functionCalls = findCallsInFunction(nodePath);
  const functionId = `${getFileId(filePath)}::${name}`;

  fileInfo.functions.push({
    id: functionId,
    name: name,
    fullName: name,
    type: 'expression',
    className: null,
    line: node.loc?.start.line || 0,
    endLine: node.loc?.end.line || 0,
    params: (node.params || []).map(p => p.name || p.left?.name || 'param'),
    isExported: false,
    isAsync: node.async || false,
    isGenerator: node.generator || false,
    calls: functionCalls,
    node: node
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
          const keyName = prop.key?.name || prop.key?.value || 'unknown';
          
          if (prop.type === 'ObjectProperty') {
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
          } else if (prop.type === 'ObjectMethod') {
            // Shorthand methods like: method() { }
            return { name: keyName, type: 'function', risk: 'high' };
          }
          return { name: keyName, type: 'unknown', risk: 'medium' };
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
          propertyDetails: propertyDetails.slice(0, 20),
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

export default {
  extractFunctionDefinition,
  extractArrowFunction,
  extractFunctionExpression,
  extractClassDefinition,
  extractVariableExports
};
