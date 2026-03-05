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
import { SqlAnalyzer } from './sql-analyzer.js';

const Sql = SqlModule;
const logger = createLogger('OmnySys:extractor:sql');
const analyzer = new SqlAnalyzer(logger);
const DB_METHODS = ['prepare', 'exec', 'query'];

// Patrones que indican que una variable viene de input del usuario (riesgo de inyeccion)
const USER_INPUT_PATTERNS = [
    'req.body', 'req.params', 'req.query', 'req.headers',
    'request.body', 'request.params', 'request.query',
    'ctx.body', 'ctx.params', 'ctx.query', 'ctx.request',
    'event.body', 'input.', 'userInput', 'formData'
];

/**
 * Analiza las expresiones interpoladas en un template literal SQL.
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
 * Busca sentencias SQL embebidas, las parsea con tree-sitter-sql
 * y las agrega como atoms al fileInfo.
 */
export async function extractSqlQueries(jsTree, code, fileInfo) {
    if (!fileInfo.atoms) fileInfo.atoms = [];

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

            const firstArg = argsNode.children.find(c => c.type === 'string' || c.type === 'template_string');
            if (firstArg) {
                let rawSql = text(firstArg, code);
                if (firstArg.type === 'string') {
                    rawSql = rawSql.slice(1, -1);
                } else if (firstArg.type === 'template_string') {
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

    // Paso 2: Parsear y Analizar SQL extraído
    const pool = getParserPool();

    for (const sqlItem of sqlStrNodes) {
        try {
            const sqlTree = await pool.withParser((parser) => {
                parser.setLanguage(Sql);
                return parser.parse(sqlItem.sql);
            });

            if (sqlTree) {
                const { operation, tables, columns } = analyzer.analyze(sqlTree, sqlItem.sql);
                const purpose = (sqlItem.injectionRisk)
                    ? 'SQL_INJECTION_RISK'
                    : analyzer.classifyPurpose(operation, tables, sqlItem.sql.trim().slice(0, 200), sqlItem.isDynamic || false);

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
                    calls: [],
                    calledBy: [],
                    className: null,
                    externalCallCount: 0,
                    isExported: false,
                    isAsync: false,
                    isDeadCode: false,
                    extracted_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    _meta: {
                        sql_operation: operation,
                        sql_purpose: purpose,
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
            logger.error(`[SQL-Debug] Could not parse inner SQL at L${sqlItem.lineStart}:`, err);
        }
    }
}
