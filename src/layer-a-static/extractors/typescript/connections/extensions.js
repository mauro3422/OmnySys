/**
 * connections/extensions.js
 * Detect interface -> interface extension connections
 */

function buildInterfaceIndex(fileResults = {}) {
  const index = new Map();

  for (const [filePath, analysis] of Object.entries(fileResults)) {
    for (const iface of analysis?.interfaces || []) {
      if (!iface?.name) continue;

      if (!index.has(iface.name)) {
        index.set(iface.name, []);
      }

      index.get(iface.name).push({
        filePath,
        interface: iface
      });
    }
  }

  return index;
}

/**
 * Detect interface extensions across files
 * @param {Object} fileResults - Map of filePath -> TS analysis
 * @returns {Array} - Connections base -> extended
 */
export function detectInterfaceExtensions(fileResults) {
  const connections = [];
  const index = buildInterfaceIndex(fileResults);

  for (const [filePath, analysis] of Object.entries(fileResults)) {
    for (const iface of analysis?.interfaces || []) {
      for (const extended of iface.extends || []) {
        const baseCandidates = index.get(extended);
        if (!baseCandidates?.length) continue;

        for (const baseCandidate of baseCandidates) {
          connections.push({
            id: `extends_${extended}_${baseCandidate.filePath}_to_${filePath}`,
            sourceFile: baseCandidate.filePath,
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

  return connections;
}
