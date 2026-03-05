import { extractAtoms } from './src/layer-a-static/pipeline/phases/atom-extraction/extraction/atom-extractor.js';

const code = `
function test1() {
  global.mySharedState = 1;
}

function test2() {
  console.log(global.mySharedState);
}
`;

const fileInfo = {
    atoms: [
        { type: 'function', name: 'test1', line: 2, endLine: 4, lineStart: 2, lineEnd: 4 },
        { type: 'function', name: 'test2', line: 6, endLine: 8, lineStart: 6, lineEnd: 8 }
    ]
};

async function main() {
    const atoms = await extractAtoms(fileInfo, code, { jsdoc: {} }, 'test-file.js', 'deep');
    for (const a of atoms) {
        console.log(a.name, 'sharedStateAccess:', JSON.stringify(a.sharedStateAccess));
    }
}

main().catch(console.error);
