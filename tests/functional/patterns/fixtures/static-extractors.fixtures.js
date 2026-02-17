/**
 * @fileoverview Fixtures para Static Extractors
 * 
 * Datos de prueba para funciones de extracción estática:
 * - extractLocalStorageKeys, extractStorageReads, extractStorageWrites
 * - extractEventNames, extractEventListeners, extractEventEmitters
 * - extractGlobalAccess, extractGlobalReads, extractGlobalWrites
 * - detectAllSemanticConnections
 * 
 * Patrón: Extraction (Pattern H)
 * 
 * @module tests/functional/patterns/fixtures/static-extractors.fixtures
 */

/**
 * Código con localStorage
 */
export const localStorageCode = {
  withReads: `
    function loadUserData() {
      const user = JSON.parse(localStorage.getItem('user'));
      const theme = localStorage.getItem('theme');
      return { user, theme };
    }
  `,

  withWrites: `
    function saveUserData(user) {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('lastUpdated', new Date().toISOString());
    }
  `,

  withReadsAndWrites: `
    function updateTheme(newTheme) {
      const currentTheme = localStorage.getItem('theme');
      if (currentTheme !== newTheme) {
        localStorage.setItem('theme', newTheme);
      }
    }
  `,

  empty: `
    function simpleFunction() {
      return 42;
    }
  `,

  complex: `
    const StorageManager = {
      getItem(key) {
        return localStorage.getItem(key);
      },
      setItem(key, value) {
        localStorage.setItem(key, value);
      },
      removeItem(key) {
        localStorage.removeItem(key);
      }
    };
  `
};

/**
 * Código con eventos
 */
export const eventCode = {
  withListeners: `
    document.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);
    element.addEventListener('custom-event', handleCustom);
  `,

  withEmitters: `
    function triggerEvent() {
      document.dispatchEvent(new Event('data-loaded'));
      element.dispatchEvent(new CustomEvent('user-action', { detail: {} }));
    }
  `,

  mixed: `
    class EventManager {
      constructor() {
        this.listeners = new Map();
        document.addEventListener('keydown', this.handleKey);
      }
      
      emit(eventName, data) {
        document.dispatchEvent(new CustomEvent(eventName, { detail: data }));
      }
    }
  `,

  empty: `
    function calculate(a, b) {
      return a + b;
    }
  `
};

/**
 * Código con variables globales
 */
export const globalCode = {
  withWindowAccess: `
    function init() {
      window.app = { version: '1.0.0' };
      window.config = { api: 'https://api.example.com' };
    }
  `,

  withDocumentAccess: `
    function setup() {
      document.title = 'My App';
      document.body.classList.add('loaded');
    }
  `,

  withNavigator: `
    function getInfo() {
      const userAgent = navigator.userAgent;
      const language = navigator.language;
      return { userAgent, language };
    }
  `,

  withConsole: `
    function logError(error) {
      console.error('Error:', error);
      console.log('Timestamp:', Date.now());
    }
  `,

  empty: `
    function pureFunction(x) {
      return x * 2;
    }
  `
};

/**
 * Código con variables de entorno
 */
export const envCode = {
  withProcessEnv: `
    const config = {
      apiUrl: process.env.API_URL,
      apiKey: process.env.API_KEY,
      nodeEnv: process.env.NODE_ENV
    };
  `,

  withImportMetaEnv: `
    const config = {
      apiUrl: import.meta.env.VITE_API_URL,
      mode: import.meta.env.MODE
    };
  `,

  empty: `
    const config = {
      timeout: 5000
    };
  `
};

/**
 * Código con rutas
 */
export const routeCode = {
  expressRoutes: `
    app.get('/users', getUsers);
    app.post('/users', createUser);
    app.get('/users/:id', getUserById);
    app.put('/users/:id', updateUser);
    app.delete('/users/:id', deleteUser);
  `,

  reactRouter: `
    <Route path="/dashboard" component={Dashboard} />
    <Route path="/profile/:userId" component={Profile} />
    <Route path="/settings" component={Settings} />
  `,

  nextjsRoutes: `
    export default function Page() {
      return <div>Home</div>;
    }
    // File: pages/users/[id].js
  `,

  empty: `
    function helper() {
      return true;
    }
  `
};

/**
 * Múltiples archivos para tests de conexiones
 */
export const multiFileCode = {
  file1: {
    path: 'src/components/UserProfile.js',
    code: `
      import { getUser } from '../api/user.js';
      
      function loadUser() {
        const userId = localStorage.getItem('currentUserId');
        return getUser(userId);
      }
      
      document.addEventListener('user-updated', handleUserUpdate);
    `
  },

  file2: {
    path: 'src/components/UserSettings.js',
    code: `
      function saveSettings(settings) {
        localStorage.setItem('currentUserId', settings.userId);
        document.dispatchEvent(new Event('user-updated'));
      }
    `
  },

  file3: {
    path: 'src/api/user.js',
    code: `
      const API_URL = process.env.API_URL;
      
      export function getUser(id) {
        return fetch(\`\${API_URL}/users/\${id}\`);
      }
    `
  },

  file4: {
    path: 'src/utils/helpers.js',
    code: `
      export function formatDate(date) {
        return new Date(date).toLocaleString();
      }
    `
  }
};

/**
 * Resultados esperados
 */
export const expectedResults = {
  localStorage: {
    keys: ['user', 'theme', 'lastUpdated'],
    reads: ['user', 'theme'],
    writes: ['user', 'lastUpdated', 'theme']
  },

  events: {
    names: ['click', 'resize', 'custom-event', 'data-loaded', 'user-action', 'keydown'],
    listeners: 4,
    emitters: 3
  },

  globals: {
    windowProps: ['app', 'config'],
    documentProps: ['title', 'body'],
    navigatorProps: ['userAgent', 'language']
  },

  env: {
    processVars: ['API_URL', 'API_KEY', 'NODE_ENV'],
    importMetaVars: ['VITE_API_URL', 'MODE']
  }
};

/**
 * Configuración para extracción
 */
export const extractionConfig = {
  detectReads: true,
  detectWrites: true,
  includeNativeProps: false,
  trackLineNumbers: true
};

export default {
  localStorageCode,
  eventCode,
  globalCode,
  envCode,
  routeCode,
  multiFileCode,
  expectedResults,
  extractionConfig
};
