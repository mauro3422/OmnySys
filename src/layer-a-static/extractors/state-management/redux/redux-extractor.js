/**
 * @fileoverview redux-extractor.js
 * 
 * Extrae información completa de Redux del código
 * 
 * @module extractors/state-management/redux/redux-extractor
 */

import { detectAllSelectors } from './selector-detector.js';
import { detectSlicesAndStores } from './slice-detector.js';
import { detectAllActions } from './thunk-detector.js';

/**
 * Extrae información de Redux del código
 * @param {string} code - Código fuente
 * @returns {Object} - { selectors: [], actions: [], reducers: [], stores: [], thunks: [], all: [] }
 */
export function extractRedux(code) {
  const selectors = detectAllSelectors(code);
  const { slices, stores } = detectSlicesAndStores(code);
  const { useDispatches, thunks, dispatchCalls } = detectAllActions(code);
  
  const actions = [...useDispatches, ...dispatchCalls];
  
  return {
    selectors,
    actions,
    reducers: slices,
    stores,
    thunks,
    all: [...selectors, ...actions, ...slices, ...stores, ...thunks]
  };
}

/**
 * Extrae solo selectores
 * @param {string} code - Código fuente
 * @returns {Array}
 */
export function extractSelectors(code) {
  return detectAllSelectors(code);
}

/**
 * Extrae solo actions
 * @param {string} code - Código fuente
 * @returns {Array}
 */
export function extractActions(code) {
  const { useDispatches, dispatchCalls } = detectAllActions(code);
  return [...useDispatches, ...dispatchCalls];
}

/**
 * Extrae solo slices/reducers
 * @param {string} code - Código fuente
 * @returns {Array}
 */
export function extractReducers(code) {
  const { slices } = detectSlicesAndStores(code);
  return slices;
}

/**
 * Extrae solo stores
 * @param {string} code - Código fuente
 * @returns {Array}
 */
export function extractStores(code) {
  const { stores } = detectSlicesAndStores(code);
  return stores;
}

/**
 * Extrae solo thunks
 * @param {string} code - Código fuente
 * @returns {Array}
 */
export function extractThunks(code) {
  const { thunks } = detectAllActions(code);
  return thunks;
}
