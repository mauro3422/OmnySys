-- OmnySystem SQLite Schema v2.0
-- Schema enriquecido con vectores matematicos para Semantic Algebra

-- Habilitar WAL mode para mejor performance concurrente
PRAGMA journal_mode = WAL;
-- PRAGMA foreign_keys = ON; (Removido para analisis incremental)

-- Tabla principal: Atomos con vectores matematicos
CREATE TABLE IF NOT EXISTS atoms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    atom_type TEXT NOT NULL,              -- 'function', 'arrow', 'method', 'variable'
    file_path TEXT NOT NULL,
    
    -- Vectores estructurales
    line_start INTEGER NOT NULL,
    line_end INTEGER NOT NULL,
    lines_of_code INTEGER NOT NULL,
    complexity INTEGER NOT NULL,
    parameter_count INTEGER DEFAULT 0,
    
    -- Flags
    is_exported BOOLEAN DEFAULT 0,
    is_async BOOLEAN DEFAULT 0,
    is_test_callback BOOLEAN DEFAULT 0,
    test_callback_type TEXT,               -- 'describe', 'it', 'test', etc.
    has_error_handling BOOLEAN DEFAULT 0,  -- Tiene manejo de errores (try/catch, .catch, etc.)
    has_network_calls BOOLEAN DEFAULT 0,   -- Tiene llamadas a red (fetch, http, etc.)
    
    -- Clasificacion
    archetype_type TEXT,
    archetype_severity INTEGER,
    archetype_confidence REAL,
    purpose_type TEXT,
    purpose_confidence REAL,
    is_dead_code BOOLEAN DEFAULT 0,
    is_phase2_complete BOOLEAN DEFAULT 0,
    
    -- Vectores matematicos (para Semantic Algebra)
    importance_score REAL DEFAULT 0,       -- PageRank-like (0-1)
    coupling_score REAL DEFAULT 0,         -- Acoplamiento externo (0-1)
    cohesion_score REAL DEFAULT 0,         -- Cohesion interna (0-1)
    stability_score REAL DEFAULT 1,        -- 1 - change_frequency (0-1)
    propagation_score REAL DEFAULT 0,      -- Impacto de cambios (0-1)
    fragility_score REAL DEFAULT 0,        -- Probabilidad de romperse (0-1)
    testability_score REAL DEFAULT 0,      -- Facilidad de testing (0-1)
    
    -- Grafos: vectores de Algebra de Grafos
    in_degree INTEGER DEFAULT 0,           -- Número de callers (entrada)
    out_degree INTEGER DEFAULT 0,           -- Número de callees (salida)
    centrality_score REAL DEFAULT 0,       -- centrality = in_degree / (out_degree + 1)
    centrality_classification TEXT,         -- 'HUB', 'BRIDGE', 'LEAF'
    risk_level TEXT,                       -- 'HIGH', 'MEDIUM', 'LOW'
    risk_prediction TEXT,                  -- Descripción del riesgo
    
    -- Contadores relacionales
    callers_count INTEGER DEFAULT 0,
    callees_count INTEGER DEFAULT 0,
    dependency_depth INTEGER DEFAULT 0,
    external_call_count INTEGER DEFAULT 0,
    
    -- Temporales
    extracted_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    change_frequency REAL DEFAULT 0,       -- Cambios por dia
    age_days INTEGER DEFAULT 0,
    generation INTEGER DEFAULT 1,
    
    -- JSON con estructuras complejas
    signature_json TEXT,                   -- Parametros, return type
    data_flow_json TEXT,                   -- Inputs, transformations, outputs
    calls_json TEXT,                       -- Lista de llamadas
    temporal_json TEXT,                    -- Timers, async patterns, events
    error_flow_json TEXT,                  -- Throws, catches, try blocks
    performance_json TEXT,                 -- Complexity, expensive ops, resources
    dna_json TEXT,                         -- Hashes, fingerprints
    derived_json TEXT,                     -- Scores calculados adicionales

    -- Tree-sitter metadata (v0.9.62)
    shared_state_json TEXT,                -- sharedStateAccess[]: global/window/globalThis access
    event_emitters_json TEXT,              -- eventEmitters[]: emit/dispatch calls
    event_listeners_json TEXT,             -- eventListeners[]: addEventListener, on*
    scope_type TEXT,                       -- 'local' | 'module' | 'global' | 'closure'

    -- Metadata
    _meta_json TEXT                        -- CreatedAt, version, source
);

