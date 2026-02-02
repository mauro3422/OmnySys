/**
 * Enum Usage Tracker
 *
 * Responsabilidad:
 * - Rastrear enums exportados (TypeScript y JavaScript)
 * - Detectar dónde se usan estos enums
 * - Calcular impacto de modificar un enum
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de uso de enums
 */
export function analyzeEnumUsage(systemMap) {
  const enumIndex = {};
  const totalEnums = systemMap.metadata.totalEnums || 0;

  if (totalEnums === 0) {
    return {
      total: 0,
      enums: {},
      recommendation: 'No enums detected (JavaScript project or no enums exported)'
    };
  }

  // Crear índice de enums exportados
  for (const [filePath, enums] of Object.entries(systemMap.enumDefinitions || {})) {
    for (const enumDef of enums) {
      if (enumDef.isExported) {
        const enumId = `${filePath}:${enumDef.name}`;
        enumIndex[enumDef.name] = {
          id: enumId,
          name: enumDef.name,
          definedIn: filePath,
          line: enumDef.line,
          members: enumDef.members,
          importedBy: []
        };
      }
    }
  }

  // Buscar imports de estos enums
  for (const [filePath, fileNode] of Object.entries(systemMap.files)) {
    for (const importStmt of fileNode.imports) {
      if (!importStmt.specifiers) continue;

      for (const spec of importStmt.specifiers) {
        const importedName = spec.imported || spec.local;

        // Verificar si importa un enum que conocemos
        if (enumIndex[importedName]) {
          const definedIn = enumIndex[importedName].definedIn;

          // Solo contar si se importa en un archivo diferente
          if (filePath !== definedIn) {
            enumIndex[importedName].importedBy.push({
              file: filePath,
              source: importStmt.source
            });
          }
        }
      }
    }
  }

  // Clasificar por nivel de uso
  const enums = {};
  let highRiskCount = 0;

  for (const [enumName, enumInfo] of Object.entries(enumIndex)) {
    const usageCount = enumInfo.importedBy.length;
    const riskLevel = usageCount >= 10 ? 'critical' :
                      usageCount >= 5 ? 'high' :
                      usageCount >= 2 ? 'medium' : 'low';

    if (riskLevel === 'high' || riskLevel === 'critical') {
      highRiskCount++;
    }

    const result = {
      name: enumName,
      definedIn: enumInfo.definedIn,
      line: enumInfo.line,
      members: enumInfo.members,
      memberCount: enumInfo.members.length,
      importedBy: enumInfo.importedBy,
      totalUsages: usageCount,
      riskLevel: riskLevel,
      recommendation: usageCount > 0 ?
        `Adding/removing enum values affects ${usageCount} file(s)` :
        'Exported but not imported elsewhere'
    };

    enums[enumInfo.id] = result;
  }

  return {
    total: Object.keys(enumIndex).length,
    enums: enums,
    highRiskCount: highRiskCount,
    recommendation: highRiskCount > 0 ?
      `${highRiskCount} enum(s) have high usage - review all usages before modifying values` :
      'No high-risk enums detected'
  };
}
