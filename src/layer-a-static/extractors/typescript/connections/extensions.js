/**
 * connections/extensions.js
 * Detect interface -> interface extension connections
 */

/**
 * Detect interface extensions across files
 * @param {Object} fileResults - Map of filePath -> TS analysis
 * @returns {Array} - Connections base -> extended
 */
export function detectInterfaceExtensions(fileResults) {
  const connections = [];

  for (const [filePath, analysis] of Object.entries(fileResults)) {
    for (const iface of analysis.interfaces || []) {
      for (const extended of iface.extends || []) {
        // Find where base interface is defined
        for (const [otherFile, otherAnalysis] of Object.entries(fileResults)) {
          const baseInterface = otherAnalysis.interfaces?.find(i => i.name === extended);
          if (baseInterface) {
            connections.push({
              id: `extends_${extended}_${otherFile}_to_${filePath}`,
              sourceFile: otherFile,
              targetFile: filePath,
              type: 'interfaceExtension',
              via: 'typescript',
              baseInterface: extended,
              extendedInterface: iface.name,
              confidence: 1.0,
              detectedBy: 'typescript-extractor',
              reason: `Interface '${iface.name}' extends '${extended}'`
            });
          }
        }
      }
    }
  }

  return connections;
}
