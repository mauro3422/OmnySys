#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { main } from './src/cli/index.js';
export {
  analyze,
  analyzeFile,
  check,
  consolidate,
  serve,
  clean,
  status,
  exportMap,
  ai
} from './src/cli/index.js';

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  main().catch((error) => {
    console.error('\nFatal error:', error.message);
    process.exit(1);
  });
}
