/**
 * @fileoverview duplicate-utils.js
 *
 * API unificada para detección, coordinación y tracking de duplicados.
 * Centraliza lógica común entre duplicate-risk (structural) y conceptual-duplicate-risk guards.
 *
 * Integra:
 * - generateAlternativeNames: Lógica unificada para sugerencias de renombrado
 * - normalizeFilePath: Normalización de rutas para Windows/Unix
 * - coordinateDuplicateFindings: Coordina structural + conceptual duplicates
 * - loadPreviousFindings: Carga findings previos de semantic_issues
 *
 * @module shared/compiler/duplicate-utils
 */

export {
    buildDuplicateDebtHistory,
    buildDuplicateContext
} from './duplicate-debt.js';

export { normalizeFilePath } from './path-normalization.js';

import { normalizeFilePath } from './path-normalization.js';

// Logger opcional - descomentar si se necesita debug
// import { createLogger } from '../../logger-system.js';
// const logger = createLogger('OmnySys:compiler:duplicate-utils');

/**
 * Genera nombres alternativos para evitar colisiones de duplicados
 * Combina estrategias de duplicate-risk.js y conceptual-duplicate-risk.js
 *
 * @param {string} originalName - Nombre original de la función
 * @param {string} [existingName] - Nombre de la función existente (opcional)
 * @returns {string[]} Array de nombres alternativos sugeridos (4-6 opciones)
 */
export function generateAlternativeNames(originalName, existingName = null) {
    const alternatives = [];

    // Si hay una función existente, sugerir reutilización (estrategia conceptual-duplicate-risk)
    if (existingName) {
        alternatives.push(`Reuse ${existingName}`);

        // Sugerir renombrar con prefijo específico
        const prefixes = ['create', 'build', 'compute', 'generate', 'make'];
        const lowerName = originalName.toLowerCase();

        for (const prefix of prefixes) {
            if (lowerName.startsWith(prefix)) {
                alternatives.push(`${prefix}Specific${originalName.slice(prefix.length)}`);
                break;
            }
        }

        alternatives.push(`Merge with ${existingName}`);
    }

    // Estrategia de duplicate-risk (siempre aplicar)
    const suffixes = ['New', 'V2', 'Ext', 'Impl', 'Async'];
    for (const suffix of suffixes) {
        alternatives.push(`${originalName}${suffix}`);
    }

    const prefixes = ['fetch', 'load', 'build', 'compute', 'process'];
    const lowerName = originalName.toLowerCase();

    for (const prefix of prefixes) {
        if (lowerName.startsWith(prefix)) {
            const rest = originalName.slice(prefix.length);
            const altPrefixes = prefixes.filter(p => p !== prefix);
            for (const altPrefix of altPrefixes.slice(0, 2)) {
                alternatives.push(`${altPrefix}${rest}`);
            }
            break;
        }
    }

    return [...new Set(alternatives)].slice(0, 6);
}

const LOW_SIGNAL_GENERATED_ATOM_NAME_REGEX = /^(anonymous(_\d+)?|.*_callback|describe_arg\d+|it_arg\d+|on_arg\d+|then_callback|catch_callback|map_callback|filter_callback|some_callback|sort_callback|get_arg\d+)$/i;
const LOW_SIGNAL_GENERATED_FINGERPRINT_ENTITY_REGEX = /:(anonymous(?:_\d+)?|.*_callback|describe_arg\d+|it_arg\d+|on_arg\d+|then_callback|catch_callback|map_callback|filter_callback|some_callback|sort_callback|get_arg\d+)$/i;

/**
 * Detecta nombres/huellas generadas por callbacks de runtime o test DSLs. Estos
 * artefactos inflan la deuda conceptual del proyecto pero no representan APIs reales.
 *
 * @param {string} atomName
 * @param {string} semanticFingerprint
 * @returns {boolean}
 */
