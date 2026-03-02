/**
 * @fileoverview schema-registry.js
 *
 * 🏛️ SINGLE SOURCE OF TRUTH - Schema Registry
 *
 * Este archivo es la ÚNICA fuente de verdad para el schema de la base de datos.
 * Todas las columnas, tablas y migraciones se definen aquí.
 *
 * PROPÓSITO:
 * - Eliminar fragmentación entre schema.sql, connection.js y migrations/
 * - Detectar automáticamente columnas faltantes
 * - Generar migraciones automáticas
 * - Prevenir el bug de las "58 columnas" por duplicación
 *
 * @module storage/database/schema-registry
 */

/**
 * Definición de columnas por tabla
 * 
 * Cada columna tiene:
 * - name: nombre de la columna
 * - type: tipo SQLite (TEXT, INTEGER, REAL, BOOLEAN)
 * - default: valor por defecto (opcional)
 * - nullable: si puede ser null (default: false)
 * - description: descripción de la columna
 * - addedIn: versión cuando se agregó (para tracking)
 * - usedByTools: herramientas MCP que usan esta columna
 */

export const TABLE_DEFINITIONS = {
  atoms: {
    description: 'Átomos del sistema (funciones, métodos, variables)',
    columns: [
      // Identificadores básicos
      { name: 'id', type: 'TEXT', pk: true, nullable: false, description: 'ID único (formato: filePath::name)' },
      { name: 'name', type: 'TEXT', nullable: false, description: 'Nombre del átomo' },
      { name: 'atom_type', type: 'TEXT', nullable: false, description: 'Tipo: function, arrow, method, variable' },
      { name: 'file_path', type: 'TEXT', nullable: false, description: 'Ruta del archivo' },

      // Vectores estructurales
      { name: 'line_start', type: 'INTEGER', nullable: false, description: 'Línea de inicio' },
      { name: 'line_end', type: 'INTEGER', nullable: false, description: 'Línea de fin' },
      { name: 'lines_of_code', type: 'INTEGER', nullable: false, description: 'Líneas de código' },
      { name: 'complexity', type: 'INTEGER', nullable: false, description: 'Complejidad ciclomática' },
      { name: 'parameter_count', type: 'INTEGER', default: 0, description: 'Cantidad de parámetros' },

      // Flags
      { name: 'is_exported', type: 'BOOLEAN', default: 0, description: 'Es exportado' },
      { name: 'is_async', type: 'BOOLEAN', default: 0, description: 'Es async' },
      { name: 'is_test_callback', type: 'BOOLEAN', default: 0, description: 'Es callback de test' },
      { name: 'test_callback_type', type: 'TEXT', nullable: true, description: 'Tipo de test: describe, it, test' },
      { name: 'has_error_handling', type: 'BOOLEAN', default: 0, description: 'Tiene manejo de errores', addedIn: 'v0.9.30' },
      { name: 'has_network_calls', type: 'BOOLEAN', default: 0, description: 'Tiene llamadas a red', addedIn: 'v0.9.30' },

      // Clasificación
      { name: 'archetype_type', type: 'TEXT', nullable: true, description: 'Arquetipo del átomo' },
      { name: 'archetype_severity', type: 'INTEGER', nullable: true, description: 'Severidad del arquetipo' },
      { name: 'archetype_confidence', type: 'REAL', nullable: true, description: 'Confianza del arquetipo' },
      { name: 'purpose_type', type: 'TEXT', nullable: true, description: 'Propósito del átomo' },
      { name: 'purpose_confidence', type: 'REAL', nullable: true, description: 'Confianza del propósito' },
      { name: 'is_dead_code', type: 'BOOLEAN', default: 0, description: 'Es código muerto' },

      // Vectores matemáticos (Semantic Algebra)
      { name: 'importance_score', type: 'REAL', default: 0, description: 'Score de importancia (0-1)' },
      { name: 'coupling_score', type: 'REAL', default: 0, description: 'Score de acoplamiento (0-1)' },
      { name: 'cohesion_score', type: 'REAL', default: 0, description: 'Score de cohesión (0-1)' },
      { name: 'stability_score', type: 'REAL', default: 1, description: 'Score de estabilidad (0-1)' },
      { name: 'propagation_score', type: 'REAL', default: 0, description: 'Score de propagación (0-1)' },
      { name: 'fragility_score', type: 'REAL', default: 0, description: 'Score de fragilidad (0-1)' },
      { name: 'testability_score', type: 'REAL', default: 0, description: 'Score de testabilidad (0-1)' },

      // Grafos (Álgebra de Grafos) - v2.0
      { name: 'in_degree', type: 'INTEGER', default: 0, description: 'Número de callers', addedIn: 'v2.0' },
      { name: 'out_degree', type: 'INTEGER', default: 0, description: 'Número de callees', addedIn: 'v2.0' },
      { name: 'centrality_score', type: 'REAL', default: 0, description: 'Score de centralidad', addedIn: 'v2.0' },
      { name: 'centrality_classification', type: 'TEXT', nullable: true, description: 'Clasificación: HUB, BRIDGE, LEAF', addedIn: 'v2.0' },
      { name: 'risk_level', type: 'TEXT', nullable: true, description: 'Nivel de riesgo', addedIn: 'v2.0' },
      { name: 'risk_prediction', type: 'TEXT', nullable: true, description: 'Predicción de riesgo', addedIn: 'v2.0' },

      // Contadores relacionales
      { name: 'callers_count', type: 'INTEGER', default: 0, description: 'Cantidad de callers' },
      { name: 'callees_count', type: 'INTEGER', default: 0, description: 'Cantidad de callees' },
      { name: 'dependency_depth', type: 'INTEGER', default: 0, description: 'Profundidad de dependencia' },
      { name: 'external_call_count', type: 'INTEGER', default: 0, description: 'Llamadas externas' },

      // Temporales
      { name: 'extracted_at', type: 'TEXT', nullable: false, description: 'Fecha de extracción' },
      { name: 'updated_at', type: 'TEXT', nullable: false, description: 'Fecha de actualización' },
      { name: 'change_frequency', type: 'REAL', default: 0, description: 'Cambios por día' },
      { name: 'age_days', type: 'INTEGER', default: 0, description: 'Edad en días' },
      { name: 'generation', type: 'INTEGER', default: 1, description: 'Generación del átomo' },

      // JSON con estructuras complejas
      { name: 'signature_json', type: 'TEXT', nullable: true, description: 'Signature: parámetros, return type' },
      { name: 'data_flow_json', type: 'TEXT', nullable: true, description: 'Flujo de datos: inputs, transformations, outputs' },
      { name: 'calls_json', type: 'TEXT', nullable: true, description: 'Lista de llamadas' },
      { name: 'called_by_json', type: 'TEXT', nullable: true, description: 'Lista de funciones que llaman a este átomo', addedIn: 'v0.9.20' },
      { name: 'temporal_json', type: 'TEXT', nullable: true, description: 'Patrones temporales: timers, async, events' },
      { name: 'error_flow_json', type: 'TEXT', nullable: true, description: 'Flujo de errores: throws, catches' },
      { name: 'performance_json', type: 'TEXT', nullable: true, description: 'Métricas de performance' },
      { name: 'dna_json', type: 'TEXT', nullable: true, description: 'DNA fingerprint' },
      { name: 'derived_json', type: 'TEXT', nullable: true, description: 'Scores derivados adicionales' },

      // Function metadata
      { name: 'function_type', type: 'TEXT', nullable: true, description: 'Tipo de función: declaration, arrow, expression, method', addedIn: 'v0.9.20' },

      // Tree-sitter metadata (v0.9.62)
      { name: 'shared_state_json', type: 'TEXT', nullable: true, description: 'sharedStateAccess[]: acceso a estado global', addedIn: 'v0.9.62' },
      { name: 'event_emitters_json', type: 'TEXT', nullable: true, description: 'eventEmitters[]: emisores de eventos', addedIn: 'v0.9.62' },
      { name: 'event_listeners_json', type: 'TEXT', nullable: true, description: 'eventListeners[]: listeners de eventos', addedIn: 'v0.9.62' },
      { name: 'scope_type', type: 'TEXT', nullable: true, description: 'Tipo de scope: local, module, global, closure', addedIn: 'v0.9.62' },

      // Metadata
      { name: '_meta_json', type: 'TEXT', nullable: true, description: 'Metadata de extracción: createdAt, version, source' }
    ],
    indexes: [
      { name: 'idx_atoms_file_path', columns: ['file_path'] },
      { name: 'idx_atoms_type', columns: ['atom_type'] },
      { name: 'idx_atoms_archetype', columns: ['archetype_type'] },
      { name: 'idx_atoms_purpose', columns: ['purpose_type'] },
      { name: 'idx_atoms_exported', columns: ['is_exported'] },
      { name: 'idx_atoms_dead_code', columns: ['is_dead_code'] },
      { name: 'idx_atoms_importance', columns: ['importance_score DESC'] },
      { name: 'idx_atoms_propagation', columns: ['propagation_score DESC'] },
      { name: 'idx_atoms_complexity', columns: ['complexity DESC'] },
      { name: 'idx_atoms_coupling', columns: ['coupling_score DESC'] },
      { name: 'idx_atoms_file_archetype', columns: ['file_path', 'archetype_type'] },
      { name: 'idx_atoms_exported_complexity', columns: ['is_exported', 'complexity DESC'] }
    ]
  },

  files: {
    description: 'Metadatos por archivo',
    columns: [
      { name: 'path', type: 'TEXT', pk: true, description: 'Ruta del archivo' },
      { name: 'last_analyzed', type: 'TEXT', nullable: false, description: 'Último análisis' },
      { name: 'atom_count', type: 'INTEGER', default: 0, description: 'Cantidad de átomos' },
      { name: 'total_complexity', type: 'INTEGER', default: 0, description: 'Complejidad total' },
      { name: 'total_lines', type: 'INTEGER', default: 0, description: 'Líneas totales' },
      { name: 'module_name', type: 'TEXT', nullable: true, description: 'Nombre del módulo' },
      { name: 'imports_json', type: 'TEXT', nullable: true, description: 'Lista de imports' },
      { name: 'exports_json', type: 'TEXT', nullable: true, description: 'Lista de exports' },
      { name: 'hash', type: 'TEXT', nullable: true, description: 'Hash del contenido para análisis incremental', addedIn: 'v2.1' }
    ],
    indexes: [
      { name: 'idx_files_module', columns: ['module_name'] }
    ]
  },

  atom_relations: {
    description: 'Grafo de dependencias entre átomos',
    columns: [
      { name: 'id', type: 'INTEGER', pk: true, autoIncrement: true },
      { name: 'source_id', type: 'TEXT', nullable: false, description: 'Átomo origen' },
      { name: 'target_id', type: 'TEXT', nullable: false, description: 'Átomo destino' },
      { name: 'relation_type', type: 'TEXT', nullable: false, description: 'Tipo: calls, imports, depends, emits' },
      { name: 'weight', type: 'REAL', default: 1.0, description: 'Peso de la relación' },
      { name: 'line_number', type: 'INTEGER', nullable: true, description: 'Línea donde ocurre' },
      { name: 'context_json', type: 'TEXT', nullable: true, description: 'Metadata adicional' },
      { name: 'created_at', type: 'TEXT', nullable: false, description: 'Fecha de creación' }
    ],
    indexes: [
      { name: 'idx_relations_source', columns: ['source_id'] },
      { name: 'idx_relations_target', columns: ['target_id'] },
      { name: 'idx_relations_type', columns: ['relation_type'] }
    ],
    unique: [['source_id', 'target_id', 'relation_type', 'line_number']]
  },

  system_files: {
    description: 'Archivos enriquecidos con system map',
    columns: [
      { name: 'path', type: 'TEXT', pk: true, description: 'Ruta del archivo' },
      { name: 'display_path', type: 'TEXT', nullable: true, description: 'Ruta display' },
      { name: 'culture', type: 'TEXT', nullable: true, description: 'Cultura: citizen, auditor, gatekeeper, etc.' },
      { name: 'culture_role', type: 'TEXT', nullable: true, description: 'Rol de la cultura' },
      { name: 'risk_score', type: 'REAL', default: 0, description: 'Score de riesgo (0-1)' },
      { name: 'semantic_analysis_json', type: 'TEXT', nullable: true, description: 'Análisis semántico' },
      { name: 'semantic_connections_json', type: 'TEXT', nullable: true, description: 'Conexiones semánticas' },
      { name: 'exports_json', type: 'TEXT', nullable: true, description: 'Export symbols' },
      { name: 'imports_json', type: 'TEXT', nullable: true, description: 'Import symbols' },
      { name: 'definitions_json', type: 'TEXT', nullable: true, description: 'Definiciones' },
      { name: 'used_by_json', type: 'TEXT', nullable: true, description: 'Archivos que usan este' },
      { name: 'calls_json', type: 'TEXT', nullable: true, description: 'Llamadas que hace' },
      { name: 'identifier_refs_json', type: 'TEXT', nullable: true, description: 'Referencias a identificadores' },
      { name: 'depends_on_json', type: 'TEXT', nullable: true, description: 'Dependencias directas' },
      { name: 'transitive_depends_json', type: 'TEXT', nullable: true, description: 'Dependencias transitivas' },
      { name: 'transitive_dependents_json', type: 'TEXT', nullable: true, description: 'Dependientes transitivos' },
      { name: 'updated_at', type: 'TEXT', nullable: false, description: 'Fecha de actualización' }
    ],
    indexes: [
      { name: 'idx_system_files_culture', columns: ['culture'] },
      { name: 'idx_system_files_risk', columns: ['risk_score DESC'] }
    ]
  },

  semantic_connections: {
    description: 'Conexiones semánticas (shared state, events, etc.)',
    columns: [
      { name: 'id', type: 'INTEGER', pk: true, autoIncrement: true },
      { name: 'connection_type', type: 'TEXT', nullable: false, description: 'Tipo: sharedState, eventListener, envVar, route' },
      { name: 'source_path', type: 'TEXT', nullable: false, description: 'Archivo origen' },
      { name: 'target_path', type: 'TEXT', nullable: false, description: 'Archivo destino' },
      { name: 'connection_key', type: 'TEXT', nullable: true, description: 'Nombre de variable/evento/env' },
      { name: 'context_json', type: 'TEXT', nullable: true, description: 'Metadata adicional' },
      { name: 'weight', type: 'REAL', default: 1.0, description: 'Peso de la conexión' },
      { name: 'created_at', type: 'TEXT', nullable: false, description: 'Fecha de creación' }
    ],
    indexes: [
      { name: 'idx_semantic_conn_type', columns: ['connection_type'] },
      { name: 'idx_semantic_conn_source', columns: ['source_path'] },
      { name: 'idx_semantic_conn_target', columns: ['target_path'] },
      { name: 'idx_semantic_conn_key', columns: ['connection_key'] }
    ]
  },

  cache_entries: {
    description: 'Cache transitorio en SQLite',
    columns: [
      { name: 'key', type: 'TEXT', pk: true, description: 'Clave de cache' },
      { name: 'value', type: 'TEXT', nullable: false, description: 'Valor' },
      { name: 'expiry', type: 'INTEGER', nullable: true, description: 'Expiración (timestamp)' },
      { name: 'created_at', type: 'TEXT', nullable: false, description: 'Fecha de creación' },
      { name: 'updated_at', type: 'TEXT', nullable: false, description: 'Fecha de actualización' }
    ],
    indexes: [
      { name: 'idx_cache_expiry', columns: ['expiry'] }
    ]
  },

  atom_versions: {
    description: 'Control de versiones de átomos',
    columns: [
      { name: 'atom_id', type: 'TEXT', pk: true, description: 'ID del átomo' },
      { name: 'hash', type: 'TEXT', nullable: false, description: 'Hash completo' },
      { name: 'field_hashes_json', type: 'TEXT', nullable: false, description: 'Hashes por campo' },
      { name: 'last_modified', type: 'INTEGER', nullable: false, description: 'Timestamp' },
      { name: 'file_path', type: 'TEXT', nullable: false, description: 'Ruta del archivo' },
      { name: 'atom_name', type: 'TEXT', nullable: false, description: 'Nombre del átomo' }
    ],
    indexes: [
      { name: 'idx_atom_versions_file', columns: ['file_path'] }
    ]
  },

  atom_events: {
    description: 'Event sourcing para audit trail',
    columns: [
      { name: 'id', type: 'INTEGER', pk: true, autoIncrement: true },
      { name: 'atom_id', type: 'TEXT', nullable: false, description: 'ID del átomo' },
      { name: 'event_type', type: 'TEXT', nullable: false, description: 'Tipo: created, updated, deleted' },
      { name: 'changed_fields', type: 'TEXT', nullable: true, description: 'Campos cambiados' },
      { name: 'before_state', type: 'TEXT', nullable: true, description: 'Estado anterior' },
      { name: 'after_state', type: 'TEXT', nullable: true, description: 'Estado posterior' },
      { name: 'impact_score', type: 'REAL', nullable: true, description: 'Score de impacto' },
      { name: 'timestamp', type: 'TEXT', nullable: false, description: 'Timestamp' },
      { name: 'source', type: 'TEXT', default: 'extractor', description: 'Fuente: extractor, semantic, user' }
    ],
    indexes: [
      { name: 'idx_events_atom', columns: ['atom_id'] },
      { name: 'idx_events_type', columns: ['event_type'] },
      { name: 'idx_events_timestamp', columns: ['timestamp'] }
    ]
  }
};

