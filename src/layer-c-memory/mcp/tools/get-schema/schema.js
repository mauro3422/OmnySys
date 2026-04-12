/**
 * @fileoverview MCP Get Schema Tool
 *
 * Herramienta unificada para consultar schemas del sistema.
 * Reemplaza a: get_atom_schema + get_schema_status
 *
 * OPCIONES:
 *   - type: 'atoms' | 'database' | 'registry'
 *   - atomType: Filtrar por tipo de átomo (solo para type='atoms')
 *   - sampleSize: Cantidad de muestras (solo para type='atoms')
 *   - focusField: Campo para análisis detallado (solo para type='atoms')
 *
 * @module mcp/tools/get-schema
 */

import {
  buildAtomsSchemaResult,
  buildDatabaseSchemaResult,
  buildRegistrySchemaResult
} from './helpers.js';

/**
 * MCP Tool: get_schema
 *
 * Herramienta unificada para consultar schemas del sistema.
 *
 * @param {Object} args - Argumentos
 * @param {string} args.type - Tipo de schema: 'atoms' | 'database' | 'registry'
 * @param {string} args.atomType - Filtrar por tipo de átomo (solo type='atoms')
 * @param {number} args.sampleSize - Cantidad de muestras (solo type='atoms')
 * @param {string} args.focusField - Campo para análisis detallado (solo type='atoms')
 * @param {boolean} args.includeSQL - Incluir SQL exportado (solo type='database')
 */
export async function get_schema(args, context) {
  const { type = 'atoms', atomType, sampleSize = 3, focusField, includeSQL = false } = args;
  const { projectPath } = context;

  try {
    switch (type) {
      case 'atoms':
        return buildAtomsSchemaResult(projectPath, { atomType, sampleSize, focusField });

      case 'database':
        return buildDatabaseSchemaResult({ includeSQL, projectPath });

      case 'registry':
        return buildRegistrySchemaResult();

      default:
        return {
          error: `Unknown schema type: ${type}`,
          validTypes: ['atoms', 'database', 'registry']
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      schemaType: type,
      timestamp: new Date().toISOString()
    };
  }
}

export default { get_schema };
