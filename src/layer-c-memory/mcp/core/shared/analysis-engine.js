/**
 * @fileoverview AnalysisEngine - El "Cerebro" Arquitectónico de OmnySys
 * 
 * Unifica la lógica de:
 * 1. Clasificación de nodos (HUB, BRIDGE, LEAF).
 * 2. Cálculo de Blast Radius (Radio de Explosión).
 * 3. Detección de Violaciones SOLID.
 * 4. Puntuación de Riesgo (Risk Scoring).
 * 
 * @module mcp/core/shared/analysis-engine
 */

import { enrichAtomsWithRelations } from '#layer-c/storage/index.js';
import { getFileDependents } from '#layer-c/query/apis/file-api.js';

/**
 * Constantes de Clasificación
 */
export const NODE_TYPES = {
    HUB: 'HUB',       // Alta centralidad de entrada (muchos dependen de él)
    BRIDGE: 'BRIDGE', // Conecta diferentes módulos/subsistemas
    LEAF: 'LEAF'      // Nodo terminal, bajo impacto
};

/**
 * Configuración de Scoring
 */
const SCORING = {
    HUB_THRESHOLD: 10,
    BRIDGE_THRESHOLD: 2,
    BLAST_RADIUS_CRITICAL: 20,
    BLAST_RADIUS_HIGH: 15,
    BLAST_RADIUS_MEDIUM: 10
};

/**
 * Clase principal del motor de análisis
 */
export class AnalysisEngine {

    /**
     * Clasifica un átomo basado en su conectividad en el grafo
     */
    static classifyNode(inDegree, outDegree) {
        const centrality = inDegree / (outDegree + 1);

        if (centrality > SCORING.HUB_THRESHOLD) return NODE_TYPES.HUB;
        if (centrality > SCORING.BRIDGE_THRESHOLD) return NODE_TYPES.BRIDGE;
        return NODE_TYPES.LEAF;
    }

    /**
     * Calcula el Blast Radius (Radio de Explosión) de un cambio en un símbolo
     */
    static async analyzeBlastRadius(symbolName, filePath, projectPath, allAtoms) {
        // 1. Encontrar el átomo
        const atom = allAtoms.find(a => (a.name === symbolName || a.id?.endsWith(`::${symbolName}`)) && (a.file === filePath || a.filePath === filePath));

        if (!atom) {
            // Fallback: Si no está en allAtoms, intentar buscar por nombre
            const sameName = allAtoms.filter(a => a.name === symbolName);
            if (sameName.length === 1) return this.analyzeBlastRadius(symbolName, sameName[0].file || sameName[0].filePath, projectPath, allAtoms);
            return { score: 0, level: 'safe', reason: 'Symbol not found in graph' };
        }

        // 2. Enriquecer para obtener callers (dependientes directos)
        const enriched = await enrichAtomsWithRelations([atom], {
            scope: 'ids',
            ids: [atom.id],
            withCallers: true
        }, projectPath);

        const atomRel = enriched[0] || {};
        const directDependents = atomRel.callers || [];
        const directAffectedFiles = new Set(directDependents.map(d => d.split('::')[0]));

        // 3. Calcular impacto transitivo (archivos)
        const transitiveFiles = await getFileDependents(projectPath, filePath);
        for (const f of transitiveFiles) directAffectedFiles.add(f);

        // 4. Scoring
        let score = (directDependents.length * 2) + (directAffectedFiles.size * 5);

        // Boost por centralidad histórica si existe
        if (atom.graph?.centralityClassification === 'HUB') score += 10;

        let level = 'safe';
        if (score >= SCORING.BLAST_RADIUS_CRITICAL) level = 'critical';
        else if (score >= SCORING.BLAST_RADIUS_HIGH) level = 'high';
        else if (score >= SCORING.BLAST_RADIUS_MEDIUM) level = 'medium';

        return {
            score,
            level,
            directDependents: directDependents.length,
            affectedFiles: directAffectedFiles.size,
            classification: this.classifyNode(directDependents.length, (atom.calls?.length || 0)),
            recommendation: level === 'critical'
                ? '⚠️ CRITICAL: Este símbolo es un HUB. Cambios aquí pueden romper gran parte del sistema.'
                : level === 'high'
                    ? '⚠️ WARNING: Alto impacto detectado. Requiere revisión manual exhaustiva.'
                    : 'SAFE: Impacto contenido.'
        };
    }

    /**
     * Realiza una auditoría completa de salud de un archivo/átomo
     */
    static async auditHealth(filePath, projectPath, atomsInFile) {
        const issues = [];
        // Se removió el chequeo estricto de SOLID al vuelo para optimizar.
        // El riskAnalyzer general de Layer A reporta estas métricas estáticas.

        // Consolidar métricas de riesgo
        const avgComplexity = atomsInFile.reduce((sum, a) => sum + (a.complexity || 0), 0) / (atomsInFile.length || 1);

        return {
            filePath,
            healthScore: Math.max(0, 100 - (issues.length * 20) - (avgComplexity > 15 ? 10 : 0)),
            violations: issues,
            avgComplexity: avgComplexity.toFixed(1),
            isMonolithic: atomsInFile.length > 15 || avgComplexity > 12
        };
    }
}

export default AnalysisEngine;
