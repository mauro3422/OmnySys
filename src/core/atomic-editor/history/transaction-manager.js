
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:atomic:transaction:manager');

export class TransactionManager {
    constructor(editor) {
        this.editor = editor;
        this.activeTransaction = null;
    }

    /**
     * Inicia una nueva transacción
     * @param {string} name - Nombre descriptivo de la transacción
     */
    async beginTransaction(name) {
        if (this.activeTransaction) {
            throw new Error(`Transaction "${this.activeTransaction.name}" already in progress`);
        }

        this.activeTransaction = {
            name,
            steps: [],
            startTime: Date.now()
        };
        logger.info(`[Transaction] Began: ${name}`);
    }

    /**
     * Registra un paso (operación con sus datos de undo) en la transacción activa
     * @param {string} filePath - Archivo afectado
     * @param {Object} undoData - Datos retornados por el editor para revertir
     */
    addStep(filePath, undoData) {
        if (!this.activeTransaction) return;

        this.activeTransaction.steps.push({
            filePath,
            undoData
        });
        logger.info(`[Transaction] Added step for ${filePath} in "${this.activeTransaction.name}"`);
    }

    /**
     * Finaliza la transacción actual (commit)
     */
    async commitTransaction() {
        if (!this.activeTransaction) return;

        logger.info(`[Transaction] Committed: ${this.activeTransaction.name} (${this.activeTransaction.steps.length} steps)`);
        this.activeTransaction = null;
    }

    /**
     * Revierte todos los pasos de la transacción activa en orden inverso
     */
    async rollbackTransaction() {
        if (!this.activeTransaction) return;

        logger.warn(`[Transaction] Rolling back: ${this.activeTransaction.name}`);

        // Revertir en orden inverso (pila)
        const steps = [...this.activeTransaction.steps].reverse();

        for (const step of steps) {
            try {
                await this.editor.undo(step.filePath, step.undoData);
                logger.info(`[Transaction] Rolled back ${step.filePath}`);
            } catch (err) {
                logger.error(`[Transaction] Fatal error during rollback of ${step.filePath}: ${err.message}`);
                // Intentamos seguir con el resto a pesar del error local
            }
        }

        this.activeTransaction = null;
    }

    /**
     * Ejecuta una serie de operaciones dentro de una transacción segura
     * @param {string} name - Nombre de la transacción
     * @param {Function} task - Función asíncrona que realiza las operaciones
     */
    async runInTransaction(name, task) {
        await this.beginTransaction(name);
        try {
            const result = await task(this);
            await this.commitTransaction();
            return result;
        } catch (err) {
            await this.rollbackTransaction();
            throw err;
        }
    }
}
