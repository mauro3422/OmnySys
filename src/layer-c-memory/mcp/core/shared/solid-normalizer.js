import fs from 'fs/promises';
import { createLogger } from '../../../../utils/logger.js';
import { AnalysisEngine } from './analysis-engine.js';
import { loadAtoms } from '#layer-c/storage/index.js';

const logger = createLogger('OmnySys:solid:normalizer');

/**
 * Generate a split proposal for a critical function.
 * @param {string} filePath
 * @param {string} symbolName
 * @param {string} projectPath
 * @returns {Promise<Object>}
 */
export async function proposeSplit(filePath, symbolName, projectPath) {
    logger.info(`[SOLIDNormalizer] Generating proposal for ${symbolName} in ${filePath}`);

    try {
        const atoms = await loadAtoms(projectPath, filePath);
        const atom = atoms.find(a => a.name === symbolName);

        if (!atom) {
            throw new Error(`Atom ${symbolName} not found in ${filePath}`);
        }

        const healthBefore = await AnalysisEngine.auditHealth(filePath, projectPath, [atom]);
        const code = await fs.readFile(filePath, 'utf-8');
        const lines = code.split('\n');
        const blocks = identifyBlocks(atom);

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
                after: Math.min(100, healthBefore.healthScore + 20),
                complexityReduction: `${atom.complexity} -> ~${Math.ceil(atom.complexity / blocks.length)} per function`
            },
            newFunctions: [],
            modifiedOriginal: ''
        };

        const originalStartLine = atom.line;
        const refactoredLines = [...lines.slice(atom.line - 1, atom.endLine)];

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const name = `extract${symbolName}_${block.suggestedName}_${i}`;
            const blockContent = lines.slice(block.lineRange[0] - 1, block.lineRange[1]).join('\n');

            proposal.newFunctions.push(
                buildExtractedFunction(name, symbolName, blockContent, block.operations)
            );
            replaceBlockInOriginal(refactoredLines, block, name, originalStartLine);
        }

        proposal.modifiedOriginal = refactoredLines.filter(line => line !== null).join('\n');
        return proposal;
    } catch (error) {
        logger.error(`[SOLIDNormalizer] Failed to propose split for ${symbolName}: ${error.message}`, error);
        return {
            success: false,
            canSplit: false,
            reason: `Internal analysis error: ${error.message}`
        };
    }
}

function identifyBlocks(atom) {
    const blocks = [];
    if (!atom.dataFlow?.transformations) return [];

    const transformations = atom.dataFlow.transformations;
    let currentBlock = null;

    for (const transformation of transformations) {
        if (!currentBlock || transformation.line - currentBlock.lineRange[1] > 3) {
            if (currentBlock) blocks.push(currentBlock);
            currentBlock = {
                lineRange: [transformation.line, transformation.line],
                operations: [transformation.operation],
                suggestedName: transformation.operation.charAt(0).toUpperCase() + transformation.operation.slice(1).toLowerCase()
            };
            continue;
        }

        currentBlock.lineRange[1] = transformation.line;
        if (!currentBlock.operations.includes(transformation.operation)) {
            currentBlock.operations.push(transformation.operation);
        }
    }

    if (currentBlock) blocks.push(currentBlock);
    return blocks.filter(block => block.lineRange[1] - block.lineRange[0] > 1);
}

function buildExtractedFunction(name, symbolName, blockContent, operations) {
    return {
        name,
        code: `\n/**\n * Extracted from ${symbolName}\n */\nfunction ${name}() {\n${blockContent}\n}\n`,
        reason: `Encapsulates operations: ${operations.join(', ')}`
    };
}

function replaceBlockInOriginal(refactoredLines, block, helperName, originalStartLine) {
    const startRel = block.lineRange[0] - originalStartLine;
    const endRel = block.lineRange[1] - originalStartLine;

    refactoredLines[startRel] = `    ${helperName}(); // Extracted code block`;
    if (endRel > startRel) {
        refactoredLines.fill(null, startRel + 1, endRel + 1);
    }
}
