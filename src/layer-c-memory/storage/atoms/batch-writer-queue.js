export class BatchWriterQueue {
    #pending = new Map();
    #stats = {
        writesDeduped: 0,
        writesTotal: 0
    };

    /**
     * Agrega o actualiza un request de escritura
     */
    add(path, data, options = {}, itemPromiseControls) {
        const { source = 'unknown', priority = 0 } = options;
        const existing = this.#pending.get(path);

        if (existing) {
            this.#stats.writesDeduped++;
            existing.data = data;
            existing.source = source;
            existing.priority = Math.max(existing.priority, priority);
            existing.updatedAt = Date.now();

            existing.resolve(); // Resuelve la promesa anterior, la nueva tomará su lugar
            existing.resolve = () => { };
            existing.reject = () => { };
        } else {
            this.#pending.set(path, {
                path,
                data,
                source,
                priority,
                addedAt: Date.now(),
                updatedAt: Date.now(),
                ...itemPromiseControls
            });
            this.#stats.writesTotal++;
        }
    }

    get(path) {
        return this.#pending.get(path);
    }

    /**
     * Retorna y elimina del queue una cantidad específica de pendientes por prioridad
     */
    takeBatch(batchSize) {
        const items = Array.from(this.#pending.values())
            .sort((a, b) => b.priority - a.priority)
            .slice(0, batchSize);

        for (const item of items) {
            this.#pending.delete(item.path);
        }

        return items;
    }

    get size() {
        return this.#pending.size;
    }

    get stats() {
        return { ...this.#stats };
    }

    clear() {
        const cleared = this.#pending.size;

        for (const item of this.#pending.values()) {
            item.reject(new Error('Batch writer cleared'));
        }

        this.#pending.clear();
        return cleared;
    }
}
