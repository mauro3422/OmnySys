import * as TS from 'tree-sitter';
import Parser from 'tree-sitter';

console.log('--- Tree-sitter Module Inspection ---');
console.log('All exports:', Object.keys(TS));
console.log('Default export type:', typeof Parser);
if (Parser) {
    console.log('Default export keys:', Object.keys(Parser));
    console.log('Default export prototype keys:', Object.keys(Parser.prototype || {}));
}

try {
    const p = new Parser();
    console.log('Instance keys:', Object.keys(p));
    console.log('Instance prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(p)));
} catch (e) {
    console.log('Failed to instantiate:', e.message);
}