-- Indices optimizados para queries comunes
CREATE INDEX IF NOT EXISTS idx_atoms_file_path ON atoms(file_path);
CREATE INDEX IF NOT EXISTS idx_atoms_type ON atoms(atom_type);
CREATE INDEX IF NOT EXISTS idx_atoms_archetype ON atoms(archetype_type);
CREATE INDEX IF NOT EXISTS idx_atoms_purpose ON atoms(purpose_type);
CREATE INDEX IF NOT EXISTS idx_atoms_exported ON atoms(is_exported);
CREATE INDEX IF NOT EXISTS idx_atoms_dead_code ON atoms(is_dead_code);

-- Indices para vectores matematicos (queries de Semantic Algebra)
CREATE INDEX IF NOT EXISTS idx_atoms_importance ON atoms(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_atoms_propagation ON atoms(propagation_score DESC);
CREATE INDEX IF NOT EXISTS idx_atoms_complexity ON atoms(complexity DESC);
CREATE INDEX IF NOT EXISTS idx_atoms_coupling ON atoms(coupling_score DESC);

-- Indice compuesto para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_atoms_file_archetype ON atoms(file_path, archetype_type);
CREATE INDEX IF NOT EXISTS idx_atoms_exported_complexity ON atoms(is_exported, complexity DESC);

-- Tabla de relaciones (grafo de dependencias)
CREATE TABLE IF NOT EXISTS atom_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relation_type TEXT NOT NULL,           -- 'calls', 'imports', 'depends', 'emits'
    weight REAL DEFAULT 1.0,               -- Peso de la relacion (0-1)
    line_number INTEGER,                   -- Linea donde ocurre
    context_json TEXT,                     -- Metadata adicional
    created_at TEXT NOT NULL,
    
    -- FOREIGN KEYs removidos para permitir discovery cross-file incremental
    UNIQUE(source_id, target_id, relation_type, line_number)
);

CREATE INDEX IF NOT EXISTS idx_relations_source ON atom_relations(source_id);
CREATE INDEX IF NOT EXISTS idx_relations_target ON atom_relations(target_id);
CREATE INDEX IF NOT EXISTS idx_relations_type ON atom_relations(relation_type);

-- Tabla de archivos (metadatos por archivo)
CREATE TABLE IF NOT EXISTS files (
    path TEXT PRIMARY KEY,
    last_analyzed TEXT NOT NULL,
    atom_count INTEGER DEFAULT 0,
    total_complexity INTEGER DEFAULT 0,
    total_lines INTEGER DEFAULT 0,
    module_name TEXT,
    imports_json TEXT,                     -- Lista de imports
    exports_json TEXT                      -- Lista de exports
);

CREATE INDEX IF NOT EXISTS idx_files_module ON files(module_name);

-- Event sourcing para audit trail y Delta updates
CREATE TABLE IF NOT EXISTS atom_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    atom_id TEXT NOT NULL,
    event_type TEXT NOT NULL,              -- 'created', 'updated', 'deleted'
    changed_fields TEXT,                   -- JSON array de campos cambiados
    before_state TEXT,                     -- JSON completo antes
    after_state TEXT,                      -- JSON completo despues
    impact_score REAL,                     -- Impacto calculado del cambio
    timestamp TEXT NOT NULL,
    source TEXT DEFAULT 'extractor'       -- 'extractor', 'semantic', 'user', 'migration'
);

