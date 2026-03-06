import { SemanticQueryTool } from './semantic/semantic-query-tool.js';
import { evaluateAtomSemanticPurity } from '../../../shared/compiler/index.js';

export class ImpactAtomicTool extends SemanticQueryTool {
    constructor() {
        super('impact:atomic');
    }

    resolveTargetAtom(symbolName, filePath) {
        if (filePath) {
            return this.getExactAtom(symbolName, filePath);
        }

        const atoms = this.repo.query({ name: symbolName });
        return atoms.length > 0 ? atoms[0] : null;
    }

    queryDependents(atom) {
        const stmt = this.repo.db.prepare(`
            WITH RECURSIVE callers(source_id, target_id, relation_type, depth) AS (
                SELECT source_id, target_id, relation_type, 1
                FROM atom_relations
                WHERE target_id = ? OR target_id LIKE ?
              UNION ALL
                SELECT ar.source_id, ar.target_id, ar.relation_type, c.depth + 1
                FROM atom_relations ar
                JOIN callers c ON ar.target_id = c.source_id
                WHERE c.depth < 10
            )
            SELECT
                c.source_id,
                min(c.depth) as min_depth,
                c.relation_type,
                a.name as atom_name,
                a.file_path as atom_file,
                a.atom_type
            FROM callers c
            LEFT JOIN atoms a ON a.id = c.source_id
            GROUP BY c.source_id
            ORDER BY min_depth ASC
        `);

        try {
            const results = stmt.all(atom.id, `%::${atom.name}`);
            return results.map(row => ({
                name: row.atom_name || row.source_id,
                file: row.atom_file || 'unknown',
                type: row.atom_type || 'unknown',
                relation: row.relation_type,
                depth: row.min_depth
            }));
        } catch (e) {
            this.logger.error(`Error running CTE for atom impact: ${e.message}`);
            return null;
        }
    }

    buildRecommendation(atom, dependents, intent, semanticPurity) {
        if (intent === 'signature_change') {
            return `Changing the signature of ${atom.name} will structurally break ${dependents.length} downstream atoms that consume it.`;
        }

        if (intent === 'deletion') {
            return `Deleting ${atom.name} will break functionality or leave dead code in ${dependents.length} downstream atoms.`;
        }

        if (intent === 'semantic_state_change') {
            return `Changing the internal state or side-effects of ${atom.name} will impact ${dependents.length} execution paths globally (purity score ${semanticPurity.score}).`;
        }

        return `${dependents.length} atoms structurally depend on ${atom.name}.`;
    }

    buildImpactAnalysis(atom, dependents, intent) {
        const semanticPurity = evaluateAtomSemanticPurity(atom);

        return {
            target: {
                name: atom.name,
                file: atom.file_path || atom.file,
                id: atom.id,
                params: atom.params || []
            },
            intent,
            totalDependents: dependents.length,
            dependents,
            recommendation: this.buildRecommendation(atom, dependents, intent, semanticPurity),
            semanticPurity
        };
    }

    async performAction(args) {
        const { filePath, symbolName, intent = 'usage' } = args;

        if (!symbolName) {
            return this.formatError('MISSING_PARAMS', 'symbolName is required. If you want file-level impact, use mcp_omnysystem_traverse_graph(impact_map).');
        }

        if (!this.repo || !this.repo.db) {
            return this.formatError('REPO_UNAVAILABLE', 'Repository or SQL DB not initialized');
        }

        const atom = this.resolveTargetAtom(symbolName, filePath);

        if (!atom) {
            return this.formatError('NOT_FOUND', `Symbol ${symbolName} not found.`);
        }

        const dependents = this.queryDependents(atom);

        if (!dependents) {
            return this.formatError('SQL_ERROR', 'Failed to trace atom relations recursively.');
        }

        return this.formatSuccess(this.buildImpactAnalysis(atom, dependents, intent));
    }
}

export const impact_atomic = async (args, context) => {
    const tool = new ImpactAtomicTool();
    return tool.execute(args, context);
};

export default { impact_atomic };
