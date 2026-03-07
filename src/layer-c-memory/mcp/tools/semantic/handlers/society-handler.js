
/**
 * SocietyHandler
 * 
 * Logic handler for semantic society queries and mappings.
 * Decouples domain grouping logic from the tool class.
 */
export class SocietyHandler {
    constructor(logger = console) {
        this.logger = logger;
    }

    /**
     * Map raw database rows to society objects.
     */
    mapSocieties(rows) {
        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            type: row.type,
            cohesion: row.cohesion_score,
            entropy: row.entropy_score,
            moleculeCount: row.molecule_count,
            metadata: JSON.parse(row.metadata_json || '{}'),
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    }

    /**
     * Map atom connection rows.
     */
    mapConnections(rows) {
        return rows.map(row => ({
            id: row.id,
            type: row.connection_type,
            source: row.source_path,
            target: row.target_path,
            key: row.connection_key,
            context: JSON.parse(row.context_json || '{}'),
            weight: row.weight,
            createdAt: row.created_at
        }));
    }

    /**
     * Build the final society result with pagination.
     */
    buildResult(queryResult, semanticSurface, options = {}) {
        const { offset = 0, limit = 20 } = options;
        return {
            total: queryResult.total,
            offset,
            limit,
            hasMore: offset + limit < queryResult.total,
            granularity: semanticSurface.contract,
            semanticByType: semanticSurface.fileLevel.byType,
            connections: this.mapConnections(queryResult.rows)
        };
    }

    /**
     * Build the where clause for society queries.
     */
    buildQuery(options = {}) {
        const { connectionType, filePath } = options;
        const clauses = ['WHERE (is_removed IS NULL OR is_removed = 0)'];
        const params = [];

        if (connectionType && connectionType !== 'all') {
            clauses.push('AND connection_type = ?');
            params.push(connectionType);
        }

        if (filePath) {
            clauses.push('AND (source_path = ? OR target_path = ?)');
            params.push(filePath, filePath);
        }

        return {
            whereClause: clauses.join(' '),
            params
        };
    }

    /**
     * Load rows for atom society.
     */
    loadRows(db, options = {}) {
        const { offset = 0, limit = 20 } = options;
        const { whereClause, params } = this.buildQuery(options);

        const rows = db.prepare(`
            SELECT COUNT(*) OVER() as total_count,
                   id, connection_type, source_path, target_path,
                   connection_key, context_json, weight, created_at
            FROM semantic_connections
            ${whereClause}
            ORDER BY weight DESC, created_at DESC
            LIMIT ? OFFSET ?
        `).all(...params, limit, offset);

        return {
            total: rows[0]?.total_count || 0,
            rows
        };
    }
}

export default SocietyHandler;