CREATE INDEX IF NOT EXISTS idx_events_atom ON atom_events(atom_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON atom_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON atom_events(timestamp);

-- Control de versiones de atomos (reemplaza atom-versions.json)
CREATE TABLE IF NOT EXISTS atom_versions (
    atom_id TEXT PRIMARY KEY,
    hash TEXT NOT NULL,                    -- Hash completo del atomo
    field_hashes_json TEXT NOT NULL,       -- JSON con hashes por campo
    file_path TEXT NOT NULL,
    atom_name TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_atom_versions_file ON atom_versions(file_path);

-- Tabla de modulos (agrupacion logica)
CREATE TABLE IF NOT EXISTS modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    path TEXT NOT NULL,
    atom_count INTEGER DEFAULT 0,
    entry_points TEXT,                     -- JSON array
    total_complexity INTEGER DEFAULT 0,
    metadata_json TEXT
);

-- Vista para analisis de salud
CREATE VIEW IF NOT EXISTS atom_health AS
SELECT 
    id,
    name,
    file_path,
    atom_type,
    complexity,
    lines_of_code,
    archetype_type,
    importance_score,
    propagation_score,
    CASE 
        WHEN complexity > 20 THEN 'high'
        WHEN complexity > 10 THEN 'medium'
        ELSE 'low'
    END as complexity_level,
    CASE
        WHEN propagation_score > 0.7 THEN 'critical'
        WHEN propagation_score > 0.4 THEN 'warning'
        ELSE 'safe'
    END as change_risk
FROM atoms;

-- Vista para grafo de llamadas
CREATE VIEW IF NOT EXISTS call_graph AS
SELECT 
    a1.id as caller_id,
    a1.name as caller_name,
    a1.file_path as caller_file,
    a2.id as callee_id,
    a2.name as callee_name,
    a2.file_path as callee_file,
    r.weight,
    r.line_number
FROM atom_relations r
JOIN atoms a1 ON r.source_id = a1.id
JOIN atoms a2 ON r.target_id = a2.id
WHERE r.relation_type = 'calls';

-- Trigger para actualizar timestamps
CREATE TRIGGER IF NOT EXISTS update_atom_timestamp 
AFTER UPDATE ON atoms
BEGIN
    UPDATE atoms SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger para mantener contadores de archivos (usa UPSERT para preservar columnas como hash)
CREATE TRIGGER IF NOT EXISTS update_file_counts_after_insert
AFTER INSERT ON atoms
BEGIN
    INSERT INTO files (path, last_analyzed, atom_count, total_complexity, total_lines)
    SELECT 
        NEW.file_path,
        datetime('now'),
        COUNT(*),
        SUM(COALESCE(complexity, 0)),
        SUM(COALESCE(lines_of_code, 0))
    FROM atoms 
    WHERE file_path = NEW.file_path
    ON CONFLICT(path) DO UPDATE SET
        last_analyzed = excluded.last_analyzed,
        atom_count = excluded.atom_count,
        total_complexity = excluded.total_complexity,
        total_lines = excluded.total_lines;
END;

CREATE TRIGGER IF NOT EXISTS update_file_counts_after_delete
AFTER DELETE ON atoms
BEGIN
    INSERT INTO files (path, last_analyzed, atom_count, total_complexity, total_lines)
    SELECT 
        OLD.file_path,
        datetime('now'),
        COUNT(*),
        SUM(COALESCE(complexity, 0)),
        SUM(COALESCE(lines_of_code, 0))
    FROM atoms 
    WHERE file_path = OLD.file_path
    ON CONFLICT(path) DO UPDATE SET
        last_analyzed = excluded.last_analyzed,
        atom_count = excluded.atom_count,
        total_complexity = excluded.total_complexity,
        total_lines = excluded.total_lines;
END;

-- =====================================================
-- SYSTEM MAP TABLES (Reemplaza system-map-enhanced.json)
-- =====================================================

-- Tabla de archivos enriquecida (extiende 'files' con datos del system map)
CREATE TABLE IF NOT EXISTS system_files (
    path TEXT PRIMARY KEY,
    display_path TEXT,
    culture TEXT,                          -- 'citizen', 'auditor', 'gatekeeper', 'law', 'entrypoint', 'script'
    culture_role TEXT,                     -- Descripcion del rol
    risk_score REAL DEFAULT 0,             -- 0-1 score de riesgo
    semantic_analysis_json TEXT,           -- {localStorage: [], events: [], globals: [], routes: [], envVars: []}
    semantic_connections_json TEXT,        -- Conexiones semanticas detectadas
    exports_json TEXT,                     -- Export symbols
    imports_json TEXT,                     -- Import symbols
    definitions_json TEXT,                 -- Definiciones en el archivo
    used_by_json TEXT,                     -- Archivos que usan este
    calls_json TEXT,                       -- Llamadas que hace
    identifier_refs_json TEXT,             -- Referencias a identificadores
    depends_on_json TEXT,                  -- Dependencias directas
    transitive_depends_json TEXT,          -- Dependencias transitivas
    transitive_dependents_json TEXT,       -- Dependientes transitivos
    updated_at TEXT NOT NULL,
    
    FOREIGN KEY (path) REFERENCES files(path) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_system_files_culture ON system_files(culture);
CREATE INDEX IF NOT EXISTS idx_system_files_risk ON system_files(risk_score DESC);

-- Tabla de dependencias entre archivos (grafo de dependencias)
CREATE TABLE IF NOT EXISTS file_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_path TEXT NOT NULL,             -- Archivo origen
    target_path TEXT NOT NULL,             -- Archivo destino
    dependency_type TEXT NOT NULL,         -- 'local', 'npm', 'builtin', 'alias'
    symbols_json TEXT,                     -- Simbolos importados
    reason TEXT,                           -- Razon de la dependencia
    is_dynamic BOOLEAN DEFAULT 0,          -- Import dinamico?
    created_at TEXT NOT NULL,
    UNIQUE(source_path, target_path, dependency_type)
);

CREATE INDEX IF NOT EXISTS idx_file_deps_source ON file_dependencies(source_path);
CREATE INDEX IF NOT EXISTS idx_file_deps_target ON file_dependencies(target_path);
CREATE INDEX IF NOT EXISTS idx_file_deps_type ON file_dependencies(dependency_type);

-- Tabla de conexiones semanticas (shared state, events, etc.)
CREATE TABLE IF NOT EXISTS semantic_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connection_type TEXT NOT NULL,         -- 'sharedState', 'eventListener', 'envVar', 'route', 'colocation'
    source_path TEXT NOT NULL,
    target_path TEXT NOT NULL,
    connection_key TEXT,                   -- Nombre de la variable/evento/env
    context_json TEXT,                     -- Metadata adicional
    weight REAL DEFAULT 1.0,               -- Peso de la conexion
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_semantic_conn_type ON semantic_connections(connection_type);
CREATE INDEX IF NOT EXISTS idx_semantic_conn_source ON semantic_connections(source_path);
CREATE INDEX IF NOT EXISTS idx_semantic_conn_target ON semantic_connections(target_path);
CREATE INDEX IF NOT EXISTS idx_semantic_conn_key ON semantic_connections(connection_key);

-- Tabla de evaluacion de riesgos
CREATE TABLE IF NOT EXISTS risk_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    risk_score REAL DEFAULT 0,             -- Score total 0-1
    risk_level TEXT,                       -- 'low', 'medium', 'high', 'critical'
    factors_json TEXT,                     -- Factores que contribuyen al riesgo
    shared_state_count INTEGER DEFAULT 0,  -- Cantidad de shared state connections
    external_deps_count INTEGER DEFAULT 0, -- Cantidad de dependencias externas
    complexity_score REAL DEFAULT 0,       -- Score de complejidad
    propagation_score REAL DEFAULT 0,      -- Score de propagacion
    assessed_at TEXT NOT NULL,
    UNIQUE(file_path)
);

