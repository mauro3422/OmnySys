/**
 * @fileoverview Static Extractor Test Factory
 * 
 * Factory for creating test data and mock objects for static extractors.
 * Provides builders for routes, env variables, events, storage, and globals.
 * 
 * @module tests/factories/static-extractor-test
 */

/**
 * Builder for creating route-related test code
 */
export class RouteBuilder {
  constructor() {
    this.code = '';
    this.routes = { server: [], client: [], all: [] };
  }

  /**
   * Create Express server route
   * @param {string} method - HTTP method (get, post, put, etc.)
   * @param {string} path - Route path
   */
  withServerRoute(method = 'get', path = '/api/users') {
    this.code += `
app.${method}('${path}', (req, res) => {
  res.json({ message: 'success' });
});
`;
    const line = this.code.split('\n').length - 3;
    this.routes.server.push({ method: method.toUpperCase(), route: path, line, type: 'server' });
    this.routes.all.push({ route: path, line, type: 'server', method: method.toUpperCase() });
    return this;
  }

  /**
   * Create Express router route
   * @param {string} method - HTTP method
   * @param {string} path - Route path
   */
  withRouterRoute(method = 'get', path = '/api/items') {
    this.code += `
router.${method}('${path}', controller.handleRequest);
`;
    const line = this.code.split('\n').length - 2;
    this.routes.server.push({ method: method.toUpperCase(), route: path, line, type: 'server' });
    this.routes.all.push({ route: path, line, type: 'server', method: method.toUpperCase() });
    return this;
  }

  /**
   * Create fetch call (client route)
   * @param {string} path - API path
   */
  withFetchCall(path = '/api/users') {
    this.code += `
fetch('${path}')
  .then(res => res.json())
  .then(data => console.log(data));
`;
    const line = this.code.split('\n').length - 3;
    this.routes.client.push({ route: path, line, type: 'client' });
    this.routes.all.push({ route: path, line, type: 'client' });
    return this;
  }

  /**
   * Create axios call (client route)
   * @param {string} method - HTTP method
   * @param {string} path - API path
   */
  withAxiosCall(method = 'get', path = '/api/users') {
    this.code += `
axios.${method}('${path}')
  .then(res => console.log(res.data));
`;
    const line = this.code.split('\n').length - 2;
    this.routes.client.push({ route: path, line, type: 'client' });
    this.routes.all.push({ route: path, line, type: 'client' });
    return this;
  }

  /**
   * Create template literal fetch with variables
   * @param {string} basePath - Base API path
   */
  withTemplateFetch(basePath = '/api/users') {
    this.code += `
fetch(\`${basePath}/\${userId}\`)
  .then(res => res.json());
`;
    const line = this.code.split('\n').length - 2;
    this.routes.client.push({ route: `${basePath}/\${userId}`, line, type: 'client' });
    this.routes.all.push({ route: `${basePath}/\${userId}`, line, type: 'client' });
    return this;
  }

  /**
   * Create multiple server routes
   * @param {Array<{method: string, path: string}>} routes
   */
  withMultipleServerRoutes(routes = [
    { method: 'get', path: '/api/users' },
    { method: 'post', path: '/api/users' },
    { method: 'put', path: '/api/users/:id' }
  ]) {
    routes.forEach(({ method, path }) => {
      this.withServerRoute(method, path);
    });
    return this;
  }

  /**
   * Create API client with multiple endpoints
   */
  withAPIClient() {
    return this
      .withFetchCall('/api/users')
      .withFetchCall('/api/posts')
      .withAxiosCall('post', '/api/login')
      .withAxiosCall('get', '/api/profile');
  }

  /**
   * Create full Express app
   */
  withExpressApp() {
    return this
      .withServerRoute('get', '/api/users')
      .withServerRoute('post', '/api/users')
      .withServerRoute('get', '/api/users/:id')
      .withServerRoute('put', '/api/users/:id')
      .withServerRoute('delete', '/api/users/:id');
  }

  build() {
    return {
      code: this.code,
      routes: this.routes
    };
  }
}

/**
 * Builder for creating environment variable test code
 */
export class EnvBuilder {
  constructor() {
    this.code = '';
    this.envVars = [];
  }

