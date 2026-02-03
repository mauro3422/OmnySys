/**
 * CommandDispatcher.js
 * 
 * Procesa comandos de texto como "set speed 50"
 */

import { globalState } from './StateModel.js';

export function executeCommand(commandString) {
    const parts = commandString.split(' '); // Ej: ["set", "speed", "50"]

    if (parts[0] === 'set') {
        const key = parts[1];
        const value = parseFloat(parts[2]);

        // TRAP: Acceso dinámico por llave de string.
        // Si 'speed' se renombra en StateModel.js, esto seguirá buscando 'speed'.
        if (key in globalState) {
            globalState[key] = value;
            console.log(`Updated ${key} to ${value}`);
        } else {
            console.warn(`Property ${key} not found in state!`);
        }
    }
}
