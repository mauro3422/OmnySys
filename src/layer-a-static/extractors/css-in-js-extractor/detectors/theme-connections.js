/**
 * @fileoverview Theme Connections Detector
 * 
 * Detect connections through shared themes
 * 
 * @module css-in-js-extractor/detectors/theme-connections
 */

/**
 * Detect theme connections between files
 * @param {Object} fileResults - Map of filePath -> styled analysis
 * @returns {Array} Detected connections
 */
export function detectThemeConnections(fileResults) {
  const connections = [];
  const themeProviders = [];
  const themeConsumers = [];

  // Categorize files
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    const themes = analysis.themes || [];

    for (const theme of themes) {
      if (theme.type === 'theme_provider') {
        themeProviders.push({ file: filePath, theme });
      } else if (['use_theme', 'with_theme', 'theme_access'].includes(theme.type)) {
        themeConsumers.push({ file: filePath, theme });
      }
    }
  }

  // Create provider -> consumer connections
  for (const provider of themeProviders) {
    for (const consumer of themeConsumers) {
      if (provider.file !== consumer.file) {
        connections.push({
          id: `theme_${provider.file}_to_${consumer.file}`,
          sourceFile: provider.file,
          targetFile: consumer.file,
          type: 'sharedTheme',
          via: 'css-in-js',
          provider: provider.theme.themeVar,
          consumer: consumer.theme.type,
          confidence: 0.9,
          detectedBy: 'css-in-js-extractor',
          reason: `Theme provider in ${provider.file} used by ${consumer.file}`
        });
      }
    }
  }

  return connections;
}
