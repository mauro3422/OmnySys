import { loadPreviousFindings } from '../../../shared/compiler/index.js';
import { loadConceptualLocalAtoms } from './duplicate-conceptual-core.js';

export async function loadConceptualDuplicateRepo(rootPath) {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    return getRepository(rootPath);
}

export function loadConceptualDuplicateContext(repo, normalizedFilePath, minLinesOfCode) {
    const previousFindings = loadPreviousFindings(
        repo.db,
        normalizedFilePath,
        'code_conceptual_duplicate'
    );
    const localAtoms = loadConceptualLocalAtoms(repo, normalizedFilePath, minLinesOfCode);

    return {
        previousFindings,
        localAtoms
    };
}
