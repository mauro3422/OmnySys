#!/usr/bin/env node

/**
 * CogniSystem Test Runner
 *
 * Ejecuta todos los tests modulares.
 */

import { testCounter, printFinalReport } from './helpers/test-setup.js';

// Importar tests
import './batch-processor/batch-processor.test.js';
import './websocket/websocket.test.js';
import './file-watcher/file-watcher.test.js';

// Esperar a que terminen todos los tests
setTimeout(() => {
  printFinalReport();
}, 5000); // Dar tiempo suficiente para todos los tests
