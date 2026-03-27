import { safeArray } from '../../../shared/compiler/index.js';

export async function loadImpactWaveBrokenImports(fullPath, filePath, rootPath, validateImportsInEdit) {
    if (!fullPath) return [];

    try {
        const fs = await import('fs/promises');
        const code = await fs.readFile(fullPath, 'utf-8');
        return await validateImportsInEdit(filePath, code, rootPath);
    } catch {
        return [];
    }
}

export async function loadImpactWaveBrokenCallers({
    filePath,
    rootPath,
    previousAtoms,
    currentAtoms,
    changedAtoms,
    validatePostEditOptimized
}) {
    const hasSignatureChanges = changedAtoms.some((atom) => atom.type === 'signature');
    if (!hasSignatureChanges) return [];

    const postValidation = await validatePostEditOptimized(filePath, rootPath, previousAtoms, currentAtoms);
    return safeArray(postValidation?.brokenCallers);
}
