import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';

async function test() {
    try {
        console.log('--- Parser Debug ---');
        console.log('Parser type:', typeof Parser);

        // Check for init
        if (Parser.init) {
            console.log('Parser.init FOUND! (This is unexpected for native)');
        } else {
            console.log('Parser.init NOT found (Good for native)');
        }

        const parser = new Parser();
        parser.setLanguage(JavaScript);
        const code = 'function hello() { console.log("world"); }';
        const tree = parser.parse(code);
        console.log('Parse successful! Root type:', tree.rootNode.type);

    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.stack) console.error(error.stack);
    }
}

test();
