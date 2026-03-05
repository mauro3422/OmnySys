import { Orchestrator } from './src/core/orchestrator/index.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import path from 'path';
import fs from 'fs';

async function testIncremental() {
    const projectPath = process.cwd();
    const orchestrator = new Orchestrator(projectPath);
    orchestrator.rootPath = projectPath; // Fix for analyze.js expectation

    const targetFile = 'src/layer-c-memory/mcp-http-server.js';
    const absolutePath = path.join(projectPath, targetFile);

    console.log(`\n--- Test de Estado Compartido Incremental ---`);
    console.log(`Archivo objetivo: ${targetFile}`);

    // 1. Verificar estado inicial
    const repo = getRepository(projectPath);
    const db = repo.db;

    const countBefore = db.prepare(`SELECT COUNT(*) as count FROM atom_relations WHERE relation_type = 'shares_state' AND (source_id LIKE ? OR target_id LIKE ?)`).get(`${targetFile.replace(/\//g, '_').replace('.js', '')}%`, `${targetFile.replace(/\//g, '_').replace('.js', '')}%`).count;
    console.log(`Relaciones antes: ${countBefore}`);

    // 2. Simular modificación (llamando directamente a analyzeAndIndex)
    const { analyzeAndIndex } = await import('./src/core/file-watcher/analyze.js');

    console.log(`\nEjecutando analyzeAndIndex incremental...`);

    // Debug antes de llamar
    const { parseFileFromDisk } = await import('./src/layer-a-static/parser/index.js');
    const parsed = await parseFileFromDisk(absolutePath);
    console.log(`Step 1: Parseo completado. Definiciones encontradas: ${parsed?.definitions?.length || 0}`);

    const analysis = await analyzeAndIndex.call(orchestrator, targetFile, absolutePath, true);

    console.log(`Análisis completo.`);
    console.log(`- Definiciones en analysis: ${analysis?.definitions?.length || 0}`);
    console.log(`- Átomos en analysis: ${analysis?.moleculeAtoms?.length || 0}`);
    console.log(`- Metada (envVars): ${analysis?.metadata?.buildTimeDeps?.envVars?.length || 0}`);

    // 3. Verificar estado después
    const countAfter = db.prepare(`SELECT COUNT(*) as count FROM atom_relations WHERE relation_type = 'shares_state' AND (source_id LIKE ? OR target_id LIKE ?)`).get(`${targetFile.replace(/\//g, '_').replace('.js', '')}%`, `${targetFile.replace(/\//g, '_').replace('.js', '')}%`).count;
    console.log(`Relaciones después: ${countAfter}`);

    if (countAfter > 0) {
        console.log(`✅ ÉXITO: Se han generado/mantenido relaciones de estado compartido de forma incremental.`);

        const sample = db.prepare(`
            SELECT ar.*, a1.name as source_name, a2.name as target_name 
            FROM atom_relations ar
            JOIN atoms a1 ON ar.source_id = a1.id
            JOIN atoms a2 ON ar.target_id = a2.id
            WHERE ar.relation_type = 'shares_state' 
              AND (ar.source_id LIKE ? OR ar.target_id LIKE ?)
            LIMIT 3
        `).all(`${targetFile.replace(/\//g, '_').replace('.js', '')}%`, `${targetFile.replace(/\//g, '_').replace('.js', '')}%`);

        console.log(`\nMuestra de relaciones creadas:`);
        sample.forEach(r => {
            console.log(`  [${r.relation_type}] ${r.source_name} -> ${r.target_name} (Context: ${r.context_json})`);
        });
    } else {
        console.log(`❌ FALLO: No se encontraron relaciones.`);
    }
}

testIncremental().catch(console.error);
