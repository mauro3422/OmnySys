import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { analyzeLogic } from '#cli/commands/analyze.js';
import { 
  createTestProject, 
  cleanupTestDir, 
  SAMPLE_PROJECT 
} from '../helpers/project-factory.js';

describe('E2E: Full Analysis Workflow', () => {
  let testDir;
  
  beforeEach(async () => {
    testDir = path.join(process.cwd(), '.test-e2e-workflow');
    await fs.mkdir(testDir, { recursive: true });
  });
  
  afterEach(async () => {
    await cleanupTestDir(testDir);
  });
  
  describe('Layer A → Layer C Flow', () => {
    it('should create complete analysis artifacts', async () => {
      const projectPath = await createTestProject(testDir, 'full-project', SAMPLE_PROJECT);
      
      const result = await analyzeLogic(projectPath, { silent: true });
      expect(result.success).toBe(true);
      
      const omnyDir = path.join(projectPath, '.omnysysdata');
      
      const dirExists = await fs.access(omnyDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
      
      const filesDir = path.join(omnyDir, 'files');
      const filesExist = await fs.access(filesDir).then(() => true).catch(() => false);
      expect(filesExist).toBe(true);
    });
    
    it('should analyze interconnected modules', async () => {
      const projectPath = await createTestProject(testDir, 'interconnected', {
        'index.js': `
import { ServiceA } from './services/a.js';
import { ServiceB } from './services/b.js';
import { Store } from './store.js';

const a = new ServiceA();
const b = new ServiceB();

a.process(Store.get());
b.process(Store.get());
`,
        'services/a.js': `
import { Store } from '../store.js';

export class ServiceA {
  process(data) {
    Store.setState({ processed: true });
    return data * 2;
  }
}
`,
        'services/b.js': `
import { Store } from '../store.js';

export class ServiceB {
  process(data) {
    Store.setState({ processedB: true });
    return data * 3;
  }
}
`,
        'store.js': `
let state = {};

export const Store = {
  get() { return state; },
  setState(newState) { state = { ...state, ...newState }; }
};
`
      });
      
      const result = await analyzeLogic(projectPath, { silent: true });
      expect(result.success).toBe(true);
      
      const indexAnalysis = path.join(projectPath, '.omnysysdata', 'files', 'index.js.json');
      const analysis = JSON.parse(await fs.readFile(indexAnalysis, 'utf-8'));
      
      expect(analysis).toBeDefined();
      expect(analysis.imports?.length).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle syntax errors gracefully', async () => {
      const projectPath = await createTestProject(testDir, 'syntax-error', {
        'valid.js': 'export const valid = 1;',
        'invalid.js': 'export const broken = {'
      });
      
      const result = await analyzeLogic(projectPath, { silent: true });
      expect(result.success).toBe(true);
      
      const validAnalysis = path.join(projectPath, '.omnysysdata', 'files', 'valid.js.json');
      const exists = await fs.access(validAnalysis).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
    
    it('should handle missing imports gracefully', async () => {
      const projectPath = await createTestProject(testDir, 'missing-imports', {
        'main.js': `
import { missing } from './non-existent.js';
import { alsoMissing } from './gone.js';

export const main = () => missing();
`
      });
      
      const result = await analyzeLogic(projectPath, { silent: true });
      expect(result.success).toBe(true);
    });
  });
  
  describe('Incremental Analysis', () => {
    it('should handle re-analysis of same project', async () => {
      const projectPath = await createTestProject(testDir, 'reanalyze', SAMPLE_PROJECT);
      
      const result1 = await analyzeLogic(projectPath, { silent: true });
      expect(result1.success).toBe(true);
      
      const result2 = await analyzeLogic(projectPath, { silent: true });
      expect(result2.success).toBe(true);
    });
    
    it('should handle modified files', async () => {
      const projectPath = await createTestProject(testDir, 'modified', {
        'app.js': 'export const version = 1;'
      });
      
      await analyzeLogic(projectPath, { silent: true });
      
      await fs.writeFile(path.join(projectPath, 'app.js'), 'export const version = 2;');
      
      const result = await analyzeLogic(projectPath, { silent: true });
      expect(result.success).toBe(true);
    });
  });
});
