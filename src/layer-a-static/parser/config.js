/**
 * @fileoverview config.js
 * 
 * Configuración del parser Babel
 * 
 * @module parser/config
 */

/**
 * Obtiene los plugins de Babel según la extensión del archivo
 * @param {string} filePath - Ruta del archivo
 * @returns {Array} - Plugins de Babel
 */
export function getBabelPlugins(filePath) {
  const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  const isJSX = filePath.endsWith('.jsx') || filePath.endsWith('.tsx');

  const plugins = [
    'jsx',
    ['flow', { all: true }],
    'objectRestSpread',
    'decorators',
    'classProperties',
    'exportExtensions',
    'asyncGenerators',
    ['pipelineOperator', { proposal: 'minimal' }],
    'nullishCoalescingOperator',
    'optionalChaining',
    'partialApplication'
  ];

  if (isTypeScript) {
    plugins.push(['typescript', { isTSX: isJSX }]);
  }

  return plugins;
}

/**
 * Obtiene las opciones del parser Babel
 * @param {string} filePath - Ruta del archivo
 * @returns {Object} - Opciones del parser
 */
export function getParserOptions(filePath) {
  return {
    sourceType: 'module',
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    plugins: getBabelPlugins(filePath)
  };
}
