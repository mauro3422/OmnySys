import { SemanticQueryTool } from './semantic/semantic-query-tool.js';

import { getProjectStats, getProjectMetadata } from '../../query/apis/project-api.js';
import { getFileAnalysis } from '../../query/apis/file-api.js';
import { getRiskAssessment } from '../../query/queries/risk-query.js';
import { SoftwarePhysicsEngine } from '../../../layer-b-semantic/physics-engine/SoftwarePhysicsEngine.js';
import { DnaAnalyzer } from '../../../layer-b-semantic/dna-analyzer/DnaAnalyzer.js';
import { getRepository } from '../../storage/repository/index.js';

/**
 * mcp_omnysystem_aggregate_metrics
 *
 * Replaces:
 * - get_health_metrics
 * - get_module_overview
 * - get_molecule_summary
 * - detect_patterns
 * - detect_race_conditions
 * - get_async_analysis
 * - get_risk_assessment
 * - get_atom_society
 */
export class AggregateMetricsTool extends SemanticQueryTool {
    constructor() {
        super('aggregate:metrics');
    }

    async performAction(args) {
        const {
            aggregationType, // 'health' | 'modules' | 'molecule' | 'patterns' | 'race_conditions' | 'async_analysis' | 'risk' | 'society' | 'duplicates' | 'pipeline_health'
            filePath,        // Optional filter
            options = {}     // Additional parameters (limit, minSeverity, patternType, etc.)
        } = args;

        if (!aggregationType) {
            return this.formatError('MISSING_PARAMS', 'aggregationType is required', {
                allowedValues: ['health', 'modules', 'molecule', 'patterns', 'race_conditions', 'async_analysis', 'risk', 'society']
            });
        }

        this.logger.debug(`Executing aggregate:metrics -> ${aggregationType}`, { filePath, options });

        try {
            switch (aggregationType) {
                case 'health': {
                    const stats = await getProjectStats(this.projectPath);

                    // Compute real physics vectors from SQLite atoms
                    let physics = { averageGravity: 0, averageReactivity: 0, avgFragility: 0, avgCoupling: 0, avgCohesion: 0, avgImportance: 0, totalAtoms: 0 };
                    if (this.repo?.db) {
                        const row = this.repo.db.prepare(`
                            SELECT COUNT(*) as total,
                                   AVG(fragility_score) as avg_fragility,
                                   AVG(coupling_score) as avg_coupling,
                                   AVG(cohesion_score) as avg_cohesion,
                                   AVG(importance_score) as avg_importance,
                                   AVG(centrality_score) as avg_centrality
                            FROM atoms
                        `).get();
                        if (row) {
                            physics = {
                                totalAtoms: row.total || 0,
                                avgFragility: Math.round((row.avg_fragility || 0) * 1000) / 1000,
                                avgCoupling: Math.round((row.avg_coupling || 0) * 1000) / 1000,
                                avgCohesion: Math.round((row.avg_cohesion || 0) * 1000) / 1000,
                                avgImportance: Math.round((row.avg_importance || 0) * 1000) / 1000,
                                avgCentrality: Math.round((row.avg_centrality || 0) * 1000) / 1000,
                                // Gravity ≈ importance × centrality (how much this codebase "gravitates" change)
                                averageGravity: Math.round((row.avg_importance || 0) * (row.avg_centrality || 0) * 1000) / 1000,
                                // Reactivity ≈ fragility × coupling (how easily things break)
                                averageReactivity: Math.round((row.avg_fragility || 0) * (row.avg_coupling || 0) * 1000) / 1000
                            };
                        }
                    }

                    return this.formatSuccess({
                        project: this.projectPath,
                        globalHealth: stats.health,
                        quality: stats.quality,
                        physics
                    });
                }

                case 'duplicates': {
                    const result = await this.getDuplicates({
                        offset: options.offset || 0,
                        limit: options.limit || 20
                    });

                    return this.formatSuccess({
                        aggregationType: 'duplicates',
                        ...result
                    });
                }

                case 'modules': {
                    const metadata = await getProjectMetadata(this.projectPath);
                    return this.formatSuccess({
                        modules: metadata.modules || [],
                        totalFiles: metadata.totalFiles
                    });
                }

                case 'molecule': {
                    if (!filePath) return this.formatError('MISSING_PARAMS', 'filePath required for molecule summary');
                    const fileData = await getFileAnalysis(this.projectPath, filePath);
                    if (!fileData) return this.formatError('NOT_FOUND', `File ${filePath} not found`);

                    return this.formatSuccess({
                        file: filePath,
                        atomsCount: (fileData.atoms || []).length,
                        exportsCount: (fileData.exports || []).length,
                        importsCount: (fileData.imports || []).length,
                        riskScore: fileData.riskScore
                    });
                }

                case 'risk': {
                    const riskData = await getRiskAssessment(this.projectPath);
                    return this.formatSuccess({
                        ...riskData
                    });
                }

                // ========================================
                // FUNCIONALIDADES REACTIVADAS (SQLite)
                // ========================================

                case 'race_conditions': {
                    // Consulta SQLite: átomos con shared state + async
                    const result = await this.getRaceConditions({
                        offset: options.offset || 0,
                        limit: options.limit || 20,
                        scopeType: options.scopeType,
                        asyncOnly: options.asyncOnly !== false, // default true
                        minSeverity: options.minSeverity || 0
                    });

                    return this.formatSuccess({
                        aggregationType: 'race_conditions',
                        ...result,
                        summary: {
                            totalRaces: result.total,
                            highSeverity: result.races.filter(r => r.severity >= 7).length,
                            mediumSeverity: result.races.filter(r => r.severity >= 4 && r.severity < 7).length,
                            lowSeverity: result.races.filter(r => r.severity < 4).length
                        }
                    });
                }

                case 'patterns': {
                    // Consulta SQLite: event emitters/listeners
                    const result = await this.getEventPatterns({
                        offset: options.offset || 0,
                        limit: options.limit || 20,
                        type: options.patternType || 'all', // 'emitters', 'listeners', 'all'
                        minSeverity: options.minSeverity || 0
                    });

                    // ALSO query semantic_connections — these are the ~250 real connections
                    // (localStorage, env vars, globals, routes) detected during analysis.
                    // Event emitters/listeners may be empty if the project uses no EventEmitter.
                    let semanticSummary = { total: 0, byType: {} };
                    try {
                        const db = this.repo?.db;
                        if (db) {
                            const semRows = db.prepare(`
                            SELECT connection_type, COUNT(*) as count
                            FROM semantic_connections
                            GROUP BY connection_type
                            ORDER BY count DESC
                        `).all();
                            semanticSummary.total = semRows.reduce((s, r) => s + r.count, 0);
                            semRows.forEach(r => { semanticSummary.byType[r.connection_type] = r.count; });
                        }
                    } catch (_) { /* DB not ready yet */ }

                    return this.formatSuccess({
                        aggregationType: 'patterns',
                        eventPatterns: result,
                        semanticConnections: semanticSummary,
                        summary: {
                            totalEventPatterns: result.total,
                            emitters: result.patterns.filter(p => p.hasEmitters).length,
                            listeners: result.patterns.filter(p => p.hasListeners).length,
                            totalSemanticConnections: semanticSummary.total,
                            semanticByType: semanticSummary.byType
                        }
                    });
                }

                case 'async_analysis': {
                    // Consulta SQLite: funciones asíncronas
                    const result = await this.getAsyncAnalysis({
                        offset: options.offset || 0,
                        limit: options.limit || 20,
                        withNetworkCalls: options.withNetworkCalls || false,
                        withErrorHandling: options.withErrorHandling || false
                    });

                    return this.formatSuccess({
                        aggregationType: 'async_analysis',
                        ...result,
                        summary: {
                            totalAsync: result.total,
                            withNetworkCalls: result.asyncAtoms.filter(a => a.hasNetworkCalls).length,
                            withErrorHandling: result.asyncAtoms.filter(a => a.hasErrorHandling).length,
                            highComplexity: result.asyncAtoms.filter(a => a.complexity > 10).length
                        }
                    });
                }

                case 'society': {
                    // Consulta SQLite: Sociedades formales (Pueblos de Átomos)
                    const result = await this.getSocieties({
                        offset: options.offset || 0,
                        limit: options.limit || 20,
                        type: options.societyType // 'functional', 'structural', 'cultural'
                    });

                    return this.formatSuccess({
                        aggregationType: 'societies',
                        ...result,
                        summary: {
                            totalSocieties: result.total,
                            functional: result.societies.filter(s => s.type === 'functional').length,
                            structural: result.societies.filter(s => s.type === 'structural').length,
                            avgCohesion: result.societies.reduce((sum, s) => sum + s.cohesion, 0) / (result.societies.length || 1)
                        }
                    });
                }

                case 'pipeline_health': {
                    // 🔬 SELF-DIAGNOSTICS: Detecta problemas en el pipeline de indexación
                    // sin depender de código externo — usa datos de la DB directamente.
                    const db = this.repo?.db;
                    if (!db) return this.formatError('DB_NOT_READY', 'Repository not available');

                    const issues = [];
                    const warnings = [];

                    // --- CHECK 1: Tablas que deberían tener datos pero tienen 0 rows ---
                    const expectedNonEmpty = [
                        { table: 'atoms', minRows: 100, description: 'No atoms indexed — pipeline never ran?' },
                        { table: 'atom_relations', minRows: 1, description: 'No relations — call graph not built' },
                        { table: 'files', minRows: 1, description: 'No files indexed' },
                        { table: 'atom_versions', minRows: 1, description: 'atom_versions empty — AtomVersionManager.trackAtomVersion() not called from pipeline' },
                        { table: 'atom_events', minRows: 1, description: 'atom_events empty — no created/updated/deleted events tracked' },
                        { table: 'societies', minRows: 1, description: 'societies empty — analyzeSocieties() not running or failing' },
                        { table: 'risk_assessments', minRows: 0, description: 'risk_assessments empty — risk-handler pipeline not running', severity: 'warning' },
                        { table: 'semantic_issues', minRows: 0, description: 'semantic_issues empty — semantic analysis pipeline not running', severity: 'warning' },
                    ];

                    const tableCounts = {};
                    for (const check of expectedNonEmpty) {
                        try {
                            const row = db.prepare(`SELECT COUNT(*) as c FROM "${check.table}"`).get();
                            tableCounts[check.table] = row?.c || 0;
                            if (row?.c < check.minRows) {
                                const entry = { table: check.table, rows: row?.c || 0, issue: check.description };
                                if (check.severity === 'warning') warnings.push(entry);
                                else issues.push(entry);
                            }
                        } catch (e) {
                            issues.push({ table: check.table, rows: null, issue: `Table missing or inaccessible: ${e.message}` });
                        }
                    }

                    // --- CHECK 2: Campos atom que siempre valen 0 (0% cobertura) ---
                    const suspiciousFields = [
                        { field: 'centrality_score', description: 'persistGraphMetrics() not connected to pipeline' },
                        { field: 'propagation_score', description: 'propagation not computed' },
                        { field: 'age_days', description: 'Git integration missing for ageDays calculation' },
                        { field: 'change_frequency', description: 'Git integration missing for changeFrequency' },
                        { field: 'in_degree', description: 'Graph degrees not updated' },
                        { field: 'out_degree', description: 'Graph degrees not updated' },
                        { field: 'has_network_calls', description: 'Network call detector not covering Node.js patterns' },
                        { field: 'callers_count', description: 'calledBy graph not built' },
                    ];

                    const zeroFields = [];
                    const atomTotal = tableCounts['atoms'] || 1;
                    for (const { field, description } of suspiciousFields) {
                        try {
                            const row = db.prepare(
                                `SELECT SUM(CASE WHEN ${field} != 0 AND ${field} IS NOT NULL THEN 1 ELSE 0 END) as nonzero FROM atoms`
                            ).get();
                            const nonZeroCount = row?.nonzero || 0;
                            const coveragePct = Math.round((nonZeroCount / atomTotal) * 100);
                            if (coveragePct === 0) {
                                issues.push({ field, coverage: '0%', nonZeroCount, issue: description });
                                zeroFields.push(field);
                            } else if (coveragePct < 5) {
                                warnings.push({ field, coverage: `${coveragePct}%`, nonZeroCount, issue: `Very low coverage — ${description}` });
                            }
                        } catch (e) { /* field may not exist yet */ }
                    }

                    // --- CHECK 3: Funciones exportadas sin callers (pipeline orphans) ---
                    // Detecta funciones is_exported=1 + callers_count=0 + nombre matches pipeline hook patterns
                    const pipelinePatterns = ['persist', 'analyze', 'compute', 'calculate', 'build', 'generate', 'process', 'index'];
                    const patternCondition = pipelinePatterns.map(p => `name LIKE '%${p}%'`).join(' OR ');
                    const orphanFunctions = db.prepare(`
                        SELECT id, name, file_path, callers_count, complexity
                        FROM atoms
                        WHERE is_exported = 1 
                          AND callers_count = 0
                          AND atom_type IN ('function', 'arrow', 'method')
                          AND is_test_callback = 0
                          AND (${patternCondition})
                          AND complexity > 3
                        ORDER BY complexity DESC
                        LIMIT 20
                    `).all();

                    const healthScore = Math.max(0, 100 - (issues.length * 15) - (warnings.length * 5));
                    const grade = healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : 'D';

                    return this.formatSuccess({
                        aggregationType: 'pipeline_health',
                        healthScore,
                        grade,
                        tableCounts,
                        issues,
                        warnings,
                        orphanPipelineFunctions: orphanFunctions.map(f => ({
                            name: f.name,
                            file: f.file_path,
                            complexity: f.complexity,
                            diagnosis: 'Exported pipeline function with 0 callers — likely not connected to indexing flow'
                        })),
                        summary: {
                            totalIssues: issues.length,
                            totalWarnings: warnings.length,
                            orphanFunctionsFound: orphanFunctions.length,
                            zeroFieldsFound: zeroFields.length,
                            recommendation: issues.length === 0
                                ? 'Pipeline looks healthy ✅'
                                : `${issues.length} critical issues detected — run mcp_omnysystem_get_recent_errors for details`
                        }
                    });
                }

                default:
                    return this.formatError('INVALID_PARAM', `Unknown aggregationType: ${aggregationType}`, {
                        allowedValues: ['health', 'modules', 'molecule', 'patterns', 'race_conditions', 'async_analysis', 'risk', 'society', 'duplicates', 'pipeline_health']
                    });
            }
        } catch (error) {
            this.logger.error(`[AggregateMetrics] Error: ${error.message}`);
            return this.formatError('EXECUTION_ERROR', `Error executing aggregation ${aggregationType}: ${error.message}`);
        }
    }

    /**
     * Agrupa conexiones por tipo
     * @param {Array} connections 
     * @returns {Object}
     * @private
     */
    _groupByType(connections) {
        return connections.reduce((acc, conn) => {
            acc[conn.type] = (acc[conn.type] || 0) + 1;
            return acc;
        }, {});
    }
}

export const aggregate_metrics = async (args, context) => {
    const tool = new AggregateMetricsTool();
    return tool.execute(args, context);
};

export default { aggregate_metrics };
