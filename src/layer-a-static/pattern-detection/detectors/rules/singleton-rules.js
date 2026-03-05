export class GlobalInitializationRule {
    constructor() {
        this.type = 'singleton-initialization';
    }

    check(findings, filePath, molecule, { registerAccess }) {
        if (!molecule.atoms) return;

        for (const atom of molecule.atoms) {
            if (atom.sharedStateAccess && atom.sharedStateAccess.length > 0) {
                for (const access of atom.sharedStateAccess) {
                    if (access.type === 'write' && (access.scopeType === 'module' || access.scopeType === 'global')) {
                        const varName = access.variable;
                        const initializationPattern = new RegExp(`if\\s*\\(\\s*!${varName}|${varName}\\s*===\\s*null|${varName}\\s*\\?\\?\\?=`);

                        if (initializationPattern.test(atom.code || '')) {
                            registerAccess(
                                'singleton', varName, atom, null,
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
                // Regex fallback
                this._checkRegexPatterns(findings, filePath, atom, registerAccess);
            }
        }
    }

    _checkRegexPatterns(findings, filePath, atom, registerAccess) {
        const patterns = [
            /if\s*\(\s*!\w+\s*\)\s*\{[^}]*=\s*(await\s+)?[^}]+\}/,
            /if\s*\(\s*\w+\s*===?\s*null\s*\)\s*\{/,
            /if\s*\(\s*typeof\s+\w+\s*===?\s*['"]undefined['"]\s*\)\s*\{/,
            /\w+\s*\?\?\?=\s*/,
            /\w+\s*\|\|=\s*/
        ];

        if (patterns.some(p => p.test(atom.code))) {
            const varName = this._extractVar(atom.code);
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

    _extractVar(code) {
        const matches = [
            code.match(/if\s*\(\s*!(\w+)\s*\)/),
            code.match(/if\s*\(\s*(\w+)\s*===?\s*null\s*\)/),
            code.match(/if\s*\(\s*typeof\s+(\w+)\s*===?\s*['"]undefined['"]\s*\)/),
            code.match(/(\w+)\s*\?\?\?=/)
        ];
        for (const m of matches) if (m) return m[1];
        return null;
    }
}
