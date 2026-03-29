export const TEST_FILE_PATTERNS = /\.(test|spec)\.(js|ts|mjs|cjs)$/i;
export const TEST_FUNCTION_PATTERNS = /^(test|it|describe|before|after|setup|teardown)/i;
export const MAX_ISSUES_PER_FILE = 3;
export const PRODUCTION_PURPOSES = [
    'API_EXPORT',
    'CLASS_METHOD',
    'INTERNAL_HELPER',
    'PRIVATE_HELPER',
    'NETWORK_HANDLER',
    'TIMER_ASYNC'
];

export function shouldSkipAsyncSafetyFile(filePath) {
    return TEST_FILE_PATTERNS.test(filePath);
}

export function isProductionPurpose(purpose) {
    return PRODUCTION_PURPOSES.includes(purpose);
}

export function hasAsyncNetworkPattern(atom) {
    const code = atom.sourceCode || atom.code || '';
    const networkPatterns = [
        /fetch\s*\(/,
        /axios\./,
        /http\.(get|post|put|delete)/,
        /request\s*\(/,
        /\.request\s*\(/,
        /new\s+XMLHttpRequest/,
        /WebSocket\s*\(/,
        /ws\./,
        /socket\./,
        /io\./,
        /\.connect\s*\(/,
        /query\s*\(/,
        /execute\s*\(/,
        /\.findOne\s*\(/,
        /\.findAll\s*\(/,
        /prisma\./,
        /mongoose\./,
        /sequelize\./
    ];

    return networkPatterns.some((pattern) => pattern.test(code));
}

export function hasAsyncTryCatch(atom) {
    const code = atom.sourceCode || atom.code || '';
    return /try\s*\{[\s\S]*?\}\s*catch/.test(code) ||
           /\.catch\s*\(/.test(code);
}

export function shouldSkipAsyncSafetyFunction(name) {
    return TEST_FUNCTION_PATTERNS.test(name);
}
