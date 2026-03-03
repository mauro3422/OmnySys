/**
 * @fileoverview index.js
 * 
 * Punto de entrada para el gestor de sociedades (Pueblos).
 * 
 * @module layer-b-semantic/society-manager
 */

import { SocietyEngine } from './SocietyEngine.js';
import { SocietyPersistor } from './SocietyPersistor.js';

/**
 * Orquestador principal para el análisis de sociedades
 * @param {string} rootPath - Ruta del proyecto
 * @param {Object} options - Opciones de análisis
 */
export async function analyzeSocieties(rootPath, options = {}) {
    const engine = new SocietyEngine(rootPath, options);
    const persistor = new SocietyPersistor(rootPath);

    const societies = await engine.buildSocieties();
    await persistor.saveSocieties(societies);

    return {
        societiesCount: societies.length,
        societies
    };
}

export { SocietyEngine, SocietyPersistor };
