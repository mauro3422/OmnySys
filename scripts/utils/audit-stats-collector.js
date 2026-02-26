/**
 * @fileoverview audit-stats-collector.js
 * 
 * Colector de estadísticas para la auditoría de calidad de datos.
 * Desacoplado del reporte para mejorar la mantenibilidad.
 */

/**
 * Inicializa el objeto de estadísticas vacías
 */
export function createInitialStats() {
    return {
        total: 0,
        withDefinitions: 0,
        withExports: 0,
        withImports: 0,
        withUsedBy: 0,
        withSemanticConnections: 0,
        withSemanticAnalysis: 0,
        withRiskScore: 0,
        withCalledBy: 0,
        withCalls: 0,

        totalDefinitions: 0,
        totalExports: 0,
        totalImports: 0,
        totalUsedBy: 0,
        totalSemanticConnections: 0,

        // Por tipo de definición
        classDefs: 0,
        functionDefs: 0,
        methodDefs: 0,
        variableDefs: 0,

        // Por tipo de archivo
        srcFiles: 0,
        testFiles: 0,
        configFiles: 0,
        scriptFiles: 0,
        otherFiles: 0
    };
}

/**
 * Procesa un archivo de storage y actualiza las estadísticas
 * @param {Object} data - Datos del archivo JSON de storage
 * @param {string} filePath - Ruta del archivo original
 * @param {Object} stats - Objeto de estadísticas a actualizar
 * @returns {Object} Problemas detectados en este archivo
 */
export function processFileData(data, filePath, stats) {
    const definitions = data.definitions || [];
    const exports = data.exports || [];
    const imports = data.imports || [];
    const usedBy = data.usedBy || [];

    const issues = {
        noDefinitions: definitions.length === 0,
        noExports: exports.length === 0,
        noImports: imports.length === 0,
        isolated: imports.length === 0 && usedBy.length === 0
    };

    // 1. Actualizar conteos base
    stats.total++;
    if (!issues.noDefinitions) {
        stats.withDefinitions++;
        stats.totalDefinitions += definitions.length;

        for (const def of definitions) {
            if (def.type === 'class') stats.classDefs++;
            else if (def.type === 'function') stats.functionDefs++;
            else if (def.type === 'method') stats.methodDefs++;
            else if (['variable', 'const'].includes(def.type)) stats.variableDefs++;
        }
    }

    if (!issues.noExports) {
        stats.withExports++;
        stats.totalExports += exports.length;
    }

    if (!issues.noImports) {
        stats.withImports++;
        stats.totalImports += imports.length;
    }

    if (usedBy.length > 0) {
        stats.withUsedBy++;
        stats.totalUsedBy += usedBy.length;
    }

    // 2. Otros campos
    if ((data.semanticConnections || []).length > 0) {
        stats.withSemanticConnections++;
        stats.totalSemanticConnections += data.semanticConnections.length;
    }

    if (data.semanticAnalysis && Object.keys(data.semanticAnalysis).length > 0) {
        stats.withSemanticAnalysis++;
    }

    if (data.riskScore) stats.withRiskScore++;
    if ((data.calledBy || []).length > 0) stats.withCalledBy++;
    if ((data.calls || []).length > 0) stats.withCalls++;

    // 3. Clasificar por tipo de archivo
    if (filePath.startsWith('src/')) stats.srcFiles++;
    else if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.startsWith('tests/')) stats.testFiles++;
    else if (filePath.includes('config')) stats.configFiles++;
    else if (filePath.startsWith('scripts/')) stats.scriptFiles++;
    else stats.otherFiles++;

    return issues;
}

/**
 * Calcula el Health Score basado en las estadísticas
 */
export function calculateHealthScore(stats) {
    const definitionScore = stats.withDefinitions / stats.total;
    const connectionScore = (stats.withImports + stats.withUsedBy) / (stats.total * 2);
    const semanticScore = stats.withSemanticConnections / stats.total;

    return ((definitionScore * 0.5) + (connectionScore * 0.3) + (semanticScore * 0.2)) * 100;
}
