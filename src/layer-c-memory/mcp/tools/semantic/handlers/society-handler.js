
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
            advisorySummary: semanticSurface.persistedLegacyView,
            derivedFrom: 'atom_relations',
            connections: this.mapConnections(queryResult.rows)
        };
    }

    /**
     * Load rows for atom society.
     */
    loadRows(semanticSurface, options = {}) {
        const { offset = 0, limit = 20 } = options;
        const { connectionType, filePath } = options;
        const canonicalRows = (semanticSurface.canonicalAdapterView?.rows || [])
            .filter((row) => {
                if (connectionType && connectionType !== 'all' && row.semanticType !== connectionType) {
                    return false;
                }

                if (filePath && row.sourceFile !== filePath && row.targetFile !== filePath) {
                    return false;
                }

                return true;
            })
            .sort((left, right) => {
                const weightDelta = (Number(right.weight) || 0) - (Number(left.weight) || 0);
                if (weightDelta !== 0) {
                    return weightDelta;
                }

                return String(left.key || '').localeCompare(String(right.key || ''));
            })
            .map((row, index) => ({
                id: `${row.sourceFile}->${row.targetFile}:${row.semanticType}:${row.key || index}`,
                connection_type: row.semanticType,
                source_path: row.sourceFile,
                target_path: row.targetFile,
                connection_key: row.key,
                context_json: JSON.stringify(row.context || {}),
                weight: row.weight,
                created_at: null
            }));

        const rows = canonicalRows.slice(offset, offset + limit);

        return {
            total: canonicalRows.length,
            rows
        };
    }
}

export default SocietyHandler;
