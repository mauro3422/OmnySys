/**
 * @fileoverview Clase base para herramientas MCP de consulta en el grafo.
 * Abstrae el acceso al repositorio SQLite y búsquedas recurrentes.
 */

import { BaseMCPTool } from './base-tool.js';
import { getRepository } from '../../../../storage/repository/repository-factory.js';

export class GraphQueryTool extends BaseMCPTool {
    constructor(toolName) {
        super(toolName);
        this.repo = null;
    }

    /**
     * Extiende la ejecución base para inicializar el repositorio
     * antes de correr la acción principal.
     */
    async execute(args, context) {
        try {
            this.repo = getRepository(context.projectPath);
        } catch (e) {
            // Usamos el logger de la clase base
            this.logger.error(`[GraphQueryTool] Failed to load repository: ${e.message}`);
            return this.formatError('REPO_UNAVAILABLE', 'Could not load Graph Repository');
        }

        // Delegar el resto del flujo de ejecución estándar a la clase base
        return super.execute(args, context);
    }

    /**
     * Utilidad estandarizada: Buscar todos los átomos de un archivo
     * @param {string} filePath 
     * @returns {Array} 
     */
    getAtomsByFile(filePath) {
        if (!this.repo) return [];
        return this.repo.query({ filePath, limit: 10000 });
    }

    /**
     * Utilidad estandarizada: Buscar átomo exacto por nombre y archivo
     * @param {string} name 
     * @param {string} filePath 
     * @returns {Object|null}
     */
    getExactAtom(name, filePath) {
        if (!this.repo) return null;
        const atoms = this.repo.query({ name, filePath });
        return atoms.length > 0 ? atoms[0] : null;
    }
}
