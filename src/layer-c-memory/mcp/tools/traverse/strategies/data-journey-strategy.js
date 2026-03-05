import { getRepository } from '../../../../storage/repository/index.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:traverse:data-journey');

/**
 * DataJourneyStrategy - Sprint 11
 * Rastreador determinístico del viaje de los datos a través de capas.
 */
export class DataJourneyStrategy {
    constructor(repo) {
        this.repo = repo;
    }

    async execute(projectPath, filePath, options = {}) {
        const { symbolName, variableName, maxHops = 5 } = options;

        if (!symbolName && !variableName) {
            throw new Error('symbolName or variableName required for trace_data_flow');
        }

        const repo = this.repo || getRepository(projectPath);
        this.db = repo.db;

        logger.info(`Starting Data Journey for ${symbolName || variableName} (Max Hops: ${maxHops})`);

        // 1. Encontrar punto de partida (Seed)
        const seedAtoms = this._findSeedAtoms(filePath, symbolName, variableName);
        if (seedAtoms.length === 0) {
            throw new Error(`Starting point not found: ${symbolName || variableName} in ${filePath}`);
        }

        // 2. Traversal (BFS)
        const journey = await this._traceJourney(seedAtoms, maxHops);

        return {
            seed: { filePath, symbolName, variableName },
            hops: journey.length,
            path: journey,
            summary: this._summarizeJourney(journey)
        };
    }

    _findSeedAtoms(filePath, symbolName, variableName) {
        let query = 'SELECT * FROM atoms WHERE 1=1';
        const params = [];

        if (filePath) {
            query += ' AND file_path = ?';
            params.push(filePath);
        }

        if (symbolName) {
            query += ' AND name = ?';
            params.push(symbolName);
        } else if (variableName) {
            // Buscar por metadatos de flujo de datos si es una variable
            query += " AND (name = ? OR data_flow_json LIKE ?)";
            params.push(variableName);
            params.push(`%${variableName}%`);
        }

        return this.db.prepare(query).all(...params);
    }

    async _traceJourney(seeds, maxHops) {
        const visited = new Set();
        const queue = seeds.map(atom => ({
            atom,
            depth: 0,
            path: [this._atomToNode(atom, 'START')]
        }));
        const results = [];

        while (queue.length > 0) {
            const { atom, depth, path } = queue.shift();

            if (depth >= maxHops) continue;
            if (visited.has(atom.id)) continue;
            visited.add(atom.id);

            // Encontrar conexiones salientes (Next Hops)
            const relations = this.db.prepare(`
                SELECT ar.*, a.name as target_name, a.file_path as target_file, a.atom_type as target_type
                FROM atom_relations ar
                JOIN atoms a ON ar.target_id = a.id
                WHERE ar.source_id = ?
            `).all(atom.id);

            for (const rel of relations) {
                const node = {
                    id: rel.target_id,
                    name: rel.target_name,
                    file: rel.target_file,
                    type: rel.relation_type,
                    context: rel.context_json ? JSON.parse(rel.context_json) : null
                };

                const newPath = [...path, node];

                // Si llegamos a un destino o simplemente acumulamos el viaje
                results.push(newPath);

                // En una implementación real, buscaríamos el átomo completo para seguir el BFS
                const nextAtom = this.db.prepare('SELECT * FROM atoms WHERE id = ?').get(rel.target_id);
                if (nextAtom) {
                    queue.push({ atom: nextAtom, depth: depth + 1, path: newPath });
                }
            }
        }

        // Devolvemos el camino más largo o una colección de caminos
        return results.sort((a, b) => b.length - a.length)[0] || [];
    }

    _atomToNode(atom, relationType) {
        return {
            id: atom.id,
            name: atom.name,
            file: atom.file_path,
            type: relationType
        };
    }

    _summarizeJourney(path) {
        if (!path || path.length === 0) return "No journey found";

        const segments = path.map((node, i) => {
            if (i === 0) return `[${node.name}]`;
            let arrow = ' -> ';
            if (node.type === 'shares_state') arrow = ' --(shared state)--> ';
            if (node.type === 'emits' || node.type === 'listens') arrow = ' ~~(event)~~> ';
            return `${arrow}[${node.name} in ${node.file}]`;
        });

        return segments.join('');
    }
}
