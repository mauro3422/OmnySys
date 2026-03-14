/**
 * @fileoverview architectural-debt-score.js
 *
 * Calcula score de deuda arquitectónica (0-100) basado en:
 * - Organización de directorios (files en lugar incorrecto)
 * - Patrones arquitectónicos (God Objects, Orphan Modules)
 * - Acoplamiento excesivo
 * - Duplicación conceptual y estructural
 *
 * Score: 0 = arquitectura perfecta, 100 = deuda máxima
 *
 * @module shared/compiler/architectural-debt-score
 */

import { createLogger } from '#utils/logger.js';
import {
    detectArchitecturalPattern,
    ARCHITECTURAL_PATTERNS
} from './architectural-pattern-detector.js';
import {
    analyzeDirectoryStructure,
    validateFileLocation,
    calculateArchitectureOrganizationScore
} from './directory-structure-analyzer.js';
import { detectHelperReuseOpportunities } from './helper-reuse-detector.js';

const logger = createLogger('OmnySys:ArchitecturalDebtScore');

/**
 * Pesos de cada categoría en el score final
 */
const CATEGORY_WEIGHTS = {
    directoryStructure: 0.25,
    patterns: 0.25,
    coupling: 0.25,
    duplication: 0.25
};

/**
 * Thresholds para severidad
 */
const SEVERITY_THRESHOLDS = {
    low: { min: 0, max: 25 },
    moderate: { min: 26, max: 50 },
    high: { min: 51, max: 75 },
    critical: { min: 76, max: 100 }
};

/**
 * Calcula score de deuda arquitectónica
 * @param {string} projectPath - Ruta del proyecto
 * @param {Object} repo - Repositorio con DB
 * @returns {Promise<Object>} Score y detalles
 */
export async function calculateArchitecturalDebtScore(projectPath, repo) {
    logger.info('[calculateArchitecturalDebtScore] Starting architectural debt analysis');

    // 1. Analizar estructura de directorios
    const conventions = analyzeDirectoryStructure(projectPath, repo);
    const directoryScore = await calculateDirectoryStructureScore(projectPath, repo, conventions);

    // 2. Analizar patrones arquitectónicos
    const patternScore = await calculatePatternScore(projectPath, repo);

    // 3. Analizar acoplamiento
    const couplingScore = await calculateCouplingScore(projectPath, repo);

    // 4. Analizar duplicación
    const duplicationScore = await calculateDuplicationScore(projectPath, repo);

    // 5. Calcular score ponderado
    const overallScore = Math.round(
        directoryScore.normalized * CATEGORY_WEIGHTS.directoryStructure +
        patternScore.normalized * CATEGORY_WEIGHTS.patterns +
        couplingScore.normalized * CATEGORY_WEIGHTS.coupling +
        duplicationScore.normalized * CATEGORY_WEIGHTS.duplication
    );

    // 6. Determinar nivel de severidad
    const level = getSeverityLevel(overallScore);

    // 7. Consolidar issues principales
    const topIssues = consolidateTopIssues([
        ...directoryScore.issues,
        ...patternScore.issues,
        ...couplingScore.issues,
        ...duplicationScore.issues
    ]);

    logger.info(`[calculateArchitecturalDebtScore] Overall score: ${overallScore}/100 (${level})`);

    return {
        overallScore,
        level,
        breakdown: {
            directoryStructure: {
                score: directoryScore.normalized,
                issues: directoryScore.issues.length,
                details: directoryScore.details
            },
            patterns: {
                score: patternScore.normalized,
                issues: patternScore.issues.length,
                details: patternScore.details
            },
            coupling: {
                score: couplingScore.normalized,
                issues: couplingScore.issues.length,
                details: couplingScore.details
            },
            duplication: {
                score: duplicationScore.normalized,
                issues: duplicationScore.issues.length,
                details: duplicationScore.details
            }
        },
        topIssues: topIssues.slice(0, 10),
        totalIssues: topIssues.length,
        categoryWeights: CATEGORY_WEIGHTS,
        calculatedAt: new Date().toISOString()
    };
}

/**
 * Calcula score de estructura de directorios
 */
