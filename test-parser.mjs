import { detectGlobalState } from './src/layer-a-static/analyses/tier3/shared-state/parsers/state-parser.js';

const code = `
function test() {
  global.mySharedState = 1;
  console.log(window.mySharedState);
  globalThis.something = true;
}
`;

async function main() {
    console.log('Testing parseGlobalState...');
    const res = await detectGlobalState(code, 'test.js');
    console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);
