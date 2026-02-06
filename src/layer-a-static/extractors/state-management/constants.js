/**
 * @fileoverview constants.js
 * 
 * SSOT - Constantes para extracción de state management
 * 
 * @module extractors/state-management/constants
 */

/**
 * Tipos de elementos Redux
 * @readonly
 * @enum {string}
 */
export const ReduxType = {
  USE_SELECTOR: 'use_selector',
  USE_DISPATCH: 'use_dispatch',
  CONNECT_HOC: 'connect_hoc',
  MAP_STATE_FUNCTION: 'map_state_function',
  CREATE_SLICE: 'create_slice',
  STORE_CREATION: 'store_creation',
  ASYNC_THUNK: 'async_thunk',
  DISPATCH_CALL: 'dispatch_call'
};

/**
 * Tipos de elementos React Context
 * @readonly
 * @enum {string}
 */
export const ContextType = {
  CONTEXT_CREATION: 'context_creation',
  CONTEXT_PROVIDER: 'context_provider',
  USE_CONTEXT: 'use_context',
  CONTEXT_CONSUMER: 'context_consumer',
  USE_CONTEXT_NEW: 'use_context_new'
};

/**
 * Tipos de conexiones
 * @readonly
 * @enum {string}
 */
export const ConnectionType = {
  SHARED_SELECTOR: 'sharedSelector',
  CONTEXT_USAGE: 'contextUsage'
};

/**
 * Patrones regex para Redux
 * @constant {Object}
 */
export const REDUX_PATTERNS = {
  // Selectors
  useSelector: /useSelector\s*\(\s*(?:\(?\s*(\w+)\s*\)?\s*=>\s*)?([^)]+)\)/g,
  useDispatch: /useDispatch\s*\(\s*\)/g,
  connect: /connect\s*\(\s*([^,]+)?\s*,?\s*([^)]+)?\s*\)/g,
  mapStateFunction: /(?:const|function)\s+(\w*mapState\w*)\s*[=(]/g,
  
  // Store & Slices
  createSlice: /createSlice\s*\(\s*\{[^}]*name\s*:\s*['"](\w+)['"]/g,
  storeCreation: /(?:configureStore|createStore)\s*\(/g,
  
  // Actions & Thunks
  asyncThunk: /createAsyncThunk\s*\(\s*['"]([^'"]+)['"]/g,
  dispatchCall: /dispatch\s*\(\s*(\w+)\s*\(/g,
  
  // State path extraction
  statePath: /(\w+(?:\.\w+)+)/g
};

/**
 * Patrones regex para React Context
 * @constant {Object}
 */
export const CONTEXT_PATTERNS = {
  createContext: /createContext\s*(?:<[^>]+>)?\s*\(/g,
  provider: /(\w+)\.Provider/g,
  useContext: /useContext\s*\(\s*(\w+)\s*\)/g,
  consumer: /(\w+)\.Consumer/g,
  useContextNew: /use\s*\(\s*(\w+)\s*\)/g  // React 18+
};

/**
 * Confianza por defecto para conexiones detectadas
 * @constant {number}
 */
export const DEFAULT_CONFIDENCE = {
  selector: 0.9,
  context: 0.95
};