  /**
   * Add process.env access
   * @param {string} varName - Environment variable name
   * @param {string} variableName - Local variable name
   */
  withProcessEnv(varName = 'API_URL', variableName = 'apiUrl') {
    this.code += `
const ${variableName} = process.env.${varName};
`;
    const line = this.code.split('\n').length - 1;
    this.envVars.push({ name: varName, line, type: 'process.env' });
    return this;
  }

  /**
   * Add import.meta.env access (Vite)
   * @param {string} varName - Environment variable name
   * @param {string} variableName - Local variable name
   */
  withImportMetaEnv(varName = 'VITE_API_URL', variableName = 'apiUrl') {
    this.code += `
const ${variableName} = import.meta.env.${varName};
`;
    const line = this.code.split('\n').length - 1;
    this.envVars.push({ name: varName, line, type: 'import.meta.env' });
    return this;
  }

  /**
   * Add default value pattern
   * @param {string} varName - Environment variable name
   * @param {string} defaultValue - Default value
   */
  withDefaultValue(varName = 'PORT', defaultValue = '3000') {
    this.code += `
const port = process.env.${varName} || '${defaultValue}';
`;
    const line = this.code.split('\n').length - 1;
    this.envVars.push({ name: varName, line, type: 'process.env' });
    return this;
  }

  /**
   * Add boolean environment variable
   * @param {string} varName - Environment variable name
   */
  withBooleanEnv(varName = 'DEBUG') {
    this.code += `
const isDebug = process.env.${varName} === 'true';
`;
    const line = this.code.split('\n').length - 1;
    this.envVars.push({ name: varName, line, type: 'process.env' });
    return this;
  }

  /**
   * Add multiple environment variables
   * @param {string[]} varNames - Environment variable names
   */
  withMultipleEnv(varNames = ['API_URL', 'API_KEY', 'NODE_ENV']) {
    varNames.forEach(name => {
      this.withProcessEnv(name, name.toLowerCase());
    });
    return this;
  }

  /**
   * Create config object from env vars
   */
  withConfigObject() {
    this.code += `
const config = {
  apiUrl: process.env.API_URL,
  apiKey: process.env.API_KEY,
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development'
};
`;
    this.envVars.push(
      { name: 'API_URL', line: this.code.split('\n').length - 5, type: 'process.env' },
      { name: 'API_KEY', line: this.code.split('\n').length - 4, type: 'process.env' },
      { name: 'PORT', line: this.code.split('\n').length - 3, type: 'process.env' },
      { name: 'NODE_ENV', line: this.code.split('\n').length - 2, type: 'process.env' }
    );
    return this;
  }

  build() {
    return {
      code: this.code,
      envVars: this.envVars
    };
  }
}

/**
 * Builder for creating event-related test code
 */
export class EventBuilder {
  constructor() {
    this.code = '';
    this.events = { listeners: [], emitters: [], all: [] };
  }

  /**
   * Add addEventListener
   * @param {string} event - Event name
   * @param {string} handler - Handler function name
   * @param {string} target - Event target (document, window, element)
   */
  withEventListener(event = 'click', handler = 'handleClick', target = 'document') {
    this.code += `
${target}.addEventListener('${event}', ${handler});
`;
    const line = this.code.split('\n').length - 1;
    this.events.listeners.push({ event, line, type: 'listener' });
    this.events.all.push({ event, line, type: 'listener' });
    return this;
  }

  /**
   * Add removeEventListener
   * @param {string} event - Event name
   * @param {string} handler - Handler function name
   */
  withRemoveEventListener(event = 'click', handler = 'handleClick') {
    this.code += `
document.removeEventListener('${event}', ${handler});
`;
    return this;
  }

  /**
   * Add CustomEvent dispatch
   * @param {string} event - Event name
   * @param {string} detail - Event detail
   */
  withCustomEvent(event = 'custom-event', detail = '{}') {
    this.code += `
document.dispatchEvent(new CustomEvent('${event}', { detail: ${detail} }));
`;
    const line = this.code.split('\n').length - 1;
    this.events.emitters.push({ event, line, type: 'emitter' });
    this.events.all.push({ event, line, type: 'emitter' });
    return this;
  }

