/**
 * @fileoverview verify-fixes-simple.mjs
 * 
 * Versión simplificada para verificar la modularización y optimización 
 * sin depender de la sesión del Proxy MCP.
 */

import { aggregate_metrics } from '../src/layer-c-memory/mcp/tools/aggregate-metrics.js';
import { createLogger } from '../src/utils/logger.js';

async function runSimpleVerification() {
    console.log('=======================================================');
    console.log('  OmnySys Simple Verification (Internal)');
    console.log('=======================================================\n');

    const fakeContext = {
        logger: createLogger('Verify:Simple'),
        projectPath: process.cwd(),
        _testing: true // Flag to skip environment-specific initialization if any
    };

    // ─── Test 1: aggregate_metrics (Internal Call) ──────────────────────────
    console.log('📦 Test 1: Internal call to aggregate_metrics (modules)...');
    try {
        const result = await aggregate_metrics({ aggregationType: 'modules' }, fakeContext);

        if (result && result.modules) {
            console.log(`  ✅ PASS: ${result.modules.length} modules extracted successfully.`);
            console.log(`     Total files: ${result.totalFiles}`);
        } else {
            console.log('  ❌ FAIL: No modules returned from internal call.');
        }
    } catch (e) {
        console.log(`  ❌ ERROR: ${e.message}`);
    }

    // ─── Test 2: Pipeline Health (Dynamic Check) ───────────────────────────
    console.log('\n🏥 Test 2: Internal call to aggregate_metrics (pipeline_health)...');
    try {
        const result = await aggregate_metrics({ aggregationType: 'pipeline_health' }, fakeContext);

        if (result && result.healthScore !== undefined) {
            console.log(`  ✅ PASS: Pipeline health score: ${result.healthScore} (${result.grade})`);
            console.log(`     Issues: ${result.issues.length}, Warnings: ${result.warnings.length}`);
        } else {
            console.log('  ❌ FAIL: Pipeline health check produced no result.');
        }
    } catch (e) {
        console.log(`  ❌ ERROR: ${e.message}`);
    }

    console.log('\n=======================================================');
    console.log('  Verification Complete.');
    console.log('=======================================================\n');
}

runSimpleVerification().catch(console.error);
