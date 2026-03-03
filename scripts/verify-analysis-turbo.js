/**
 * scripts/verify-analysis-turbo.js
 * 
 * Benchmark script for Phase 2 "Turbo Mode"
 * This script wipes local data, runs a full initialization,
 * and measures the time it takes to complete both Phase 1 and Phase 2.
 */
import { OmnySysMCPServer } from '../src/layer-c-memory/mcp/core/server-class.js';
import { getRepository } from '../src/layer-c-memory/storage/repository/index.js';
import fs from 'fs/promises';
import path from 'path';

const projectPath = process.cwd();
const dataPath = path.join(projectPath, '.omnysysdata');

async function run() {
    console.log('🚀 Starting Phase 2 Turbo Benchmark...');

    // 1. Cleanup
    console.log(`🧹 Deleting ${dataPath}...`);
    try {
        await fs.rm(dataPath, { recursive: true, force: true });
    } catch (e) {
        console.log('   (Data path already clean or locked)');
    }

    // Set environment variable to avoid LLM overhead during benchmark
    process.env.OMNYSYS_LLM_DISABLED = 'true';
    process.env.OMNYSYS_HOT_RELOAD = 'false';

    const server = new OmnySysMCPServer(projectPath);

    const startTime = Date.now();
    let phase1Time = 0;
    let phase2StartTime = 0;

    console.log('🏗️  Starting Initialization Pipeline...');

    const originalPipelineExecute = server.pipeline.execute.bind(server.pipeline);
    server.pipeline.execute = async (ctx) => {
        const res = await originalPipelineExecute(ctx);

        const orchestrator = server.orchestrator;
        if (!orchestrator) {
            console.error('❌ Orchestrator not found after initialization');
            process.exit(1);
        }

        phase1Time = (Date.now() - startTime) / 1000;
        phase2StartTime = Date.now();
        console.log(`\n✅ Phase 1 (Structural) Complete in ${phase1Time.toFixed(2)}s`);
        console.log('🔄 Background Phase 2 (Deep) has started...\n');

        return new Promise((resolve) => {
            let lastProcessed = 0;
            let stallCount = 0;

            const checkInterval = setInterval(() => {
                const processed = orchestrator.processedFiles.size;
                const total = orchestrator.totalFilesToAnalyze;

                if (total > 0) {
                    const percentage = ((processed / total) * 100).toFixed(1);
                    process.stdout.write(`\r📊 Phase 2 Progress: ${percentage}% (${processed}/${total} files)   `);

                    if (processed === lastProcessed && processed < total) {
                        stallCount++;
                        if (stallCount > 120) { // 1 minute stall
                            console.log('\n\n❌ ERROR: Phase 2 appears stalled!');
                            clearInterval(checkInterval);
                            resolve(res);
                        }
                    } else {
                        stallCount = 0;
                    }
                    lastProcessed = processed;

                    if (processed >= total) {
                        clearInterval(checkInterval);
                        const phase2Time = (Date.now() - phase2StartTime) / 1000;
                        const totalTime = (Date.now() - startTime) / 1000;

                        console.log('\n\n✨ BENCHMARK COMPLETE ✨');
                        console.log('-------------------------');
                        console.log(`Phase 1 Total: ${phase1Time.toFixed(2)}s`);
                        console.log(`Phase 2 Total: ${phase2Time.toFixed(2)}s`);
                        console.log(`Total E2E:    ${totalTime.toFixed(2)}s`);
                        console.log('-------------------------');

                        // Final Database Verification
                        const repo = getRepository(projectPath);
                        const ghostAtoms = repo.db.prepare('SELECT COUNT(*) as count FROM atoms WHERE is_phase2_complete = 0').get();

                        if (ghostAtoms.count === 0) {
                            console.log('✅ DATABASE INTEGRITY: All atoms marked as Phase 2 Complete.');
                        } else {
                            console.log(`❌ DATABASE ERROR: Found ${ghostAtoms.count} atoms with incomplete Phase 2.`);
                        }

                        resolve(res);
                    }
                } else if (orchestrator.analysisCompleteEmitted) {
                    // If total is 0 but analysis is complete, it might mean there was nothing to do
                    console.log('ℹ️  Phase 2 had no files to analyze.');
                    clearInterval(checkInterval);
                    resolve(res);
                }
            }, 500);
        });
    };

    await server.initialize();

    console.log('🛑 Shutting down server...');
    await server.shutdown();
    process.exit(0);
}

run().catch(err => {
    console.error('❌ Benchmark failed:', err);
    process.exit(1);
});
