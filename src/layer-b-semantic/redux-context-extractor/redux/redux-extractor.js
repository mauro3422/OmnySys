/**
 * @fileoverview Redux Extractor
 * 
 * Extrae información de Redux.
 * 
 * @module redux-context-extractor/redux/redux-extractor
 * @version 1.0.0
 */

import { getLineNumber } from '../utils/location-helpers.js';

export function extractRedux(code) {
  const result = { selectors: [], actions: [], reducers: [], stores: [], thunks: [] };
  let match;
  
  const useSelectorPattern = /useSelector\s*\(\s*(?:\(?\s*(\w+)\s*\)?\s*=>\s*)?([^)]+)\)/g;
  while ((match = useSelectorPattern.exec(code)) !== null) {
    const selectorBody = match[2];
    const paths = [];
    let pathMatch;
    const pathRegex = /(\w+(?:\.\w+)+)/g;
    while ((pathMatch = pathRegex.exec(selectorBody)) !== null) {
      if (pathMatch[1].includes('.') && !pathMatch[1].startsWith('console')) {
        paths.push(pathMatch[1]);
      }
    }
    result.selectors.push({ type: 'use_selector', body: selectorBody.slice(0, 100), paths, line: getLineNumber(code, match.index) });
  }
  
  const useDispatchPattern = /useDispatch\s*\(\s*\)/g;
  while ((match = useDispatchPattern.exec(code)) !== null) {
    result.actions.push({ type: 'use_dispatch', line: getLineNumber(code, match.index) });
  }
  
  const createSlicePattern = /createSlice\s*\(\s*\{[^}]*name\s*:\s*['"](\w+)['"]/g;
  while ((match = createSlicePattern.exec(code)) !== null) {
    result.reducers.push({ type: 'create_slice', name: match[1], line: getLineNumber(code, match.index) });
  }
  
  const storePattern = /(?:configureStore|createStore)\s*\(/g;
  while ((match = storePattern.exec(code)) !== null) {
    result.stores.push({ type: 'store', line: getLineNumber(code, match.index) });
  }
  
  const asyncThunkPattern = /createAsyncThunk\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = asyncThunkPattern.exec(code)) !== null) {
    result.thunks.push({ type: 'async_thunk', name: match[1], line: getLineNumber(code, match.index) });
  }
  
  return result;
}

export default { extractRedux };
