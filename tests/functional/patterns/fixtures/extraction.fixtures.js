/**
 * @fileoverview Fixtures para Pattern H: Extraction
 *
 * Datos de prueba para funciones de extracción:
 * - extractTypeScriptDefinitions
 * - extractInterfaces
 * - extractExports
 * - detectAllSemanticConnections
 *
 * ESTRUCTURA:
 * Estas funciones reciben código (string) o AST y retornan definiciones extraídas
 * Patrón: { interfaces[], types[], classes[], exports[], all[] }
 *
 * @module tests/functional/patterns/fixtures/extraction.fixtures
 */

/**
 * Código TypeScript de ejemplo para extraer definiciones
 */
export const typeScriptCode = {
  simple: `
    interface User {
      id: number;
      name: string;
    }
    
    type UserRole = 'admin' | 'user' | 'guest';
    
    class UserManager {
      users: User[] = [];
      
      addUser(user: User): void {
        this.users.push(user);
      }
    }
    
    export { User, UserManager };
  `,

  withGenerics: `
    interface ApiResponse<T> {
      data: T;
      status: number;
      error?: string;
    }
    
    type Result<T, E> = 
      | { success: true; value: T }
      | { success: false; error: E };
    
    export type { ApiResponse, Result };
  `,

  complex: `
    // Interfaces
    interface Person {
      name: string;
      age: number;
    }
    
    interface Employee extends Person {
      employeeId: string;
      department: Department;
    }
    
    // Types
    type Department = ' Engineering' | 'Sales' | 'Marketing';
    type Status = 'active' | 'inactive';
    
    // Enums
    enum Priority {
      LOW = 1,
      MEDIUM = 2,
      HIGH = 3
    }
    
    // Classes
    class Team {
      members: Employee[] = [];
      
      addMember(emp: Employee): void {
        this.members.push(emp);
      }
    }
    
    // Exports
    export { Person, Employee, Team, Priority };
    export type { Department, Status };
  `,

  empty: ``,

  noDefinitions: `
    const x = 5;
    function helper() { return x; }
  `
};

/**
 * Código JavaScript para detectar conexiones semánticas
 */
export const semanticCode = {
  withLocalStorage: `
    function saveData(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    }
    
    function loadData(key) {
      return JSON.parse(localStorage.getItem(key));
    }
  `,

  withEvents: `
    function setupListeners() {
      window.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleKeydown);
    }
    
    function handleClick(e) {
      console.log('Clicked!', e.target);
    }
  `,

  withGlobals: `
    function init() {
      window.app = { version: '1.0.0' };
      document.title = 'My App';
    }
  `,

  clean: `
    function add(a, b) {
      return a + b;
    }
    
    function multiply(a, b) {
      return a * b;
    }
  `
};

/**
 * AST mínimo para tests (estructura simplificada)
 */
export const minimalAST = {
  type: 'File',
  program: {
    type: 'Program',
    body: [
      {
        type: 'ExportNamedDeclaration',
        declaration: {
          type: 'TSInterfaceDeclaration',
          id: { name: 'User' }
        }
      }
    ]
  }
};

/**
 * Resultados esperados para validación
 */
export const expectedResults = {
  simpleTypeScript: {
    hasInterfaces: true,
    hasTypes: true,
    hasClasses: true,
    hasExports: true,
    interfaceCount: 1,  // User
    typeCount: 1,       // UserRole
    classCount: 1       // UserManager
  },

  withGenerics: {
    hasGenerics: true,
    interfaceCount: 1,  // ApiResponse<T>
    typeCount: 1        // Result<T, E>
  },

  complex: {
    interfaceCount: 2,  // Person, Employee
    typeCount: 2,       // Department, Status
    classCount: 1,      // Team
    enumCount: 1        // Priority
  },

  empty: {
    interfaceCount: 0,
    typeCount: 0,
    classCount: 0,
    totalDefinitions: 0
  },

  withLocalStorage: {
    hasLocalStorageConnections: true,
    connectionCount: 2
  },

  withEvents: {
    hasEventConnections: true,
    connectionCount: 2
  },

  clean: {
    hasConnections: false,
    connectionCount: 0
  }
};

/**
 * Configuración de extracción
 */
export const extractionConfig = {
  includePrivate: false,
  includeInternal: false,
  detectGenerics: true,
  detectAsync: true
};

/**
 * Exportar todos los fixtures juntos
 */
export default {
  typeScriptCode,
  semanticCode,
  minimalAST,
  expectedResults,
  extractionConfig
};