/**
 * Obtiene todas las tablas registradas
 */
export function getRegisteredTables() {
  return Object.keys(TABLE_DEFINITIONS);
}

/**
 * Obtiene la definición de una tabla
 */
export function getTableDefinition(tableName) {
  return TABLE_DEFINITIONS[tableName];
}

/**
 * Obtiene todas las columnas de una tabla
 */
export function getTableColumns(tableName) {
  const table = TABLE_DEFINITIONS[tableName];
  if (!table) return [];
  return table.columns;
}

/**
 * Obtiene los índices de una tabla
 */
export function getTableIndexes(tableName) {
  const table = TABLE_DEFINITIONS[tableName];
  if (!table) return [];
  return table.indexes || [];
}

/**
 * Verifica si una columna existe en una tabla
 */
export function hasColumn(tableName, columnName) {
  const columns = getTableColumns(tableName);
  return columns.some(col => col.name === columnName);
}

/**
 * Obtiene una columna específica
 */
export function getColumn(tableName, columnName) {
  const columns = getTableColumns(tableName);
  return columns.find(col => col.name === columnName);
}

/**
 * Genera SQL para crear una tabla
 */
export function generateCreateTableSQL(tableName) {
  const table = TABLE_DEFINITIONS[tableName];
  if (!table) throw new Error(`Table ${tableName} not found in registry`);

  const columnDefs = table.columns.map(col => {
    let sql = `${col.name} ${col.type}`;

    if (col.pk) sql += ' PRIMARY KEY';
    if (col.autoIncrement) sql += ' AUTOINCREMENT';
    if (!col.nullable && !col.pk) sql += ' NOT NULL';
    if (col.default !== undefined) sql += ` DEFAULT ${typeof col.default === 'string' ? `'${col.default}'` : col.default}`;

    return sql;
  });

  // Agregar constraints UNIQUE
  if (table.unique) {
    for (const uniqueCols of table.unique) {
      columnDefs.push(`UNIQUE(${uniqueCols.join(', ')})`);
    }
  }

  // Agregar FOREIGN KEYs (Removido para permitir discovery cross-file sin errores de constraint)
  /* if (tableName === 'atom_relations') {
    columnDefs.push('FOREIGN KEY (source_id) REFERENCES atoms(id) ON DELETE CASCADE');
    columnDefs.push('FOREIGN KEY (target_id) REFERENCES atoms(id) ON DELETE CASCADE');
  } */

  return `CREATE TABLE IF NOT EXISTS ${tableName} (\n    ${columnDefs.join(',\n    ')}\n);`;
}

