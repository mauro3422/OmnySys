/**
 * @fileoverview atom-utils.js
 * 
 * Centraliza helpers para manejo y normalización de 'atoms' (funciones/clases)
 * asegurando compatibilidad entre los nombres de campos camelCase y snake_case.
 * 
 * @module shared/compiler/atom-utils
 */

/**
 * Obtiene el código fuente de un átomo
 * @param {Object} atom 
 * @returns {string}
 */
export function getAtomCode(atom = {}) {
    return atom.sourceCode || atom.code || '';
}

/**
 * Obtiene el propósito de un átomo
 * @param {Object} atom 
 * @returns {string}
 */
export function getAtomPurpose(atom = {}) {
    return atom.purpose || atom.purpose_type || '';
}

/**
 * Verifica si un átomo es asíncrono
 * @param {Object} atom 
 * @returns {boolean}
 */
export function isAsyncAtom(atom = {}) {
    return atom.isAsync === true || atom.is_async === true;
}

/**
 * Obtiene el acceso a estado compartido (sharedStateAccess)
 * @param {Object} atom 
 * @returns {Array}
 */
export function getSharedStateAccess(atom = {}) {
    return Array.isArray(atom.sharedStateAccess)
        ? atom.sharedStateAccess
        : Array.isArray(atom.shared_state_access)
            ? atom.shared_state_access
            : [];
}

/**
 * Verifica si un átomo tiene llamadas a red
 * @param {Object} atom 
 * @returns {boolean}
 */
export function hasNetworkCalls(atom = {}) {
    return atom.hasNetworkCalls === true || atom.has_network_calls === true;
}

/**
 * Verifica si un string coincide con algún patrón
 * @param {Array<RegExp>} patterns 
 * @param {string} text 
 * @returns {boolean}
 */
export function matchesAny(patterns, text = '') {
    return patterns.some((pattern) => pattern.test(text || ''));
}

export default {
    getAtomCode,
    getAtomPurpose,
    isAsyncAtom,
    getSharedStateAccess,
    hasNetworkCalls,
    matchesAny
};
