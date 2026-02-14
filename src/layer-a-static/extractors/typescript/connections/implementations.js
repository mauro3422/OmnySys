/**
 * connections/implementations.js
 * Detect class -> interface implementation connections
 */

/**
 * Detect interface implementations across files
 * @param {Object} fileResults - Map of filePath -> TS analysis
 * @returns {Array} - Connections interface -> implementor
 */
export function detectInterfaceImplementations(fileResults) {
  const connections = [];

  // Index interfaces by name
  const interfaceIndex = new Map();

  for (const [filePath, analysis] of Object.entries(fileResults)) {
    for (const iface of analysis.interfaces || []) {
      if (!interfaceIndex.has(iface.name)) {
        interfaceIndex.set(iface.name, []);
      }
      interfaceIndex.get(iface.name).push({ file: filePath, definition: iface });
    }
  }

  // Find classes that implement interfaces
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    for (const cls of analysis.classes || []) {
      for (const implemented of cls.implements || []) {
        if (interfaceIndex.has(implemented)) {
          for (const ifaceDef of interfaceIndex.get(implemented)) {
            connections.push({
              id: `implements_${implemented}_${filePath}`,
              sourceFile: ifaceDef.file,
              targetFile: filePath,
              type: 'interfaceImplementation',
              via: 'typescript',
              interfaceName: implemented,
              className: cls.name,
              confidence: 1.0,
              detectedBy: 'typescript-extractor',
              reason: `Class '${cls.name}' implements interface '${implemented}'`
            });
          }
        }
      }
    }
  }

  return connections;
}
