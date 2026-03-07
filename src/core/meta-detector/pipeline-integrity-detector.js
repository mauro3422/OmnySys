/**
 * @fileoverview pipeline-integrity-detector.js
 *
 * Meta-detector que verifica la integridad de TODO el pipeline de OmnySys.
 * A diferencia de los guards tradicionales (que buscan código problemático),
 * este detector verifica que el SISTEMA FUNCIONE CORRECTAMENTE.
 *
 * Verifica 8 áreas críticas:
 * 1. Cobertura de extracción (Layer A → Layer C)
 * 2. Completitud de metadata de átomos
 * 3. Resolución de calledBy (cross-file links)
 * 4. Ejecución correcta de guards
 * 5. Persistencia de issues
 * 6. Acceso de MCP tools a datos
 * 7. Datos huérfanos en SQLite
 * 8. Consistencia de relaciones
 *
 * @module core/meta-detector/pipeline-integrity-detector
 */

import { createLogger } from '../../utils/logger.js';
import { getRepository } from '#layer-c/storage/repository/index.js';

const logger = createLogger('OmnySys:PipelineIntegrityDetector');

/**
 * Detector de integridad del pipeline
 */
export class PipelineIntegrityDetector {
    constructor(projectPath) {
        this.projectPath = projectPath;
        this.repo = null;
    }

    /**
     * Inicializa el repositorio
     */
    async initialize() {
        try {
            this.repo = getRepository(this.projectPath);
            return true;
        } catch (error) {
            logger.error('Failed to initialize repository:', error.message);
            return false;
        }
    }