CREATE INDEX IF NOT EXISTS idx_risk_level ON risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_score ON risk_assessments(risk_score DESC);

-- Tabla de issues semanticos detectados
CREATE TABLE IF NOT EXISTS semantic_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    issue_type TEXT NOT NULL,              -- Tipo de issue
    severity TEXT NOT NULL,                -- 'high', 'medium', 'low'
    message TEXT NOT NULL,                 -- Descripcion del problema
    line_number INTEGER,                   -- Linea donde ocurre (si aplica)
    context_json TEXT,                     -- Contexto adicional
    detected_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_semantic_issues_file ON semantic_issues(file_path);
CREATE INDEX IF NOT EXISTS idx_semantic_issues_type ON semantic_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_semantic_issues_severity ON semantic_issues(severity);

-- Tabla de metadata del system map
CREATE TABLE IF NOT EXISTS system_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Tabla de cache transitorio (reemplaza Map() en memoria)
CREATE TABLE IF NOT EXISTS cache_entries (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expiry INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cache_expiry ON cache_entries(expiry);

-- Insertar version del schema
INSERT OR REPLACE INTO system_metadata (key, value, updated_at) 
VALUES ('schema_version', '2.1', datetime('now'));

INSERT OR REPLACE INTO system_metadata (key, value, updated_at) 
VALUES ('cache_sqlite_enabled', 'true', datetime('now'));

INSERT OR REPLACE INTO system_metadata (key, value, updated_at) 
VALUES ('system_map_enabled', 'true', datetime('now'));