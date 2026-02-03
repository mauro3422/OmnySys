/**
 * DataManager.js
 * 
 * Hilo principal que coordina los datos.
 */

const worker = new Worker('./ProcessorWorker.js');

export function dispatchNodes(nodes) {
    // Los nodos tienen estructura: { id: string, x: number, y: number }
    console.log("Enviando nodos al worker para procesar...");

    // TRAP: Si alguien cambia la estructura de 'nodes' aquí,
    // ProcessorWorker.js dejará de funcionar.
    worker.postMessage({
        type: 'PROCESS_NODES',
        payload: nodes
    });
}

worker.onmessage = (e) => {
    const processedNodes = e.data;
    updateUI(processedNodes);
};

function updateUI(nodes) {
    console.log(`Recibidos ${nodes.length} nodos procesados.`);
}
