/**
 * @fileoverview system-map.js
 * 
 * Métodos para guardar y cargar el system map en SQLite.
 * Reemplaza la necesidad de system-map-enhanced.json
 * 
 * @module storage/repository/adapters/helpers/system-map
 */

import { safeNumber, safeString, safeJson, safeParseJson } from './converters.js';

/**
 * Guarda el system map completo en SQLite
 */
export function saveSystemMap(db, connectionManager, systemMap, logger) {
  const now = new Date().toISOString();
  
  // Recolectar TODOS los paths referenciados (para FK constraints)
  const allFilePaths = collectAllFilePaths(systemMap);
  
  connectionManager.transaction(() => {
    // 1. Primero asegurar que TODOS los archivos existan en tabla 'files'
    // (incluyendo los referenciados en dependencias, conexiones, etc.)
    ensureFilesExist(db, allFilePaths, now);
    
    // 2. Guardar archivos del system map
    if (systemMap.files) {
      saveSystemFiles(db, systemMap.files, now);
    }
    
    // 3. Guardar dependencias
    if (systemMap.dependencies) {
      saveFileDependencies(db, systemMap.dependencies, now);
    }
    
    // 4. Guardar conexiones semanticas
    if (systemMap.connections) {
      saveSemanticConnections(db, systemMap.connections, now);
    }
    
    // 5. Guardar risk assessments
    if (systemMap.riskAssessment) {
      saveRiskAssessments(db, systemMap.riskAssessment, now);
    }
    
    // 6. Guardar semantic issues
    if (systemMap.semanticIssues) {
      saveSemanticIssues(db, systemMap.semanticIssues, now);
    }
    
    // 7. Actualizar metadata
    updateSystemMetadata(db, systemMap.metadata, now);
  });
  
  logger.info(`[SQLiteAdapter] System map saved: ${Object.keys(systemMap.files || {}).length} files, ${(systemMap.dependencies || []).length} deps, ${allFilePaths.size} total paths`);
}

/**
 * Recolecta todos los paths de archivos referenciados en el system map
 * para asegurar que existan en la tabla 'files' (FK constraints)
 */
function collectAllFilePaths(systemMap) {
  const paths = new Set();
  
  // Archivos principales
  if (systemMap.files) {
    Object.keys(systemMap.files).forEach(p => paths.add(p));
  }
  
  // Dependencias (from/to)
  if (systemMap.dependencies) {
    for (const dep of systemMap.dependencies) {
      if (dep.from) paths.add(dep.from);
      if (dep.to) paths.add(dep.to);
    }
  }
  
  // Conexiones semanticas (source/target o from/to)
  if (systemMap.connections) {
    const connTypes = ['sharedState', 'eventListeners', 'envVars', 'routes', 'colocation'];
    for (const type of connTypes) {
      const conns = systemMap.connections[type];
      if (Array.isArray(conns)) {
        for (const conn of conns) {
          if (conn.source || conn.from) paths.add(conn.source || conn.from);
          if (conn.target || conn.to) paths.add(conn.target || conn.to);
        }
      }
    }
  }
  
  // Risk assessments (keys son paths)
  if (systemMap.riskAssessment) {
    Object.keys(systemMap.riskAssessment).forEach(p => paths.add(p));
  }
  
  // Semantic issues (keys son paths)
  if (systemMap.semanticIssues) {
    Object.keys(systemMap.semanticIssues).forEach(p => paths.add(p));
  }
  
  return paths;
}

/**
 * Carga el system map completo desde SQLite
 */
export function loadSystemMap(db) {
  return {
    files: loadSystemFiles(db),
    dependencies: loadFileDependencies(db),
    connections: loadSemanticConnections(db),
    riskAssessment: loadRiskAssessments(db),
    semanticIssues: loadSemanticIssues(db),
    metadata: loadSystemMetadata(db),
    // Mantener compatibilidad
    functions: {},
    function_links: [],
    unresolvedImports: {},
    reexportChains: [],
    exportIndex: {},
    typeDefinitions: {},
    enumDefinitions: {},
    constantExports: {},
    objectExports: {},
    typeUsages: {}
  };
}

// =====================================================
// PRIVATE HELPERS
// =====================================================

