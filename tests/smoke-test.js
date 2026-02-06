#!/usr/bin/env node

/**
 * Smoke Test - Valida extractores y arquetipos contra test-cases/scenario-new-extractors/
 *
 * Ejecutar: node tests/smoke-test.js
 *           npm run smoke
 *
 * Verifica:
 * 1. Route extraction (api-server.js, api-client.js)
 * 2. Route connections (shared /api/users entre server y client)
 * 3. Env var extraction (env-reader-a.js, env-reader-b.js)
 * 4. Env connections (shared DB_HOST)
 * 5. Colocation detection (Button.js <-> Button.test.js, Button.stories.js)
 * 6. Archetype detection (facade, config-hub, entry-point bypass LLM)
 * 7. LLM bypass (requiresLLM flags)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCENARIO = path.join(ROOT, 'test-cases', 'scenario-new-extractors');

/** Convert absolute path to file:// URL for dynamic import on Windows */
function toImportURL(absolutePath) {
  return pathToFileURL(absolutePath).href;
}

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  \u2705 ${testName}`);
    passed++;
  } else {
    console.error(`  \u274C ${testName}`);
    failed++;
  }
}

function readFile(name) {
  return fs.readFileSync(path.join(SCENARIO, name), 'utf-8');
}

async function main() {
  console.log('\n=== OmnySys Smoke Test ===\n');

  // ─── 1. Route Extraction ───
  console.log('--- Route Extraction ---');
  const { extractRoutes } = await import(
    toImportURL(path.join(ROOT, 'src', 'layer-a-static', 'extractors', 'static', 'route-extractor.js'))
  );

  const serverCode = readFile('api-server.js');
  const serverRoutes = extractRoutes('api-server.js', serverCode);
  assert(serverRoutes.server.length >= 3, 'api-server.js: detects 3+ server routes');
  assert(serverRoutes.server.some(r => r.route === '/api/users'), 'api-server.js: detects /api/users');
  assert(serverRoutes.server.some(r => r.route === '/api/auth/login'), 'api-server.js: detects /api/auth/login');
  assert(serverRoutes.server.some(r => r.route === '/api/users/:id'), 'api-server.js: detects /api/users/:id');

  const clientCode = readFile('api-client.js');
  const clientRoutes = extractRoutes('api-client.js', clientCode);
  assert(clientRoutes.client.length >= 2, 'api-client.js: detects 2+ client routes');

  // ─── 2. Route Connections ───
  console.log('\n--- Route Connections ---');
  const { detectRouteConnections } = await import(
    toImportURL(path.join(ROOT, 'src', 'layer-a-static', 'extractors', 'static', 'route-connections.js'))
  );

  const routeFileResults = {
    'api-server.js': { routes: serverRoutes },
    'api-client.js': { routes: clientRoutes }
  };
  const routeConns = detectRouteConnections(routeFileResults);
  assert(routeConns.length >= 1, `Route connections found: ${routeConns.length}`);
  assert(routeConns.some(c => c.type === 'shared-route'), 'Connection type is shared-route');

  // ─── 3. Env Var Extraction ───
  console.log('\n--- Env Var Extraction ---');
  const { extractSemanticFromFile } = await import(
    toImportURL(path.join(ROOT, 'src', 'layer-a-static', 'extractors', 'static', 'index.js'))
  );

  const envA = extractSemanticFromFile('env-reader-a.js', readFile('env-reader-a.js'));
  const envB = extractSemanticFromFile('env-reader-b.js', readFile('env-reader-b.js'));
  assert(envA.envVars.length >= 2, `env-reader-a.js: detects ${envA.envVars.length} env vars (DB_HOST, PORT)`);
  assert(envB.envVars.length >= 2, `env-reader-b.js: detects ${envB.envVars.length} env vars (DB_HOST, API_KEY)`);
  assert(envA.envVars.some(e => e.name === 'DB_HOST'), 'env-reader-a.js: finds DB_HOST');
  assert(envB.envVars.some(e => e.name === 'DB_HOST'), 'env-reader-b.js: finds DB_HOST');

  // ─── 4. Env Connections ───
  console.log('\n--- Env Connections ---');
  const { detectEnvConnections } = await import(
    toImportURL(path.join(ROOT, 'src', 'layer-a-static', 'extractors', 'static', 'env-connections.js'))
  );

  const envFileResults = {
    'env-reader-a.js': envA,
    'env-reader-b.js': envB
  };
  const envConns = detectEnvConnections(envFileResults);
  assert(envConns.length >= 1, `Env connections found: ${envConns.length}`);
  assert(envConns.some(c => c.envVar === 'DB_HOST'), 'Shared DB_HOST connection detected');
  assert(envConns.every(c => c.confidence === 1.0), 'All env connections have confidence 1.0');

  // ─── 5. Colocation Detection ───
  console.log('\n--- Colocation Detection ---');
  const { detectColocatedFiles } = await import(
    toImportURL(path.join(ROOT, 'src', 'layer-a-static', 'extractors', 'static', 'colocation-extractor.js'))
  );

  const allPaths = [
    'Button.js',
    'Button.test.js',
    'Button.stories.js',
    'config.js',
    'main.js'
  ];
  const colocConns = detectColocatedFiles(allPaths);
  assert(colocConns.length >= 2, `Colocation connections found: ${colocConns.length}`);
  assert(colocConns.some(c => c.colocationType === 'test-companion'), 'Button.test.js detected as test-companion');
  assert(colocConns.some(c => c.colocationType === 'storybook'), 'Button.stories.js detected as storybook');

  // ─── 6. Full detectAllSemanticConnections ───
  console.log('\n--- Full Detection Pipeline ---');
  const { detectAllSemanticConnections } = await import(
    toImportURL(path.join(ROOT, 'src', 'layer-a-static', 'extractors', 'static', 'index.js'))
  );

  const allFiles = {
    'api-server.js': serverCode,
    'api-client.js': clientCode,
    'env-reader-a.js': readFile('env-reader-a.js'),
    'env-reader-b.js': readFile('env-reader-b.js')
  };
  const allConns = detectAllSemanticConnections(allFiles);
  assert(allConns.routeConnections.length >= 1, `Pipeline: ${allConns.routeConnections.length} route connections`);
  assert(allConns.envConnections.length >= 1, `Pipeline: ${allConns.envConnections.length} env connections`);
  assert(allConns.all.length >= 2, `Pipeline: ${allConns.all.length} total connections`);

  // ─── 7. Archetype Detection & LLM Bypass ───
  console.log('\n--- Archetype LLM Bypass ---');
  const { ARCHETYPE_REGISTRY, archetypeRequiresLLM, filterArchetypesRequiringLLM } = await import(
    toImportURL(path.join(ROOT, 'src', 'layer-b-semantic', 'prompt-engine', 'PROMPT_REGISTRY.js'))
  );

  // Verificar que facade, config-hub, entry-point NO requieren LLM
  assert(archetypeRequiresLLM('facade') === false, 'facade: requiresLLM = false');
  assert(archetypeRequiresLLM('config-hub') === false, 'config-hub: requiresLLM = false');
  assert(archetypeRequiresLLM('entry-point') === false, 'entry-point: requiresLLM = false');

  // Verificar que god-object, dynamic-importer SÍ requieren LLM
  assert(archetypeRequiresLLM('god-object') === true, 'god-object: requiresLLM = true');
  assert(archetypeRequiresLLM('dynamic-importer') === true, 'dynamic-importer: requiresLLM = true');
  assert(archetypeRequiresLLM('orphan-module') === true, 'orphan-module: requiresLLM = true');

  // Verificar que conditional funciona
  assert(archetypeRequiresLLM('event-hub') === 'conditional', 'event-hub: requiresLLM = conditional');
  assert(archetypeRequiresLLM('singleton') === 'conditional', 'singleton: requiresLLM = conditional');

  // Verificar filterArchetypesRequiringLLM
  const mixedArchetypes = [
    { type: 'facade', severity: 4 },
    { type: 'god-object', severity: 10 },
    { type: 'entry-point', severity: 3 }
  ];
  const filtered = filterArchetypesRequiringLLM(mixedArchetypes);
  assert(filtered.length === 1, `filterArchetypesRequiringLLM: ${filtered.length} of 3 need LLM`);
  assert(filtered[0].type === 'god-object', 'filterArchetypesRequiringLLM: only god-object passes');

  // ─── Summary ───
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(40)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
