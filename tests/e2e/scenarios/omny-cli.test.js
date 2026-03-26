import { createTestProject, cleanupTestDir, SAMPLE_PROJECT } from '../helpers/project-factory.js';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import Database from 'better-sqlite3';

import { URL, fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe('OmnySys E2E: CLI -> SQLite Pipeline', () => {
    let projectDir;
    let dbPath;

    beforeAll(async () => {
        // Create a fake project in OS temp directory
        const baseDir = process.env.TEMP || process.env.TMPDIR || '/tmp';
        projectDir = await createTestProject(baseDir, 'omnysys-e2e-test', SAMPLE_PROJECT);
        
        // Output must be a valid git repository for OmnySys to work
        execSync('git init && git add . && git commit -m "Mock Initial Commit" --author="Test <test@test.com>"', { cwd: projectDir });

        dbPath = path.join(projectDir, '.omnysysdata', 'omnysys.db');
    });

    afterAll(async () => {
        // Cleanup the fake project after tests finish
        await cleanupTestDir(projectDir);
    });

    it('should successfully analyze the project and populate the SQLite database', async () => {
        // 1. Arrange: Resolve paths
        const omnyCliPath = path.resolve(__dirname, '../../../src/cli/index.js');

        // 2. Act: Run the CLI via child_process
        try {
            console.log(`Running omny analyze on test project ID: ${projectDir}`);
            const output = execSync(`node "${omnyCliPath}" analyze .`, { 
                cwd: projectDir,
                encoding: 'utf-8'
            });
            console.log(output);
        } catch (error) {
            console.error(error.stdout || error.message);
            throw new Error('CLI execution failed. Check standard output for details.');
        }

        // 3. Assert: Verify the database exists
        let dbExists = false;
        try {
            await fs.access(dbPath);
            dbExists = true;
        } catch {
            dbExists = false;
        }
        expect(dbExists).toBe(true);

        // 4. Assert: Connect to SQLite and verify data atoms were written
        const db = new Database(dbPath, { readonly: true });
        
        const atomsCountQuery = db.prepare('SELECT count(*) as count FROM atoms').get();
        expect(atomsCountQuery.count).toBeGreaterThan(0);

        const relationCountQuery = db.prepare('SELECT count(*) as count FROM atom_relations').get();
        // we expect relationships since the SAMPLE_PROJECT contains `import` statements!
        expect(relationCountQuery.count).toBeGreaterThan(0);

        db.close();
    });
});
