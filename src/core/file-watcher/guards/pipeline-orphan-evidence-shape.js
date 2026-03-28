import { isValidGuardTarget } from './guard-standards.js';

const PIPELINE_NAME_PATTERN = /(persist|analyze|compute|calculate|build|generate|process|index)/i;

function isProductionPipelineFile(filePath = '') {
    return typeof filePath === 'string'
        && filePath.startsWith('src/')
        && !filePath.startsWith('tests/')
        && !filePath.startsWith('scripts/');
}

export function hasPipelineShape(atom) {
    if (!isValidGuardTarget(atom)) return false;
    if (!(atom?.isExported || atom?.is_exported)) return false;
    const filePath = atom.filePath || atom.file_path || '';
    if (!isProductionPipelineFile(filePath)) return false;
    return PIPELINE_NAME_PATTERN.test(atom?.name || '');
}
