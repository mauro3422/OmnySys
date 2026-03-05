import crypto from 'crypto';

export function calculateHash(data) {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(str).digest('hex');
}

export function calculateFieldHashes(atomData) {
    const hashes = {};
    const excludedFields = ['_meta', 'lineage', 'timestamp'];
    for (const [key, value] of Object.entries(atomData)) {
        if (excludedFields.includes(key)) continue;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            hashes[key] = calculateHash(value);
        } else if (Array.isArray(value)) {
            hashes[key] = calculateHash(value.map((item, i) => typeof item === 'object' ? calculateHash(item) : `${i}:${item}`));
        } else {
            hashes[key] = calculateHash(String(value));
        }
    }
    return hashes;
}
