export class EventPatternHandler {
    constructor(db) {
        this.db = db;
    }

    handle(rows) {
        return rows.map(atom => ({
            id: atom.id,
            name: atom.name,
            file: atom.file_path,
            line: atom.line_start,
            eventEmitters: JSON.parse(atom.event_emitters_json || '[]'),
            eventEventListeners: JSON.parse(atom.event_listeners_json || '[]'),
            isAsync: atom.is_async,
            scopeType: atom.scope_type,
            complexity: atom.complexity,
            importanceScore: atom.importance_score,
            riskLevel: atom.risk_level,
            hasEmitters: !!(atom.event_emitters_json && atom.event_emitters_json !== '[]'),
            hasListeners: !!(atom.event_listeners_json && atom.event_listeners_json !== '[]')
        }));
    }
}
