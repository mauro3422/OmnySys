/**
 * @fileoverview canonical-dependency-guard.js
 *
 * Governance Guard that detects when an abstraction bypasses a canonical
 * equivalent API to compute something manually. For example, reading directly
 * from 'files' or 'atom_relations' when there is already a centralized compiler
 * helper to do that.
 *
 * @module core/file-watcher/guards/governance/canonical-dependency-guard
 * @version 1.0.0
 */

import { BaseGovernanceGuard } from './base-governance-guard.js';
import { IssueDomains } from '../guard-standards.js';
import { buildCompilerContractLayer } from '../../../../shared/compiler/index.js';



export class CanonicalDependencyGuard extends BaseGovernanceGuard {
    constructor() {
        super('canonical-dependency-guard', IssueDomains.ARCH);
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
                await this.clearIssue(rootPath, filePath, 'canonical_bypass', 'high');
                return [];
            }

            // We only enforce canonical rules on specific layers, ignoring the compiler itself
            // and low layer storage modules.
            if (filePath.includes('shared/compiler') || filePath.includes('layer-c/storage') || filePath.includes('layer-b/extraction')) {
                await this.clearIssue(rootPath, filePath, 'canonical_bypass', 'high');
                return [];
            }

            const contract = buildCompilerContractLayer();
            const canonicalSurfaces = contract.surfaces.filter(s => s.status === 'canonical').map(s => s.id);
            const advisorySurfaces = contract.surfaces.filter(s => s.status.includes('advisory')).map(s => s.id);

            const violations = [];

            for (const atom of atoms) {
                // Revisa si este atomo depende directamente de leer tablas crudas
                // bypassando helpers canonicos (muy rudimentario para propositos demostrativos, pero util).
                const rawTableReads = atom.deps?.filter(dep =>
                    canonicalSurfaces.includes(dep) || advisorySurfaces.includes(dep)
                ) || [];

                if (rawTableReads.length > 0) {
                    violations.push({
                        atomId: atom.id,
                        atomName: atom.name,
                        bypassedSurfaces: rawTableReads
                    });
                }
            }

            if (violations.length > 0) {
                const message = `[Canonical Dependency Guard] Detected ${violations.length} atoms bypassing canonical entrypoints and reading raw tables directly.`;

                await this.reportIssue(rootPath, filePath, 'canonical_bypass', 'high', message, {
                    suggestedAction: 'Use canonical entrypoints from src/shared/compiler instead of reading raw tables directly.',
                    bypassingAtoms: violations.map(v => v.atomName),
                    surfaces: [...new Set(violations.flatMap(v => v.bypassedSurfaces))]
                });
            } else {
                await this.clearIssue(rootPath, filePath, 'canonical_bypass', 'high');
            }

            return violations;
        } catch (error) {
            console.error(`[CanonicalDependencyGuard] Error analyzing ${filePath}:`, error);
            return [];
        }
    }
}

const guardInstance = new CanonicalDependencyGuard();
export const detectCanonicalDependencies = guardInstance.detect.bind(guardInstance);