  /**
   * Add Event (not CustomEvent) dispatch
   * @param {string} event - Event name
   */
  withEventDispatch(event = 'load') {
    this.code += `
window.dispatchEvent(new Event('${event}'));
`;
    const line = this.code.split('\n').length - 1;
    this.events.emitters.push({ event, line, type: 'emitter' });
    this.events.all.push({ event, line, type: 'emitter' });
    return this;
  }

  /**
   * Add .on() method (EventEmitter style)
   * @param {string} event - Event name
   * @param {string} handler - Handler function name
   */
  withOnMethod(event = 'data', handler = 'handleData') {
    this.code += `
emitter.on('${event}', ${handler});
`;
    const line = this.code.split('\n').length - 1;
    this.events.listeners.push({ event, line, type: 'listener' });
    this.events.all.push({ event, line, type: 'listener' });
    return this;
  }

  /**
   * Add .emit() method (EventEmitter style)
   * @param {string} event - Event name
   * @param {string} data - Event data
   */
  withEmitMethod(event = 'update', data = 'payload') {
    this.code += `
emitter.emit('${event}', ${data});
`;
    const line = this.code.split('\n').length - 1;
    this.events.emitters.push({ event, line, type: 'emitter' });
    this.events.all.push({ event, line, type: 'emitter' });
    return this;
  }

  /**
   * Add .once() method
   * @param {string} event - Event name
   * @param {string} handler - Handler function name
   */
  withOnceMethod(event = 'ready', handler = 'init') {
    this.code += `
emitter.once('${event}', ${handler});
`;
    const line = this.code.split('\n').length - 1;
    this.events.listeners.push({ event, line, type: 'listener' });
    this.events.all.push({ event, line, type: 'listener' });
    return this;
  }

  /**
   * Add multiple event listeners
   * @param {string[]} events - Event names
   */
  withMultipleListeners(events = ['click', 'submit', 'keydown']) {
    events.forEach((event, i) => {
      this.withEventListener(event, `handler${i}`);
    });
    return this;
  }

  /**
   * Create complete event bus
   */
  withEventBus() {
    return this
      .withOnMethod('user:login', 'onUserLogin')
      .withOnMethod('user:logout', 'onUserLogout')
      .withEmitMethod('user:login', '{ id: 1 }')
      .withEmitMethod('user:logout');
  }

  /**
   * Create DOM event handlers
   */
  withDOMEvents() {
    return this
      .withEventListener('click', 'handleClick')
      .withEventListener('submit', 'handleSubmit', 'form')
      .withEventListener('keydown', 'handleKeydown', 'window')
      .withCustomEvent('app:ready', '{ status: "ok" }');
  }

  build() {
    return {
      code: this.code,
      events: this.events
    };
  }
}

/**
 * Builder for creating storage-related test code
 */
export class StorageBuilder {
  constructor() {
    this.code = '';
    this.storage = { reads: [], writes: [], all: [] };
  }

  /**
   * Add localStorage.setItem
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   */
  withLocalStorageWrite(key = 'token', value = '"abc123"') {
    this.code += `
localStorage.setItem('${key}', ${value});
`;
    const line = this.code.split('\n').length - 1;
    this.storage.writes.push({ key, line, type: 'write' });
    this.storage.all.push({ key, line, type: 'write' });
    return this;
  }

  /**
   * Add localStorage.getItem
   * @param {string} key - Storage key
   * @param {string} variableName - Variable to assign to
   */
  withLocalStorageRead(key = 'token', variableName = 'token') {
    this.code += `
const ${variableName} = localStorage.getItem('${key}');
`;
    const line = this.code.split('\n').length - 1;
    this.storage.reads.push({ key, line, type: 'read' });
    this.storage.all.push({ key, line, type: 'read' });
    return this;
  }

  /**
   * Add localStorage bracket notation write
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   */
  withBracketWrite(key = 'user', value = '"{}"') {
    this.code += `
localStorage['${key}'] = ${value};
`;
    const line = this.code.split('\n').length - 1;
    this.storage.writes.push({ key, line, type: 'write' });
    this.storage.all.push({ key, line, type: 'write' });
    return this;
  }

  /**
   * Add localStorage bracket notation read
   * @param {string} key - Storage key
   */
  withBracketRead(key = 'user') {
    this.code += `
const userData = localStorage['${key}'];
`;
    const line = this.code.split('\n').length - 1;
    this.storage.reads.push({ key, line, type: 'read' });
    this.storage.all.push({ key, line, type: 'read' });
    return this;
  }

