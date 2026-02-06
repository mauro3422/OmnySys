/**
 * Main Entry Point
 * Tests: entry-point archetype detector
 * Expected: Detected as entry-point (5+ imports, 0 dependents)
 */

import express from 'express';
import { getUsers, login } from './api-client.js';
import { getDatabaseConfig } from './env-reader-a.js';
import { Button } from './Button.js';
import * as utils from './utils/index.js';
import * as config from './config.js';

// This file imports many modules but nothing imports it
// -> Entry point

const app = express();

async function main() {
  const dbConfig = getDatabaseConfig();
  console.log('DB Config:', dbConfig);

  const users = await getUsers();
  console.log('Users:', users);

  const button = Button({ label: 'Start', onClick: () => {} });
  console.log('Button:', button);

  console.log('Utils:', utils.formatString('hello'));
}

main();
