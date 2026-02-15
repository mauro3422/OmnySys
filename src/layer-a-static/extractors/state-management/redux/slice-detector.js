/**
 * @fileoverview slice-detector.js
 * 
 * Detecta slices y stores de Redux (createSlice, configureStore)
 * 
 * @module extractors/state-management/redux/slice-detector
 */

import { REDUX_PATTERNS, ReduxType } from '../constants.js';
import { getLineNumber } from '../utils.js';

/**
 * Detecta creación de slices (createSlice)
 * @param {string} code - Código fuente
 * @returns {Array} - Slices detectados
 */
export function detectSlices(code) {
  const reducers = [];
  let match;
  
  REDUX_PATTERNS.createSlice.lastIndex = 0;
  while ((match = REDUX_PATTERNS.createSlice.exec(code)) !== null) {
    reducers.push({
      type: ReduxType.CREATE_SLICE,
      name: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  return reducers;
}

/**
 * Detecta creación de stores (configureStore, createStore)
 * @param {string} code - Código fuente
 * @returns {Array} - Stores detectados
 */
export function detectStores(code) {
  const stores = [];
  let match;
  
  REDUX_PATTERNS.storeCreation.lastIndex = 0;
  while ((match = REDUX_PATTERNS.storeCreation.exec(code)) !== null) {
    stores.push({
      type: ReduxType.STORE_CREATION,
      line: getLineNumber(code, match.index)
    });
  }
  
  return stores;
}

/**
 * Detecta slices y stores
 * @param {string} code - Código fuente
 * @returns {Object} - { slices: [], stores: [] }
 */
export function detectSlicesAndStores(code) {
  return {
    slices: detectSlices(code),
    stores: detectStores(code)
  };
}
