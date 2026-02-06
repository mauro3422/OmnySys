/**
 * redux-context-extractor.js
 * Extrae información de Redux y React Context
 * 
 * Detecta:
 * - Selectores y su estructura de estado
 * - Actions y reducers
 * - Context providers y consumers
 * - useSelector hooks
 */

/**
 * Extrae información de Redux del código
 * @param {string} code - Código fuente
 * @returns {Object} - { selectors: [], actions: [], reducers: [], stores: [] }
 */
export function extractRedux(code) {
  const result = {
    selectors: [],     // useSelector(state => state.x)
    actions: [],       // useDispatch(), action creators
    reducers: [],      // createSlice, combineReducers
    stores: [],        // configureStore, createStore
    thunks: [],        // createAsyncThunk
    all: []
  };
  
  // useSelector hooks
  const useSelectorPattern = /useSelector\s*\(\s*(?:\(?\s*(\w+)\s*\)?\s*=>\s*)?([^)]+)\)/g;
  
  // useDispatch
  const useDispatchPattern = /useDispatch\s*\(\s*\)/g;
  
  // connect(mapState, mapDispatch)
  const connectPattern = /connect\s*\(\s*([^,]+)?\s*,?\s*([^)]+)?\s*\)/g;
  
  // mapStateToProps function
  const mapStatePattern = /(?:const|function)\s+(\w*mapState\w*)\s*[=\(]/g;
  
  // createSlice
  const createSlicePattern = /createSlice\s*\(\s*\{[^}]*name\s*:\s*['"](\w+)['"]/g;
  
  // configureStore / createStore
  const storePattern = /(?:configureStore|createStore)\s*\(/g;
  
  // createAsyncThunk
  const asyncThunkPattern = /createAsyncThunk\s*\(\s*['"]([^'"]+)['"]/g;
  
  // Dispatch de actions: dispatch(action())
  const dispatchPattern = /dispatch\s*\(\s*(\w+)\s*\(/g;
  
  // State path access: state.x.y.z
  const statePathPattern = /(\w+)\.([\w.]+)/g;
  
  let match;
  
  // useSelector hooks - extraer path del estado
  while ((match = useSelectorPattern.exec(code)) !== null) {
    const selectorBody = match[2];
    const paths = [];
    
    // Extraer paths como state.user.name
    let pathMatch;
    const pathRegex = /(\w+(?:\.\w+)+)/g;
    while ((pathMatch = pathRegex.exec(selectorBody)) !== null) {
      const fullPath = pathMatch[1];
      // Filtrar solo paths que parecen acceso a estado
      if (fullPath.includes('.') && !fullPath.startsWith('console')) {
        paths.push(fullPath);
      }
    }
    
    result.selectors.push({
      type: 'use_selector',
      body: selectorBody.slice(0, 100),
      paths,
      line: getLineNumber(code, match.index)
    });
  }
  
  // useDispatch
  while ((match = useDispatchPattern.exec(code)) !== null) {
    result.actions.push({
      type: 'use_dispatch',
      line: getLineNumber(code, match.index)
    });
  }
  
  // connect HOC
  while ((match = connectPattern.exec(code)) !== null) {
    result.selectors.push({
      type: 'connect_hoc',
      mapState: match[1]?.trim(),
      mapDispatch: match[2]?.trim(),
      line: getLineNumber(code, match.index)
    });
  }
  
  // mapStateToProps functions
  while ((match = mapStatePattern.exec(code)) !== null) {
    result.selectors.push({
      type: 'map_state_function',
      name: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  // createSlice
  while ((match = createSlicePattern.exec(code)) !== null) {
    result.reducers.push({
      type: 'create_slice',
      name: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  // Store creation
  while ((match = storePattern.exec(code)) !== null) {
    result.stores.push({
      type: 'store_creation',
      line: getLineNumber(code, match.index)
    });
  }
  
  // Async thunks
  while ((match = asyncThunkPattern.exec(code)) !== null) {
    result.thunks.push({
      type: 'async_thunk',
      name: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  // Dispatch calls
  while ((match = dispatchPattern.exec(code)) !== null) {
    result.actions.push({
      type: 'dispatch_call',
      action: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  result.all = [...result.selectors, ...result.actions, ...result.reducers, ...result.stores];
  
  return result;
}

/**
 * Extrae información de React Context
 * @param {string} code - Código fuente
 * @returns {Object} - { contexts: [], providers: [], consumers: [] }
 */
export function extractContext(code) {
  const result = {
    contexts: [],      // createContext()
    providers: [],     // <Context.Provider>
    consumers: [],     // useContext(), <Context.Consumer>
    all: []
  };
  
  // createContext
  const createContextPattern = /createContext\s*(?:<[^>]+>)?\s*\(/g;
  
  // Context.Provider
  const providerPattern = /(\w+)\.Provider/g;
  
  // useContext hook
  const useContextPattern = /useContext\s*\(\s*(\w+)\s*\)/g;
  
  // Context.Consumer
  const consumerPattern = /(\w+)\.Consumer/g;
  
  // use(Context) - React 18+
  const useContextNewPattern = /use\s*\(\s*(\w+)\s*\)/g;
  
  let match;
  
  while ((match = createContextPattern.exec(code)) !== null) {
    result.contexts.push({
      type: 'context_creation',
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = providerPattern.exec(code)) !== null) {
    result.providers.push({
      type: 'context_provider',
      contextName: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = useContextPattern.exec(code)) !== null) {
    result.consumers.push({
      type: 'use_context',
      contextName: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = consumerPattern.exec(code)) !== null) {
    result.consumers.push({
      type: 'context_consumer',
      contextName: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = useContextNewPattern.exec(code)) !== null) {
    result.consumers.push({
      type: 'use_context_new',
      contextName: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  result.all = [...result.contexts, ...result.providers, ...result.consumers];
  
  return result;
}

/**
 * Detecta conexiones por selector compartido
 * @param {Object} fileResults - Mapa de filePath -> analysis
 * @returns {Array} - Conexiones detectadas
 */
export function detectSelectorConnections(fileResults) {
  const connections = [];
  
  // Indexar paths de estado usados
  const pathIndex = new Map(); // path -> [{file, selector}]
  
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    const redux = analysis.redux || {};
    
    for (const selector of redux.selectors || []) {
      for (const path of selector.paths || []) {
        if (!pathIndex.has(path)) {
          pathIndex.set(path, []);
        }
        pathIndex.get(path).push({ file: filePath, selector });
      }
    }
  }
  
  // Crear conexiones entre archivos que usan el mismo path
  for (const [path, usages] of pathIndex.entries()) {
    if (usages.length > 1) {
      for (let i = 0; i < usages.length; i++) {
        for (let j = i + 1; j < usages.length; j++) {
          connections.push({
            id: `selector_${path}_${usages[i].file}_to_${usages[j].file}`,
            sourceFile: usages[i].file,
            targetFile: usages[j].file,
            type: 'sharedSelector',
            via: 'redux',
            statePath: path,
            confidence: 0.9,
            detectedBy: 'redux-extractor',
            reason: `Both use selector accessing state.${path}`
          });
        }
      }
    }
  }
  
  return connections;
}

/**
 * Detecta conexiones por Context compartido
 * @param {Object} fileResults - Mapa de filePath -> analysis
 * @returns {Array} - Conexiones detectadas
 */
export function detectContextConnections(fileResults) {
  const connections = [];
  
  // Indexar providers y consumers por nombre de contexto
  const contextProviders = new Map();
  const contextConsumers = new Map();
  
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    const context = analysis.context || {};
    
    for (const provider of context.providers || []) {
      if (!contextProviders.has(provider.contextName)) {
        contextProviders.set(provider.contextName, []);
      }
      contextProviders.get(provider.contextName).push({ file: filePath, provider });
    }
    
    for (const consumer of context.consumers || []) {
      if (!contextConsumers.has(consumer.contextName)) {
        contextConsumers.set(consumer.contextName, []);
      }
      contextConsumers.get(consumer.contextName).push({ file: filePath, consumer });
    }
  }
  
  // Crear conexiones provider -> consumers
  for (const [contextName, providers] of contextProviders.entries()) {
    const consumers = contextConsumers.get(contextName) || [];
    
    for (const provider of providers) {
      for (const consumer of consumers) {
        if (provider.file !== consumer.file) {
          connections.push({
            id: `context_${contextName}_${provider.file}_to_${consumer.file}`,
            sourceFile: provider.file,
            targetFile: consumer.file,
            type: 'contextUsage',
            via: 'react-context',
            contextName: contextName,
            confidence: 0.95,
            detectedBy: 'context-extractor',
            reason: `Context '${contextName}' provided by ${provider.file}, consumed by ${consumer.file}`
          });
        }
      }
    }
  }
  
  return connections;
}

/**
 * Detecta estructura del store (reducers)
 * @param {Object} fileResults - Mapa de filePath -> analysis
 * @returns {Object} - Estructura del store detectada
 */
export function detectStoreStructure(fileResults) {
  const slices = [];
  
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    const redux = analysis.redux || {};
    
    for (const reducer of redux.reducers || []) {
      slices.push({
        name: reducer.name,
        file: filePath,
        line: reducer.line
      });
    }
  }
  
  return {
    sliceCount: slices.length,
    slices,
    likelyStateKeys: slices.map(s => s.name.toLowerCase())
  };
}

/**
 * Extrae análisis completo de Redux/Context de un archivo
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código fuente
 * @returns {Object} - Análisis completo
 */
export function extractReduxContextFromFile(filePath, code) {
  return {
    filePath,
    redux: extractRedux(code),
    context: extractContext(code),
    timestamp: new Date().toISOString()
  };
}

/**
 * Detecta todas las conexiones Redux/Context
 * @param {Object} fileSourceCode - Mapa de filePath -> código
 * @returns {Object} - Conexiones detectadas
 */
export function detectAllReduxContextConnections(fileSourceCode) {
  const fileResults = {};
  
  for (const [filePath, code] of Object.entries(fileSourceCode)) {
    fileResults[filePath] = extractReduxContextFromFile(filePath, code);
  }
  
  const selectorConnections = detectSelectorConnections(fileResults);
  const contextConnections = detectContextConnections(fileResults);
  const storeStructure = detectStoreStructure(fileResults);
  
  return {
    connections: [...selectorConnections, ...contextConnections],
    storeStructure,
    fileResults,
    byType: {
      selector: selectorConnections,
      context: contextConnections
    }
  };
}

// Utilidad
function getLineNumber(code, position) {
  const lines = code.substring(0, position).split('\n');
  return lines.length;
}
