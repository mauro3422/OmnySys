/**
 * Global Constants Tracker
 *
 * Responsabilidad:
 * - Rastrear constantes exportadas (export const)
 * - Detectar dónde se importan estas constantes
 * - Identificar "hotspot constants" usadas en muchos lugares
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de uso de constantes
 */
export function analyzeConstantUsage(systemMap) {
  const constantIndex = {};
  const totalConstants = systemMap.metadata.totalConstants || 0;

  if (totalConstants === 0) {
    return {
      total: 0,
      constants: {},
      hotspotConstants: [],
      recommendation: 'No exported constants detected'
    };
  }

  // Crear índice de constantes exportadas
  for (const [filePath, constants] of Object.entries(systemMap.constantExports || {})) {
    for (const constant of constants) {
      const constantId = `${filePath}:${constant.name}`;
      constantIndex[constant.name] = {
        id: constantId,
        name: constant.name,
        definedIn: filePath,
        line: constant.line,
        valueType: constant.valueType,
        importedBy: []
      };
    }
  }

  // Buscar imports de estas constantes
  for (const [filePath, fileNode] of Object.entries(systemMap.files)) {
    for (const importStmt of fileNode.imports) {
      if (!importStmt.specifiers) continue;

      for (const spec of importStmt.specifiers) {
        const importedName = spec.imported || spec.local;

        // Verificar si importa una constante que conocemos
        if (constantIndex[importedName]) {
          const definedIn = constantIndex[importedName].definedIn;

          // Solo contar si se importa en un archivo diferente
          if (filePath !== definedIn) {
            constantIndex[importedName].importedBy.push({
              file: filePath,
              source: importStmt.source
            });
          }
        }
      }
    }
  }

  // Clasificar por nivel de uso
  const constants = {};
  const hotspotConstants = [];

  for (const [constantName, constantInfo] of Object.entries(constantIndex)) {
    const usageCount = constantInfo.importedBy.length;
    const riskLevel = usageCount >= 10 ? 'critical' :
                      usageCount >= 5 ? 'high' :
                      usageCount >= 2 ? 'medium' : 'low';

    const result = {
      name: constantName,
      definedIn: constantInfo.definedIn,
      line: constantInfo.line,
      valueType: constantInfo.valueType,
      importedBy: constantInfo.importedBy,
      totalUsages: usageCount,
      riskLevel: riskLevel,
      recommendation: usageCount > 0 ?
        `Changing this constant affects ${usageCount} file(s)` :
        'Exported but not imported elsewhere'
    };

    constants[constantInfo.id] = result;

    // Hotspot constants (>= 5 usos)
    if (usageCount >= 5) {
      hotspotConstants.push(result);
    }
  }

  // Ordenar hotspots por uso descendente
  hotspotConstants.sort((a, b) => b.totalUsages - a.totalUsages);

  return {
    total: Object.keys(constantIndex).length,
    constants: constants,
    hotspotConstants: hotspotConstants,
    recommendation: hotspotConstants.length > 0 ?
      `${hotspotConstants.length} constant(s) are heavily used - modify with caution` :
      'No heavily-used constants detected'
  };
}
