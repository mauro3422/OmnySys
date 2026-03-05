export class DuplicateHandler {
    constructor(db) {
        this.db = db;
    }

    handle(rows) {
        const groups = {};
        rows.forEach(row => {
            const groupKey = row.dna_json || row.isomorphic_hash;
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    groupSize: row.group_size,
                    instances: [],
                    urgencyScore: this._calculateUrgency(row)
                };
            }
            groups[groupKey].instances.push(this._formatInstance(row));
        });

        return Object.values(groups).sort((a, b) => b.urgencyScore - a.urgencyScore);
    }

    _calculateUrgency(row) {
        return Math.round(
            row.group_size *
            (row.importance_score || 0.1) *
            (1 + (row.change_frequency || 0))
        );
    }

    _formatInstance(row) {
        return {
            id: row.id,
            name: row.name,
            file: row.file_path,
            line: row.line_start,
            linesOfCode: row.lines_of_code,
            atomType: row.atom_type,
            archetype: row.archetype_type,
            purpose: row.purpose_type,
            changeFrequency: row.change_frequency,
            importanceScore: row.importance_score,
            callerCount: row.caller_count || 0
        };
    }
}
