#!/usr/bin/env node
/**
 * compare-parsers.js
 *
 * Compara la salida de:
 *   - parser   (Babel actual)
 *   - parser-v2 (Tree-sitter nuevo)
 *
 * Uso:
 *   node scripts/compare-parsers.js [--sample N] [--file path/to/file.js]
 *
 * Métricas comparadas:
 *   - Cantidad de funciones detectadas
 *   - Cantidad de imports/exports
 *   - Calls dentro de cada función (calidad del scope tracking)
 */

import { parseFile as babelParse } from '../src/layer-a-static/parser/index.js';
import { parseFile as treeParse } from '../src/layer-a-static/parser-v2/index.js';
import { glob } from 'glob';
import path from 'path';
import { readFileSync } from 'fs';

// ─── Args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const sampleIdx = args.indexOf('--sample');
const sampleSize = sampleIdx !== -1 ? parseInt(args[sampleIdx + 1]) : 20;
const fileIdx = args.indexOf('--file');
const specificFile = fileIdx !== -1 ? args[fileIdx + 1] : null;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function delta(a, b) {
    if (a === b) return '✅ equal';
    const diff = b - a;
    const pct = a === 0 ? '∞' : ((Math.abs(diff) / a) * 100).toFixed(1) + '%';
    return diff > 0 ? `⬆ +${diff} (${pct})` : `⬇ ${diff} (${pct})`;
}

async function compareFile(filePath) {
    const code = readFileSync(filePath, 'utf-8');
    const relPath = path.relative(process.cwd(), filePath);

    let babelResult, treeResult;

    try {
        babelResult = babelParse(filePath, code);
    } catch (e) {
        return { file: relPath, error: `Babel: ${e.message}` };
    }

    try {
        treeResult = await treeParse(filePath, code);
    } catch (e) {
        return { file: relPath, error: `Tree-sitter: ${e.message}` };
    }

    const bFns = babelResult.functions?.length ?? 0;
    const tFns = treeResult.functions?.length ?? 0;
    const bImports = babelResult.imports?.length ?? 0;
    const tImports = treeResult.imports?.length ?? 0;
    const bExports = babelResult.exports?.length ?? 0;
    const tExports = treeResult.exports?.length ?? 0;

    // Calls totales dentro de funciones
    const bCalls = babelResult.functions?.reduce((n, f) => n + (f.calls?.length ?? 0), 0) ?? 0;
    const tCalls = treeResult.functions?.reduce((n, f) => n + (f.calls?.length ?? 0), 0) ?? 0;

    return {
        file: relPath,
        functions: { babel: bFns, tree: tFns, delta: delta(bFns, tFns) },
        imports: { babel: bImports, tree: tImports, delta: delta(bImports, tImports) },
        exports: { babel: bExports, tree: tExports, delta: delta(bExports, tExports) },
        calls: { babel: bCalls, tree: tCalls, delta: delta(bCalls, tCalls) },
        match: bFns === tFns && bImports === tImports,
    };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    let files;

    if (specificFile) {
        files = [path.resolve(specificFile)];
    } else {
        const allFiles = await glob('src/**/*.js', { cwd: process.cwd(), absolute: true });
        // sample aleatorio
        const shuffled = allFiles.sort(() => Math.random() - 0.5);
        files = shuffled.slice(0, sampleSize);
    }

    console.log(`\n🔬 Comparing parsers on ${files.length} files...\n`);

    let matched = 0, diffFns = 0, errors = 0;
    const results = [];

    for (const file of files) {
        const r = await compareFile(file);
        results.push(r);
        if (r.error) {
            errors++;
            console.log(`❌ ${r.file}: ${r.error}`);
        } else if (r.match) {
            matched++;
        } else {
            diffFns++;
        }
    }

    // ── Summary ──
    console.log('\n───────────────────────────────────────────────────────────────');
    console.log(`📊 Results: ${matched} match | ${diffFns} diff | ${errors} errors`);
    console.log(`📈 Match rate: ${((matched / files.length) * 100).toFixed(1)}%\n`);

    // Print diffs
    const diffs = results.filter(r => !r.error && !r.match);
    if (diffs.length > 0) {
        console.log('📋 Differences:');
        for (const r of diffs) {
            console.log(`  ${r.file}`);
            if (r.functions.babel !== r.functions.tree)
                console.log(`    functions: babel=${r.functions.babel} tree=${r.functions.tree} ${r.functions.delta}`);
            if (r.imports.babel !== r.imports.tree)
                console.log(`    imports: babel=${r.imports.babel} tree=${r.imports.tree} ${r.imports.delta}`);
            if (r.exports.babel !== r.exports.tree)
                console.log(`    exports: babel=${r.exports.babel} tree=${r.exports.tree} ${r.exports.delta}`);
            if (r.calls.babel !== r.calls.tree)
                console.log(`    calls: babel=${r.calls.babel} tree=${r.calls.tree} ${r.calls.delta}`);
        }
    }

    // Calls improvement (closure tracking)
    const callImprovement = results
        .filter(r => !r.error && r.calls)
        .filter(r => r.calls.tree > r.calls.babel);
    if (callImprovement.length > 0) {
        console.log(`\n🚀 Closure tracking improvement (tree > babel calls):`);
        callImprovement.slice(0, 5).forEach(r => {
            console.log(`  ${r.file}: babel=${r.calls.babel} tree=${r.calls.tree} ${r.calls.delta}`);
        });
    }
}

main().catch(e => { console.error(e); process.exit(1); });
