#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { CogniSystemUnifiedServer, main } from './unified-server/index.js';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { CogniSystemUnifiedServer };
