/**
 * Main.js
 * Intenta crear un worker que NO existe
 */

// TRAP: Este worker no existe en el proyecto
const worker = new Worker('./NonExistentWorker.js');

export function processData(data) {
    worker.postMessage({ type: 'PROCESS', payload: data });
}

worker.onmessage = (e) => {
    console.log('Result:', e.data);
};
