import { calculateComplexity } from './src/layer-a-static/pipeline/phases/atom-extraction/metadata/complexity.js';
import { extractPerformanceHints } from './src/layer-a-static/extractors/metadata/performance-hints.js';

const code = `
function slow() {
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            console.log(i, j);
        }
    }
    fs.readFileSync('foo.txt');
}
`;

console.log('Complexity:', calculateComplexity(code));
console.log('Performance Hints:', JSON.stringify(extractPerformanceHints(code), null, 2));
