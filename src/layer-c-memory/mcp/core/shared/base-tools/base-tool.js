/**
 * @fileoverview Base class for all MCP Tools in OmnySys.
 * Encapsulates common logic: context injection, error handling,
 * logging, and standardized response formatting.
 */

import { createLogger } from '../../../../utils/logger.js';
import { applyPagination } from '../../pagination.js';

export class BaseMCPTool {
    /**
     * @param {string} toolName - El nombre de la herramienta para el logger
     */
    constructor(toolName) {
        this.name = toolName;
        this.logger = createLogger(`OmnySys:mcp:${toolName}`);
    }

    /**
     * Entry point universal para todas las herramientas.
     * Maneja el try-catch global y la inyección de contexto.
     * 
     * @param {Object} args - Argumentos de la requests MCP
     * @param {Object} context - Contexto del servidor (projectPath, orchestrator, etc)
     */
    async execute(args, context) {
        this.logger.info(`[Tool] ${this.name}() invoked`);
        this.context = context;
        this.projectPath = context.projectPath;

        // Validación de contexto básico
        if (!this.projectPath) {
            this.logger.error(`[Tool] ${this.name}() failed: Missing projectPath in context`);
            return this.formatError('SYSTEM_ERROR', 'No projectPath provided in MCP context');
        }

        try {
            // Delegamos a la implementación específica de la herramienta
            const result = await this.performAction(args);

            // Aplicación de paginación global si la herramienta retorna un array paginable
            // (asume que applyPagination sabe lidiar con la estrucutra O si ya viene paginado)
            // Nota: dejaremos que el router HTTP aplique la paginación final como lo hace ahora,
            // pero podríamos moverlo aquí en el futuro.

            return result;
        } catch (error) {
            this.logger.error(`[Tool] ${this.name} failed with unhandled exception: ${error.message}`);
            if (error.stack) {
                this.logger.debug(error.stack);
            }
            return this.formatError('INTERNAL_RUNTIME_ERROR', error.message);
        }
    }

    /**
     * Método abstracto que DEBEN implementar las clases hijas.
     * Contiene la lógica core de la herramienta.
     * 
     * @abstract
     * @param {Object} args 
     */
    async performAction(args) {
        throw new Error(`[BaseMCPTool] performAction() not implemented for ${this.name}`);
    }

    /**
     * Utilidad para formatear errores de forma estandarizada en el cliente
     */
    formatError(code, message, details = {}) {
        return {
            error: code,
            message,
            ...details,
            success: false
        };
    }

    /**
     * Utilidad para formatear éxitos estandarizados
     */
    formatSuccess(data, message = 'Success') {
        return {
            success: true,
            message,
            ...data
        };
    }

    async dispatchByKey({
        key,
        value,
        handlers,
        missingParamCode = 'MISSING_PARAMS',
        missingParamMessage,
        invalidParamCode = 'INVALID_PARAM',
        invalidParamMessage
    }) {
        if (!value) {
            return this.formatError(missingParamCode, missingParamMessage || `${key} is required`, {
                allowedValues: Object.keys(handlers)
            });
        }

        const handler = handlers[value];
        if (!handler) {
            return this.formatError(invalidParamCode, invalidParamMessage || `Unknown ${key}: ${value}`);
        }

        return await handler();
    }

    async runRoutedAction({
        routeKey,
        routeValue,
        handlers,
        debugMessage,
        debugContext,
        executionErrorCode = 'EXECUTION_ERROR',
        executionErrorMessage
    }) {
        if (debugMessage) {
            this.logger.debug(debugMessage, debugContext);
        }

        try {
            return await this.dispatchByKey({
                key: routeKey,
                value: routeValue,
                handlers
            });
        } catch (error) {
            const message = executionErrorMessage
                ? executionErrorMessage(error)
                : `Error executing ${routeKey} ${routeValue}: ${error.message}`;
            return this.formatError(executionErrorCode, message);
        }
    }
}
