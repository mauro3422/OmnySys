export class AsyncAnalysisHandler {
    constructor(db) {
        this.db = db;
    }

    handle(rows) {
        return rows.map(atom => ({
            id: atom.id,
            name: atom.name,
            file: atom.file_path,
            line: atom.line_start,
            isAsync: atom.is_async,
            hasNetworkCalls: atom.has_network_calls,
            hasErrorHandling: atom.has_error_handling,
            externalCallCount: atom.external_call_count,
            complexity: atom.complexity,
            importanceScore: atom.importance_score,
            riskLevel: atom.risk_level,
            archetype: atom.archetype_type
        }));
    }
}
