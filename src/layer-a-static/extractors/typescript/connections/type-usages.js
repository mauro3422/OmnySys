/**
 * connections/type-usages.js
 * Detect type import connections
 */

/**
 * Detect type usages across files
 * @param {Object} fileResults - Map of filePath -> TS analysis
 * @returns {Array} - Connections type definition -> usage
 */
export function detectTypeUsages(fileResults) {
  const connections = [];

  // Index type definitions
  const typeIndex = new Map();

  for (const [filePath, analysis] of Object.entries(fileResults)) {
    for (const type of analysis.types || []) {
      if (!typeIndex.has(type.name)) {
        typeIndex.set(type.name, []);
      }
      typeIndex.get(type.name).push({ file: filePath, definition: type });
    }
  }

  // Find type imports
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    for (const imp of analysis.imports || []) {
      if (typeIndex.has(imp.name)) {
        for (const typeDef of typeIndex.get(imp.name)) {
          if (typeDef.file !== filePath) {
            connections.push({
              id: `type_import_${imp.name}_${typeDef.file}_to_${filePath}`,
              sourceFile: typeDef.file,
              targetFile: filePath,
              type: 'typeImport',
              via: 'typescript',
              typeName: imp.name,
              confidence: 1.0,
              detectedBy: 'typescript-extractor',
              reason: `Type '${imp.name}' imported from '${typeDef.file}'`
            });
          }
        }
      }
    }
  }

  return connections;
}
