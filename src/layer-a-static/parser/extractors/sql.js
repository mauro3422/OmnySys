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
const IDENTIFIER_PATTERN = /^[a-zA-Z_$][a-zA-Z0-9_.]*$/;
const USER_INPUT_PATTERN =
    /(?:req\.body|req\.params|req\.query|req\.headers|request\.body|request\.params|request\.query|ctx\.body|ctx\.params|ctx\.query|ctx\.request|event\.body|input\.|userInput|formData)/;
const CONSTANT_DECLARATION_PATTERN =
    /(?:const|let)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*['"]([ a-zA-Z_][a-zA-Z0-9_]*)['"]/g;

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
function resolveTemplateVars(templateNode, code, constantValues) {
    const templateVars = [];
    const injectionSources = [];
    const resolvedTables = [];
    let injectionRisk = false;

    for (const child of templateNode.children) {
        if (child.type !== 'template_substitution') continue;
        const exprText = typeof code === 'string'
            ? code.slice(child.startIndex + 2, child.endIndex - 1).trim()
            : String(child.text || '')
                .replace(/^\$\{/, '')
                .replace(/\}$/, '')
                .trim();
        templateVars.push(exprText);

        if (USER_INPUT_PATTERN.test(exprText)) {
            injectionRisk = true;
            injectionSources.push(exprText);
        }

        if (IDENTIFIER_PATTERN.test(exprText)) {
            const varName = exprText.split('.').pop();
            const resolvedTable = constantValues.get(varName);
            if (resolvedTable) resolvedTables.push(resolvedTable);
        }
    }

    return { templateVars, injectionRisk, injectionSources, resolvedTables };
}

function buildConstantValues(code) {
    const constantValues = new Map();
    if (typeof code !== 'string' || code.length === 0) return constantValues;
    let match;

    while ((match = CONSTANT_DECLARATION_PATTERN.exec(code)) !== null) {
        constantValues.set(match[1], match[2]);
    }

    return constantValues;
}

/**
 * Busca sentencias SQL embebidas, las parsea con tree-sitter-sql
 * y las agrega como atoms al fileInfo.
 */
export async function extractSqlQueries(jsTree, code, fileInfo) {
    if (!fileInfo.atoms) fileInfo.atoms = [];

    // 1. Encontrar nodos que contienen SQL
    const constantValues = buildConstantValues(code);
    const sqlStrNodes = findSqlNodes(jsTree, code, constantValues);
    if (sqlStrNodes.length === 0) return;

    // 2. Parsear y Analizar SQL extraído
    const pool = getParserPool();
    const builder = new SqlAtomBuilder(fileInfo.filePath);

    for (const sqlItem of sqlStrNodes) {
        try {
            const sqlTree = await pool.withParser(async (parser) => {
                parser.setLanguage(Sql);
                return parser.parse(sqlItem.sql);
            });

            if (sqlTree) {
                const atom = builder.build(sqlItem, sqlTree);
                if (atom) fileInfo.definitions.push(atom);
            }
        } catch (err) {
            logger.error(`[SQL-Debug] Could not parse inner SQL at L${sqlItem.lineStart}:`, err);
        }
    }
}

/**
 * @private
 * Localizador de nodos SQL en el AST
 */
function findSqlNodes(jsTree, code, constantValues) {
    const nodes = [];
    walk(jsTree.rootNode, ['call_expression'], (callNode) => {
        const item = extractSqlFromCall(callNode, code, constantValues);
        if (item) nodes.push(item);
    });
    return nodes;
}

function extractSqlFromCall(callNode, code, constantValues) {
    const fnNode = callNode.childForFieldName('function');
    if (!fnNode || fnNode.type !== 'member_expression') return null;

    const methodName = text(fnNode.childForFieldName('property'), code);
    if (!DB_METHODS.includes(methodName)) return null;

    const firstArg = callNode.childForFieldName('arguments')?.children
        .find(c => c.type === 'string' || c.type === 'template_string');

    if (!firstArg) return null;

    let rawSql = text(firstArg, code);
    if (firstArg.type === 'string') {
        rawSql = rawSql.slice(1, -1);
    } else if (firstArg.type === 'template_string') {
        rawSql = rawSql.replace(/\$\{[^}]*\}/g, '_tbl_').slice(1, -1);
    }

    if (rawSql.trim().length <= 5) return null;

    const isDynamic = firstArg.type === 'template_string';
    const resolution = isDynamic
        ? resolveTemplateVars(firstArg, code, constantValues)
        : { templateVars: [], injectionRisk: false, injectionSources: [], resolvedTables: [] };

    return {
        sql: rawSql,
        lineStart: callNode.startPosition.row + 1,
        lineEnd: callNode.endPosition.row + 1,
        funcName: methodName,
        isDynamic,
        ...resolution
    };
}

/**
 * @private
 * Constructor de átomos de SQL
 */
class SqlAtomBuilder {
    constructor(filePath) {
        this.filePath = filePath;
    }

    build(sqlItem, sqlTree) {
        const { operation, tables, columns } = analyzer.analyze(sqlTree, sqlItem.sql);
        const isInjection = sqlItem.injectionRisk;

        const purpose = isInjection
            ? 'SQL_INJECTION_RISK'
            : analyzer.classifyPurpose(operation, tables, sqlItem.sql.trim().slice(0, 200), sqlItem.isDynamic);

        return {
            id: `${this.filePath || ''}::SQL_${operation}_L${sqlItem.lineStart}`,
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
                is_dynamic: sqlItem.isDynamic,
                sql_injection_risk: isInjection,
                injection_sources: sqlItem.injectionSources,
                template_vars: sqlItem.templateVars,
                resolved_tables_from_vars: sqlItem.resolvedTables,
                tables_referenced: Array.from(tables),
                columns_referenced: Array.from(columns),
                method: sqlItem.funcName,
                raw_sql: sqlItem.sql.trim().slice(0, 200),
                line_start: sqlItem.lineStart
            }
        };
    }
}
