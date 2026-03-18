import { buildSystemMap } from './src/layer-graph/builders/system-map.js';

const parsedFiles = {
  'src/a.js': {
    fileName: 'a.js',
    imports: [],
    exports: [{ name: 'foo', type: 'function' }],
    definitions: []
  },
  'src/b.js': {
    fileName: 'b.js',
    imports: [{ source: './a.js', specifiers: ['foo'] }],
    exports: [],
    definitions: []
  }
};

const resolvedImports = {
  'src/b.js': [
    { source: './a.js', resolved: 'src/a.js', type: 'esm' }
  ]
};

const systemMap = buildSystemMap(parsedFiles, resolvedImports);

console.log('FILES KEYS:', Object.keys(systemMap.files));
console.log('B DEPS:', systemMap.files['src/b.js']?.dependsOn);
console.log('A USEDBY:', systemMap.files['src/a.js']?.usedBy);
console.log('DEPENDENCIES:', JSON.stringify(systemMap.dependencies, null, 2));