export function isLowSignalGeneratedAtom(atomName, semanticFingerprint) {
    const normalizedName = String(atomName || '').toLowerCase();
    const fingerprint = String(semanticFingerprint || '').toLowerCase();

    return LOW_SIGNAL_GENERATED_ATOM_NAME_REGEX.test(normalizedName) ||
        LOW_SIGNAL_GENERATED_FINGERPRINT_ENTITY_REGEX.test(fingerprint);
}

/**
 * Determina si un semantic fingerprint es demasiado genérico para reportarse como
 * duplicado conceptual de alto valor. Esto reduce ruido en helpers de acceso a datos.
 *
 * @param {string} filePath
 * @param {string} atomName
 * @param {string} semanticFingerprint
 * @returns {boolean}
 */
export function isLowSignalConceptualFingerprint(filePath, atomName, semanticFingerprint) {
    const normalizedPath = normalizeFilePath(filePath).toLowerCase();
    const normalizedName = String(atomName || '').toLowerCase();
    const fingerprint = String(semanticFingerprint || '').toLowerCase();

    const lowSignalFingerprints = new Set([
        'get:core:atoms',
        'get:core:relations',
        'get:core:imports',
        'get:core:context',
        'get:core:count',
        'get:core:rows',
        'get:core:issue',
        'get:core:issues',
        'load:core:rows',
        'load:core:issue',
        'load:core:issues',
        'load:core:connections',
        'normalize:core:message'
    ]);

    const dataAccessPathMarkers = [
        '/repository/',
        '/query/',
        '/storage/',
        '/guards/'
    ];

    const dataAccessNamePrefixes = [
        'get',
        'load',
        'fetch',
        'list',
        'find',
        'select',
        'normalize'
    ];

    const isDataAccessPath = dataAccessPathMarkers.some(marker => normalizedPath.includes(marker));
    const isDataAccessName = dataAccessNamePrefixes.some(prefix => normalizedName.startsWith(prefix));

    return isDataAccessPath && isDataAccessName && lowSignalFingerprints.has(fingerprint);
}

function matchesAnyPrefix(value, prefixes) {
    return prefixes.some(prefix => value.startsWith(prefix));
}

const REPOSITORY_SURFACE_PATH_MARKERS = [
    '/storage/repository/',
    '/query/queries/file-query/',
    '/mcp/tools/semantic/'
];

const REPOSITORY_SURFACE_NAMES = new Set([
    'query',
    'getall',
    'findbyname',
    'findbyarchetype',
    'findbypurpose',
    'findsimilar',
    'updatevectors'
]);

const REPOSITORY_SURFACE_FINGERPRINTS = new Set([
    'process:core:query',
    'get:core:all',
    'find:core:name',
    'find:core:archetype',
    'find:core:purpose',
    'find:core:similar',
    'update:core:vectors'
]);

/**
 * Identifica métodos de superficie contractual de repositorio. Estos métodos
 * se repiten intencionalmente entre contratos base, adapters y query facades.
 *
 * @param {string} filePath
 * @param {string} atomName
 * @param {string} semanticFingerprint
 * @returns {boolean}
 */
export function isRepositoryContractSurface(filePath, atomName, semanticFingerprint) {
    const normalizedPath = normalizeFilePath(filePath).toLowerCase();
    const normalizedName = String(atomName || '').toLowerCase();
    const fingerprint = String(semanticFingerprint || '').toLowerCase();

    const isRepositoryPath = REPOSITORY_SURFACE_PATH_MARKERS.some((marker) => normalizedPath.includes(marker));
    if (!isRepositoryPath) return false;

    return REPOSITORY_SURFACE_NAMES.has(normalizedName) ||
        REPOSITORY_SURFACE_FINGERPRINTS.has(fingerprint);
}

/**
 * Clasifica fingerprints conceptuales con demasiado solapamiento semántico para guards,
 * logging y utilidades internas. La meta es no tratarlos como "API pública duplicada".
 *
 * @param {string} filePath
 * @param {string} atomName
 * @param {string} semanticFingerprint
 * @returns {boolean}
 */
