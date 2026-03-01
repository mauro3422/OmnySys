/**
 * @fileoverview grammar-loader.js
 * 
 * Wrapper para cargar grammars de tree-sitter manejando diferencias de versiones
 * 
 * Versiones soportadas:
 * - tree-sitter 0.20.x + tree-sitter-javascript 0.19.x (módulo ES el language)
 * - tree-sitter 0.21.x+ + tree-sitter-javascript 0.23.x+ (module.default.language)
 * 
 * @module parser/grammar-loader
 */

/**
 * Carga y normaliza un grammar de tree-sitter
 * @param {Object} grammarModule - Módulo importado
 * @param {string} [grammarName] - Nombre del grammar dentro del módulo (para TypeScript)
 * @returns {Object|null} Language object válido para parser.setLanguage()
 */
export function loadGrammar(grammarModule, grammarName = null) {
  if (!grammarModule) return null;
  
  let lang = null;
  
  // Caso 1: El módulo ES directamente el language (tree-sitter-javascript 0.19.x)
  if (grammarModule.nodeTypeInfo && !grammarModule.default && !grammarModule.language) {
    return grammarModule;
  }
  
  // Caso 2: ESM con default export (tree-sitter-javascript 0.23.x+)
  if (grammarModule.default) {
    if (grammarName && grammarModule.default[grammarName]) {
      // TypeScript: module.default.typescript
      lang = grammarModule.default[grammarName];
    } else if (grammarModule.default.language) {
      // JavaScript: module.default.language
      lang = grammarModule.default.language;
    } else if (grammarModule.default.nodeTypeInfo) {
      // El default ES el language
      lang = grammarModule.default;
    }
  }
  
  // Caso 3: CommonJS con language export directo
  if (!lang && grammarName && grammarModule[grammarName]) {
    lang = grammarModule[grammarName];
  }
  
  // Caso 4: CommonJS con language export directo (JavaScript)
  if (!lang && grammarModule.language) {
    lang = grammarModule.language;
  }
  
  return lang;
}

/**
 * Carga todos los grammars soportados
 * @returns {Promise<Object>} Mapa de extensión → language
 */
export async function loadAllGrammars() {
  const [js, ts] = await Promise.all([
    import('tree-sitter-javascript'),
    import('tree-sitter-typescript')
  ]);
  
  const jsLang = loadGrammar(js);
  const tsLang = loadGrammar(ts, 'typescript');
  const tsxLang = loadGrammar(ts, 'tsx');
  
  return {
    '.js': jsLang,
    '.jsx': jsLang,
    '.mjs': jsLang,
    '.cjs': jsLang,
    '.ts': tsLang,
    '.tsx': tsxLang
  };
}

export default { loadGrammar, loadAllGrammars };
