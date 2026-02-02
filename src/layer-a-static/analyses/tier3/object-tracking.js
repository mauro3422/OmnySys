/**
 * Exported Objects Tracker (Mutable State)
 *
 * Responsabilidad:
 * - Detectar objetos exportados (export const obj = { ... })
 * - Identificar potencial estado compartido mutable
 * - Advertir sobre efectos secundarios ocultos
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de objetos exportados
 */
export function analyzeSharedObjects(systemMap) {
  const objectIndex = {};
  const totalObjects = systemMap.metadata.totalSharedObjects || 0;

  if (totalObjects === 0) {
    return {
      total: 0,
      sharedObjects: {},
      criticalObjects: [],
      recommendation: 'No exported mutable objects detected - good practice!'
    };
  }

  // Crear índice de objetos exportados
  for (const [filePath, objects] of Object.entries(systemMap.objectExports || {})) {
    for (const obj of objects) {
      const objectId = `${filePath}:${obj.name}`;
      objectIndex[obj.name] = {
        id: objectId,
        name: obj.name,
        definedIn: filePath,
        line: obj.line,
        isMutable: obj.isMutable,
        properties: obj.properties,
        importedBy: []
      };
    }
  }

  // Buscar imports de estos objetos
  for (const [filePath, fileNode] of Object.entries(systemMap.files)) {
    for (const importStmt of fileNode.imports) {
      if (!importStmt.specifiers) continue;

      for (const spec of importStmt.specifiers) {
        const importedName = spec.imported || spec.local;

        // Verificar si importa un objeto que conocemos
        if (objectIndex[importedName]) {
          const definedIn = objectIndex[importedName].definedIn;

          // Solo contar si se importa en un archivo diferente
          if (filePath !== definedIn) {
            objectIndex[importedName].importedBy.push({
              file: filePath,
              source: importStmt.source
            });
          }
        }
      }
    }
  }

  // Clasificar por riesgo
  const sharedObjects = {};
  const criticalObjects = [];

  for (const [objectName, objectInfo] of Object.entries(objectIndex)) {
    const usageCount = objectInfo.importedBy.length;

    // Objetos compartidos mutables son inherentemente riesgosos
    const riskLevel = usageCount >= 5 ? 'critical' :
                      usageCount >= 2 ? 'high' :
                      usageCount >= 1 ? 'medium' : 'low';

    const result = {
      name: objectName,
      definedIn: objectInfo.definedIn,
      line: objectInfo.line,
      isMutable: objectInfo.isMutable,
      properties: objectInfo.properties,
      importedBy: objectInfo.importedBy,
      totalUsages: usageCount,
      riskLevel: riskLevel,
      warning: objectInfo.isMutable && usageCount > 0 ?
        `SHARED MUTABLE STATE: ${usageCount} file(s) share this object - modifications affect all` :
        'Exported object (not imported elsewhere)',
      recommendation: objectInfo.isMutable && usageCount > 0 ?
        'Consider using immutable patterns or state management library' :
        'Low risk - not shared'
    };

    sharedObjects[objectInfo.id] = result;

    // Objetos críticos (compartidos y mutables)
    if (objectInfo.isMutable && usageCount >= 2) {
      criticalObjects.push(result);
    }
  }

  // Ordenar críticos por uso descendente
  criticalObjects.sort((a, b) => b.totalUsages - a.totalUsages);

  return {
    total: Object.keys(objectIndex).length,
    sharedObjects: sharedObjects,
    criticalObjects: criticalObjects,
    recommendation: criticalObjects.length > 0 ?
      `CRITICAL: ${criticalObjects.length} mutable object(s) shared across files - high risk of bugs` :
      'No critical shared mutable state detected'
  };
}
