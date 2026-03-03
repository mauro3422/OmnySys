/**
 * @fileoverview sql.js
 * 
 * Extractor de sentencias SQL embebidas en JS/TS.
 * Busca llamadas a métodos de BD (prepare, exec, etc.), extrae el string,
 * y usa un sub-parser nativo de tree-sitter-sql para generar un SQL_QUERY.
 * 
 * @module parser/extractors/sql
 */

import { walk, text } from './utils.js';
import { getParserPool } from '../parser-pool.js';
import SqlModule from '@derekstride/tree-sitter-sql';
import { createLogger } from '../../../utils/logger.js';

const Sql = SqlModule; // The entire module object contains name, language (pointer) and nodeTypeInfo

const logger = createLogger('OmnySys:extractor:sql');

const DB_METHODS = ['prepare', 'exec', 'run', 'all', 'get', 'query'];

// Patrones que indican que una variable viene de input del usuario (riesgo de inyeccion)
const USER_INPUT_PATTERNS = [
    'req.body', 'req.params', 'req.query', 'req.headers',
    'request.body', 'request.params', 'request.query',
    'ctx.body', 'ctx.params', 'ctx.query', 'ctx.request',
    'event.body', 'input.', 'userInput', 'formData'
];

/**
 * Analiza las expresiones interpoladas en un template literal SQL.
 * Detecta riesgo de inyeccion SQL (variable viene de user input)
 * y resolucion parcial (variable es una constante conocida).
 *
 * @param {object} templateNode - AST node de tipo template_string
 * @param {string} code - codigo fuente completo del archivo
 * @returns {{ templateVars: string[], injectionRisk: boolean, injectionSources: string[], resolvedTables: string[] }}
 */
function resolveTemplateVars(templateNode, code) {
    const templateVars = [];
    const injectionSources = [];
    const resolvedTables = [];
    let injectionRisk = false;

    for (const child of templateNode.children) {
        if (child.type !== 'template_substitution') continue;
        const exprText = code.slice(child.startIndex + 2, child.endIndex - 1).trim();
        templateVars.push(exprText);

        // Detectar si viene de user input
        for (const pattern of USER_INPUT_PATTERNS) {
            if (exprText.includes(pattern)) {
                injectionRisk = true;
                injectionSources.push(exprText);
                break;
            }
        }

        // Intentar resolver constantes simples en el scope del archivo
        if (/^[a-zA-Z_$][a-zA-Z0-9_.]*$/.test(exprText)) {
            const varName = exprText.split('.').pop();
            const constMatch = code.match(
                new RegExp('(?:const|let)\\s+' + varName + '\\s*=\\s*[\'"]([ a-zA-Z_][a-zA-Z0-9_]*)[\'"]')
            );
            if (constMatch) resolvedTables.push(constMatch[1]);
        }
    }

    return { templateVars, injectionRisk, injectionSources, resolvedTables };
}

/**
 * Clasifica el proposito semantico de una query SQL, análogo al `purpose` de code atoms.
 * @param {string} operation
 * @param {Set<string>} tables
 * @param {string} rawSql
 * @param {boolean} isDynamic - true si el SQL viene de un template literal con variables runtime
 * @returns {string} sql_purpose
 */
