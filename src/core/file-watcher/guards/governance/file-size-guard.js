/**
 * @fileoverview file-size-guard.js
 *
 * Governance Guard: Evita que los archivos crezcan desproporcionadamente.
 * Archivos mayores a 400 líneas reducen drásticamente la capacidad de la IA
 * de editar y mantener el código sin mojibakes o pérdida de contexto.
 *
 * @module core/file-watcher/guards/governance/file-size-guard
 * @version 1.0.0
 */

import { BaseGovernanceGuard } from './base-governance-guard.js';
import { StandardThresholds, StandardSuggestions, severityFromFileLines, IssueDomains, IssueSeverity } from '../guard-standards.js';
import { classifyFileOperationalRole, resolveArchitecturalRecommendation } from '../../../../shared/compiler/index.js';
import fs from 'fs';

const guardParams = new BaseGovernanceGuard('file-size-guard', IssueDomains.CODE);

/**
 * Analiza el tamaño total del archivo y levanta un warning de gobernanza si excede los límites funcionales.
 */
export async function detectFileSizeLimits(rootPath, filePath, context, atoms = [], options = {}) {
    const {
        fileLinesCritical = StandardThresholds.FILE_LINES_CRITICAL,
        fileLinesHigh = StandardThresholds.FILE_LINES_HIGH,
        isNewFile = false // TODO: Idealmente el FileWatcher nos diría si es onAdded vs onChanged
    } = options;

    try {
        if (!fs.existsSync(filePath)) {
            await guardParams.clearIssue(rootPath, filePath, 'file_size', IssueSeverity.HIGH);
            await guardParams.clearIssue(rootPath, filePath, 'file_size', IssueSeverity.MEDIUM);
            return [];
        }

        const stats = await fs.promises.stat(filePath);
        // Si el archivo es demasiado grande en bytes (>1MB), ni lo leemos, reportamos directo.
        if (stats.size > 1024 * 1024) {
            const issue = await guardParams.reportIssue(rootPath, filePath, 'file_size', IssueSeverity.HIGH,
                `File is excessively large (${Math.round(stats.size / 1024)}KB). Split immediately.`,
                { suggestedAction: StandardSuggestions.FILE_SIZE_SPLIT, metricValue: stats.size }
            );
            return [issue];
        }

        const content = await fs.promises.readFile(filePath, 'utf-8');
        const linesCount = content.split('\n').length;
        const operationalRole = classifyFileOperationalRole(filePath);

        const severity = severityFromFileLines(linesCount);

        if (severity) {
            // Si el archivo ya existía y está gigante, es deuda técnica (Medium).
            // Si es un archivo *nuevo* o un refactor donde queremos ser estrictos, es High.
            const adjustedSeverity = isNewFile ? IssueSeverity.HIGH : IssueSeverity.MEDIUM;
            const recommendation = resolveArchitecturalRecommendation({
                issueType: `code_file_size_${adjustedSeverity}`,
                filePath,
                operationalRole
            });
            const splitSuggestion = recommendation?.action
                || (operationalRole.role === 'orchestrator'
                    ? StandardSuggestions.COORDINATOR_EXTRACTION
                    : StandardSuggestions.FILE_SIZE_SPLIT);
            const contextData = {
                metricValue: linesCount,
                threshold: severity === IssueSeverity.HIGH ? fileLinesCritical : fileLinesHigh,
                suggestedAction: isNewFile
                    ? 'Rejecting new file: ' + splitSuggestion
                    : 'Technical Debt: ' + splitSuggestion,
                extraData: {
                    linesOfCode: linesCount,
                    isNewFile,
                    operationalRole,
                    architecturalRecommendation: recommendation?.strategy || null,
                    recommendationAlternatives: recommendation?.alternatives || []
                }
            };

            const issue = await guardParams.reportIssue(
                rootPath,
                filePath,
                'file_size',
                adjustedSeverity,
                `Governance ${isNewFile ? 'Alert' : 'Debt'}: File is ${linesCount} lines long (threshold: ${contextData.threshold}). Dangerous for AI editing.`,
                contextData
            );
            return [issue];
        } else {
            await guardParams.clearIssue(rootPath, filePath, 'file_size', IssueSeverity.HIGH);
            await guardParams.clearIssue(rootPath, filePath, 'file_size', IssueSeverity.MEDIUM);
            return [];
        }

    } catch (error) {
        return [];
    }
}