  /**
   * Add sessionStorage.setItem
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   */
  withSessionStorageWrite(key = 'sessionId', value = '"xyz789"') {
    this.code += `
sessionStorage.setItem('${key}', ${value});
`;
    const line = this.code.split('\n').length - 1;
    this.storage.writes.push({ key, line, type: 'write' });
    this.storage.all.push({ key, line, type: 'write' });
    return this;
  }

  /**
   * Add sessionStorage.getItem
   * @param {string} key - Storage key
   */
  withSessionStorageRead(key = 'sessionId') {
    this.code += `
const sessionId = sessionStorage.getItem('${key}');
`;
    const line = this.code.split('\n').length - 1;
    this.storage.reads.push({ key, line, type: 'read' });
    this.storage.all.push({ key, line, type: 'read' });
    return this;
  }

  /**
   * Add localStorage.removeItem
   * @param {string} key - Storage key
   */
  withLocalStorageRemove(key = 'token') {
    this.code += `
localStorage.removeItem('${key}');
`;
    return this;
  }

  /**
   * Add localStorage.clear
   */
  withLocalStorageClear() {
    this.code += `
localStorage.clear();
`;
    return this;
  }

  /**
   * Create auth storage pattern
   */
  withAuthStorage() {
    return this
      .withLocalStorageWrite('token', '"jwt_token_here"')
      .withLocalStorageWrite('user', 'JSON.stringify(user)')
      .withLocalStorageRead('token', 'savedToken');
  }

  /**
   * Create settings storage pattern
   */
  withSettingsStorage() {
    return this
      .withLocalStorageWrite('theme', '"dark"')
      .withLocalStorageWrite('language', '"en"')
      .withLocalStorageRead('theme', 'currentTheme')
      .withLocalStorageRead('language', 'currentLanguage');
  }

  /**
   * Create session storage pattern
   */
  withSessionPattern() {
    return this
      .withSessionStorageWrite('sessionId', '"sess_123"')
      .withSessionStorageWrite('csrfToken', '"token_abc"')
      .withSessionStorageRead('sessionId');
  }

  build() {
    return {
      code: this.code,
      storage: this.storage
    };
  }
}

/**
 * Builder for creating global variable test code
 */
export class GlobalBuilder {
  constructor() {
    this.code = '';
    this.globals = { reads: [], writes: [], all: [] };
  }

  /**
   * Add window property read
   * @param {string} prop - Property name
   * @param {string} variableName - Variable to assign to
   */
  withWindowRead(prop = 'appConfig', variableName = 'config') {
    this.code += `
const ${variableName} = window.${prop};
`;
    const line = this.code.split('\n').length - 1;
    this.globals.reads.push({ property: prop, line, type: 'read' });
    this.globals.all.push({ property: prop, line, type: 'read' });
    return this;
  }

  /**
   * Add window property write
   * @param {string} prop - Property name
   * @param {string} value - Value to assign
   */
  withWindowWrite(prop = 'appState', value = '{}') {
    this.code += `
window.${prop} = ${value};
`;
    const line = this.code.split('\n').length - 1;
    this.globals.writes.push({ property: prop, line, type: 'write' });
    this.globals.all.push({ property: prop, line, type: 'write' });
    return this;
  }

  /**
   * Add global property read
   * @param {string} prop - Property name
   */
  withGlobalRead(prop = 'sharedData') {
    this.code += `
const data = global.${prop};
`;
    const line = this.code.split('\n').length - 1;
    this.globals.reads.push({ property: prop, line, type: 'read' });
    this.globals.all.push({ property: prop, line, type: 'read' });
    return this;
  }

  /**
   * Add global property write
   * @param {string} prop - Property name
   * @param {string} value - Value to assign
   */
  withGlobalWrite(prop = 'sharedData', value = '[]') {
    this.code += `
global.${prop} = ${value};
`;
    const line = this.code.split('\n').length - 1;
    this.globals.writes.push({ property: prop, line, type: 'write' });
    this.globals.all.push({ property: prop, line, type: 'write' });
    return this;
  }

