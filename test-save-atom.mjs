import { saveAtom } from './src/layer-c-memory/storage/atoms/atom.js';
import path from 'path';

const rootPath = process.cwd();
const testAtom = {
  id: 'test.js::testFunc',
  name: 'testFunc',
  type: 'function',
  line: 1,
  test: 'manual'
};

try {
  const result = await saveAtom(rootPath, 'test.js', 'testFunc', testAtom);
  console.log('✅ Atom saved to:', result);
} catch (error) {
  console.error('❌ Error:', error.message);
}
