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

import { getFreshModuleSpecifier } from '../../tool-module-cache.js';

function buildDatabaseSchemaFallback(result, projectPath) {
  const summary = result?.summary || {};
  const historicalStores = result?.historicalStores || {
    projectPath,
    archiveDir: null,
    totalStores: 0,
    readyStoreCount: 0,
    missingStoreCount: 0,
    state: 'missing',
    latestSnapshotAt: null,
    freshestSnapshotState: 'missing',
    lineageReconciliation: null,
    summaryText: 'historical storage unavailable'
  };

  return {
    success: true,
    schemaType: 'database',
    schemaDebugMarker: 'mcp/get-schema/database-v2',
    timestamp: result?.timestamp || new Date().toISOString(),
    warning: result?.error || 'Database schema scan returned a degraded result.',
    summary: {
      totalRegisteredTables: summary.totalRegisteredTables || (Array.isArray(result?.tables) ? result.tables.length : 0),
      existingTables: summary.existingTables || (Array.isArray(result?.tables) ? result.tables.length : 0),
      untrackedTables: summary.untrackedTables || (Array.isArray(result?.untrackedTables) ? result.untrackedTables.length : 0),
      missingTables: summary.missingTables || 0,
      tablesWithDrift: summary.tablesWithDrift || 0,
      totalMissingColumns: summary.totalMissingColumns || 0,
      totalExtraColumns: summary.totalExtraColumns || 0,
      historicalStoreCount: summary.historicalStoreCount || historicalStores.totalStores || 0,
      historicalStoreReadyCount: summary.historicalStoreReadyCount || historicalStores.readyStoreCount || 0,
      historicalStoreMissingCount: summary.historicalStoreMissingCount || historicalStores.missingStoreCount || 0,
      historicalStoreState: summary.historicalStoreState || historicalStores.state || 'missing'
    },
    tables: Array.isArray(result?.tables) ? result.tables : [],
    untrackedTables: Array.isArray(result?.untrackedTables) ? result.untrackedTables : [],
    recommendations: Array.isArray(result?.recommendations)
      ? result.recommendations
      : [{
        severity: 'medium',
        message: result?.error || 'Database schema scan returned a degraded result.',
        action: 'refresh_cache'
      }],
    databaseHealth: result?.databaseHealth || null,
    controlPlaneFoundations: result?.controlPlaneFoundations || null,
    liveRowSync: result?.liveRowSync || null,
    historicalStores,
    stageErrors: Array.isArray(result?.stageErrors)
      ? result.stageErrors
      : [{ stage: 'databaseSchema', message: result?.error || 'Database schema scan returned a degraded result.' }]
  };
}

function coerceDatabaseSchemaResult(result, projectPath) {
  if (!result || typeof result !== 'object') {
    return null;
  }

  if (result.success !== false) {
    return result;
  }

  return buildDatabaseSchemaFallback(result, projectPath);
}

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
    const helpers = await import(getFreshModuleSpecifier('./helpers.js'));
    switch (type) {
      case 'atoms':
        return helpers.buildAtomsSchemaResult(projectPath, { atomType, sampleSize, focusField });

      case 'database':
        {
          const result = helpers.buildDatabaseSchemaResult({ includeSQL, projectPath });
          return coerceDatabaseSchemaResult(result, projectPath) || result;
        }

      case 'registry':
        return helpers.buildRegistrySchemaResult();

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
      debugStack: error.stack || null,
      schemaType: type,
      timestamp: new Date().toISOString()
    };
  }
}

export default { get_schema };
