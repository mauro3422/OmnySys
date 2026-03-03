/**
 * @fileoverview omnysys-health-detector.js
 *
 * Detector de salud arquitectural de OmnySys usando atoms SQL.
 * Analiza los patrones de acceso a base de datos del propio sistema
 * para detectar violaciones, ineficiencias y oportunidades de optimizacion.
 *
 * Detecta:
 *  1. Repository Bypass — DB directo fuera de storage/
 *  2. Multi-SELECT JOIN candidates — N queries que podrian unificarse
 *  3. Schema Column Drift — columnas referenciadas que no existen
 *  4. Direct db.prepare vs getRepository() en capas de negocio
 *  5. BULK_MUTATION sin transaccion en funciones de escritura masiva
 *
 * @module pattern-detection/detectors/omnysys-health-detector
 */

// Rutas que SON el repositorio — acceso directo a DB aqui es correcto
const STORAGE_PATHS = [
    'src/layer-c-memory/storage/',
    'src/layer-c-memory/mcp/',       // MCP tools pueden necesitar DB para introspection
    'src/layer-c-memory/query/',     // Query layer es parte del acceso intencional
    'src/core/orchestrator/',        // Orquestador necesita acceso directo durante boot
    'src/core/unified-server/',      // API server usa DB para introspection
    'src/core/cache/',               // Cache manager gestiona DB directamente
    'src/core/file-watcher/',        // File watcher necesita leer/actualizar DB
    'src/layer-a-static/pipeline/',  // Pipeline de analisis — acceso legitimo durante index
    'src/layer-a-static/indexer',   // Indexer principal
    'scripts/',
    'migrations/',
    'tests/',
    'check-sql',
    'test-health',
    'tmp-debug',
];

import { TABLE_DEFINITIONS } from '../../../layer-c-memory/storage/database/schema-registry.js';

// Build KNOWN_COLUMNS_BY_TABLE dynamically from the Single Source of Truth
const KNOWN_COLUMNS_BY_TABLE = {};
for (const [tableName, definition] of Object.entries(TABLE_DEFINITIONS)) {
    KNOWN_COLUMNS_BY_TABLE[tableName] = new Set(definition.columns.map(col => col.name));
}

export class OmnysysHealthDetector {
    constructor({ config = {}, globalConfig = {} } = {}) {
        this.config = {
            multiSelectThreshold: config.multiSelectThreshold || 2, // N+ SELECTs en misma funcion = JOIN candidate
            ...config
        };
    }

