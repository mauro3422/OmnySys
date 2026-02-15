/**
 * @fileoverview selector-detector.js
 * 
 * Detecta selectores de Redux (useSelector, connect, mapStateToProps)
 * 
 * @module extractors/state-management/redux/selector-detector
 */

import { REDUX_PATTERNS, ReduxType } from '../constants.js';
import { getLineNumber, extractStatePaths, truncate } from '../utils.js';

/**
 * Detecta uso de useSelector hooks
 * @param {string} code - Código fuente
 * @returns {Array} - Selectores detectados
 */
export function detectUseSelectors(code) {
  const selectors = [];
  let match;
  
  REDUX_PATTERNS.useSelector.lastIndex = 0;
  while ((match = REDUX_PATTERNS.useSelector.exec(code)) !== null) {
    const selectorBody = match[2];
    const paths = extractStatePaths(selectorBody);
    
    selectors.push({
      type: ReduxType.USE_SELECTOR,
      body: truncate(selectorBody, 100),
      paths,
      line: getLineNumber(code, match.index)
    });
  }
  
  return selectors;
}

/**
 * Detecta uso de connect HOC
 * @param {string} code - Código fuente
 * @returns {Array} - Conexiones detectadas
 */
export function detectConnectHOC(code) {
  const selectors = [];
  let match;
  
  REDUX_PATTERNS.connect.lastIndex = 0;
  while ((match = REDUX_PATTERNS.connect.exec(code)) !== null) {
    selectors.push({
      type: ReduxType.CONNECT_HOC,
      mapState: match[1]?.trim(),
      mapDispatch: match[2]?.trim(),
      line: getLineNumber(code, match.index)
    });
  }
  
  return selectors;
}

/**
 * Detecta funciones mapStateToProps
 * @param {string} code - Código fuente
 * @returns {Array} - Funciones detectadas
 */
export function detectMapStateFunctions(code) {
  const selectors = [];
  let match;
  
  REDUX_PATTERNS.mapStateFunction.lastIndex = 0;
  while ((match = REDUX_PATTERNS.mapStateFunction.exec(code)) !== null) {
    selectors.push({
      type: ReduxType.MAP_STATE_FUNCTION,
      name: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  return selectors;
}

/**
 * Detecta todos los selectores
 * @param {string} code - Código fuente
 * @returns {Array} - Todos los selectores
 */
export function detectAllSelectors(code) {
  return [
    ...detectUseSelectors(code),
    ...detectConnectHOC(code),
    ...detectMapStateFunctions(code)
  ];
}
