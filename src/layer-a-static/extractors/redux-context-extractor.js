/**
 * redux-context-extractor.js
 * 
 * ⚠️ DEPRECATED: Este archivo es un re-export para backward compatibility.
 * 
 * El código se ha movido a:
 *   src/layer-a-static/extractors/state-management/
 * 
 * Nueva estructura:
 *   - constants.js           - SSOT: tipos y patrones
 *   - utils.js               - Utilidades compartidas
 *   - redux/                 - Redux extractors
 *     - redux-extractor.js   - extractRedux
 *     - selector-detector.js - useSelector, connect
 *     - slice-detector.js    - createSlice, configureStore
 *     - thunk-detector.js    - useDispatch, createAsyncThunk
 *   - context/               - React Context extractors
 *     - context-extractor.js - extractContext
 *     - provider-detector.js - Context.Provider
 *     - consumer-detector.js - useContext
 *   - connections/           - Detectores de conexiones
 *     - selector-connections.js
 *     - context-connections.js
 *     - store-structure.js
 *   - index.js               - Facade API pública
 * 
 * @deprecated Use `import { ... } from './state-management/index.js'` instead
 */

console.warn('⚠️  DEPRECATED: Importing from redux-context-extractor.js');
console.warn('   Please update imports to: extractors/state-management/index.js');

export * from './state-management/index.js';
