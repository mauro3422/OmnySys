/**
 * @fileoverview index.js
 * 
 * Facade del módulo de extractores atómicos
 * Extrae TODOS los tipos de átomos de un archivo
 * 
 * Siguiendo SOLID:
 * - Cada extractor tiene una responsabilidad única (SRP)
 * - Se pueden agregar nuevos tipos sin modificar existentes (OCP)
 * - Todos implementan la misma interfaz (LSP)
 * - El facade no depende de implementaciones específicas (DIP)
 * 
 * Siguiendo SSOT:
 * - Un átomo = una fuente de verdad
 * - La metadata del archivo DERIVA de sus átomos
 * 
 * @module extractors/atomic
 */

import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default ?? _traverse;
import { extractFunctionDeclaration, extractFunctionExpression } from './function-extractor.js';
import { extractArrowFunction } from './arrow-extractor.js';
import { extractClassMethod, extractPrivateMethod, extractAccessor } from './class-method-extractor.js';
import { extractVariable } from './variable-extractor.js';

const logger = console; // Simplificado para demo

/**
 * Configuración del parser Babel
 */
const PARSER_CONFIG = {
  sourceType: 'module',
  plugins: [
    'jsx', 'typescript', 'classProperties', 'classPrivateMethods'
    // NOTE: pipelineOperator removed - conflicts with shebangs and private fields
  ]
};

/**
 * Extrae TODOS los átomos de un archivo
 * Esta es la función principal (facade)
 * 
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta del archivo
 * @returns {Array<Atom>} - Lista de átomos
 */
export function extractAtoms(code, filePath) {
  const atoms = [];
  let ast;
  
  try {
    ast = parse(code, PARSER_CONFIG);
  } catch (error) {
    logger.warn(`Parse error in ${filePath}: ${error.message}`);
    return [];
  }
  
  let currentClassName = null;
  
  traverse(ast, {
    // Funciones declaradas
    FunctionDeclaration(path) {
      if (isTopLevel(path)) {
        atoms.push(extractFunctionDeclaration(path, filePath));
      }
    },
    
    // Funciones expresadas
    FunctionExpression(path) {
      if (isVariableDeclaration(path)) {
        atoms.push(extractFunctionExpression(path, filePath));
      }
    },
    
    // Arrow functions
    ArrowFunctionExpression(path) {
      if (isVariableDeclaration(path)) {
        atoms.push(extractArrowFunction(path, filePath));
      }
    },
    
    // Métodos de clase (incluye getters/setters)
    ClassMethod(path) {
      if (path.parent.type === 'ClassBody') {
        const className = getClassName(path);
        const kind = path.node.kind;
        
        if (kind === 'get' || kind === 'set') {
          // Getter o setter
          atoms.push(extractAccessor(path, filePath, className));
        } else {
          // Método normal
          atoms.push(extractClassMethod(path, filePath, className));
        }
      }
    },
    
    // Métodos privados
    ClassPrivateMethod(path) {
      if (path.parent.type === 'ClassBody') {
        const className = getClassName(path);
        atoms.push(extractPrivateMethod(path, filePath, className));
      }
    },
    
    // Variables/Constantes (v0.9.34 - nuevo)
    // Solo exportadas y que NO sean funciones/arrows (ya cubiertas)
    VariableDeclarator(path) {
      // Solo top-level
      if (!isTopLevelVariable(path)) return;
      
      const init = path.node.init;
      // Skip si es función o arrow (ya cubiertas por otros visitors)
      if (init && (init.type === 'FunctionExpression' || init.type === 'ArrowFunctionExpression')) {
        return;
      }
      
      // Detectar si está exportado
      const parentDecl = path.parent;
      const grandParent = path.parentPath?.parent;
      const isExported = grandParent?.type === 'ExportNamedDeclaration' ||
                         (parentDecl?.type === 'VariableDeclaration' && 
                          path.parentPath?.parentPath?.node?.type === 'ExportNamedDeclaration');
      
      const kind = parentDecl?.kind || 'const';
      const variable = extractVariable(path, filePath, isExported, kind);
      if (variable) {
        atoms.push(variable);
      }
    }
  });
  
  return atoms;
}

/**
 * Extrae solo funciones (declaradas y expresadas)
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta del archivo
 * @returns {Array} - Solo funciones
 */
export function extractFunctions(code, filePath) {
  const allAtoms = extractAtoms(code, filePath);
  return allAtoms.filter(a => 
    a.type === 'function' || a.type === 'function-expression'
  );
}

/**
 * Extrae solo métodos de clase
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta del archivo
 * @returns {Array} - Solo métodos
 */
export function extractClassMethods(code, filePath) {
  const allAtoms = extractAtoms(code, filePath);
  return allAtoms.filter(a => 
    a.type === 'method' || a.type === 'static' || 
    a.type === 'private-method' || a.type === 'getter' || a.type === 'setter'
  );
}

/**
 * Extrae solo arrow functions
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta del archivo
 * @returns {Array} - Solo arrows
 */
export function extractArrows(code, filePath) {
  const allAtoms = extractAtoms(code, filePath);
  return allAtoms.filter(a => a.type === 'arrow');
}

// Helpers
function isTopLevel(path) {
  return path.parent.type === 'Program' ||
         path.parent.type === 'ExportNamedDeclaration' ||
         path.parent.type === 'ExportDefaultDeclaration';
}

function isVariableDeclaration(path) {
  return path.parent.type === 'VariableDeclarator';
}

function getClassName(path) {
  let current = path;
  while (current) {
    if (current.node.type === 'ClassDeclaration' && current.node.id) {
      return current.node.id.name;
    }
    current = current.parentPath;
  }
  return 'AnonymousClass';
}

/**
 * Check if VariableDeclarator is top-level (direct child of Program or Export)
 */
function isTopLevelVariable(path) {
  const parent = path.parent;
  const grandParent = path.parentPath?.parent;
  
  // Direct: const x = ... at program level
  if (parent?.type === 'VariableDeclaration' && grandParent?.type === 'Program') {
    return true;
  }
  
  // Exported: export const x = ...
  if (parent?.type === 'VariableDeclaration' && grandParent?.type === 'ExportNamedDeclaration') {
    return true;
  }
  
  return false;
}

export default extractAtoms;
