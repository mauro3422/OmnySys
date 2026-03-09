import crypto from 'crypto';
import path from 'path';

export function calculateContentHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
}

export function toProjectRelativePath(absoluteRootPath, absoluteFilePath) {
    return path.relative(absoluteRootPath, absoluteFilePath).replace(/\\/g, '/');
}
