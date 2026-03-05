/**
 * MCP Tool: execute_sql
 * Permite ejecutar consultas SQL crudas contra la base de datos de OmnySys
 * Ideal para depuración avanzada y extracción métrica a bajo nivel.
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:mcp:execute-sql');

export async function execute_sql(args, context) {
    const { query, parameters = [] } = args;
    const { projectPath } = context;

    logger.info(`[Tool] execute_sql:\n  ${query}`);

    try {
        const repo = getRepository(projectPath);
        if (!repo || !repo.db) {
            throw new Error('Base de datos SQLite no inicializada para este proyecto');
        }

        // Verificar si es SELECT para usar .all() o si es UPDATE/INSERT para usar .run()
        const isSelect = query.trim().toUpperCase().startsWith('SELECT') || query.trim().toUpperCase().startsWith('PRAGMA') || query.trim().toUpperCase().startsWith('WITH');

        const stmt = repo.db.prepare(query);

        let result;
        if (isSelect) {
            result = stmt.all(...parameters);
        } else {
            result = stmt.run(...parameters);
        }

        return {
            success: true,
            queryType: isSelect ? 'SELECT' : 'MUTATION',
            rowCount: isSelect ? result.length : result.changes,
            data: result
        };

    } catch (error) {
        logger.error(`[Tool] execute_sql error: ${error.message}`);

        let schemaHints = null;
        try {
            // Extraer nombre de tabla para dar ayuda contextual si falla por columna inexistente
            const tableMatch = query.match(/(?:FROM|JOIN|UPDATE|INTO)\s+([a-zA-Z0-9_]+)/i);
            if (tableMatch && tableMatch[1]) {
                const tableName = tableMatch[1];
                const columns = repo.db.prepare(`PRAGMA table_info(${tableName})`).all();
                if (columns && columns.length > 0) {
                    schemaHints = {
                        table: tableName,
                        columns: columns.map(c => ({ name: c.name, type: c.type }))
                    };
                }
            }
        } catch (hintError) {
            // Ignorar si falla la extracción de la ayuda
        }

        return {
            success: false,
            error: error.message,
            query: query,
            schemaHints
        };
    }
}

export default { execute_sql };
