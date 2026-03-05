export class RaceConditionHandler {
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
            scopeType: atom.scope_type,
            sharedStateAccess: JSON.parse(atom.shared_state_json || '[]'),
            complexity: atom.complexity,
            importanceScore: atom.importance_score,
            riskLevel: atom.risk_level,
            archetype: atom.archetype_type,
            purpose: atom.purpose_type,
            severity: this._calculateSeverity(atom)
        }));
    }

    _calculateSeverity(atom) {
        let severity = 0;
        if (atom.is_async) severity += 2;

        const sharedState = JSON.parse(atom.shared_state_json || '[]');
        severity += Math.min(sharedState.length * 2, 4);

        if (atom.scope_type === 'global') severity += 2;
        else if (atom.scope_type === 'closure') severity += 1;

        if (atom.complexity > 10) severity += 1;
        if (atom.complexity > 20) severity += 1;
        if (atom.importance_score > 0.8) severity += 1;

        return Math.min(severity, 10);
    }
}
