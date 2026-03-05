import { getDependencyGraph } from '../../../../query/queries/dependency-query.js';

export class CallGraphStrategy {
    constructor(repo) {
        this.repo = repo;
    }

    async execute(projectPath, filePath, options) {
        if (!filePath) throw new Error('filePath required for call_graph');

        const depthNum = parseInt(options.depth || options.maxDepth || 2, 10);
        const tree = await getDependencyGraph(projectPath, filePath, depthNum);

        const result = {
            root: filePath,
            depth: depthNum,
            graph: tree
        };

        if (options.includeSemantic) {
            result.graph = this._enrichGraphWithSemantic(tree);
        }

        return result;
    }

    _enrichGraphWithSemantic(tree) {
        if (!tree || !tree.nodes) return tree;

        tree.nodes = tree.nodes.map(node => {
            if (!this.repo) return node;

            const atoms = this.repo.query({ filePath: node.file || node.filePath, limit: 100 });
            if (atoms.length === 0) return node;

            const hasSharedState = atoms.some(a => a.shared_state_json && a.shared_state_json !== '[]');
            const hasEvents = atoms.some(a =>
                (a.event_emitters_json && a.event_emitters_json !== '[]') ||
                (a.event_listeners_json && a.event_listeners_json !== '[]')
            );
            const asyncCount = atoms.filter(a => a.is_async).length;

            return {
                ...node,
                semantic: {
                    hasSharedState,
                    hasEvents,
                    asyncCount,
                    totalAtoms: atoms.length
                }
            };
        });

        return tree;
    }
}
