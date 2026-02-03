/**
 * ProcessorWorker.js
 * 
 * Worker que procesa datos pesados.
 */

self.onmessage = (e) => {
    const { type, payload } = e.data;

    if (type === 'PROCESS_NODES') {
        const result = payload.map(node => {
            // TRAP: Acceso directo a propiedades x, y.
            // Si el objeto cambia a node.pos.x, esto devolverá NaN.
            return {
                id: node.id,
                x: node.x + Math.random() * 2,
                y: node.y + Math.random() * 2
            };
        });

        self.postMessage(result);
    }
};