function ensureFilesExist(db, filePaths, now) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO files (path, last_analyzed, atom_count, total_complexity, total_lines, imports_json, exports_json)
    VALUES (?, ?, 0, 0, 0, '[]', '[]')
  `);
  
  for (const filePath of filePaths) {
    stmt.run(filePath, now);
  }
}

function saveSystemFiles(db, files, now) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO system_files (
      path, display_path, culture, culture_role, risk_score,
      semantic_analysis_json, semantic_connections_json,
      exports_json, imports_json, definitions_json, used_by_json,
      calls_json, identifier_refs_json, depends_on_json,
      transitive_depends_json, transitive_dependents_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const [path, fileData] of Object.entries(files)) {
    stmt.run(
      path,
      fileData.displayPath || path,
      fileData.culture || null,
      fileData.cultureRole || null,
      safeNumber(fileData.riskScore, 0),
      safeJson(fileData.semanticAnalysis),
      safeJson(fileData.semanticConnections),
      safeJson(fileData.exports),
      safeJson(fileData.imports),
      safeJson(fileData.definitions),
      safeJson(fileData.usedBy),
      safeJson(fileData.calls),
      safeJson(fileData.identifierRefs),
      safeJson(fileData.dependsOn),
      safeJson(fileData.transitiveDepends),
      safeJson(fileData.transitiveDependents),
      now
    );
  }
}

function saveFileDependencies(db, dependencies, now) {
  db.prepare('DELETE FROM file_dependencies').run();
  
  const stmt = db.prepare(`
    INSERT INTO file_dependencies 
    (source_path, target_path, dependency_type, symbols_json, reason, is_dynamic, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const dep of dependencies) {
    stmt.run(
      dep.from,
      dep.to,
      dep.type || 'local',
      safeJson(dep.symbols),
      dep.reason || null,
      dep.dynamic ? 1 : 0,
      now
    );
  }
}

