/**
 * ComponentA.js
 * 
 * Usa el bus de datos principal.
 */

import { mainBus } from './ServiceManager.js';

export function setupComponentA() {
    mainBus.on('data', (d) => {
        console.log(`Component A recibió: ${d}`);
    });
}