/**
 * Genera SQL para crear índices de una tabla
 */
export function generateCreateIndexesSQL(tableName) {
  const table = TABLE_DEFINITIONS[tableName];
  if (!table || !table.indexes) return [];

  return table.indexes.map(idx => {
    const columns = idx.columns.join(', ');
    return `CREATE INDEX IF NOT EXISTS ${idx.name} ON ${tableName}(${columns});`;
  });
}

/**
 * Detecta columnas faltantes en una tabla
 * @param {Array} existingColumns - Array de {name} desde PRAGMA table_info
 */
export function detectMissingColumns(tableName, existingColumns) {
  const registeredColumns = getTableColumns(tableName);
  const existingNames = new Set(existingColumns.map(col => col.name));

  return registeredColumns.filter(col => !existingNames.has(col.name));
}

/**
 * Genera SQL para agregar columnas faltantes
 */
export function generateAddColumnSQL(tableName, columnName) {
  const column = getColumn(tableName, columnName);
  if (!column) throw new Error(`Column ${columnName} not found in registry`);

  let sql = `ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.type}`;

  if (!column.nullable && column.default !== undefined) {
    sql += ` DEFAULT ${typeof column.default === 'string' ? `'${column.default}'` : column.default}`;
  }

  return sql;
}

/**
 * Obtiene metadata de herramientas que usan una columna
 */
