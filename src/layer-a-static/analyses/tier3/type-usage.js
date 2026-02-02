/**
 * Type/Interface Usage Tracker
 *
 * Responsabilidad:
 * - Rastrear definiciones de TypeScript types e interfaces
 * - Detectar dónde se usan estos types
 * - Calcular impacto de modificar un type
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de uso de types
 */
export function analyzeTypeUsage(systemMap) {
  const typeUsageMap = {};
  const totalTypes = systemMap.metadata.totalTypes || 0;

  if (totalTypes === 0) {
    return {
      total: 0,
      types: {},
      interfaces: {},
      recommendation: 'No TypeScript types/interfaces detected (JavaScript project or no types exported)'
    };
  }

  // Crear índice de types/interfaces definidos
  const typeIndex = {};
  for (const [filePath, types] of Object.entries(systemMap.typeDefinitions || {})) {
    for (const type of types) {
      if (type.isExported) {
        const typeId = `${filePath}:${type.name}`;
        typeIndex[type.name] = {
          id: typeId,
          name: type.name,
          kind: type.type, // 'interface' o 'type'
          definedIn: filePath,
          line: type.line,
          usedBy: []
        };
      }
    }
  }

  // Buscar usos de estos types en otros archivos
  for (const [filePath, usages] of Object.entries(systemMap.typeUsages || {})) {
    for (const usage of usages) {
      const typeName = usage.name;

      // Verificar si este type está en nuestro índice
      if (typeIndex[typeName]) {
        // Determinar el archivo que define el type
        const definedIn = typeIndex[typeName].definedIn;

        // Solo contar si el uso es en un archivo DIFERENTE (dependencia cross-file)
        if (filePath !== definedIn) {
          typeIndex[typeName].usedBy.push({
            file: filePath,
            line: usage.line
          });
        }
      }
    }
  }

  // Clasificar por tipo y calcular riesgo
  const interfaces = {};
  const types = {};
  let highRiskCount = 0;

  for (const [typeName, typeInfo] of Object.entries(typeIndex)) {
    const usageCount = typeInfo.usedBy.length;
    const riskLevel = usageCount >= 10 ? 'critical' :
                      usageCount >= 5 ? 'high' :
                      usageCount >= 2 ? 'medium' : 'low';

    if (riskLevel === 'high' || riskLevel === 'critical') {
      highRiskCount++;
    }

    const result = {
      name: typeName,
      definedIn: typeInfo.definedIn,
      line: typeInfo.line,
      usedBy: typeInfo.usedBy,
      totalUsages: usageCount,
      riskLevel: riskLevel,
      recommendation: usageCount > 0 ?
        `Changing this ${typeInfo.kind} affects ${usageCount} file(s)` :
        `This ${typeInfo.kind} is exported but not used elsewhere`
    };

    if (typeInfo.kind === 'interface') {
      interfaces[typeInfo.id] = result;
    } else {
      types[typeInfo.id] = result;
    }
  }

  return {
    total: Object.keys(typeIndex).length,
    interfaces: interfaces,
    types: types,
    highRiskCount: highRiskCount,
    recommendation: highRiskCount > 0 ?
      `${highRiskCount} type(s)/interface(s) have high usage - review before modifying` :
      'No high-risk types detected'
  };
}
