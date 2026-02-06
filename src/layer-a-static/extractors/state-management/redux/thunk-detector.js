/**
 * @fileoverview thunk-detector.js
 * 
 * Detecta thunks y dispatch de Redux
 * 
 * @module extractors/state-management/redux/thunk-detector
 */

import { REDUX_PATTERNS, ReduxType } from '../constants.js';
import { getLineNumber } from '../utils.js';

/**
 * Detecta uso de useDispatch
 * @param {string} code - Código fuente
 * @returns {Array} - Dispatch hooks detectados
 */
export function detectUseDispatch(code) {
  const actions = [];
  let match;
  
  while ((match = REDUX_PATTERNS.useDispatch.exec(code)) !== null) {
    actions.push({
      type: ReduxType.USE_DISPATCH,
      line: getLineNumber(code, match.index)
    });
  }
  
  return actions;
}

/**
 * Detecta createAsyncThunk
 * @param {string} code - Código fuente
 * @returns {Array} - Thunks detectados
 */
export function detectAsyncThunks(code) {
  const thunks = [];
  let match;
  
  while ((match = REDUX_PATTERNS.asyncThunk.exec(code)) !== null) {
    thunks.push({
      type: ReduxType.ASYNC_THUNK,
      name: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  return thunks;
}

/**
 * Detecta llamadas a dispatch
 * @param {string} code - Código fuente
 * @returns {Array} - Dispatch calls detectados
 */
export function detectDispatchCalls(code) {
  const actions = [];
  let match;
  
  while ((match = REDUX_PATTERNS.dispatchCall.exec(code)) !== null) {
    actions.push({
      type: ReduxType.DISPATCH_CALL,
      action: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  return actions;
}

/**
 * Detecta todas las acciones (dispatch, thunks)
 * @param {string} code - Código fuente
 * @returns {Object} - { useDispatches: [], thunks: [], dispatchCalls: [] }
 */
export function detectAllActions(code) {
  return {
    useDispatches: detectUseDispatch(code),
    thunks: detectAsyncThunks(code),
    dispatchCalls: detectDispatchCalls(code)
  };
}