    async detect(systemMap) {
        const findings = [];
        const files = systemMap?.files || {};

        for (const [filePath, fileData] of Object.entries(files)) {
            const allAtoms = fileData?.atoms || [];
            const sqlAtoms = allAtoms.filter(a => a.type === 'sql_query');
            if (sqlAtoms.length === 0) continue;

            if (!this._storageCache) this._storageCache = new Map();
            let isStorageLayer = this._storageCache.get(filePath);
            if (isStorageLayer === undefined) {
                isStorageLayer = STORAGE_PATHS.some(p => filePath.includes(p));
                this._storageCache.set(filePath, isStorageLayer);
            }

            const jsAtomsByName = new Map(allAtoms.filter(a => a.type !== 'sql_query').map(a => [a.name, a]));

            // 1. Repository Bypass — SQL directo fuera de la capa de storage
            if (!isStorageLayer) {
                for (const atom of sqlAtoms) {
                    const purpose = atom._meta?.sql_purpose || '';
                    // DDL_OPERATION y SCHEMA_QUERY a veces se usan en scripts de init — solo flaggear DATA_*
                    if (['DATA_READ', 'DATA_INSERT', 'DATA_UPDATE', 'DATA_DELETE', 'CACHE_READ',
                        'BULK_MUTATION', 'AGGREGATION', 'UPSERT'].includes(purpose)) {
                        findings.push(this._finding('sql-repo-bypass', 'high', filePath, atom,
                            `Direct DB access outside storage layer — should use getRepository() instead`,
                            { sql_purpose: purpose, suggestion: 'Move to src/layer-c-memory/storage/' }
                        ));
                    }
                }
            }

            // 2. Multi-SELECT JOIN candidates — misma funcion padre, varias tablas distintas
            const selectsByParent = {};
            for (const atom of sqlAtoms) {
                if (atom._meta?.sql_operation !== 'SELECT') continue;
                const pid = atom._meta?.parent_atom_name || atom._meta?.parent_atom_id;
                if (!pid) continue;
                if (!selectsByParent[pid]) selectsByParent[pid] = [];
                selectsByParent[pid].push(atom);
            }
            for (const [parentName, selects] of Object.entries(selectsByParent)) {
                if (selects.length < this.config.multiSelectThreshold) continue;
                // Verificar que son tablas distintas (seria JOIN candidate)
                const allTables = selects.flatMap(s => s._meta?.tables_referenced || []);
                const uniqueTables = new Set(allTables);
                if (uniqueTables.size >= 2) {
                    findings.push({
                        type: 'sql-join-candidate', severity: 'medium', filePath,
                        atomId: selects[0].id, atomName: parentName, line: selects[0].lineStart || 0,
                        message: `${selects.length} separate SELECTs in '${parentName}' on tables [${[...uniqueTables].join(', ')}] — consider JOIN`,
                        details: { select_count: selects.length, tables: [...uniqueTables], sql_purposes: selects.map(s => s._meta?.sql_purpose) }
                    });
                }
            }

            // 3. Schema Column Drift — usa columns_referenced del AST (tree-sitter-sql)
            // Mucho mas preciso que regex: tree-sitter extrae column_name/field nodes directamente
            for (const atom of sqlAtoms) {
                const referencedCols = atom._meta?.columns_referenced || [];
                if (referencedCols.length === 0) continue;

                const tables = atom._meta?.tables_referenced || [];
                for (const table of tables) {
                    const knownCols = KNOWN_COLUMNS_BY_TABLE[table];
                    if (!knownCols) continue; // tabla desconocida = no la medimos

                    for (const col of referencedCols) {
                        if (!knownCols.has(col) && col !== '*' && col.length > 1) {
                            findings.push(this._finding('sql-schema-drift', 'high', filePath, atom,
                                `Column '${col}' referenced by SQL but not in schema for table '${table}' — runtime error risk`,
                                { column: col, table }
                            ));
                        }
                    }
                }
            }

            // 4. DYNAMIC_QUERY en capa core — queries que deberian ser estaticas
            if (isStorageLayer) {
                for (const atom of sqlAtoms) {
                    if (atom._meta?.sql_purpose === 'DYNAMIC_QUERY' && !atom._meta?.sql_injection_risk) {
                        findings.push(this._finding('sql-dynamic-in-storage', 'medium', filePath, atom,
                            `Dynamic query in storage layer — table name resolved at runtime, consider making it static`,
                            { template_vars: atom._meta?.template_vars, resolved: atom._meta?.resolved_tables_from_vars }
                        ));
                    }
                }
            }
        }

        const highCount = findings.filter(f => f.severity === 'high').length;
        const medCount = findings.filter(f => f.severity === 'medium').length;
        const score = Math.max(0, 100 - highCount * 10 - medCount * 4);

        return {
            detector: 'omnysys-health',
            findings,
            score,
            summary: {
                repositoryBypass: findings.filter(f => f.type === 'sql-repo-bypass').length,
                joinCandidates: findings.filter(f => f.type === 'sql-join-candidate').length,
                schemaDrift: findings.filter(f => f.type === 'sql-schema-drift').length,
                dynamicInStorage: findings.filter(f => f.type === 'sql-dynamic-in-storage').length,
                totalFindings: findings.length
            }
        };
    }

    _finding(type, severity, filePath, atom, message, details = {}) {
        return {
            type, severity, filePath,
            atomId: atom.id, atomName: atom.name,
            line: atom.lineStart || atom.line || 0,
            message, details
        };
    }
}

export default OmnysysHealthDetector;
