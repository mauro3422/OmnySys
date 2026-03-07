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
      { name: 'is_removed', type: 'BOOLEAN', default: 0, description: 'Indica si el átomo fue removido', addedIn: 'v0.9.84' },
      { name: 'is_phase2_complete', type: 'BOOLEAN', default: 0, description: 'Si completó el análisis semántico profundo (Lazy Indexing)', addedIn: 'v0.9.73' },
      { name: 'is_deprecated', type: 'BOOLEAN', default: 0, description: 'Si el átomo está marcado como obsoleto (@deprecated)', addedIn: 'v0.9.87' },
      { name: 'deprecated_reason', type: 'TEXT', nullable: true, description: 'Razón de la deprecación o alternativa sugerida', addedIn: 'v0.9.87' },

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
      { name: 'imports_json', type: 'TEXT', nullable: true, description: 'Lista de imports que usa este átomo', addedIn: 'v3.0.1' },
      { name: 'exports_json', type: 'TEXT', nullable: true, description: 'Símbolos que exporta (si es clase/módulo)', addedIn: 'v3.0.1' },
      { name: 'uses_json', type: 'TEXT', nullable: true, description: 'Átomos que usa directamente', addedIn: 'v3.0.1' },
      { name: 'side_effects_json', type: 'TEXT', nullable: true, description: 'Efectos secundarios detectados', addedIn: 'v3.0.1' },

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
      { name: 'is_removed', type: 'BOOLEAN', default: 0, description: 'Indica si el archivo fue removido o excluido', addedIn: 'v3.0.1' },
      { name: 'hash', type: 'TEXT', nullable: true, description: 'Hash del contenido para análisis incremental', addedIn: 'v2.1' },
      { name: 'updated_at', type: 'TEXT', nullable: false, default: '1970-01-01 00:00:00', description: 'Fecha de actualización', addedIn: 'v3.0.1' }
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

  modules: {
    description: 'Metadatos por módulo (agrupación de archivos)',
    columns: [
      { name: 'id', type: 'INTEGER', pk: true, autoIncrement: true, description: 'ID autoincremental', addedIn: 'v2.1-registry' },
      { name: 'name', type: 'TEXT', nullable: false, description: 'Nombre del módulo' },
      { name: 'path', type: 'TEXT', nullable: false, description: 'Ruta del módulo' },
      { name: 'type', type: 'TEXT', nullable: true, description: 'Tipo de módulo (ej: library, feature, component)' },
      { name: 'file_count', type: 'INTEGER', default: 0, description: 'Cantidad de archivos en el módulo' },
      { name: 'atom_count', type: 'INTEGER', default: 0, description: 'Cantidad de átomos en el módulo' },
      { name: 'entry_points', type: 'TEXT', nullable: true, description: 'JSON array de puntos de entrada', addedIn: 'v2.1-registry' },
      { name: 'total_complexity', type: 'INTEGER', default: 0, description: 'Complejidad total histórica', addedIn: 'v2.1-registry' },
      { name: 'complexity_score', type: 'REAL', default: 0, description: 'Complejidad agregada del módulo' },
      { name: 'cohesion_score', type: 'REAL', default: 0, description: 'Cohesión del módulo (0-1)' },
      { name: 'coupling_score', type: 'REAL', default: 0, description: 'Acoplamiento del módulo (0-1)' },
      { name: 'risk_score', type: 'REAL', default: 0, description: 'Score de riesgo agregado (0-1)' },
      { name: 'metadata_json', type: 'TEXT', nullable: true, description: 'Metadata adicional del módulo' },
      { name: 'is_removed', type: 'BOOLEAN', default: 0, description: 'Indica si el módulo fue removido', addedIn: 'v3.0.1' },
      { name: 'updated_at', type: 'TEXT', nullable: false, default: '1970-01-01 00:00:00', description: 'Fecha de actualización', addedIn: 'v3.0.1' }
    ],
    indexes: [
      { name: 'idx_modules_path', columns: ['path'] }
    ]
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
      { name: 'id', type: 'TEXT', pk: true, nullable: false, description: 'ID de la sociedad (ej: module-path or semantic-id)' },
      { name: 'name', type: 'TEXT', nullable: false, description: 'Nombre legible del pueblo' },
      { name: 'type', type: 'TEXT', nullable: false, description: 'Tipo: cultural, functional, semantic' },
      { name: 'cohesion_score', type: 'REAL', default: 0, description: 'Cohesión interna (0-1)' },
      { name: 'entropy_score', type: 'REAL', default: 1, description: 'Entropía (desorden) (0-1)' },
      { name: 'molecule_count', type: 'INTEGER', default: 0, description: 'Cantidad de archivos en la sociedad' },
      { name: 'metadata_json', type: 'TEXT', nullable: true, description: 'Metadatos adicionales: roles, vecindarios, tags' },
      { name: 'created_at', type: 'TEXT', nullable: false, description: 'Fecha de fundación' },
      { name: 'updated_at', type: 'TEXT', nullable: false, description: 'Última actualización' }
    ],
    indexes: [
      { name: 'idx_societies_type', columns: ['type'] },
      { name: 'idx_societies_cohesion', columns: ['cohesion_score DESC'] }
    ]
  },

  // ── Tables that exist in DB but were previously unregistered ─────────────────

  risk_assessments: {
    description: 'Risk assessment por archivo: nivel, factores, scores (escrito por risk-handler.js)',
    addedIn: 'v2.1-registry',
    columns: [
      { name: 'id', type: 'INTEGER', pk: true, autoIncrement: true },
      { name: 'file_path', type: 'TEXT', nullable: false, description: 'Ruta del archivo evaluado' },
      { name: 'risk_score', type: 'REAL', nullable: true, description: 'Score de riesgo agregado (0-1)' },
      { name: 'risk_level', type: 'TEXT', nullable: true, description: 'Nivel: critical, high, medium, low' },
      { name: 'factors_json', type: 'TEXT', nullable: true, description: 'Factores de riesgo detallados' },
      { name: 'shared_state_count', type: 'INTEGER', nullable: true, description: 'Cantidad de accesos a estado compartido' },
      { name: 'external_deps_count', type: 'INTEGER', nullable: true, description: 'Cantidad de dependencias externas' },
      { name: 'complexity_score', type: 'REAL', nullable: true, description: 'Score de complejidad ciclomática agregada' },
      { name: 'propagation_score', type: 'REAL', nullable: true, description: 'Score de propagación de riesgo' },
      { name: 'is_removed', type: 'BOOLEAN', default: 0, description: 'Indica si la evaluación fue removida', addedIn: 'v3.0.1' },
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
    description: 'Issues semánticos detectados por archivo (escrito por semantic-handler.js y orchestrator/issues.js)',
    addedIn: 'v2.1-registry',
    columns: [
      { name: 'id', type: 'INTEGER', pk: true, autoIncrement: true },
      { name: 'file_path', type: 'TEXT', nullable: false, description: 'Ruta del archivo con el issue' },
      { name: 'issue_type', type: 'TEXT', nullable: false, description: 'Tipo: dead_code, circular_dep, god_function, etc.' },
      { name: 'severity', type: 'TEXT', nullable: false, description: 'Severidad: critical, high, medium, low' },
      { name: 'message', type: 'TEXT', nullable: false, description: 'Descripción del issue' },
      { name: 'line_number', type: 'INTEGER', nullable: true, description: 'Línea donde ocurre' },
      { name: 'context_json', type: 'TEXT', nullable: true, description: 'Contexto adicional del issue' },
      { name: 'lifecycle_status', type: 'TEXT', default: 'active', description: 'Estado: active, expired, superseded', addedIn: 'v3.0.1' },
      { name: 'is_removed', type: 'BOOLEAN', default: 0, description: 'Indica si el issue fue removido', addedIn: 'v3.0.1' },
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
    description: 'Metadata global del sistema: versión schema, totales, configuración (key-value store)',
    addedIn: 'v2.1-registry',
    columns: [
      { name: 'key', type: 'TEXT', pk: true, description: 'Clave de metadata (ej: schema_version, core_metadata, cache_sqlite_enabled)' },
      { name: 'value', type: 'TEXT', nullable: false, description: 'Valor (puede ser JSON)' },
      { name: 'updated_at', type: 'TEXT', nullable: false, description: 'Timestamp de última actualización' }
    ],
    indexes: []
  },

  mcp_sessions: {
    description: 'Sesiones de MCP persistentes para soportar reinicios del servidor',
    addedIn: 'v3.0.0-sessions',
    columns: [
      { name: 'id', type: 'TEXT', pk: true, nullable: false, description: 'ID de la sesión (UUID)' },
      { name: 'client_id', type: 'TEXT', nullable: true, description: 'Identificador del cliente (ej: Kimi, Cline)', addedIn: 'v3.0.1-dedup' },
      { name: 'client_info_json', type: 'TEXT', nullable: true, description: 'Información del cliente (nombre, versión)' },
      { name: 'session_metadata_json', type: 'TEXT', nullable: true, description: 'Metadata adicional de la sesión' },
      { name: 'created_at', type: 'TEXT', nullable: false, description: 'Fecha de creación' },
      { name: 'updated_at', type: 'TEXT', nullable: false, description: 'Fecha de última actividad' },
      { name: 'is_active', type: 'BOOLEAN', default: 1, description: 'Estado de la sesión' }
    ],
    indexes: [
      { name: 'idx_mcp_sessions_updated', columns: ['updated_at'] },
      { name: 'idx_mcp_sessions_active', columns: ['is_active'] },
      { name: 'idx_mcp_sessions_client', columns: ['client_id'] }
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
 * Genera la definición SQL de una columna
 */
function _getColumnDefinitionSQL(col, options = {}) {
  let sql = `${col.name} ${col.type}`;

  if (col.pk) sql += ' PRIMARY KEY';
  if (col.autoIncrement) sql += ' AUTOINCREMENT';
  if (!col.nullable && !col.pk && !options.isAlter) sql += ' NOT NULL';

  if (col.default !== undefined) {
    const defaultVal = typeof col.default === 'string' ? `'${col.default}'` : col.default;
    sql += ` DEFAULT ${defaultVal}`;
  }

  return sql;
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

  const columnDefs = table.columns.map(col => _getColumnDefinitionSQL(col));

  if (table.unique) {
    table.unique.forEach(uniqueCols => {
      columnDefs.push(`UNIQUE(${uniqueCols.join(', ')})`);
    });
  }

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

  return `ALTER TABLE ${tableName} ADD COLUMN ${_getColumnDefinitionSQL(column, { isAlter: true })}`;
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

  Object.entries(TABLE_DEFINITIONS).forEach(([tableName, tableDef]) => {
    const existingTable = existingTablesInfo.find(t => t.name === tableName);
    const registeredColumns = tableDef.columns;

    if (!existingTable) {
      report.tables[tableName] = {
        status: 'missing',
        registeredColumns: registeredColumns.length,
        existingColumns: 0
      };
      report.missingColumns.push({ table: tableName, columns: registeredColumns.map(c => c.name) });
    } else {
      const existingNames = new Set(existingTable.columns.map(c => c.name));
      const registeredNames = new Set(registeredColumns.map(c => c.name));

      const missing = registeredColumns.filter(col => !existingNames.has(col.name)).map(c => c.name);
      const extra = [...existingNames].filter(name => !registeredNames.has(name));

      report.tables[tableName] = {
        status: missing.length === 0 ? 'ok' : 'mismatch',
        registeredColumns: registeredColumns.length,
        existingColumns: existingTable.columns.length,
        missingColumns: missing,
        extraColumns: extra
      };

      if (missing.length > 0) report.missingColumns.push({ table: tableName, columns: missing });
      if (extra.length > 0) report.extraColumns.push({ table: tableName, columns: extra });
    }

    report.totalRegisteredColumns += registeredColumns.length;
    report.totalExistingColumns += report.tables[tableName].existingColumns;
  });

  return report;
}

/**
 * Exporta el schema completo como SQL
 */
export function exportSchemaSQL() {
  const header = [
    '-- OmnySystem SQLite Schema',
    `-- Generated from schema-registry.js`,
    `-- ${new Date().toISOString()}\n`
  ].join('\n');

  const body = Object.keys(TABLE_DEFINITIONS).map(tableName => {
    const tableSql = generateCreateTableSQL(tableName);
    const indexesSql = generateCreateIndexesSQL(tableName).join('\n');
    const description = `-- ${TABLE_DEFINITIONS[tableName].description}`;

    return [description, tableSql, indexesSql].filter(Boolean).join('\n');
  }).join('\n\n');

  return header + body;
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
