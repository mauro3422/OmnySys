/**
 * css-in-js-extractor.js
 * Extrae información de CSS-in-JS (styled-components, emotion, etc.)
 * 
 * Detecta:
 * - Styled components y sus dependencias
 * - Theme objects compartidos
 * - CSS variables dinámicas
 * - Clases CSS generadas
 */

/**
 * Extrae styled components del código
 * @param {string} code - Código fuente
 * @returns {Object} - { components: [], themes: [], cssVars: [] }
 */
export function extractStyledComponents(code) {
  const result = {
    components: [],    // styled.div`...`, styled(Component)`...`
    themes: [],        // ThemeProvider, useTheme
    cssVars: [],       // CSS custom properties
    globalStyles: [],  // createGlobalStyle
    all: []
  };
  
  // styled.div`...` o styled('div')`...`
  const styledTagPattern = /styled\s*\.\s*(\w+)\s*`([^`]+)`/g;
  const styledStringPattern = /styled\s*\(\s*['"](\w+)['"]\s*\)\s*`([^`]+)`/g;
  const styledComponentPattern = /styled\s*\(\s*(\w+)\s*\)\s*`([^`]+)`/g;
  
  // ThemeProvider
  const themeProviderPattern = /<ThemeProvider\s+theme\s*=\s*\{([^}]+)\}/g;
  const useThemePattern = /useTheme\s*\(\s*\)/g;
  const withThemePattern = /withTheme\s*\(\s*(\w+)\s*\)/g;
  
  // CSS variables: ${props => props.color} o ${({ theme }) => theme.colors.primary}
  const cssInterpolationPattern = /\$\{\s*(?:\([^)]*\)\s*=>\s*)?([^}]+)\}/g;
  
  // Theme usage: theme.colors.primary, props.theme.x
  const themeUsagePattern = /(?:theme|props\.theme)\.(\w+(?:\.\w+)*)/g;
  
  // Global styles: createGlobalStyle
  const globalStylePattern = /createGlobalStyle\s*`([^`]+)`/g;
  
  // CSS prop (emotion): css={`...`}
  const cssPropPattern = /css\s*=\s*\{?\s*`([^`]+)`/g;
  
  let match;
  
  // Styled components con tag (styled.div)
  while ((match = styledTagPattern.exec(code)) !== null) {
    const cssContent = match[2];
    const interpolations = [];
    let interpMatch;
    while ((interpMatch = cssInterpolationPattern.exec(cssContent)) !== null) {
      interpolations.push(interpMatch[1]);
    }
    
    result.components.push({
      type: 'styled_tag',
      tag: match[1],
      css: cssContent.slice(0, 200), // Truncado para no saturar
      interpolations,
      line: getLineNumber(code, match.index),
      hasThemeAccess: interpolations.some(i => i.includes('theme'))
    });
  }
  
  // Styled components con string (styled('div'))
  while ((match = styledStringPattern.exec(code)) !== null) {
    result.components.push({
      type: 'styled_string',
      tag: match[1],
      css: match[2].slice(0, 200),
      line: getLineNumber(code, match.index)
    });
  }
  
  // Styled components con componente (styled(Button))
  while ((match = styledComponentPattern.exec(code)) !== null) {
    result.components.push({
      type: 'styled_component',
      baseComponent: match[1],
      css: match[2].slice(0, 200),
      line: getLineNumber(code, match.index)
    });
  }
  
  // ThemeProvider
  while ((match = themeProviderPattern.exec(code)) !== null) {
    result.themes.push({
      type: 'theme_provider',
      themeVar: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  // useTheme hook
  while ((match = useThemePattern.exec(code)) !== null) {
    result.themes.push({
      type: 'use_theme',
      line: getLineNumber(code, match.index)
    });
  }
  
  // withTheme HOC
  while ((match = withThemePattern.exec(code)) !== null) {
    result.themes.push({
      type: 'with_theme',
      component: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  // Uso de theme: theme.colors.primary
  while ((match = themeUsagePattern.exec(code)) !== null) {
    result.themes.push({
      type: 'theme_access',
      path: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  // Global styles
  while ((match = globalStylePattern.exec(code)) !== null) {
    result.globalStyles.push({
      type: 'global_style',
      css: match[1].slice(0, 200),
      line: getLineNumber(code, match.index)
    });
  }
  
  // CSS prop (emotion)
  while ((match = cssPropPattern.exec(code)) !== null) {
    result.components.push({
      type: 'css_prop',
      css: match[1].slice(0, 200),
      line: getLineNumber(code, match.index)
    });
  }
  
  result.all = [...result.components, ...result.themes, ...result.globalStyles];
  
  return result;
}

/**
 * Detecta conexiones por theme compartido
 * @param {Object} fileResults - Mapa de filePath -> styled analysis
 * @returns {Array} - Conexiones detectadas
 */
export function detectThemeConnections(fileResults) {
  const connections = [];
  const files = Object.entries(fileResults);
  
  // Buscar archivos que definen/proveen theme
  const themeProviders = [];
  const themeConsumers = [];
  
  for (const [filePath, analysis] of files) {
    const themes = analysis.themes || [];
    
    for (const theme of themes) {
      if (theme.type === 'theme_provider') {
        themeProviders.push({ file: filePath, theme });
      } else if (theme.type === 'use_theme' || theme.type === 'with_theme' || theme.type === 'theme_access') {
        themeConsumers.push({ file: filePath, theme });
      }
    }
  }
  
  // Crear conexiones provider -> consumers
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

/**
 * Detecta conexiones por styled component compartido
 * @param {Object} fileResults - Mapa de filePath -> styled analysis  
 * @returns {Array} - Conexiones detectadas
 */
export function detectStyledComponentConnections(fileResults) {
  const connections = [];
  const componentIndex = new Map(); // componentName -> [{file, component}]
  
  // Indexar todos los styled components
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
  
  // Crear conexiones para componentes extendidos
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

/**
 * Extrae todos los datos CSS-in-JS de un archivo
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código fuente
 * @returns {Object} - Análisis completo
 */
export function extractCSSInJSFromFile(filePath, code) {
  return {
    filePath,
    ...extractStyledComponents(code),
    timestamp: new Date().toISOString()
  };
}

/**
 * Detecta todas las conexiones CSS-in-JS
 * @param {Object} fileSourceCode - Mapa de filePath -> código
 * @returns {Object} - Conexiones detectadas
 */
export function detectAllCSSInJSConnections(fileSourceCode) {
  const fileResults = {};
  
  for (const [filePath, code] of Object.entries(fileSourceCode)) {
    fileResults[filePath] = extractCSSInJSFromFile(filePath, code);
  }
  
  const themeConnections = detectThemeConnections(fileResults);
  const styledConnections = detectStyledComponentConnections(fileResults);
  
  return {
    connections: [...themeConnections, ...styledConnections],
    fileResults,
    byType: {
      theme: themeConnections,
      styledExtension: styledConnections
    }
  };
}

// Utilidad
function getLineNumber(code, position) {
  const lines = code.substring(0, position).split('\n');
  return lines.length;
}