  /**
   * Add globalThis access
   * @param {string} prop - Property name
   * @param {boolean} isWrite - Whether it's a write operation
   */
  withGlobalThis(prop = 'appData', isWrite = false) {
    if (isWrite) {
      this.code += `
globalThis.${prop} = {};
`;
      const line = this.code.split('\n').length - 1;
      this.globals.writes.push({ property: prop, line, type: 'write' });
      this.globals.all.push({ property: prop, line, type: 'write' });
    } else {
      this.code += `
const data = globalThis.${prop};
`;
      const line = this.code.split('\n').length - 1;
      this.globals.reads.push({ property: prop, line, type: 'read' });
      this.globals.all.push({ property: prop, line, type: 'read' });
    }
    return this;
  }

  /**
   * Create app state global pattern
   */
  withAppStateGlobal() {
    return this
      .withWindowWrite('appState', '{ user: null, isLoggedIn: false }')
      .withWindowRead('appState', 'currentState')
      .withWindowWrite('appConfig', '{ apiUrl: "/api" }');
  }

  /**
   * Create feature flags global pattern
   */
  withFeatureFlagsGlobal() {
    return this
      .withWindowWrite('featureFlags', '{ newUI: true, betaFeature: false }')
      .withWindowRead('featureFlags', 'flags');
  }

  build() {
    return {
      code: this.code,
      globals: this.globals
    };
  }
}

/**
 * Builder for creating multi-file static connection scenarios
 */
export class StaticConnectionBuilder {
  constructor() {
    this.files = new Map();
  }