function saveSemanticConnections(db, connections, now) {
  db.prepare('DELETE FROM semantic_connections').run();
  
  const stmt = db.prepare(`
    INSERT INTO semantic_connections
    (connection_type, source_path, target_path, connection_key, context_json, weight, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Mapeo de tipos de conexión del builder a tipos de DB
  const connectionTypeMap = {
    'sharedState': 'sharedState',
    'eventListeners': 'eventListeners', 
    'localStorage': 'sharedState',  // localStorage es un tipo de shared state
    'advanced': 'eventListeners',   // conexiones avanzadas van como eventos
    'cssInJS': 'colocation',
    'typescript': 'colocation',
    'reduxContext': 'sharedState'
  };
  
  for (const [builderType, dbType] of Object.entries(connectionTypeMap)) {
    const conns = connections[builderType];
    if (!conns || !Array.isArray(conns)) continue;
    
    for (const conn of conns) {
      // Las conexiones usan sourceFile/targetFile o source/target o from/to
      let sourcePath = conn.sourceFile || conn.source || conn.from;
      let targetPath = conn.targetFile || conn.target || conn.to;
      let key = conn.key || conn.name || conn.variable || conn.event || conn.type || null;
      let context = conn;
      let weight = safeNumber(conn.weight || conn.strength, 1.0);
      
      if (!sourcePath || !targetPath) continue;
      
      stmt.run(dbType, sourcePath, targetPath, key, safeJson(context), weight, now);
    }
  }
}

function saveRiskAssessments(db, riskAssessment, now) {
  db.prepare('DELETE FROM risk_assessments').run();
  
  const stmt = db.prepare(`
    INSERT INTO risk_assessments
    (file_path, risk_score, risk_level, factors_json, shared_state_count, 
     external_deps_count, complexity_score, propagation_score, assessed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // El riskAssessment tiene estructura { scores: {...}, report: {...} }
  const scores = riskAssessment.scores || riskAssessment;
  
  for (const [filePath, risk] of Object.entries(scores)) {
    // Ignorar keys que no son file paths (como 'report', 'metadata', etc.)
    if (typeof risk !== 'object' || risk === null) continue;
    if (filePath === 'report' || filePath === 'metadata' || filePath === 'summary') continue;
    
    stmt.run(
      filePath,
      safeNumber(risk.score, 0),
      risk.level || 'low',
      safeJson(risk.factors),
      safeNumber(risk.sharedStateCount, 0),
      safeNumber(risk.externalDepsCount, 0),
      safeNumber(risk.complexityScore, 0),
      safeNumber(risk.propagationScore, 0),
      now
    );
  }
}

function saveSemanticIssues(db, semanticIssues, now) {
  db.prepare('DELETE FROM semantic_issues').run();
  
  const stmt = db.prepare(`
    INSERT INTO semantic_issues
    (file_path, issue_type, severity, message, line_number, context_json, detected_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const [filePath, issues] of Object.entries(semanticIssues)) {
    if (!Array.isArray(issues)) continue;
    
    for (const issue of issues) {
      stmt.run(
        filePath,
        issue.type || 'unknown',
        issue.severity || 'medium',
        issue.message || 'No message',
        safeNumber(issue.line, null),
        safeJson(issue.context),
        now
      );
    }
  }
}

function updateSystemMetadata(db, metadata, now) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO system_metadata (key, value, updated_at)
    VALUES (?, ?, ?)
  `);
  
  if (metadata) {
    stmt.run('system_map_metadata', safeJson(metadata), now);
  }
  stmt.run('last_updated', now, now);
}

function loadSystemFiles(db) {
  const rows = db.prepare('SELECT * FROM system_files').all();
  const files = {};
  
  for (const row of rows) {
    files[row.path] = {
      path: row.path,
      displayPath: row.display_path,
      culture: row.culture,
      cultureRole: row.culture_role,
      riskScore: row.risk_score,
      semanticAnalysis: safeParseJson(row.semantic_analysis_json),
      semanticConnections: safeParseJson(row.semantic_connections_json),
      exports: safeParseJson(row.exports_json),
      imports: safeParseJson(row.imports_json),
      definitions: safeParseJson(row.definitions_json),
      usedBy: safeParseJson(row.used_by_json),
      calls: safeParseJson(row.calls_json),
      identifierRefs: safeParseJson(row.identifier_refs_json),
      dependsOn: safeParseJson(row.depends_on_json),
      transitiveDepends: safeParseJson(row.transitive_depends_json),
      transitiveDependents: safeParseJson(row.transitive_dependents_json)
    };
  }
  
  return files;
}

function loadFileDependencies(db) {
  const rows = db.prepare('SELECT * FROM file_dependencies').all();
  return rows.map(r => ({
    from: r.source_path,
    to: r.target_path,
    type: r.dependency_type,
    symbols: safeParseJson(r.symbols_json),
    reason: r.reason,
    dynamic: Boolean(r.is_dynamic)
  }));
}

function loadSemanticConnections(db) {
  const rows = db.prepare('SELECT * FROM semantic_connections').all();
  const connections = {
    sharedState: [],
    eventListeners: [],
    envVars: [],
    routes: [],
    colocation: [],
    total: 0
  };
  
  for (const row of rows) {
    if (connections[row.connection_type]) {
      connections[row.connection_type].push({
        source: row.source_path,
        target: row.target_path,
        key: row.connection_key,
        context: safeParseJson(row.context_json),
        weight: row.weight
      });
    }
  }
  
  connections.total = rows.length;
  return connections;
}

function loadRiskAssessments(db) {
  const rows = db.prepare('SELECT * FROM risk_assessments').all();
  const assessments = {};
  
  for (const row of rows) {
    assessments[row.file_path] = {
      score: row.risk_score,
      level: row.risk_level,
      factors: safeParseJson(row.factors_json),
      sharedStateCount: row.shared_state_count,
      externalDepsCount: row.external_deps_count,
      complexityScore: row.complexity_score,
      propagationScore: row.propagation_score
    };
  }
  
  return assessments;
}

function loadSemanticIssues(db) {
  const rows = db.prepare('SELECT * FROM semantic_issues').all();
  const issues = {};
  
  for (const row of rows) {
    if (!issues[row.file_path]) {
      issues[row.file_path] = [];
    }
    issues[row.file_path].push({
      type: row.issue_type,
      severity: row.severity,
      message: row.message,
      line: row.line_number,
      context: safeParseJson(row.context_json)
    });
  }
  
  return issues;
}

function loadSystemMetadata(db) {
  const rows = db.prepare('SELECT * FROM system_metadata').all();
  const metadata = {};
  
  for (const row of rows) {
    if (row.key === 'system_map_metadata') {
      Object.assign(metadata, safeParseJson(row.value));
    } else {
      metadata[row.key] = row.value;
    }
  }
  
  return metadata;
}
