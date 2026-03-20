const REGEX_FALLBACK_PATTERNS = [
    /if\s*\(\s*!\w+\s*\)\s*\{[^}]*=\s*(await\s+)?[^}]+\}/,
    /if\s*\(\s*\w+\s*===?\s*null\s*\)\s*\{/,
    /if\s*\(\s*typeof\s+\w+\s*===?\s*['"]undefined['"]\s*\)\s*\{/,
    /\w+\s*\?\?\?=\s*/,
    /\w+\s*\|\|=\s*/
];

export class GlobalInitializationRule {
    constructor() {
        this.type = 'singleton-initialization';
        this._patternCache = new Map();
    }

    check(findings, filePath, molecule, { registerAccess }) {
        if (!molecule.atoms) return;

        for (const atom of molecule.atoms) {
            const accesses = atom.sharedStateAccess || [];
            if (accesses.length > 0) {
                for (const access of accesses) {
                    if (access.type === 'write' && (access.scopeType === 'module' || access.scopeType === 'global')) {
                        const initializationPattern = this._getInitializationPattern(access.variable);

                        if (initializationPattern.test(atom.code || '')) {
                            registerAccess(
                                'singleton', access.variable, atom, null,
                                {
                                    type: 'initialization',
                                    isAsync: atom.isAsync,
                                    pattern: 'conditional_initialization',
                                    source: 'tree-sitter'
                                },
                                filePath
                            );
                        }
                    } else if (access.type === 'read' && (access.scopeType === 'module' || access.scopeType === 'global')) {
                        registerAccess(
                            'singleton', access.variable, atom, null,
                            {
                                type: 'access',
                                line: access.line,
                                source: 'tree-sitter'
                            },
                            filePath
                        );
                    }
                }
            } else if (atom.code) {
                this._checkRegexPatterns(findings, filePath, atom, registerAccess);
            }
        }
    }

    _checkRegexPatterns(findings, filePath, atom, registerAccess) {
        if (matchesAnyPattern(atom.code, REGEX_FALLBACK_PATTERNS)) {
            const varName = extractSingletonVariable(atom.code);
            if (varName) {
                registerAccess(
                    'singleton', varName, atom, null,
                    {
                        type: 'initialization',
                        isAsync: atom.isAsync,
                        pattern: 'regex_detected'
                    },
                    filePath
                );
            }
        }
    }

    _getInitializationPattern(varName) {
        const cached = this._patternCache.get(varName);
        if (cached) return cached;

        const pattern = new RegExp(
            `if\\s*\\(\\s*!${escapeRegExp(varName)}|${escapeRegExp(varName)}\\s*===\\s*null|${escapeRegExp(varName)}\\s*\\?\\?\\?=`
        );
        this._patternCache.set(varName, pattern);
        return pattern;
    }
}

function matchesAnyPattern(code, patterns) {
    for (const pattern of patterns) {
        if (pattern.test(code)) {
            return true;
        }
    }

    return false;
}

function extractSingletonVariable(code) {
    const matches = [
        code.match(/if\s*\(\s*!(\w+)\s*\)/),
        code.match(/if\s*\(\s*(\w+)\s*===?\s*null\s*\)/),
        code.match(/if\s*\(\s*typeof\s+(\w+)\s*===?\s*['"]undefined['"]\s*\)/),
        code.match(/(\w+)\s*\?\?\?=/)
    ];

    for (const match of matches) {
        if (match) return match[1];
    }

    return null;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
