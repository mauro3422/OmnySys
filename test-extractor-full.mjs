import { parseFileFromDisk } from './src/layer-a-static/parser/index.js';
import { extractAtoms } from './src/layer-a-static/pipeline/phases/atom-extraction/extraction/atom-extractor.js';
import { warmExtractorCache } from './src/layer-a-static/pipeline/phases/atom-extraction/extraction/atom-extractor/extractor-loader.js';
import fs from 'fs/promises';

async function test() {
    await warmExtractorCache();

    const filePath = 'src/layer-c-memory/mcp-http-server.js';
    const code = await fs.readFile(filePath, 'utf8');
    const fileInfo = await parseFileFromDisk(filePath, code);

    console.log('File Info Atoms count:', fileInfo.atoms.length);

    const atoms = await extractAtoms(fileInfo, code, {}, filePath, 'deep');

    const atomsWithSharedState = atoms.filter(a => a.sharedStateAccess && a.sharedStateAccess.length > 0);

    console.log('Atoms with Shared State:', atomsWithSharedState.length);
    for (const a of atomsWithSharedState) {
        console.log(`Atom ${a.name} (${a.line}-${a.endLine}) has access at:`, a.sharedStateAccess.map(acc => acc.line));
    }

    if (atomsWithSharedState.length === 0) {
        // Find the specific access we know is there (line 397)
        const { detectGlobalState } = await import('./src/layer-a-static/analyses/tier3/shared-state/parsers/state-parser.js');
        const fullAnalysis = await detectGlobalState(code, filePath);
        console.log('Accesses found at lines:', fullAnalysis.globalAccess.map(acc => acc.line));

        const targetLine = 397;
        const coveringAtoms = fileInfo.atoms.filter(at => at.line <= targetLine && at.endLine >= targetLine);
        console.log(`Atoms covering line ${targetLine}:`, coveringAtoms.map(at => `${at.name || 'anon'} (${at.line}-${at.endLine})`));
    }
}

test();