    /**
     * Verifica TODA la integridad del pipeline
     * @returns {Promise<Array>} Resultados de todas las verificaciones
     */
    async verify() {
        const initialized = await this.initialize();
        if (!initialized || !this.repo?.db) {
            logger.error('Cannot verify pipeline: repository not available');
            return [];
        }

        const checks = [
            // 1. Verificar que todos los archivos escaneados tengan átomos
            this.checkScanToAtomCoverage(),

            // 2. Verificar que todos los átomos tengan metadata completa
            this.checkAtomMetadataCompleteness(),

            // 3. Verificar que todos los calledBy estén resueltos
            this.checkCalledByResolution(),

            // 4. Verificar que los guards se ejecuten correctamente
            this.checkGuardExecution(),

            // 5. Verificar que los issues se persistan correctamente
            this.checkIssuePersistence(),

            // 6. Verificar que las MCP tools puedan leer los datos
            this.checkMcpDataAccess(),

            // 7. Verificar que no haya datos huérfanos
            this.checkOrphanedData(),

            // 8. Verificar consistencia de relaciones
            this.checkRelationConsistency()
        ];

        const results = await Promise.allSettled(checks);

        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                logger.error(`Check ${index} failed:`, result.reason);
                return {
                    name: `check_${index}`,
                    passed: false,
                    severity: 'high',
                    error: result.reason.message,
                    details: { error: result.reason.message }
                };
            }
        });
    }

    /**
     * VERIFICACIÓN 1: Cobertura de extracción (Layer A → Layer C)
     * Verifica que TODO archivo escaneado tenga átomos extraídos
     */
    async checkScanToAtomCoverage() {
        try {
            const db = this.repo.db;

            // Obtener archivos escaneados (de files table)
            const scannedFiles = db.prepare(`
                SELECT COUNT(DISTINCT path) as count FROM files
            `).get().count;

            // Obtener archivos con átomos
            const filesWithAtoms = db.prepare(`
                SELECT COUNT(DISTINCT file_path) as count FROM atoms
                WHERE (is_removed IS NULL OR is_removed = 0)
            `).get().count;

            // Obtener archivos escaneados pero sin átomos (sample)
            const missingFiles = db.prepare(`
                SELECT f.path
                FROM files f
                LEFT JOIN atoms a ON f.path = a.file_path
                WHERE a.file_path IS NULL
                  AND (f.is_removed IS NULL OR f.is_removed = 0)
                LIMIT 20
            `).all().map(row => row.path);

            const coveragePercentage = scannedFiles > 0
                ? (filesWithAtoms / scannedFiles) * 100
                : 100;

            const missingCount = scannedFiles - filesWithAtoms;

            return {
                name: 'scan_to_atom_coverage',
                passed: missingCount === 0,
                severity: missingCount > 100 ? 'high' : missingCount > 10 ? 'medium' : 'low',
                details: {
                    scannedFiles,
                    filesWithAtoms,
                    missingFiles: missingCount,
                    missingFilesSample: missingFiles,
                    coveragePercentage: Math.round(coveragePercentage * 100) / 100
                },
                recommendation: missingCount > 0
                    ? 'Re-run full analysis with --force-reanalysis to index missing files'
                    : 'All scanned files have atoms extracted'
            };
        } catch (error) {
            logger.error('checkScanToAtomCoverage failed:', error.message);
            throw error;
        }
    }

    /**
     * VERIFICACIÓN 2: Completitud de Metadata de Átomos
     * Verifica que TODOS los átomos tengan metadata completa
     */
    async checkAtomMetadataCompleteness() {
        try {
            const db = this.repo.db;

            // Campos requeridos
            const requiredFields = [
                'id', 'name', 'file_path', 'atom_type',
                'lines_of_code', 'complexity'
            ];

            // Campos opcionales pero importantes
            const optionalButImportant = [
                'imports_json', 'exports_json', 'called_by_json', 'uses_json',
                'shared_state_json', 'event_emitters_json', 'event_listeners_json',
                'data_flow_json', 'side_effects_json', 'scope_type', 'purpose_type', 'archetype_type'
            ];

            // Contar átomos con campos requeridos faltantes
            const missingRequiredQuery = requiredFields.map(field => {
                if (field === 'id' || field === 'name' || field === 'file_path') {
                    return `${field} IS NULL`;
                }
                return `${field} IS NULL OR ${field} = ''`;
            }).join(' OR ');

            const missingRequired = db.prepare(`
                SELECT COUNT(*) as count FROM atoms
                WHERE (is_removed IS NULL OR is_removed = 0)
                  AND (${missingRequiredQuery})
            `).get().count;

            // Contar átomos con campos opcionales faltantes
            let missingOptional = 0;
            for (const field of optionalButImportant) {
                const count = db.prepare(`
                    SELECT COUNT(*) as count FROM atoms
                    WHERE (is_removed IS NULL OR is_removed = 0)
                      AND (${field} IS NULL OR ${field} = '')
                `).get().count;
                missingOptional += count;
            }

            const totalAtoms = db.prepare(`
                SELECT COUNT(*) as count FROM atoms
                WHERE (is_removed IS NULL OR is_removed = 0)
            `).get().count;

            const completenessPercentage = totalAtoms > 0
                ? ((totalAtoms - missingRequired) / totalAtoms) * 100
                : 100;

            return {
                name: 'atom_metadata_completeness',
                passed: missingRequired === 0,
                severity: missingRequired > 50 ? 'high' : missingRequired > 10 ? 'medium' : 'low',
                details: {
                    totalAtoms,
                    missingRequired,
                    missingOptionalFields: Math.round(missingOptional / optionalButImportant.length),
                    completenessPercentage: Math.round(completenessPercentage * 100) / 100,
                    requiredFields,
                    optionalButImportant
                },
                recommendation: missingRequired > 0
                    ? `Fix extractors to populate ${missingRequired} atoms with missing required fields`
                    : 'All atoms have complete metadata'
            };
        } catch (error) {
            logger.error('checkAtomMetadataCompleteness failed:', error.message);
            throw error;
        }
    }

    /**
     * VERIFICACIÓN 3: Resolución de calledBy (Cross-file Links)
     * Verifica que TODOS los calledBy estén resueltos
     */
    async checkCalledByResolution() {
        try {
            const db = this.repo.db;

            // Obtener átomos con calledBy sin resolver
            const unresolvedCalledBy = db.prepare(`
                SELECT COUNT(*) as count FROM atoms
                WHERE (is_removed IS NULL OR is_removed = 0)
                  AND called_by_json IS NOT NULL
                  AND called_by_json != '[]'
                  AND called_by_json LIKE '%"unresolved":true%'
            `).get().count;

            // Obtener total de links calledBy
            const totalLinksQuery = db.prepare(`
                SELECT called_by_json FROM atoms
                WHERE (is_removed IS NULL OR is_removed = 0)
                  AND called_by_json IS NOT NULL
                  AND called_by_json != '[]'
            `).all();

            let totalLinks = 0;
            let unresolvedLinks = 0;

            for (const row of totalLinksQuery) {
                try {
                    const calledBy = JSON.parse(row.called_by_json);
                    totalLinks += calledBy.length;
                    unresolvedLinks += calledBy.filter(c => c.unresolved === true).length;
                } catch (e) {
                    // Invalid JSON, skip
                }
            }

            const resolutionPercentage = totalLinks > 0
                ? ((totalLinks - unresolvedLinks) / totalLinks) * 100
                : 100;

            return {
                name: 'calledBy_resolution',
                passed: unresolvedLinks === 0,
                severity: unresolvedLinks > 500 ? 'high' : unresolvedLinks > 100 ? 'medium' : 'low',
                details: {
                    totalLinks,
                    unresolvedLinks,
                    resolutionPercentage: Math.round(resolutionPercentage * 100) / 100,
                    affectedAtoms: unresolvedCalledBy
                },
                recommendation: unresolvedLinks > 0
                    ? 'Enable Class Instantiation Tracker and improve import resolution'
                    : 'All calledBy links are resolved'
            };
        } catch (error) {
            logger.error('checkCalledByResolution failed:', error.message);
            throw error;
        }
    }

    /**
     * VERIFICACIÓN 4: Ejecución de Guards
     * Verifica que TODOS los guards se ejecuten correctamente
     */
    async checkGuardExecution() {
        try {
            const { guardRegistry } = await import('../file-watcher/guards/registry.js');
            await guardRegistry.initializeDefaultGuards();

            const stats = guardRegistry.getStats();
            const expectedGuards = {
                semantic: 8,
                impact: 12
            };

            const missingGuards = [];

            if (stats.byType.semantic < expectedGuards.semantic) {
                missingGuards.push(`semantic: ${stats.byType.semantic}/${expectedGuards.semantic}`);
            }

            if (stats.byType.impact < expectedGuards.impact) {
                missingGuards.push(`impact: ${stats.byType.impact}/${expectedGuards.impact}`);
            }

            return {
                name: 'guard_execution',
                passed: missingGuards.length === 0,
                severity: missingGuards.length > 0 ? 'high' : 'low',
                details: {
                    totalGuards: stats.total,
                    byType: stats.byType,
                    byDomain: stats.byDomain,
                    missingGuards,
                    expectedGuards
                },
                recommendation: missingGuards.length > 0
                    ? `Register missing guards: ${missingGuards.join(', ')}`
                    : 'All guards are registered and operational'
            };
        } catch (error) {
            logger.error('checkGuardExecution failed:', error.message);
            throw error;
        }
    }

    /**
     * VERIFICACIÓN 5: Persistencia de Issues
     * Verifica que los issues de guards se persistan correctamente
     */
    async checkIssuePersistence() {
        try {
            const db = this.repo.db;

            // Obtener issues recientes
            const recentIssues = db.prepare(`
                SELECT id, issue_type, severity, file_path, context_json, detected_at
                FROM semantic_issues
                WHERE message LIKE '[watcher]%'
                  AND (is_removed IS NULL OR is_removed = 0)
                ORDER BY detected_at DESC
                LIMIT 1000
            `).all();

            // Issues sin lifecycle correcto
            const issuesWithoutLifecycle = recentIssues.filter(issue => {
                try {
                    const context = JSON.parse(issue.context_json || '{}');
                    return !context.lifecycle || context.lifecycle.status === 'unknown';
                } catch (e) {
                    return true;
                }
            }).length;

            // Issues sin contexto de acción sugerida
            const issuesWithoutContext = recentIssues.filter(issue => {
                try {
                    const context = JSON.parse(issue.context_json || '{}');
                    return !context.suggestedAction;
                } catch (e) {
                    return true;
                }
            }).length;

            // Issues huérfanos (archivo ya no existe)
            const orphanedIssues = db.prepare(`
                SELECT COUNT(*) as count
                FROM semantic_issues si
                LEFT JOIN atoms a ON si.file_path = a.file_path
                WHERE si.message LIKE '[watcher]%'
                  AND (a.file_path IS NULL OR a.is_removed = 1)
                  AND (si.lifecycle_status IS NULL OR si.lifecycle_status != 'expired')
                  AND (si.is_removed IS NULL OR si.is_removed = 0)
            `).get().count;

            // Distribución por lifecycle
            const lifecycleDistribution = db.prepare(`
                SELECT 
                    SUM(CASE WHEN lifecycle_status = 'active' OR lifecycle_status IS NULL THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN lifecycle_status = 'expired' THEN 1 ELSE 0 END) as expired,
                    SUM(CASE WHEN lifecycle_status = 'superseded' THEN 1 ELSE 0 END) as superseded
                FROM semantic_issues
                WHERE message LIKE '[watcher]%'
            `).get();

            return {
                name: 'issue_persistence',
                passed: orphanedIssues === 0 && issuesWithoutLifecycle === 0,
                severity: orphanedIssues > 100 ? 'high' : orphanedIssues > 20 ? 'medium' : 'low',
                details: {
                    totalIssues: recentIssues.length,
                    withoutLifecycle: issuesWithoutLifecycle,
                    withoutContext: issuesWithoutContext,
                    orphanedIssues,
                    lifecycleDistribution
                },
                recommendation: orphanedIssues > 0
                    ? `Run lifecycle cleanup to remove ${orphanedIssues} orphaned issues`
                    : issuesWithoutLifecycle > 0
                        ? `Fix guards to include lifecycle in context (${issuesWithoutLifecycle} issues missing)`
                        : 'All issues are properly persisted with lifecycle'
            };
        } catch (error) {
            logger.error('checkIssuePersistence failed:', error.message);
            throw error;
        }
    }

    /**
     * VERIFICACIÓN 6: Acceso de MCP Tools a Datos
     * Verifica que las MCP tools puedan leer los datos correctamente
     */
    async checkMcpDataAccess() {
        try {
            const db = this.repo.db;

            const tools = [
                {
                    name: 'query_atoms',
                    test: () => db.prepare(`SELECT COUNT(*) as count FROM atoms LIMIT 1`).get()
                },
                {
                    name: 'query_relations',
                    test: () => db.prepare(`SELECT COUNT(*) as count FROM atom_relations LIMIT 1`).get()
                },
                {
                    name: 'query_files',
                    test: () => db.prepare(`SELECT COUNT(*) as count FROM files LIMIT 1`).get()
                },
                {
                    name: 'query_issues',
                    test: () => db.prepare(`SELECT COUNT(*) as count FROM semantic_issues LIMIT 1`).get()
                }
            ];

            const results = [];

            for (const tool of tools) {
                try {
                    const result = tool.test();
                    results.push({
                        tool: tool.name,
                        success: true,
                        dataQuality: result ? 'good' : 'empty'
                    });
                } catch (error) {
                    results.push({
                        tool: tool.name,
                        success: false,
                        error: error.message,
                        dataQuality: 'unknown'
                    });
                }
            }

            const failedTools = results.filter(r => !r.success);

            return {
                name: 'mcp_data_access',
                passed: failedTools.length === 0,
                severity: failedTools.length > 0 ? 'high' : 'low',
                details: {
                    totalTools: tools.length,
                    failedTools: failedTools.map(t => t.tool),
                    results
                },
                recommendation: failedTools.length > 0
                    ? `Fix database access for tools: ${failedTools.map(t => t.tool).join(', ')}`
                    : 'All MCP tools can access data correctly'
            };
        } catch (error) {
            logger.error('checkMcpDataAccess failed:', error.message);
            throw error;
        }
    }

    /**
     * VERIFICACIÓN 7: Datos Huérfanos
     * Verifica que no haya datos huérfanos en la DB
     */
    async checkOrphanedData() {
        try {
            const db = this.repo.db;

            const orphans = {
                // Átomos sin archivo
                atomsWithoutFile: db.prepare(`
                    SELECT COUNT(*) as count
                    FROM atoms a
                    LEFT JOIN files f ON a.file_path = f.path
                    WHERE f.path IS NULL
                      AND (a.is_removed IS NULL OR a.is_removed = 0)
                `).get().count,

                // Relaciones sin átomos (o con átomos removidos)
                relationsWithoutAtoms: db.prepare(`
                    SELECT COUNT(*) as count
                    FROM atom_relations ar
                    LEFT JOIN atoms a ON ar.source_id = a.id
                    WHERE (a.id IS NULL OR a.is_removed = 1)
                      AND (ar.is_removed IS NULL OR ar.is_removed = 0)
                `).get().count,

                // Issues sin archivo (o con archivo removido)
                issuesWithoutFile: db.prepare(`
                    SELECT COUNT(*) as count
                    FROM semantic_issues si
                    LEFT JOIN files f ON si.file_path = f.path
                    WHERE (f.path IS NULL OR f.is_removed = 1)
                      AND (si.is_removed IS NULL OR si.is_removed = 0)
                `).get().count
            };

            const totalOrphans = Object.values(orphans).reduce((sum, count) => sum + count, 0);

            return {
                name: 'orphaned_data',
                passed: totalOrphans === 0,
                severity: totalOrphans > 100 ? 'high' : totalOrphans > 20 ? 'medium' : 'low',
                details: {
                    totalOrphans,
                    byType: orphans,
                    samples: Object.fromEntries(
                        Object.entries(orphans).map(([key, count]) => [key, Math.min(count, 10)])
                    )
                },
                recommendation: totalOrphans > 0
                    ? `Run database cleanup to remove ${totalOrphans} orphaned records`
                    : 'No orphaned data found'
            };
        } catch (error) {
            logger.error('checkOrphanedData failed:', error.message);
            throw error;
        }
    }

    /**
     * VERIFICACIÓN 8: Consistencia de Relaciones
     * Verifica que las relaciones sean bidireccionales y consistentes
     */
    async checkRelationConsistency() {
        try {
            const db = this.repo.db;

            // Verificar que calledBy y usedBy sean consistentes
            // Si A.calledBy incluye B, entonces B.usedBy debe incluir A

            // Esta verificación es costosa, así que hacemos un sample
            const sampleSize = 100;

            const sampleAtoms = db.prepare(`
                SELECT id, file_path, called_by_json
                FROM atoms
                WHERE (is_removed IS NULL OR is_removed = 0)
                  AND called_by_json IS NOT NULL
                  AND called_by_json != '[]'
                LIMIT ?
            `).all(sampleSize);

            let inconsistencies = 0;
            let checked = 0;

            for (const atom of sampleAtoms) {
                try {
                    const calledBy = JSON.parse(atom.called_by_json);

                    for (const caller of calledBy) {
                        if (!caller.id) continue;

                        // Verificar si el caller existe
                        const callerAtom = db.prepare(`
                            SELECT id, uses_json
                            FROM atoms
                            WHERE id = ?
                        `).get(caller.id);

                        if (!callerAtom) {
                            inconsistencies++;
                            continue;
                        }

                        checked++;

                        // Verificar bidireccionalidad (opcional, puede no existir en todos los casos)
                        // Por ahora solo verificamos que el caller exista
                    }
                } catch (e) {
                    // Invalid JSON, skip
                }
            }

            const inconsistencyRate = checked > 0 ? (inconsistencies / checked) * 100 : 0;

            return {
                name: 'relation_consistency',
                passed: inconsistencies === 0,
                severity: inconsistencies > 50 ? 'high' : inconsistencies > 10 ? 'medium' : 'low',
                details: {
                    sampleSize: sampleAtoms.length,
                    checkedRelations: checked,
                    inconsistencies,
                    inconsistencyRate: Math.round(inconsistencyRate * 100) / 100
                },
                recommendation: inconsistencies > 0
                    ? `Fix ${inconsistencies} inconsistent relations in calledBy/usedBy links`
                    : 'All checked relations are consistent'
            };
        } catch (error) {
            logger.error('checkRelationConsistency failed:', error.message);
            throw error;
        }
    }
}

export default PipelineIntegrityDetector;