  /**
   * Add a file with route content
   * @param {string} filePath - File path
   * @param {Function} builderFn - Function that receives RouteBuilder
   */
  withRouteFile(filePath, builderFn) {
    const builder = new RouteBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Add a file with env vars
   * @param {string} filePath - File path
   * @param {Function} builderFn - Function that receives EnvBuilder
   */
  withEnvFile(filePath, builderFn) {
    const builder = new EnvBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Add a file with events
   * @param {string} filePath - File path
   * @param {Function} builderFn - Function that receives EventBuilder
   */
  withEventFile(filePath, builderFn) {
    const builder = new EventBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Add a file with storage
   * @param {string} filePath - File path
   * @param {Function} builderFn - Function that receives StorageBuilder
   */
  withStorageFile(filePath, builderFn) {
    const builder = new StorageBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Add a file with globals
   * @param {string} filePath - File path
   * @param {Function} builderFn - Function that receives GlobalBuilder
   */
  withGlobalFile(filePath, builderFn) {
    const builder = new GlobalBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Create shared storage scenario
   */
  withSharedStorageScenario() {
    return this
      .withStorageFile('services/auth.js', builder => {
        builder.withLocalStorageWrite('token', '"jwt_123"');
      })
      .withStorageFile('components/Header.jsx', builder => {
        builder.withLocalStorageRead('token', 'userToken');
      })
      .withStorageFile('utils/api.js', builder => {
        builder.withLocalStorageRead('token', 'authToken');
      });
  }

  /**
   * Create shared event scenario
   */
  withSharedEventScenario() {
    return this
      .withEventFile('components/EventEmitter.js', builder => {
        builder.withEmitMethod('user:login', '{ id: 1 }');
      })
      .withEventFile('components/Listener1.jsx', builder => {
        builder.withOnMethod('user:login', 'handleLogin');
      })
      .withEventFile('components/Listener2.jsx', builder => {
        builder.withOnMethod('user:login', 'onUserLogin');
      });
  }

  /**
   * Create shared env scenario
   */
  withSharedEnvScenario() {
    return this
      .withEnvFile('config/api.js', builder => {
        builder.withProcessEnv('API_URL', 'apiUrl');
      })
      .withEnvFile('services/http.js', builder => {
        builder.withProcessEnv('API_URL', 'baseUrl');
      })
      .withEnvFile('utils/constants.js', builder => {
        builder.withProcessEnv('API_URL', 'endpoint');
      });
  }

  /**
   * Create shared global scenario
   */
  withSharedGlobalScenario() {
    return this
      .withGlobalFile('init.js', builder => {
        builder.withWindowWrite('appState', '{ version: "1.0" }');
      })
      .withGlobalFile('components/App.jsx', builder => {
        builder.withWindowRead('appState', 'state');
      })
      .withGlobalFile('utils/helpers.js', builder => {
        builder.withWindowRead('appState', 'appState');
      });
  }

  /**
   * Create shared route scenario
   */
  withSharedRouteScenario() {
    return this
      .withRouteFile('server/routes.js', builder => {
        builder.withServerRoute('get', '/api/users');
      })
      .withRouteFile('client/api.js', builder => {
        builder.withFetchCall('/api/users');
      })
      .withRouteFile('services/userService.js', builder => {
        builder.withAxiosCall('get', '/api/users');
      });
  }

  build() {
    const result = {};
    for (const [path, data] of this.files) {
      result[path] = data;
    }
    return result;
  }
}

/**
 * Predefined static extractor test scenarios
 */
export const StaticScenarios = {
  /**
   * Empty file
   */
  emptyFile() {
    return { code: '', routes: { server: [], client: [], all: [] }, envVars: [], events: { listeners: [], emitters: [], all: [] }, storage: { reads: [], writes: [], all: [] }, globals: { reads: [], writes: [], all: [] } };
  },

  /**
   * Simple route
   */
  simpleRoute() {
    const builder = new RouteBuilder();
    builder.withServerRoute('get', '/api/test');
    return builder.build();
  },

  /**
   * Simple env var
   */
  simpleEnv() {
    const builder = new EnvBuilder();
    builder.withProcessEnv('TEST_VAR');
    return builder.build();
  },

  /**
   * Simple event
   */
  simpleEvent() {
    const builder = new EventBuilder();
    builder.withEventListener('click', 'handleClick');
    return builder.build();
  },

  /**
   * Simple storage
   */
  simpleStorage() {
    const builder = new StorageBuilder();
    builder.withLocalStorageWrite('key', '"value"');
    return builder.build();
  },

  /**
   * Simple global
   */
  simpleGlobal() {
    const builder = new GlobalBuilder();
    builder.withWindowWrite('testProp', '123');
    return builder.build();
  },

  /**
   * Complex API routes
   */
  complexRoutes() {
    const builder = new RouteBuilder();
    builder.withExpressApp();
    return builder.build();
  },

  /**
   * Complex env setup
   */
  complexEnv() {
    const builder = new EnvBuilder();
    builder.withConfigObject();
    return builder.build();
  },

  /**
   * Complex events
   */
  complexEvents() {
    const builder = new EventBuilder();
    builder.withEventBus();
    return builder.build();
  },

  /**
   * Complex storage
   */
  complexStorage() {
    const builder = new StorageBuilder();
    builder.withAuthStorage().withSettingsStorage();
    return builder.build();
  },

  /**
   * Complex globals
   */
  complexGlobals() {
    const builder = new GlobalBuilder();
    builder.withAppStateGlobal().withFeatureFlagsGlobal();
    return builder.build();
  }
};

/**
 * Validation helpers for static extractor results
 */
export const StaticValidators = {
  /**
   * Validate route structure
   */
  isValidRoute(route) {
    return route &&
           typeof route.route === 'string' &&
           typeof route.line === 'number';
  },

  /**
   * Validate env var structure
   */
  isValidEnvVar(envVar) {
    return envVar &&
           typeof envVar.name === 'string' &&
           typeof envVar.line === 'number';
  },

  /**
   * Validate event structure
   */
  isValidEvent(event) {
    return event &&
           typeof event.event === 'string' &&
           typeof event.line === 'number';
  },

  /**
   * Validate storage structure
   */
  isValidStorage(storage) {
    return storage &&
           typeof storage.key === 'string' &&
           typeof storage.line === 'number';
  },

  /**
   * Validate global structure
   */
  isValidGlobal(global) {
    return global &&
           typeof global.property === 'string' &&
           typeof global.line === 'number';
  },

  /**
   * Validate connection structure
   */
  isValidConnection(connection) {
    return connection &&
           typeof connection.id === 'string' &&
           typeof connection.sourceFile === 'string' &&
           typeof connection.targetFile === 'string' &&
           typeof connection.type === 'string';
  }
};

export default {
  RouteBuilder,
  EnvBuilder,
  EventBuilder,
  StorageBuilder,
  GlobalBuilder,
  StaticConnectionBuilder,
  StaticScenarios,
  StaticValidators
};
