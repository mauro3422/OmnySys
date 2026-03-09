/**
 * @fileoverview advisory-inference-guard.js
 *
 * Governance Guard that detects when an abstraction relies on "advisory"
 * or "mirrored_support" surfaces as if they were purely canonical without
 * validating their integrity first.
 *
 * @module core/file-watcher/guards/governance/advisory-inference-guard
 * @version 1.0.0
 */

import { BaseGovernanceGuard } from './base-governance-guard.js';
import { IssueDomains } from '../guard-standards.js';
import { buildCompilerContractLayer } from '../../../../shared/compiler/index.js';



export class AdvisoryInferenceGuard extends BaseGovernanceGuard {
    constructor() {
        super('advisory-inference-guard', IssueDomains.ARCH);
    }

    /**
     * @param {string} rootPath Project root path
     * @param {string} filePath File path being analyzed
     * @param {Object} context Context containing repository access
     * @param {Object} options Extra options
     */
    async detect(rootPath, filePath, context, options = {}) {
        try {
            const getAtomsFn = options.getAtomsForFile || (async (fp) => await context.getAtomsForFile(fp));
            const atoms = await getAtomsFn(filePath);

            if (!atoms || atoms.length === 0) {
                await this.clearIssue(rootPath, filePath, 'advisory_misuse', 'high');
                return [];
            }

            // We only enforce these rules on outer-layer abstractions.
            if (filePath.includes('shared/compiler') || filePath.includes('layer-c/storage')) {
                await this.clearIssue(rootPath, filePath, 'advisory_misuse', 'high');
                return [];
            }

            const contract = buildCompilerContractLayer();
            const advisorySurfaces = contract.surfaces.filter(s => s.status.includes('advisory')).map(s => s.id);
            const supportSurfaces = contract.surfaces.filter(s => s.status === 'mirrored_support').map(s => s.id);
            const combinedRestrictedSurfaces = [...advisorySurfaces, ...supportSurfaces];

            const violations = [];

            for (const atom of atoms) {
                // Un chequeo de demostración: si el átomo depende del uso de una superficie advisoria
                // en lugar de usar su `backingSurface` (superficie que le da soporte) cuando es crítico.
                // Para simplificar, buscamos si tiene una dependencia a semantic_connections sin pasar
                // por un intermediario que valide su paridad/integridad.
                const restrictedReads = atom.deps?.filter(dep =>
                    combinedRestrictedSurfaces.includes(dep)
                ) || [];

                if (restrictedReads.length > 0) {
                    violations.push({
                        atomId: atom.id,
                        atomName: atom.name,
                        misusedSurfaces: restrictedReads
                    });
                }
            }

            if (violations.length > 0) {
                const message = `[Advisory Inference Guard] Detected ${violations.length} atoms reading advisory/mirrored surfaces directly. Check invariants before trusting them.`;

                await this.reportIssue(rootPath, filePath, 'advisory_misuse', 'high', message, {
                    suggestedAction: 'Ensure you review the system map persistence parity and use the backing surfaces or their contract canonical layers for correctness.',
                    misusingAtoms: violations.map(v => v.atomName),
                    surfaces: [...new Set(violations.flatMap(v => v.misusedSurfaces))]
                });
            } else {
                await this.clearIssue(rootPath, filePath, 'advisory_misuse', 'high');
            }

            return violations;
        } catch (error) {
            console.error(`[AdvisoryInferenceGuard] Error analyzing ${filePath}:`, error);
            return [];
        }
    }
}

const guardInstance = new AdvisoryInferenceGuard();
export const detectAdvisoryInferences = guardInstance.detect.bind(guardInstance);