function classifySqlPurpose(operation, tables, rawSql, isDynamic = false) {
    // DYNAMIC_QUERY: la estructura (tabla, columnas, condiciones) se determina en runtime.
    // Aplica a cualquier query cuya sintaxis no puede analizarse completamente en estático.
    // Generalizable: no es específico de SQLite, aplica a cualquier ORM o driver.
    const hasDynamicTable = rawSql.includes('_tbl_');
    if (isDynamic && (operation === 'UNKNOWN' || hasDynamicTable)) return 'DYNAMIC_QUERY';

    const sql = rawSql.toUpperCase();
    const tableList = [...tables].join(',');

    // Auth & security
    const authTables = ['users', 'sessions', 'tokens', 'permissions', 'roles', 'auth'];
    if (operation === 'SELECT' && authTables.some(t => tableList.includes(t))) return 'AUTH_CHECK';

    // Audit / logging
    const logTables = ['events', 'logs', 'audit', 'history', 'changelog'];
    if (operation === 'INSERT' && logTables.some(t => tableList.includes(t))) return 'AUDIT_LOG';

    // Schema introspection
    if (operation === 'PRAGMA' || sql.includes('SQLITE_MASTER') || sql.includes('SQLITE_SCHEMA')) return 'SCHEMA_QUERY';

    // DDL
    if (operation === 'DDL') return 'DDL_OPERATION';

    // Transaction control
    if (operation === 'TRANSACTION') return 'TRANSACTION_CONTROL';

    // Aggregation (COUNT, SUM, AVG, GROUP BY)
    if (operation === 'SELECT' && (sql.includes('COUNT(') || sql.includes('SUM(') || sql.includes('AVG(') || sql.includes('GROUP BY'))) return 'AGGREGATION';

    // JOIN traversal
    if (operation === 'SELECT' && sql.includes('JOIN')) return 'RELATIONSHIP_TRAVERSE';

    // Bulk mutation (UPDATE/DELETE without WHERE — full table)
    if ((operation === 'UPDATE' || operation === 'DELETE') && !sql.includes('WHERE')) return 'BULK_MUTATION';

    // Upsert
    if (operation === 'INSERT' && (sql.includes('OR REPLACE') || sql.includes('OR IGNORE') || sql.includes('ON CONFLICT'))) return 'UPSERT';

    // Version/history tracking
    if (tableList.includes('version') || tableList.includes('snapshot') || tableList.includes('migration')) return 'VERSION_TRACKING';

    // Cache refresh pattern (SELECT in read-only helper)
    if (operation === 'SELECT' && tables.size === 1) return 'CACHE_READ';

    // Generic by operation
    if (operation === 'SELECT') return 'DATA_READ';
    if (operation === 'INSERT') return 'DATA_INSERT';
    if (operation === 'UPDATE') return 'DATA_UPDATE';
    if (operation === 'DELETE') return 'DATA_DELETE';

    return 'UNKNOWN_PURPOSE';
}

/**
 * Regex fallback para detectar la operación SQL cuando el AST no la clasifica.
 * Cubre WITH, PRAGMA, DDL (CREATE/DROP/ALTER), REPLACE, UPSERT.
 * @param {string} rawSql
 * @returns {string} operación normalizada
 */
function detectOperationFallback(rawSql) {
    const s = rawSql.trim().toUpperCase();
    if (s.startsWith('SELECT') || s.startsWith('WITH')) return 'SELECT';
    if (s.startsWith('INSERT') || s.startsWith('REPLACE INTO') || s.startsWith('REPLACE')) return 'INSERT';
    if (s.startsWith('UPDATE')) return 'UPDATE';
    if (s.startsWith('DELETE')) return 'DELETE';
    if (s.startsWith('PRAGMA')) return 'PRAGMA';
    if (s.startsWith('CREATE') || s.startsWith('DROP') || s.startsWith('ALTER')) return 'DDL';
    if (s.startsWith('BEGIN') || s.startsWith('COMMIT') || s.startsWith('ROLLBACK')) return 'TRANSACTION';
    return 'UNKNOWN';
}

/**
 * Busca sentencias SQL embebidas, las parsea con tree-sitter-sql
 * y las agrega como atoms al fileInfo.
 * 
 * @param {import('tree-sitter').Tree} jsTree - JS/TS AST
 * @param {string} code - Código JS/TS completo
 * @param {object} fileInfo - FileInfo donde inyectaremos los átomos
 */
