/**
 * @fileoverview schema-registry-definitions.js
 * 
 * Definiciones de tablas - SINGLE SOURCE OF TRUTH para el schema de la base de datos.
 * Extraído de schema-registry.js para reducir tamaño del archivo principal.
 * 
 * @module storage/database/schema-registry-definitions
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
      { name: 'id', type: 'TEXT', pk: true, nullable: false, description: 'ID único (formato: filePath::name)' },
      { name: 'name', type: 'TEXT', nullable: false, description: 'Nombre del átomo' },
      { name: 'atom_type', type: 'TEXT', nullable: false, description: 'Tipo: function, arrow, method, variable' },
      { name: 'file_path', type: 'TEXT', nullable: false, description: 'Ruta del archivo' },
      { name: 'line_start', type: 'INTEGER', nullable: false, description: 'Línea de inicio' },
      { name: 'line_end', type: 'INTEGER', nullable: false, description: 'Línea de fin' },
      { name: 'lines_of_code', type: 'INTEGER', nullable: false, description: 'Líneas de código' },
      { name: 'complexity', type: 'INTEGER', nullable: false, description: 'Complejidad ciclomática' },
      { name: 'parameter_count', type: 'INTEGER', default: 0, description: 'Cantidad de parámetros' },
      { name: 'is_exported', type: 'BOOLEAN', default: 0, description: 'Es exportado' },
      { name: 'is_async', type: 'BOOLEAN', default: 0, description: 'Es async' },
      { name: 'is_test_callback', type: 'BOOLEAN', default: 0, description: 'Es callback de test' },
      { name: 'test_callback_type', type: 'TEXT', nullable: true, description: 'Tipo de test: describe, it, test' },
      { name: 'has_error_handling', type: 'BOOLEAN', default: 0, description: 'Tiene manejo de errores', addedIn: 'v0.9.30' },
      { name: 'has_network_calls', type: 'BOOLEAN', default: 0, description: 'Tiene llamadas a red', addedIn: 'v0.9.30' },
      { name: 'archetype_type', type: 'TEXT', nullable: true, description: 'Arquetipo del átomo' },
      { name: 'archetype_severity', type: 'INTEGER', nullable: true, description: 'Severidad del arquetipo' },
      { name: 'archetype_confidence', type: 'REAL', nullable: true, description: 'Confianza del arquetipo' },
      { name: 'purpose_type', type: 'TEXT', nullable: true, description: 'Propósito del átomo' },
      { name: 'purpose_confidence', type: 'REAL', nullable: true, description: 'Confianza del propósito' },
      { name: 'is_dead_code', type: 'BOOLEAN', default: 0, description: 'Es código muerto' },
      { name: 'is_removed', type: 'BOOLEAN', default: 0, description: 'Indica si el átomo fue removido', addedIn: 'v0.9.84' },
      { name: 'is_phase2_complete', type: 'BOOLEAN', default: 0, description: 'Si completó el análisis semántico profundo', addedIn: 'v0.9.73' },
      { name: 'is_deprecated', type: 'BOOLEAN', default: 0, description: 'Si el átomo está marcado como obsoleto', addedIn: 'v0.9.87' },
      { name: 'deprecated_reason', type: 'TEXT', nullable: true, description: 'Razón de la deprecación', addedIn: 'v0.9.87' },
      { name: 'importance_score', type: 'REAL', default: 0, description: 'Score de importancia (0-1)' },
      { name: 'coupling_score', type: 'REAL', default: 0, description: 'Score de acoplamiento (0-1)' },
      { name: 'cohesion_score', type: 'REAL', default: 0, description: 'Score de cohesión (0-1)' },
      { name: 'stability_score', type: 'REAL', default: 1, description: 'Score de estabilidad (0-1)' },
      { name: 'propagation_score', type: 'REAL', default: 0, description: 'Score de propagación (0-1)' },
      { name: 'fragility_score', type: 'REAL', default: 0, description: 'Score de fragilidad (0-1)' },
      { name: 'testability_score', type: 'REAL', default: 0, description: 'Score de testabilidad (0-1)' },
      { name: 'in_degree', type: 'INTEGER', default: 0, description: 'Número de callers', addedIn: 'v2.0' },
      { name: 'out_degree', type: 'INTEGER', default: 0, description: 'Número de callees', addedIn: 'v2.0' },
      { name: 'centrality_score', type: 'REAL', default: 0, description: 'Score de centralidad', addedIn: 'v2.0' },
      { name: 'centrality_classification', type: 'TEXT', nullable: true, description: 'Clasificación: HUB, BRIDGE, LEAF', addedIn: 'v2.0' },
      { name: 'risk_level', type: 'TEXT', nullable: true, description: 'Nivel de riesgo', addedIn: 'v2.0' },
      { name: 'risk_prediction', type: 'TEXT', nullable: true, description: 'Predicción de riesgo', addedIn: 'v2.0' },
      { name: 'callers_count', type: 'INTEGER', default: 0, description: 'Cantidad de callers' },
      { name: 'callees_count', type: 'INTEGER', default: 0, description: 'Cantidad de callees' },
      { name: 'dependency_depth', type: 'INTEGER', default: 0, description: 'Profundidad de dependencia' },
      { name: 'external_call_count', type: 'INTEGER', default: 0, description: 'Llamadas externas' },
      { name: 'extracted_at', type: 'TEXT', nullable: false, description: 'Fecha de extracción' },
      { name: 'updated_at', type: 'TEXT', nullable: false, description: 'Fecha de actualización' },
      { name: 'change_frequency', type: 'REAL', default: 0, description: 'Cambios por día' },
      { name: 'age_days', type: 'INTEGER', default: 0, description: 'Edad en días' },
      { name: 'generation', type: 'INTEGER', default: 1, description: 'Generación del átomo' },
      { name: 'signature_json', type: 'TEXT', nullable: true, description: 'Signature: parámetros, return type' },
      { name: 'data_flow_json', type: 'TEXT', nullable: true, description: 'Flujo de datos: inputs, transformations, outputs' },
      { name: 'calls_json', type: 'TEXT', nullable: true, description: 'Lista de llamadas' },
      { name: 'called_by_json', type: 'TEXT', nullable: true, description: 'Lista de funciones que llaman a este átomo', addedIn: 'v0.9.20' },
      { name: 'temporal_json', type: 'TEXT', nullable: true, description: 'Patrones temporales: timers, async, events' },
      { name: 'error_flow_json', type: 'TEXT', nullable: true, description: 'Flujo de errores: throws, catches' },
      { name: 'performance_json', type: 'TEXT', nullable: true, description: 'Métricas de performance' },
      { name: 'dna_json', type: 'TEXT', nullable: true, description: 'DNA fingerprint' },
      { name: 'derived_json', type: 'TEXT', nullable: true, description: 'Scores derivados adicionales' },
      { name: 'imports_json', type: 'TEXT', nullable: true, description: 'Lista de imports que usa este átomo', addedIn: 'v3.0.1' },
      { name: 'exports_json', type: 'TEXT', nullable: true, description: 'Símbolos que exporta', addedIn: 'v3.0.1' },
      { name: 'uses_json', type: 'TEXT', nullable: true, description: 'Átomos que usa directamente', addedIn: 'v3.0.1' },
      { name: 'side_effects_json', type: 'TEXT', nullable: true, description: 'Efectos secundarios detectados', addedIn: 'v3.0.1' },
      { name: 'function_type', type: 'TEXT', nullable: true, description: 'Tipo de función: declaration, arrow, expression, method', addedIn: 'v0.9.20' },
      { name: 'shared_state_json', type: 'TEXT', nullable: true, description: 'sharedStateAccess[]: acceso a estado global', addedIn: 'v0.9.62' },
      { name: 'event_emitters_json', type: 'TEXT', nullable: true, description: 'eventEmitters[]: emisores de eventos', addedIn: 'v0.9.62' },
      { name: 'event_listeners_json', type: 'TEXT', nullable: true, description: 'eventListeners[]: listeners de eventos', addedIn: 'v0.9.62' },
      { name: 'scope_type', type: 'TEXT', nullable: true, description: 'Tipo de scope: local, module, global, closure', addedIn: 'v0.9.62' },
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
      { name: 'idx_atoms_exported_complexity', columns: ['is_exported', 'complexity DESC'] },
      { name: 'idx_atoms_phase2', columns: ['is_phase2_complete'] }
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
      { name: 'is_removed', type: 'BOOLEAN', default: 0, description: 'Indica si el archivo fue removido', addedIn: 'v3.0.1' },
      { name: 'hash', type: 'TEXT', nullable: true, description: 'Hash del contenido', addedIn: 'v2.1' },
      { name: 'updated_at', type: 'TEXT', nullable: false, default: '1970-01-01 00:00:00', description: 'Fecha de actualización', addedIn: 'v3.0.1' }
    ],
    indexes: [{ name: 'idx_files_module', columns: ['module_name'] }]
  },

  atom_relations: {
    description: 'Grafo de dependencias entre átomos',
    columns: [
      { name: 'id', type: 'INTEGER', pk: true, autoIncrement: true },
      { name: 'source_id', type: 'TEXT', nullable: false, description: 'Átomo origen' },
      { name: 'target_id', type: 'TEXT', nullable: false, description: 'Átomo destino' },
      { name: 'relation_type', type: 'TEXT', nullable: false, description: 'Tipo: calls, imports, depends, emits, shares_state' },
      { name: 'weight', type: 'REAL', default: 1.0, description: 'Peso de la relación' },
      { name: 'line_number', type: 'INTEGER', nullable: true, description: 'Línea donde ocurre' },
      { name: 'context_json', type: 'TEXT', nullable: true, description: 'Metadata adicional' },
      { name: 'is_removed', type: 'BOOLEAN', default: 0, description: 'Indica si la relación fue removida', addedIn: 'v3.0.1' },
      { name: 'created_at', type: 'TEXT', nullable: false, description: 'Fecha de creación' },
      { name: 'updated_at', type: 'TEXT', nullable: false, default: '1970-01-01 00:00:00', description: 'Fecha de actualización', addedIn: 'v3.0.1' },
      { name: 'lifecycle_status', type: 'TEXT', default: 'active', description: 'Estado: active, removed, archived', addedIn: 'v3.0.1' }
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
      { name: 'is_removed', type: 'BOOLEAN', default: 0, description: 'Indica si el análisis fue removido', addedIn: 'v3.0.1' },
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
      { name: 'is_removed', type: 'BOOLEAN', default: 0, description: 'Indica si la conexión fue removida', addedIn: 'v3.0.1' },
      { name: 'created_at', type: 'TEXT', nullable: false, description: 'Fecha de creación' },
      { name: 'updated_at', type: 'TEXT', nullable: false, default: '1970-01-01 00:00:00', description: 'Fecha de actualización', addedIn: 'v3.0.1' },
      { name: 'lifecycle_status', type: 'TEXT', default: 'active', description: 'Estado: active, removed, archived', addedIn: 'v3.0.1' }
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
    indexes: [{ name: 'idx_cache_expiry', columns: ['expiry'] }]
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
    indexes: [{ name: 'idx_atom_versions_file', columns: ['file_path'] }]
  },

  file_hashes: {
    description: 'Hashes persistidos para detección incremental de cambios',
    addedIn: 'v3.0.1',
    columns: [
      { name: 'file_path', type: 'TEXT', pk: true, nullable: false, description: 'Ruta normalizada del archivo' },
      { name: 'content_hash', type: 'TEXT', nullable: false, description: 'Hash SHA-256 del contenido' },
      { name: 'last_updated', type: 'INTEGER', nullable: false, description: 'Timestamp de última actualización' }
    ],
    indexes: [{ name: 'idx_file_hashes_path', columns: ['file_path'] }]
  },

  modules: {
    description: 'Metadatos por módulo (agrupación de archivos)',
    columns: [
      { name: 'id', type: 'INTEGER', pk: true, autoIncrement: true, description: 'ID autoincremental', addedIn: 'v2.1-registry' },
      { name: 'name', type: 'TEXT', nullable: false, description: 'Nombre del módulo' },
      { name: 'path', type: 'TEXT', nullable: false, description: 'Ruta del módulo' },
      { name: 'type', type: 'TEXT', nullable: true, description: 'Tipo de módulo' },
      { name: 'file_count', type: 'INTEGER', default: 0, description: 'Cantidad de archivos' },
      { name: 'atom_count', type: 'INTEGER', default: 0, description: 'Cantidad de átomos' },
      { name: 'entry_points', type: 'TEXT', nullable: true, description: 'JSON array de puntos de entrada', addedIn: 'v2.1-registry' },
      { name: 'total_complexity', type: 'INTEGER', default: 0, description: 'Complejidad total', addedIn: 'v2.1-registry' },
      { name: 'complexity_score', type: 'REAL', default: 0, description: 'Complejidad agregada' },
      { name: 'cohesion_score', type: 'REAL', default: 0, description: 'Cohesión del módulo (0-1)' },
      { name: 'coupling_score', type: 'REAL', default: 0, description: 'Acoplamiento del módulo (0-1)' },
      { name: 'risk_score', type: 'REAL', default: 0, description: 'Score de riesgo (0-1)' },
      { name: 'metadata_json', type: 'TEXT', nullable: true, description: 'Metadata adicional' },
      { name: 'is_removed', type: 'BOOLEAN', default: 0, description: 'Indica si el módulo fue removido', addedIn: 'v3.0.1' },
      { name: 'updated_at', type: 'TEXT', nullable: false, default: '1970-01-01 00:00:00', description: 'Fecha de actualización', addedIn: 'v3.0.1' }
    ],
    indexes: [{ name: 'idx_modules_path', columns: ['path'] }]
  },

  file_dependencies: {
    description: 'Grafo de dependencias entre archivos',
    columns: [
      { name: 'id', type: 'INTEGER', pk: true, autoIncrement: true },
      { name: 'source_path', type: 'TEXT', nullable: false, description: 'Archivo origen' },
      { name: 'target_path', type: 'TEXT', nullable: false, description: 'Archivo destino' },
      { name: 'dependency_type', type: 'TEXT', nullable: false, description: 'Tipo: local, npm, builtin, alias' },
      { name: 'symbols_json', type: 'TEXT', nullable: true, description: 'Símbolos importados' },
      { name: 'reason', type: 'TEXT', nullable: true, description: 'Razón de la dependencia' },
      { name: 'is_dynamic', type: 'BOOLEAN', default: 0, description: '¿Import dinámico?' },
      { name: 'is_removed', type: 'BOOLEAN', default: 0, description: 'Indica si la dependencia fue removida', addedIn: 'v3.0.1' },
      { name: 'created_at', type: 'TEXT', nullable: false, description: 'Fecha de creación' },
      { name: 'updated_at', type: 'TEXT', nullable: false, default: '1970-01-01 00:00:00', description: 'Fecha de actualización', addedIn: 'v3.0.1' }
    ],
    indexes: [
      { name: 'idx_file_deps_source', columns: ['source_path'] },
      { name: 'idx_file_deps_target', columns: ['target_path'] },
      { name: 'idx_file_deps_type', columns: ['dependency_type'] }
    ],
    unique: [['source_path', 'target_path', 'dependency_type']]
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
  },

  societies: {
    description: 'Agrupaciones semánticas de moléculas (Pueblos de Átomos)',
    columns: [
      { name: 'id', type: 'TEXT', pk: true, nullable: false, description: 'ID de la sociedad' },
      { name: 'name', type: 'TEXT', nullable: false, description: 'Nombre legible del pueblo' },
      { name: 'type', type: 'TEXT', nullable: false, description: 'Tipo: cultural, functional, semantic' },
      { name: 'cohesion_score', type: 'REAL', default: 0, description: 'Cohesión interna (0-1)' },
      { name: 'entropy_score', type: 'REAL', default: 1, description: 'Entropía (desorden) (0-1)' },
      { name: 'molecule_count', type: 'INTEGER', default: 0, description: 'Cantidad de archivos' },
      { name: 'metadata_json', type: 'TEXT', nullable: true, description: 'Metadatos adicionales' },
      { name: 'created_at', type: 'TEXT', nullable: false, description: 'Fecha de fundación' },
      { name: 'updated_at', type: 'TEXT', nullable: false, description: 'Última actualización' }
    ],
    indexes: [
      { name: 'idx_societies_type', columns: ['type'] },
      { name: 'idx_societies_cohesion', columns: ['cohesion_score DESC'] }
    ]
  },

  risk_assessments: {
    description: 'Risk assessment por archivo',
    addedIn: 'v2.1-registry',
    columns: [
      { name: 'id', type: 'INTEGER', pk: true, autoIncrement: true },
      { name: 'file_path', type: 'TEXT', nullable: false, description: 'Ruta del archivo evaluado' },
      { name: 'risk_score', type: 'REAL', nullable: true, description: 'Score de riesgo (0-1)' },
      { name: 'risk_level', type: 'TEXT', nullable: true, description: 'Nivel: critical, high, medium, low' },
      { name: 'factors_json', type: 'TEXT', nullable: true, description: 'Factores de riesgo detallados' },
      { name: 'shared_state_count', type: 'INTEGER', nullable: true, description: 'Accesos a estado compartido' },
      { name: 'external_deps_count', type: 'INTEGER', nullable: true, description: 'Dependencias externas' },
      { name: 'complexity_score', type: 'REAL', nullable: true, description: 'Score de complejidad' },
      { name: 'propagation_score', type: 'REAL', nullable: true, description: 'Score de propagación' },
      { name: 'is_removed', type: 'BOOLEAN', default: 0, description: 'Indica si fue removida', addedIn: 'v3.0.1' },
      { name: 'assessed_at', type: 'TEXT', nullable: false, description: 'Timestamp de evaluación' },
      { name: 'updated_at', type: 'TEXT', nullable: false, default: '1970-01-01 00:00:00', description: 'Fecha de actualización', addedIn: 'v3.0.1' },
      { name: 'lifecycle_status', type: 'TEXT', default: 'active', description: 'Estado: active, removed, archived', addedIn: 'v3.0.1' }
    ],
    indexes: [
      { name: 'idx_risk_level', columns: ['risk_level'] },
      { name: 'idx_risk_score', columns: ['risk_score DESC'] },
      { name: 'idx_risk_file', columns: ['file_path'] }
    ]
  },

  semantic_issues: {
    description: 'Issues semánticos detectados por archivo',
    addedIn: 'v2.1-registry',
    columns: [
      { name: 'id', type: 'INTEGER', pk: true, autoIncrement: true },
      { name: 'file_path', type: 'TEXT', nullable: false, description: 'Ruta del archivo' },
      { name: 'issue_type', type: 'TEXT', nullable: false, description: 'Tipo: dead_code, circular_dep, god_function' },
      { name: 'severity', type: 'TEXT', nullable: false, description: 'Severidad: critical, high, medium, low' },
      { name: 'message', type: 'TEXT', nullable: false, description: 'Descripción del issue' },
      { name: 'line_number', type: 'INTEGER', nullable: true, description: 'Línea donde ocurre' },
      { name: 'context_json', type: 'TEXT', nullable: true, description: 'Contexto adicional' },
      { name: 'lifecycle_status', type: 'TEXT', default: 'active', description: 'Estado: active, expired, superseded', addedIn: 'v3.0.1' },
      { name: 'is_removed', type: 'BOOLEAN', default: 0, description: 'Indica si fue removido', addedIn: 'v3.0.1' },
      { name: 'detected_at', type: 'TEXT', nullable: false, description: 'Timestamp de detección' },
      { name: 'updated_at', type: 'TEXT', nullable: false, default: '1970-01-01 00:00:00', description: 'Fecha de actualización', addedIn: 'v3.0.1' }
    ],
    indexes: [
      { name: 'idx_semantic_issues_file', columns: ['file_path'] },
      { name: 'idx_semantic_issues_type', columns: ['issue_type'] },
      { name: 'idx_semantic_issues_severity', columns: ['severity'] }
    ]
  },

  system_metadata: {
    description: 'Metadata global del sistema (key-value store)',
    addedIn: 'v2.1-registry',
    columns: [
      { name: 'key', type: 'TEXT', pk: true, description: 'Clave de metadata' },
      { name: 'value', type: 'TEXT', nullable: false, description: 'Valor (puede ser JSON)' },
      { name: 'updated_at', type: 'TEXT', nullable: false, description: 'Timestamp de última actualización' }
    ],
    indexes: []
  },

  mcp_sessions: {
    description: 'Sesiones de MCP persistentes',
    addedIn: 'v3.0.0-sessions',
    columns: [
      { name: 'id', type: 'TEXT', pk: true, nullable: false, description: 'ID de la sesión (UUID)' },
      { name: 'client_id', type: 'TEXT', nullable: true, description: 'Identificador del cliente', addedIn: 'v3.0.1-dedup' },
      { name: 'client_info_json', type: 'TEXT', nullable: true, description: 'Información del cliente' },
      { name: 'session_metadata_json', type: 'TEXT', nullable: true, description: 'Metadata de la sesión' },
      { name: 'created_at', type: 'TEXT', nullable: false, description: 'Fecha de creación' },
      { name: 'updated_at', type: 'TEXT', nullable: false, description: 'Fecha de última actividad' },
      { name: 'is_active', type: 'BOOLEAN', default: 1, description: 'Estado de la sesión' }
    ],
    indexes: [
      { name: 'idx_mcp_sessions_updated', columns: ['updated_at'] },
      { name: 'idx_mcp_sessions_active', columns: ['is_active'] }
    ]
  },

  mcp_tool_runs: {
    description: 'Historial de ejecuciones de tools MCP',
    addedIn: 'v3.1-metrics',
    columns: [
      { name: 'id', type: 'INTEGER', pk: true, autoIncrement: true },
      { name: 'project_path', type: 'TEXT', nullable: false, description: 'Proyecto' },
      { name: 'tool_name', type: 'TEXT', nullable: false, description: 'Nombre de la tool' },
      { name: 'scope_path', type: 'TEXT', nullable: true, description: 'Scope contextual' },
      { name: 'focus_path', type: 'TEXT', nullable: true, description: 'Focus contextual' },
      { name: 'capture_source', type: 'TEXT', nullable: true, description: 'Origen: mcp.tool' },
      { name: 'started_at', type: 'TEXT', nullable: false, description: 'Timestamp de inicio' },
      { name: 'ended_at', type: 'TEXT', nullable: false, description: 'Timestamp de fin' },
      { name: 'duration_ms', type: 'REAL', default: 0, description: 'Duración total' },
      { name: 'success', type: 'BOOLEAN', default: 0, description: 'Si terminó sin error' },
      { name: 'error_message', type: 'TEXT', nullable: true, description: 'Error principal' },
      { name: 'before_watcher_alert_count', type: 'INTEGER', default: 0, description: 'Alertas antes' },
      { name: 'after_watcher_alert_count', type: 'INTEGER', default: 0, description: 'Alertas después' },
      { name: 'before_recent_warning_count', type: 'INTEGER', default: 0, description: 'Warnings antes' },
      { name: 'after_recent_warning_count', type: 'INTEGER', default: 0, description: 'Warnings después' },
      { name: 'before_recent_error_count', type: 'INTEGER', default: 0, description: 'Errores antes' },
      { name: 'after_recent_error_count', type: 'INTEGER', default: 0, description: 'Errores después' },
      { name: 'alert_clearance', type: 'INTEGER', default: 0, description: 'Delta alertas resueltas' },
      { name: 'error_clearance', type: 'INTEGER', default: 0, description: 'Delta errores resueltos' },
      { name: 'warning_clearance', type: 'INTEGER', default: 0, description: 'Delta warnings resueltos' },
      { name: 'repair_status', type: 'TEXT', nullable: true, description: 'Estado: repaired, stable, thrashing, failed' },
      { name: 'repair_score', type: 'REAL', default: 0, description: 'Score de reparación' },
      { name: 'before_snapshot_json', type: 'TEXT', nullable: true, description: 'Snapshot previo' },
      { name: 'after_snapshot_json', type: 'TEXT', nullable: true, description: 'Snapshot posterior' },
      { name: 'before_notifications_json', type: 'TEXT', nullable: true, description: 'Notificaciones previas' },
      { name: 'after_notifications_json', type: 'TEXT', nullable: true, description: 'Notificaciones posteriores' },
      { name: 'delta_json', type: 'TEXT', nullable: true, description: 'Deltas entre snapshots' },
      { name: 'snapshot_fingerprint', type: 'TEXT', nullable: false, description: 'Fingerprint del run' },
      { name: 'args_json', type: 'TEXT', nullable: true, description: 'Args de la tool' }
    ],
    indexes: [
      { name: 'idx_mcp_tool_runs_project_time', columns: ['project_path', 'started_at DESC'] },
      { name: 'idx_mcp_tool_runs_tool_time', columns: ['project_path', 'tool_name', 'ended_at DESC'] },
      { name: 'idx_mcp_tool_runs_scope', columns: ['project_path', 'scope_path', 'focus_path'] },
      { name: 'idx_mcp_tool_runs_fingerprint', columns: ['snapshot_fingerprint'] }
    ]
  },

  compiler_scanned_files: {
    description: 'Registro de archivos escaneados por el compilador',
    addedIn: 'v0.9.110',
    columns: [
      { name: 'path', type: 'TEXT', pk: true, nullable: false, description: 'Ruta del archivo' },
      { name: 'first_seen', type: 'TEXT', nullable: false, description: 'First seen timestamp' },
      { name: 'last_seen', type: 'TEXT', nullable: false, description: 'Last seen timestamp' }
    ],
    indexes: [{ name: 'idx_compiler_scanned_files_path', columns: ['path'] }]
  },

  compiler_metrics_snapshots: {
    description: 'Historial de snapshots de métricas del compilador',
    addedIn: 'v3.1-metrics',
    columns: [
      { name: 'id', type: 'INTEGER', pk: true, autoIncrement: true },
      { name: 'project_path', type: 'TEXT', nullable: false, description: 'Proyecto' },
      { name: 'snapshot_kind', type: 'TEXT', nullable: false, description: 'Tipo: status, manual, dashboard, debt, folderization' },
      { name: 'scope_path', type: 'TEXT', nullable: true, description: 'Scope consultado' },
      { name: 'focus_path', type: 'TEXT', nullable: true, description: 'Focus consultado' },
      { name: 'capture_source', type: 'TEXT', nullable: true, description: 'Origen: status.runtime, mcp.tool, dashboard' },
      { name: 'analysis_generation_id', type: 'TEXT', nullable: true, description: 'ID de generación de análisis' },
      { name: 'captured_at', type: 'TEXT', nullable: false, description: 'Timestamp de captura' },
      { name: 'health_score', type: 'REAL', default: 0, description: 'Score de salud' },
      { name: 'health_grade', type: 'TEXT', nullable: true, description: 'Grade de salud' },
      { name: 'issue_count', type: 'INTEGER', default: 0, description: 'Issues visibles' },
      { name: 'structural_groups', type: 'INTEGER', default: 0, description: 'Grupos de duplicados estructurales' },
      { name: 'conceptual_groups', type: 'INTEGER', default: 0, description: 'Grupos conceptuales accionables' },
      { name: 'conceptual_raw_groups', type: 'INTEGER', default: 0, description: 'Grupos conceptuales crudos' },
      { name: 'pipeline_orphans', type: 'INTEGER', default: 0, description: 'Orphaned pipeline atoms' },
      { name: 'folderization_candidate_count', type: 'INTEGER', default: 0, description: 'Candidatos de folderización' },
      { name: 'flat_families', type: 'INTEGER', default: 0, description: 'Familias planas' },
      { name: 'mixed_families', type: 'INTEGER', default: 0, description: 'Familias mixtas' },
      { name: 'already_folderized_families', type: 'INTEGER', default: 0, description: 'Familias ya folderizadas' },
      { name: 'naming_families', type: 'INTEGER', default: 0, description: 'Familias con deuda de nombres' },
      { name: 'naming_targets', type: 'INTEGER', default: 0, description: 'Targets de rename' },
      { name: 'naming_debt', type: 'INTEGER', default: 0, description: 'Deuda de nombres' },
      { name: 'active_atoms', type: 'INTEGER', default: 0, description: 'Atoms activos' },
      { name: 'live_coverage_ratio', type: 'REAL', default: 0, description: 'Cobertura live' },
      { name: 'zero_atom_file_count', type: 'INTEGER', default: 0, description: 'Archivos sin átomos' },
      { name: 'call_links', type: 'INTEGER', default: 0, description: 'Links del call graph' },
      { name: 'semantic_links', type: 'INTEGER', default: 0, description: 'Links semánticos' },
      { name: 'watcher_alert_count', type: 'INTEGER', default: 0, description: 'Alertas del watcher' },
      { name: 'recent_warning_count', type: 'INTEGER', default: 0, description: 'Warnings recientes' },
      { name: 'recent_error_count', type: 'INTEGER', default: 0, description: 'Errores recientes' },
      { name: 'phase2_pending_files', type: 'INTEGER', default: 0, description: 'Archivos pendientes Phase 2' },
      { name: 'drift_state', type: 'TEXT', nullable: true, description: 'Estado de drift/estabilidad' },
      { name: 'drift_score', type: 'REAL', default: 0, description: 'Score de drift' },
      { name: 'stability_score', type: 'REAL', default: 0, description: 'Score de estabilidad' },
      { name: 'success_score', type: 'REAL', default: 0, description: 'Score de éxito/MVP' },
      { name: 'success_threshold', type: 'REAL', default: 0, description: 'Umbral de éxito' },
      { name: 'mvp_ready', type: 'INTEGER', default: 0, description: 'Indicador de readiness MVP' },
      { name: 'behavior_state', type: 'TEXT', nullable: true, description: 'Estado conductual' },
      { name: 'readiness_reason', type: 'TEXT', nullable: true, description: 'Razón de readiness' },
      { name: 'snapshot_fingerprint', type: 'TEXT', nullable: false, description: 'Fingerprint del snapshot' },
      { name: 'summary_text', type: 'TEXT', nullable: true, description: 'Resumen legible' },
      { name: 'payload_json', type: 'TEXT', nullable: true, description: 'Payload completo' },
      { name: 'trend_json', type: 'TEXT', nullable: true, description: 'Tendencia y velocidad' }
    ],
    indexes: [
      { name: 'idx_compiler_metrics_snapshots_project_kind_time', columns: ['project_path', 'snapshot_kind', 'captured_at DESC'] },
      { name: 'idx_compiler_metrics_snapshots_scope', columns: ['project_path', 'scope_path', 'focus_path'] },
      { name: 'idx_compiler_metrics_snapshots_fingerprint', columns: ['snapshot_fingerprint'] }
    ]
  }
};

export default { TABLE_DEFINITIONS };