export function isGuardUtilityConceptualFingerprint(filePath, atomName, semanticFingerprint) {
    const normalizedPath = normalizeFilePath(filePath).toLowerCase();
    const normalizedName = String(atomName || '').toLowerCase();
    const fingerprint = String(semanticFingerprint || '').toLowerCase();

    const guardPathMarkers = [
        '/file-watcher/guards/',
        '/shared/compiler/',
        '/logger',
        '/logging/'
    ];

    const lowSignalFingerprints = new Set([
        'detect:core:risk',
        'load:core:atoms',
        'load:core:rows',
        'process:core:log',
        'generate:core:recommendations',
        'build:core:context',
        'process:core:findings',
        'process:core:finding',
        'run:core:guard'
    ]);

    const lowSignalNamePrefixes = [
        'detect',
        'debug',
        'log',
        'generate',
        'build',
        'collect',
        'coordinate',
        'persist',
        'run'
    ];

    const isGuardUtilityPath = guardPathMarkers.some(marker => normalizedPath.includes(marker));
    const isGuardUtilityName = matchesAnyPrefix(normalizedName, lowSignalNamePrefixes);

    return isGuardUtilityPath && isGuardUtilityName && lowSignalFingerprints.has(fingerprint);
}

/**
 * Helpers internos de guards con formas muy genéricas. Su repetición entre
 * detectores/guards es frecuente y no representa deuda estructural prioritaria.
 *
 * @param {string} filePath
 * @param {string} atomName
 * @returns {boolean}
 */
export function isLowSignalGuardStructuralHelper(filePath, atomName) {
    const normalizedPath = normalizeFilePath(filePath).toLowerCase();
    const normalizedName = String(atomName || '').toLowerCase();

    const guardPathMarkers = [
        '/file-watcher/guards/',
        '/shared/compiler/'
    ];

    const isGuardPath = guardPathMarkers.some((marker) => normalizedPath.includes(marker));
    if (!isGuardPath) return false;

    return /^detect[a-z0-9]+risk$/i.test(normalizedName) ||
        /^load[a-z0-9]+(rows|atoms)$/i.test(normalizedName);
}

/**
 * Filtro canónico para decidir si un finding conceptual debe ignorarse por baja señal.
 *
 * @param {string} filePath
 * @param {string} atomName
 * @param {string} semanticFingerprint
 * @returns {boolean}
 */
export function shouldIgnoreConceptualDuplicateFinding(filePath, atomName, semanticFingerprint) {
    return isLowSignalGeneratedAtom(atomName, semanticFingerprint) ||
        isRepositoryContractSurface(filePath, atomName, semanticFingerprint) ||
        isLowSignalConceptualFingerprint(filePath, atomName, semanticFingerprint) ||
        isGuardUtilityConceptualFingerprint(filePath, atomName, semanticFingerprint);
}

/**
 * Filtro canónico para duplicados estructurales de baja señal.
 *
 * @param {string} filePath
 * @param {string} atomName
 * @returns {boolean}
 */
export function shouldIgnoreStructuralDuplicateFinding(filePath, atomName) {
    return isRepositoryContractSurface(filePath, atomName, null) ||
        isLowSignalGuardStructuralHelper(filePath, atomName);
}

/**
 * Combina findings de duplicados estructurales y conceptuales
 * Detecta solapamiento y prioriza resolución
 *
 * @param {Array<Object>} structuralFindings - Duplicados por DNA hash (LOGIC_DUPLICATE)
 * @param {Array<Object>} conceptualFindings - Duplicados por semantic fingerprint (CONCEPTUAL_DUPLICATE)
 * @returns {Object} Findings combinados con coordinación y recomendaciones
 */
