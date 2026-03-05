import { getFileAnalysis, getFileDependents } from '../../../../query/apis/file-api.js';
import { getTransitiveDependents } from '../../../../query/queries/dependency-query.js';

export class ImpactMapStrategy {
    async execute(projectPath, filePath, options) {
        if (!filePath) throw new Error('filePath required for impact_map');

        const fileData = await getFileAnalysis(projectPath, filePath);
        if (!fileData) throw new Error(`File ${filePath} not found in index`);

        const directDeps = await getFileDependents(projectPath, filePath, options);
        const transDeps = await getTransitiveDependents(projectPath, filePath, options);

        const result = {
            file: filePath,
            directlyAffects: directDeps,
            transitiveAffects: transDeps,
            totalAffected: directDeps.length + transDeps.length,
            riskLevel: fileData.riskScore?.severity || 'low',
            subsystem: fileData.subsystem || 'unknown',
            exports: (fileData.exports || []).map(e => e.name)
        };

        if (options.includeSemantic) {
            result.semanticSummary = {
                hasSharedState: (fileData.semanticAnalysis?.sharedState?.reads?.length || 0) > 0 ||
                    (fileData.semanticAnalysis?.sharedState?.writes?.length || 0) > 0,
                hasEvents: (fileData.semanticAnalysis?.eventPatterns?.eventEmitters?.length || 0) > 0 ||
                    (fileData.semanticAnalysis?.eventPatterns?.eventListeners?.length || 0) > 0,
                sharedStateReads: fileData.semanticAnalysis?.sharedState?.reads || [],
                sharedStateWrites: fileData.semanticAnalysis?.sharedState?.writes || [],
                eventEmitters: fileData.semanticAnalysis?.eventPatterns?.eventEmitters || [],
                eventListeners: fileData.semanticAnalysis?.eventPatterns?.eventListeners || []
            };
        }

        return result;
    }
}
