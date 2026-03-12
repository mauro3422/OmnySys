import { normalizeSlashes } from './utils.js';

export function getNodeCommand() {
    return normalizeSlashes(process.execPath);
}