export function coordinateDuplicateFindings(structuralFindings = [], conceptualFindings = []) {
    const coordinated = {
        structural: structuralFindings,
        conceptual: conceptualFindings,
        hasOverlap: false,
        overlapDetails: [],
        totalFindings: structuralFindings.length + conceptualFindings.length,
        priority: 'structural', // Priorizar structural primero (misma implementación)
        combinedRemediation: []
    };

    // Detectar solapamiento: mismos símbolos en ambos tipos de duplicados
    if (structuralFindings.length > 0 && conceptualFindings.length > 0) {
        const structuralSymbols = new Set(structuralFindings.map(f => f.symbol));
        const conceptualSymbols = new Set(conceptualFindings.map(f => f.symbol));

        const overlap = [...structuralSymbols].filter(s => conceptualSymbols.has(s));

        if (overlap.length > 0) {
            coordinated.hasOverlap = true;
            coordinated.overlapDetails = overlap.map(symbol => {
                const structuralCount = structuralFindings.filter(f => f.symbol === symbol).length;
                const conceptualCount = conceptualFindings.filter(f => f.symbol === symbol).length;

                return {
                    symbol,
                    structuralCount,
                    conceptualCount,
                    totalInstances: structuralCount + conceptualCount,
                    recommendation: 'CRITICAL: Same symbol has both structural (DNA) and conceptual (semantic) duplicates. Resolve structural first.',
                    suggestedAction: `Consolidate all ${structuralCount + conceptualCount} variants into a single canonical implementation`
                };
            });

            // Si hay overlap, la prioridad es aún más crítica
            coordinated.priority = 'structural-critical';
        }
    }

    // Generar remediación combinada
    if (structuralFindings.length > 0) {
        coordinated.combinedRemediation.push({
            phase: 1,
            type: 'structural',
            action: 'Resolve DNA/structural duplicates first (identical implementation)',
            count: structuralFindings.length
        });
    }

    if (conceptualFindings.length > 0) {
        coordinated.combinedRemediation.push({
            phase: 2,
            type: 'conceptual',
            action: 'Review conceptual duplicates (same purpose, different implementation)',
            count: conceptualFindings.length
        });
    }

    return coordinated;
}

/**
 * Carga findings previos de semantic_issues para trackear historial
 *
 * @param {Object} db - SQLite database connection
 * @param {string} filePath - Archivo a consultar
 * @param {string} [issueTypePrefix] - Prefijo de issue type (ej: 'code_duplicate', 'code_conceptual_duplicate')
 * @returns {Array<Object>} Findings previos extraídos del contexto
 */
export function loadPreviousFindings(db, filePath, issueTypePrefix = 'code_duplicate') {
    try {
        if (!db || !filePath) return [];

        const normalizedPath = normalizeFilePath(filePath);

        // Buscar issues previos del mismo tipo para este archivo
        const rows = db.prepare(`
            SELECT context_json, detected_at
            FROM semantic_issues
            WHERE file_path = ?
              AND issue_type LIKE ?
              AND message LIKE '[watcher]%'
            ORDER BY detected_at DESC
            LIMIT 1
        `).all(normalizedPath, `${issueTypePrefix}%`);

        if (rows.length === 0) return [];

        // Extraer findings del contexto JSON
        const findings = [];
        for (const row of rows) {
            try {
                const context = JSON.parse(row.context_json);
                if (context?.findings && Array.isArray(context.findings)) {
                    findings.push(...context.findings);
                }
            } catch (e) {
                // logger.debug(`[LOAD PREVIOUS FINDINGS] Parse error for ${filePath}: ${e.message}`);
                console.debug(`[LOAD PREVIOUS FINDINGS] Parse error for ${filePath}: ${e.message}`);
            }
        }

        return findings;
    } catch (error) {
        // logger.debug(`[LOAD PREVIOUS FINDINGS] Error for ${filePath}: ${error.message}`);
        console.debug(`[LOAD PREVIOUS FINDINGS] Error for ${filePath}: ${error.message}`);
        return [];
    }
}
