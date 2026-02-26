function exportToMarkdown(raceResults) {
    if (!raceResults) throw new Error('raceResults is required');
    const summary = raceResults.summary || { totalRaces: 0, totalWarnings: 0, sharedStateItems: 0, bySeverity: {}, byType: {} };
    const races = raceResults.races || [];

    let md = '# Race Conditions Report\n\n';
    md += `Generated: ${new Date().toISOString()}\n\n`;
    md += `## Summary\n\n`;
    md += `- **Total Races:** ${summary.totalRaces}\n`;
    md += `- **Total Warnings:** ${summary.totalWarnings}\n`;
    md += `- **Shared State Items:** ${summary.sharedStateItems}\n\n`;

    md += '## Races by Severity\n\n';
    for (const [severity, count] of Object.entries(summary.bySeverity)) {
        md += `- ${severity}: ${count}\n`;
    }
    md += '\n';

    md += '## Races by Type\n\n';
    for (const [type, count] of Object.entries(summary.byType)) {
        md += `- ${type}: ${count}\n`;
    }
    md += '\n';

    md += '## Detailed Races\n\n';
    for (const race of races) {
        md += `### ${race.id} (${race.severity})\n\n`;
        md += `- **Type:** ${race.type}\n`;
        md += `- **State:** ${race.stateKey}\n`;
        md += `- **Description:** ${race.description}\n\n`;

        md += '**Accesses:**\n';
        for (const access of race.accesses || []) {
            md += `- ${access.atomName} (${access.module}) - Line ${access.line}\n`;
        }
        md += '\n';
    }

    return md;
}

function exportToCSV(raceResults) {
    if (!raceResults) throw new Error('raceResults is required');
    const headers = ['ID', 'Type', 'Severity', 'State', 'Function1', 'Module1', 'Function2', 'Module2', 'Description'];
    const rows = (raceResults.races || []).map(race => {
        const [a1, a2] = race.accesses || [];
        return [
            race.id,
            race.type,
            race.severity,
            race.stateKey,
            a1?.atomName || '',
            a1?.module || '',
            a2?.atomName || '',
            a2?.module || '',
            race.description
        ].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
}

export function exportRaceResults(raceResults, format = 'json') {
    if (!raceResults) throw new Error('raceResults is required');

    switch (format) {
        case 'json': return JSON.stringify(raceResults, null, 2);
        case 'markdown': return exportToMarkdown(raceResults);
        case 'csv': return exportToCSV(raceResults);
        default: return JSON.stringify(raceResults, null, 2);
    }
}