async function calculateDirectoryStructureScore(projectPath, repo, conventions) {
    const issues = [];
    let totalFiles = 0;
    let filesInWrongPlace = 0;

    if (repo?.db) {
        // Obtener todos los archivos
        const files = repo.db.prepare(`
            SELECT DISTINCT file_path
            FROM atoms
            WHERE file_path IS NOT NULL
        `).all();

        totalFiles = files.length;

        // Verificar cada archivo
        for (const file of files) {
            const filePath = file.file_path.replace(/\\/g, '/');
            const fileName = filePath.split('/').pop();
            const fileType = detectFileType(fileName);

            if (fileType && fileType !== 'other') {
                const validation = validateFileLocation(filePath, fileType, conventions);

                if (!validation.isCorrect) {
                    filesInWrongPlace++;
                    issues.push({
                        type: 'file_in_wrong_directory',
                        file: filePath,
                        severity: 'low',
                        expectedDirectory: validation.expectedDirectory,
                        actualDirectory: validation.actualDirectory,
                        recommendation: `Move to ${validation.expectedDirectory}`
                    });
                }
            }
        }
    }

    // Calcular score (0 = todos en lugar correcto, 100 = todos mal ubicados)
    const wrongPlaceRatio = totalFiles > 0 ? filesInWrongPlace / totalFiles : 0;
    const normalized = Math.round(wrongPlaceRatio * 100);

    return {
        normalized,
        issues,
        details: {
            totalFiles,
            filesInWrongPlace,
            wrongPlaceRatio: Math.round(wrongPlaceRatio * 100 * 100) / 100
        }
    };
}

/**
 * Calcula score de patrones arquitectónicos
 */
async function calculatePatternScore(projectPath, repo) {
    const issues = [];
    let totalAtoms = 0;
    let problematicAtoms = 0;

    if (repo?.db) {
        // Obtener átomos con metadata arquitectónica
        const atoms = repo.db.prepare(`
            SELECT id, name, file_path, complexity, is_exported,
                   json_extract(dna_json, '$.semanticFingerprint') as fingerprint
            FROM atoms
            WHERE atom_type IN ('function', 'method', 'arrow', 'class')
              AND (is_removed IS NULL OR is_removed = 0)
        `).all();

        totalAtoms = atoms.length;

        // Analizar cada átomo
        for (const atom of atoms) {
            const metadata = {
                filePath: atom.file_path,
                name: atom.name,
                complexity: atom.complexity,
                isExported: atom.is_exported === 1,
                semanticFingerprint: atom.fingerprint
            };

            const pattern = detectArchitecturalPattern(metadata);

            if (pattern.patterns.length > 0 && pattern.severity !== 'low') {
                problematicAtoms++;

                for (const rec of pattern.recommendations) {
                    issues.push({
                        type: pattern.primaryPattern || 'architectural_issue',
                        file: metadata.filePath,
                        symbol: metadata.name,
                        severity: pattern.severity,
                        recommendation: rec.message,
                        suggestedStructure: rec.suggestedStructure
                    });
                }
            }
        }
    }

    // Calcular score
    const problematicRatio = totalAtoms > 0 ? problematicAtoms / totalAtoms : 0;
    const normalized = Math.min(100, Math.round(problematicRatio * 200)); // Multiplicador para penalizar más

    return {
        normalized,
        issues,
        details: {
            totalAtoms,
            problematicAtoms,
            problematicRatio: Math.round(problematicRatio * 100 * 100) / 100
        }
    };
}

/**
 * Calcula score de acoplamiento
 */
