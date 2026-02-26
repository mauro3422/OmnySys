
import fs from 'fs/promises';
import { createLogger } from '../../../../utils/logger.js';
import { AnalysisEngine } from './analysis-engine.js';
import { loadAtoms } from '#layer-c/storage/index.js';

const logger = createLogger('OmnySys:solid:normalizer');

export class SOLIDNormalizer {
    /**
     * Genera una propuesta de división para una función crítica
     * @param {string} filePath - Ruta del archivo
     * @param {string} symbolName - Nombre de la función
     * @param {string} projectPath - Raíz del proyecto
     * @returns {Promise<Object>} Propuesta de refactorización
     */
    static async proposeSplit(filePath, symbolName, projectPath) {
        logger.info(`[SOLIDNormalizer] Generating proposal for ${symbolName} in ${filePath}`);

        const atoms = await loadAtoms(projectPath, filePath);
        const atom = atoms.find(a => a.name === symbolName);

        if (!atom) {
            throw new Error(`Atom ${symbolName} not found in ${filePath}`);
        }

        // 1. Análisis de Salud Previa
        const healthBefore = await AnalysisEngine.auditHealth(filePath, projectPath, [atom]);

        // 2. Identificar bloques lógicos (Inspirado en extract-analyzer.js)
        const code = await fs.readFile(filePath, 'utf-8');
        const lines = code.split('\n');

        const blocks = this._identifyBlocks(atom);

        if (blocks.length < 2) {
            return {
                canSplit: false,
                reason: 'Function is already cohesive or too small for meaningful split.'
            };
        }

        const proposal = {
            success: true,
            filePath,
            originalSymbol: symbolName,
            healthImpact: {
                before: healthBefore.healthScore,
                after: Math.min(100, healthBefore.healthScore + 20), // Proyección
                complexityReduction: `${atom.complexity} -> ~${Math.ceil(atom.complexity / blocks.length)} per function`
            },
            newFunctions: [],
            modifiedOriginal: ''
        };

        // 3. Generar nuevas funciones y mapear reemplazos
        let refactoredLines = [...lines.slice(atom.line - 1, atom.endLine)];
        const originalStartLine = atom.line;

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const name = `extract${symbolName}_${block.suggestedName}_${i}`;

            // Extraer el código del bloque
            // Nota: El índice en lines es line-1
            const blockContent = lines.slice(block.lineRange[0] - 1, block.lineRange[1]).join('\n');

            // TODO: Analizar qué variables necesita (parámetros) y qué devuelve
            // Por ahora simplificamos a una función sin parámetros para el MVP del diseño
            const newFuncCode = `\n/**\n * Extracted from ${symbolName}\n */\nfunction ${name}() {\n${blockContent}\n}\n`;

            proposal.newFunctions.push({
                name,
                code: newFuncCode,
                reason: `Encapsulates operations: ${block.operations.join(', ')}`
            });

            // Reemplazar en el original (ajustando índices relativos al inicio del átomo)
            const startRel = block.lineRange[0] - originalStartLine;
            const endRel = block.lineRange[1] - originalStartLine;

            // Reemplazamos el primer renglón del bloque por la llamada y vaciamos el resto
            refactoredLines[startRel] = `    ${name}(); // Extracted code block`;
            for (let j = startRel + 1; j <= endRel; j++) {
                refactoredLines[j] = null; // Marcar para eliminación
            }
        }

        proposal.modifiedOriginal = refactoredLines.filter(l => l !== null).join('\n');

        return proposal;
    }

    /**
     * Identifica bloques lógicos candidatos a ser extraídos
     * @private
     */
    static _identifyBlocks(atom) {
        const blocks = [];
        if (!atom.dataFlow?.transformations) return [];

        const transformations = atom.dataFlow.transformations;
        let currentBlock = null;

        for (const t of transformations) {
            if (!currentBlock || t.line - currentBlock.lineRange[1] > 3) {
                if (currentBlock) blocks.push(currentBlock);
                currentBlock = {
                    lineRange: [t.line, t.line],
                    operations: [t.operation],
                    suggestedName: t.operation.charAt(0).toUpperCase() + t.operation.slice(1).toLowerCase()
                };
            } else {
                currentBlock.lineRange[1] = t.line;
                if (!currentBlock.operations.includes(t.operation)) {
                    currentBlock.operations.push(t.operation);
                }
            }
        }
        if (currentBlock) blocks.push(currentBlock);

        // Solo retornar bloques que cubran un rango real de líneas
        return blocks.filter(b => b.lineRange[1] - b.lineRange[0] > 1);
    }
}
