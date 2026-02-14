/**
 * @fileoverview Styled Component Connections Detector
 * 
 * Detect connections through styled component extensions
 * 
 * @module css-in-js-extractor/detectors/styled-connections
 */

/**
 * Detect styled component connections between files
 * @param {Object} fileResults - Map of filePath -> styled analysis
 * @returns {Array} Detected connections
 */
export function detectStyledComponentConnections(fileResults) {
  const connections = [];
  const componentIndex = new Map(); // componentName -> [{file, component}]

  // Index all styled components
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    const components = analysis.components || [];

    for (const comp of components) {
      if (comp.type === 'styled_component' && comp.baseComponent) {
        if (!componentIndex.has(comp.baseComponent)) {
          componentIndex.set(comp.baseComponent, []);
        }
        componentIndex.get(comp.baseComponent).push({ file: filePath, component: comp });
      }
    }
  }

  // Create connections for extended components
  for (const [baseName, usages] of componentIndex.entries()) {
    if (usages.length > 1) {
      for (let i = 0; i < usages.length; i++) {
        for (let j = i + 1; j < usages.length; j++) {
          connections.push({
            id: `styled_ext_${baseName}_${usages[i].file}_to_${usages[j].file}`,
            sourceFile: usages[i].file,
            targetFile: usages[j].file,
            type: 'styledExtension',
            via: 'css-in-js',
            baseComponent: baseName,
            confidence: 0.95,
            detectedBy: 'css-in-js-extractor',
            reason: `Both extend styled(${baseName})`
          });
        }
      }
    }
  }

  return connections;
}
