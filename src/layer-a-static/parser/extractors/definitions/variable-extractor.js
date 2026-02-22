/**
 * @fileoverview Variable Extractor
 * 
 * Extrae variables exportadas (constantes y objetos).
 * 
 * @module parser/extractors/definitions/variable-extractor
 */

/**
 * Analiza las propiedades de un objeto para determinar su tipo y riesgo
 * @param {Array} properties - Propiedades del objeto
 * @returns {Array} Detalles de cada propiedad
 */
function analyzeObjectProperties(properties) {
  return properties.map(prop => {
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
}

/**
 * Determina el tipo de objeto y nivel de riesgo basado en sus propiedades
 * @param {Array} propertyDetails - Detalles de las propiedades
 * @returns {Object} Tipo y nivel de riesgo
 */
function determineObjectType(propertyDetails) {
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
  
  return { objectType, riskLevel, highRiskProps, mediumRiskProps, lowRiskProps };
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
        const propertyDetails = analyzeObjectProperties(init.properties);
        const { objectType, riskLevel, highRiskProps, mediumRiskProps, lowRiskProps } = determineObjectType(propertyDetails);
        
        const warning = riskLevel === 'high' 
          ? 'Exported mutable state with methods - potential shared state'
          : riskLevel === 'medium'
          ? 'Exported data structure - monitor usage'
          : 'Exported enum/constants - low risk';
        
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
          warning: warning
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
