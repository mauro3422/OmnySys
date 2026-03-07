
/**
 * GraphQueryHandler
 * 
 * Logic handler for direct graph queries (instances, details).
 * Decouples tool routing from semantic execution.
 */
export class GraphQueryHandler {
    constructor(logger = console) {
        this.logger = logger;
    }

    /**
     * Handles 'instances' query type.
     */
    handleInstances(atoms, options = {}) {
        return atoms.filter(Boolean).map(a => {
            const file = a.file_path || a.filePath || a.file;
            const base = {
                file,
                type: a.atom_type || a.type,
                id: a.id,
                params: a.params || [],
                exports: !!(a.is_exported || a.exports || false)
            };

            if (options.includeSemantic) {
                base.semantic = this.mapSemanticData(a);
            }

            return base;
        });
    }

    /**
     * Handles 'details' query type.
     */
    handleDetails(atom, options = {}) {
        if (options.includeSemantic) {
            atom.semantic = this.mapSemanticData(atom);
        }
        return atom;
    }

    /**
     * Common mapper for semantic metadata.
     */
    mapSemanticData(atom) {
        return {
            sharedStateAccess: JSON.parse(atom.shared_state_json || '[]'),
            eventEmitters: JSON.parse(atom.event_emitters_json || '[]'),
            eventListeners: JSON.parse(atom.event_listeners_json || '[]'),
            isAsync: !!atom.is_async,
            scopeType: atom.scope_type,
            hasNetworkCalls: !!atom.has_network_calls,
            hasErrorHandling: !!atom.has_error_handling,
            complexity: atom.complexity,
            instructionCount: atom.instruction_count
        };
    }
}

export default GraphQueryHandler;
