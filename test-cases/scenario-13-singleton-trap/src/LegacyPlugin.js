/**
 * LegacyPlugin.js
 * 
 * TRAP: Este archivo importa la CLASE en lugar de la INSTANCIA
 * y crea su propia copia del bus, pensando que está usando el global.
 */

import { DataBus } from './ServiceManager.js';

const myBus = new DataBus();

export function runLegacyAction() {
    console.log("Legacy Plugin emitiendo datos...");
    // Esto NO llegará a ComponentA porque es otra instancia
    myBus.emit('data', "Mensaje desde el pasado");
}

/**
 * OTRO TRAP POSIBLE: 
 * import { mainBus } from '../src/ServiceManager.js'; 
 * Si el bundler no normaliza rutas, esto podría cargar el archivo dos veces.
 */
