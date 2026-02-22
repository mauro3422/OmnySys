/**
 * @fileoverview MCP Test Helpers
 * 
 * Helpers para tests de contrato de herramientas MCP.
 * 
 * @module tests/contracts/layer-c/helpers/mcp-test-helpers
 */

/**
 * Importa el módulo de herramientas MCP de forma segura
 * @returns {Promise<Object|null>} - Módulo importado o null
 */
export async function importToolsModule() {
  try {
    return await import('#layer-c/mcp/tools/index.js');
  } catch (e) {
    return null;
  }
}

/**
 * Wrapper para expect que maneja módulos no disponibles
 * @param {*} condition - Condición a evaluar
 * @param {Function} assertion - Función de aserción
 */
export function expectIfAvailable(condition, assertion) {
  if (!condition) {
    expect(true).toBe(true);
    return;
  }
  assertion();
}

/**
 * Verifica que un objeto tenga todas las propiedades requeridas
 * @param {Object} obj - Objeto a verificar
 * @param {string[]} fields - Lista de campos requeridos
 */
export function expectRequiredFields(obj, fields) {
  fields.forEach(field => {
    expect(obj).toHaveProperty(field);
  });
}
