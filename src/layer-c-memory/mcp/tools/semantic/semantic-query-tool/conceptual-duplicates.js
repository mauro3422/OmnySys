import { parseSemanticFingerprint, classifyConceptualNoise } from '../../../../../shared/compiler/index.js';

function buildConceptualSummary(groups) {
    const totalGroups = groups.length;
    const highRisk = groups.filter((group) => group.risk === 'high').length;
    const chests = {};

    groups.forEach((group) => {
        chests[group.chest] = (chests[group.chest] || 0) + group.implementationCount;
    });

    return {
        totalGroups,
        totalImplementations: groups.reduce((sum, group) => sum + group.implementationCount, 0),
        highRisk,
        mediumRisk: groups.filter((group) => group.risk === 'medium').length,
        lowRisk: groups.filter((group) => group.risk === 'low').length,
        chests,
        message: totalGroups > 0
            ? `Found ${totalGroups} conceptual duplicate groups across ${Object.keys(chests).length} chests`
            : 'No conceptual duplicates found'
    };
}

function buildConceptualRemediation(summary) {
    return {
        priority: summary.highRisk > 0 ? 'high' : 'medium',
        suggestedActions: [
            summary.highRisk > 0 && `Consolidate ${summary.highRisk} high-risk groups`,
            'Standardize groups with structural variations'
        ].filter(Boolean)
    };
}

function queryConceptualDuplicates(db, options = {}) {
    const minCount = options.minCount || 2;
    const limit = options.limit || 50;
    return db.prepare(`
            SELECT 
                json_extract(dna_json, '$.semanticFingerprint') as fingerprint,
                COUNT(*) as count
            FROM atoms
            WHERE atom_type IN ('function', 'method', 'arrow')
                AND (${options.includeRemoved ? '1=1' : 'is_removed IS NULL OR is_removed = 0'})
                AND json_extract(dna_json, '$.semanticFingerprint') IS NOT NULL
            GROUP BY fingerprint
            HAVING count >= ?
            ORDER BY count DESC
            LIMIT ?
        `).all(minCount, limit);
}

function mapConceptualGroups(rows = []) {
    return rows.map((row) => {
        if (row.concept && row.chest) return row;

        const fingerprint = row.fingerprint || row.semanticFingerprint || '';
        const concept = parseSemanticFingerprint(fingerprint);
        const chest = concept.chest || 'legacy';

        let risk = 'medium';
        if (chest === 'lifecycle' || chest === 'telemetry') risk = 'low';
        if (chest === 'logic' || chest === 'orchestration') {
            risk = (row.count || row.implementationCount) > 5 ? 'high' : 'medium';
        }

        return {
            semanticFingerprint: fingerprint,
            chest,
            implementationCount: row.count || row.implementationCount,
            risk,
            concept
        };
    });
}

export function loadConceptualDuplicates(repo, options = {}) {
    const rows = repo.findConceptualDuplicates
        ? repo.findConceptualDuplicates(options)
        : queryConceptualDuplicates(repo.db, options);
    const repoSummary = rows?.summary || null;

    // Filter out noise-class groups when using repo path (which has summary)
    let groups;
    if (repoSummary && repoSummary.noiseByClass) {
        // When using repo path, filter each group by checking if ALL its atoms are noise
        const rawGroups = rows.groups || rows || [];
        groups = rawGroups.filter((group) => {
            const fp = group.semanticFingerprint || group.fingerprint || '';
            // Skip groups where the fingerprint indicates generic callbacks
            const { chest, entity } = parseSemanticFingerprint(fp);
            const isGenericCallback = /_callback$/.test(fp) || entity === 'callback' || entity === '_callback';
            if (chest === 'lifecycle' && isGenericCallback) return false;
            return true;
        });
        groups = mapConceptualGroups(groups);
    } else {
        groups = mapConceptualGroups(rows);
    }

    const summary = buildConceptualSummary(groups);

    return {
        aggregationType: 'conceptual_duplicates',
        summary: {
            ...summary,
            rawGroups: repoSummary?.raw?.groupCount ?? summary.totalGroups,
            rawImplementations: repoSummary?.raw?.implementationCount ?? summary.totalImplementations,
            actionableGroups: repoSummary?.actionable?.groupCount ?? summary.totalGroups,
            actionableImplementations: repoSummary?.actionable?.implementationCount ?? summary.totalImplementations,
            noiseByClass: repoSummary?.noiseByClass || {},
            chestDistribution: repoSummary?.chestDistribution || {}
        },
        total: groups.length,
        groups,
        remediation: groups.length > 0 ? buildConceptualRemediation(summary) : null
    };
}