export function getColumnToolUsage(tableName, columnName) {
  const column = getColumn(tableName, columnName);
  if (!column) return [];
  // Por ahora no tenemos usedByTools en columnas, se puede agregar después
  return [];
}

/**
 * Genera reporte de estado del schema
 */
export function generateSchemaReport(existingTablesInfo) {
  const report = {
    tables: {},
    missingColumns: [],
    extraColumns: [],
    totalRegisteredColumns: 0,
    totalExistingColumns: 0
  };

  for (const [tableName, tableDef] of Object.entries(TABLE_DEFINITIONS)) {
    const existingTable = existingTablesInfo.find(t => t.name === tableName);

    if (!existingTable) {
      report.tables[tableName] = {
        status: 'missing',
        registeredColumns: tableDef.columns.length,
        existingColumns: 0
      };
      report.missingColumns.push({
        table: tableName,
        columns: tableDef.columns.map(c => c.name)
      });
    } else {
      const missing = detectMissingColumns(tableName, existingTable.columns);
      const existingNames = new Set(existingTable.columns.map(c => c.name));
      const registeredNames = new Set(tableDef.columns.map(c => c.name));
      const extra = [...existingNames].filter(name => !registeredNames.has(name));

      report.tables[tableName] = {
        status: missing.length === 0 ? 'ok' : 'mismatch',
        registeredColumns: tableDef.columns.length,
        existingColumns: existingTable.columns.length,
        missingColumns: missing.map(c => c.name),
        extraColumns: extra
      };

      if (missing.length > 0) {
        report.missingColumns.push({
          table: tableName,
          columns: missing.map(c => c.name)
        });
      }

      if (extra.length > 0) {
        report.extraColumns.push({
          table: tableName,
          columns: extra
        });
      }
    }

    report.totalRegisteredColumns += tableDef.columns.length;
    report.totalExistingColumns += report.tables[tableName].existingColumns;
  }

  return report;
}

/**
 * Exporta el schema completo como SQL
 */
export function exportSchemaSQL() {
  let sql = '-- OmnySystem SQLite Schema\n';
  sql += `-- Generated from schema-registry.js\n`;
  sql += `-- ${new Date().toISOString()}\n\n`;

  for (const tableName of Object.keys(TABLE_DEFINITIONS)) {
    sql += `-- ${TABLE_DEFINITIONS[tableName].description}\n`;
    sql += generateCreateTableSQL(tableName) + '\n\n';

    const indexes = generateCreateIndexesSQL(tableName);
    if (indexes.length > 0) {
      sql += indexes.join('\n') + '\n\n';
    }
  }

  return sql;
}

export default {
  TABLE_DEFINITIONS,
  getRegisteredTables,
  getTableDefinition,
  getTableColumns,
  getTableIndexes,
  hasColumn,
  getColumn,
  generateCreateTableSQL,
  generateCreateIndexesSQL,
  detectMissingColumns,
  generateAddColumnSQL,
  generateSchemaReport,
  exportSchemaSQL
};