async function calculateCouplingScore(projectPath, repo) {
    const issues = [];
    let totalFiles = 0;
    let highCouplingFiles = 0;

    if (repo?.db) {
        // Obtener archivos con alto acoplamiento (muchos imports/dependencias)
        const files = repo.db.prepare(`
            SELECT file_path,
                   COUNT(DISTINCT json_extract(imports_json, '$[*].source')) as importCount
            FROM atoms
            WHERE imports_json IS NOT NULL
              AND (is_removed IS NULL OR is_removed = 0)
            GROUP BY file_path
            HAVING importCount > 10  // Threshold: más de 10 imports
        `).all();

        totalFiles = files.length;
        highCouplingFiles = files.length;

        for (const file of files) {
            issues.push({
                type: 'high_coupling',
                file: file.file_path,
                severity: 'medium',
                importCount: file.importCount,
                recommendation: 'Consider splitting into smaller modules or using dependency injection'
            });
        }
    }

    // Calcular score
    const highCouplingRatio = totalFiles > 0 ? highCouplingFiles / totalFiles : 0;
    const normalized = Math.round(highCouplingRatio * 100);

    return {
        normalized,
        issues,
        details: {
            totalFiles,
            highCouplingFiles,
            highCouplingRatio: Math.round(highCouplingRatio * 100 * 100) / 100
        }
    };
}

/**
 * Calcula score de duplicación
 */
async function calculateDuplicationScore(projectPath, repo) {
    const issues = [];
    let duplicateGroups = 0;
    let duplicateImplementations = 0;

    if (repo?.db) {
        // Obtener duplicados conceptuales
        const duplicates = repo.db.prepare(`
            SELECT json_extract(dna_json, '$.semanticFingerprint') as fingerprint,
                   COUNT(*) as instanceCount,
                   GROUP_CONCAT(file_path) as files
            FROM atoms
            WHERE json_extract(dna_json, '$.semanticFingerprint') IS NOT NULL
              AND json_extract(dna_json, '$.semanticFingerprint') != 'unknown:unknown:unknown'
              AND (is_removed IS NULL OR is_removed = 0)
            GROUP BY fingerprint
            HAVING instanceCount > 1
        `).all();

        duplicateGroups = duplicates.length;
        duplicateImplementations = duplicates.reduce((sum, d) => sum + d.instanceCount, 0);

        for (const dup of duplicates.slice(0, 20)) { // Top 20
            issues.push({
                type: 'conceptual_duplicate',
                semanticFingerprint: dup.fingerprint,
                instanceCount: dup.instanceCount,
                files: dup.files.split(','),
                severity: dup.instanceCount > 5 ? 'high' : 'medium',
                recommendation: `Consolidate ${dup.instanceCount} duplicate implementations`
            });
        }
    }

    // Calcular score (basado en grupos de duplicados)
    const normalized = Math.min(100, Math.round(duplicateGroups * 2)); // 50 grupos = 100

    return {
        normalized,
        issues,
        details: {
            duplicateGroups,
            duplicateImplementations,
            avgInstancesPerGroup: duplicateGroups > 0 ? Math.round(duplicateImplementations / duplicateGroups * 100) / 100 : 0
        }
    };
}

/**
 * Detecta tipo de archivo por nombre
 */
function detectFileType(fileName) {
    const name = fileName.toLowerCase();

    if (name.includes('util') || name.includes('helper') || name.includes('common')) {
        return 'helper';
    }
    if (name.includes('policy') || name.includes('guard') || name.includes('rule') || name.includes('validator')) {
        return 'policy';
    }
    if (name.includes('service') || name.includes('manager') || name.includes('orchestrator')) {
        return 'service';
    }
    if (name.includes('controller') || name.includes('handler') || name.includes('route')) {
        return 'controller';
    }
    if (name.includes('model') || name.includes('entity') || name.includes('schema')) {
        return 'model';
    }
    if (name.includes('test') || name.includes('spec')) {
        return 'test';
    }

    return 'other';
}

/**
 * Obtiene nivel de severidad basado en score
 */
function getSeverityLevel(score) {
    if (score <= SEVERITY_THRESHOLDS.low.max) return 'low';
    if (score <= SEVERITY_THRESHOLDS.moderate.max) return 'moderate';
    if (score <= SEVERITY_THRESHOLDS.high.max) return 'high';
    return 'critical';
}

/**
 * Consolida y ordena issues por severidad
 */
function consolidateTopIssues(allIssues) {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return allIssues
        .sort((a, b) => {
            const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
            if (severityDiff !== 0) return severityDiff;
            return a.file.localeCompare(b.file);
        });
}

/**
 * Export principal
 */
export default calculateArchitecturalDebtScore;