export async function extractSqlQueries(jsTree, code, fileInfo) {
    if (!fileInfo.atoms) fileInfo.atoms = []; // Ensuring atoms array exists (or we push to definitions/functions based on OmnySys rules)

    const sqlStrNodes = [];

    // Paso 1: Buscar expresiones `db.prepare("SELECT...")`
    walk(jsTree.rootNode, ['call_expression'], (callNode) => {
        const fnNode = callNode.childForFieldName('function');
        if (!fnNode || fnNode.type !== 'member_expression') return;

        const propNode = fnNode.childForFieldName('property');
        if (!propNode) return;

        const methodName = text(propNode, code);
        if (DB_METHODS.includes(methodName)) {
            const argsNode = callNode.childForFieldName('arguments');
            if (!argsNode || argsNode.childCount === 0) return;

            // Extraemos el primer argumento (el string)
            const firstArg = argsNode.children.find(c => c.type === 'string' || c.type === 'template_string');
            if (firstArg) {
                // Sacamos las comillas (inicio y fin)
                let rawSql = text(firstArg, code);
                if (firstArg.type === 'string') {
                    rawSql = rawSql.slice(1, -1);
                } else if (firstArg.type === 'template_string') {
                    // template string con variables: las "tapamos" para no romper el parser SQL
                    rawSql = rawSql.replace(/\$\{[^}]*\}/g, '_tbl_').slice(1, -1);
                }

                if (rawSql.trim().length > 5) {
                    const resolution = (firstArg.type === 'template_string')
                        ? resolveTemplateVars(firstArg, code)
                        : { templateVars: [], injectionRisk: false, injectionSources: [], resolvedTables: [] };
                    sqlStrNodes.push({
                        sql: rawSql,
                        lineStart: callNode.startPosition.row + 1,
                        lineEnd: callNode.endPosition.row + 1,
                        funcName: methodName,
                        isDynamic: firstArg.type === 'template_string',
                        ...resolution
                    });
                }
            }
        }
    });

    if (sqlStrNodes.length === 0) return;

    // Paso 2: Parsear los SQL extraídos usando tree-sitter-sql
    const pool = getParserPool();

    for (const sqlItem of sqlStrNodes) {
        try {
            const sqlTree = await pool.withParser((parser) => {
                parser.setLanguage(Sql);
                return parser.parse(sqlItem.sql);
            });

            if (sqlTree) {
                // Paso 3: Analizar el AST de SQL para detectar tablas, columnas y tipo
                let operation = 'UNKNOWN';
                let tables = new Set();
                let columns = new Set();

                walk(sqlTree.rootNode, [
                    'select', 'insert', 'update', 'delete', 'identifier', 'column_name', 'field'
                ], (node) => {
                    if (node.type === 'select' && operation === 'UNKNOWN') operation = 'SELECT';
                    if (node.type === 'insert' && operation === 'UNKNOWN') operation = 'INSERT';
                    if (node.type === 'update' && operation === 'UNKNOWN') operation = 'UPDATE';
                    if (node.type === 'delete' && operation === 'UNKNOWN') operation = 'DELETE';

                    if (node.type === 'column_name' || node.type === 'field') {
                        const colTxt = sqlItem.sql.slice(node.startIndex, node.endIndex).toLowerCase().trim();
                        if (colTxt && colTxt.length > 1 && !colTxt.includes('.') && colTxt !== '_tbl_') {
                            columns.add(colTxt);
                        }
                    }

                    if (node.type === 'identifier') {
                        const txt = sqlItem.sql.slice(node.startIndex, node.endIndex).toLowerCase();
                        if (txt === '_tbl_') return;
                        if (txt.length > 2 && !['select', 'from', 'where', 'limit', 'join', 'insert', 'into', 'values', 'update', 'set', 'delete'].includes(txt)) {
                            const pType = node.parent?.type;
                            // Dereckstride grammar often uses 'object_reference' or 'relation' for tables
                            if (pType && (pType === 'object_reference' || pType.includes('relation') || pType === 'from' || pType === 'update' || pType === 'insert')) {
                                tables.add(txt);
                            }
                        }
                    }
                });

                // Fallback: si el AST no reconoció la operación, usar regex sobre el string raw
                if (operation === 'UNKNOWN') {
                    operation = detectOperationFallback(sqlItem.sql);
                }
                const atomId = `${fileInfo.filePath || ''}::SQL_${operation}_L${sqlItem.lineStart}`;
                fileInfo.definitions.push({
                    id: atomId,
                    name: `SQL_${operation}_L${sqlItem.lineStart}`,
                    type: 'sql_query',
                    lineStart: sqlItem.lineStart,
                    lineEnd: sqlItem.lineEnd,
                    lines_of_code: (sqlItem.lineEnd - sqlItem.lineStart) + 1,
                    complexity: 1,
                    parameter_count: 0,
                    // Required by call-graph.js
                    calls: [],
                    calledBy: [],
                    className: null,
                    externalCallCount: 0,
                    // Standard atom flags
                    isExported: false,
                    isAsync: false,
                    isDeadCode: false,
                    extracted_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    // Use _meta (not _meta_json) - converters.js reads atom._meta as an object
                    _meta: {
                        sql_operation: operation,
                        sql_purpose: (sqlItem.injectionRisk)
                            ? 'SQL_INJECTION_RISK'
                            : classifySqlPurpose(operation, tables, sqlItem.sql.trim().slice(0, 200), sqlItem.isDynamic || false),
                        is_dynamic: sqlItem.isDynamic || false,
                        sql_injection_risk: sqlItem.injectionRisk || false,
                        injection_sources: sqlItem.injectionSources || [],
                        template_vars: sqlItem.templateVars || [],
                        resolved_tables_from_vars: sqlItem.resolvedTables || [],
                        tables_referenced: Array.from(tables),
                        columns_referenced: Array.from(columns),
                        method: sqlItem.funcName,
                        raw_sql: sqlItem.sql.trim().slice(0, 200),
                        line_start: sqlItem.lineStart
                    }
                });
            }
        } catch (err) {
            console.error(`[SQL-Debug] Could not parse inner SQL at L${sqlItem.lineStart}:`, err);
        }
    }
}
