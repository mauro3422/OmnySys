export function extractRelativeModuleSpecifiers(source = '') {
    const specifiers = new Set();
    const patterns = [
        /^\s*import\s+[^'"]*?from\s+['"](\.[^'"]+)['"]/gm,
        /^\s*export\s+[^'"]*?from\s+['"](\.[^'"]+)['"]/gm,
        /^\s*import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/gm
    ];

    for (const pattern of patterns) {
        for (const match of String(source || '').matchAll(pattern)) {
            if (match?.[1]) {
                specifiers.add(match[1]);
            }
        }
    }

    return [...specifiers];
}

export function extractNamedImportsFromClause(clause = '') {
    const normalized = String(clause || '').trim();
    if (!normalized) return [];

    const braceMatch = normalized.match(/\{([^}]+)\}/);
    if (!braceMatch?.[1]) return [];

    return braceMatch[1]
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const [importedName] = entry.split(/\s+as\s+/i);
            return String(importedName || '').trim();
        })
        .filter(Boolean);
}

export function extractRelativeImportContracts(source = '') {
    const contracts = [];
    const patterns = [
        /^\s*import\s+([^'"]*?)\s+from\s+['"](\.[^'"]+)['"]/gm,
        /^\s*export\s+\{([^'"]+)\}\s+from\s+['"](\.[^'"]+)['"]/gm
    ];

    for (const pattern of patterns) {
        for (const match of String(source || '').matchAll(pattern)) {
            const clause = String(match?.[1] || '').trim();
            const specifier = String(match?.[2] || '').trim();
            if (!specifier) continue;

            contracts.push({
                specifier,
                namedImports: extractNamedImportsFromClause(clause),
                namespaceImport: /\*\s+as\s+\w+/i.test(clause)
            });
        }
    }

    return contracts;
}

export function extractModuleNamedExports(source = '') {
    const namedExports = new Set();
    const exportPatterns = [
        { regex: /^\s*export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm, clause: false },
        { regex: /^\s*export\s+(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm, clause: false },
        { regex: /^\s*export\s*\{([^}]+)\}/gm, clause: true }
    ];

    for (const pattern of exportPatterns) {
        for (const match of String(source || '').matchAll(pattern.regex)) {
            if (!pattern.clause && match[1]) {
                namedExports.add(String(match[1]).trim());
                continue;
            }

            addClauseExports(namedExports, match[1]);
        }
    }

    return namedExports;
}

function addClauseExports(namedExports, clause) {
    const normalizedClause = String(clause || '').trim();
    if (!normalizedClause) return;

    for (const entry of normalizedClause.split(',')) {
        const normalized = String(entry).trim();
        if (!normalized) continue;
        const parts = normalized.split(/\s+as\s+/i);
        const exportedName = String(parts[1] || parts[0] || '').trim();
        if (exportedName && exportedName !== 'default') {
            namedExports.add(exportedName);
        }
    }
}
