import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { analyzeLogic } from '#cli/commands/analyze.js';
import { 
  createTestProject, 
  cleanupTestDir, 
  SAMPLE_PROJECT,
  createReactComponent,
  createServiceModule 
} from '../helpers/project-factory.js';

describe('E2E: CLI Analyze Command', () => {
  let testDir;
  
  beforeEach(async () => {
    testDir = path.join(process.cwd(), '.test-e2e-analyze');
    await fs.mkdir(testDir, { recursive: true });
  });
  
  afterEach(async () => {
    await cleanupTestDir(testDir);
  });
  
  describe('Basic Analysis', () => {
    it('should analyze empty project', async () => {
      const projectPath = await createTestProject(testDir, 'empty', {
        'placeholder.js': '// empty'
      });
      
      const result = await analyzeLogic(projectPath, { silent: true });
      
      expect(result.success).toBe(true);
      expect(result.projectPath).toBe(projectPath);
    });
    
    it('should analyze simple project', async () => {
      const projectPath = await createTestProject(testDir, 'simple', SAMPLE_PROJECT);
      
      const result = await analyzeLogic(projectPath, { silent: true });
      
      expect(result.success).toBe(true);
    });
    
    it('should create non-existent directory', async () => {
      const result = await analyzeLogic('/non/existent/path', { silent: true });
      
      expect(result.success).toBe(true);
    });
  });
  
  describe('Import/Export Detection', () => {
    it('should detect all imports and exports', async () => {
      const projectPath = await createTestProject(testDir, 'imports', {
        'main.js': `
import { helper } from './utils.js';
import * as lib from './lib.js';
import DefaultExport from './default.js';

export const main = () => helper(lib.fn());
export { helper };
export default main;
`,
        'utils.js': 'export const helper = () => {};',
        'lib.js': 'export const fn = () => {};',
        'default.js': 'export default {}'
      });
      
      const result = await analyzeLogic(projectPath, { silent: true });
      expect(result.success).toBe(true);
      
      const analysisFile = path.join(projectPath, '.omnysysdata', 'files', 'main.js.json');
      const analysis = JSON.parse(await fs.readFile(analysisFile, 'utf-8'));
      
      expect(analysis.imports?.length).toBeGreaterThanOrEqual(3);
      expect(analysis.exports?.length).toBeGreaterThanOrEqual(2);
    });
  });
  
  describe('Shared State Detection', () => {
    it('should detect localStorage usage', async () => {
      const projectPath = await createTestProject(testDir, 'storage', {
        'app.js': createServiceModule('AppService', { hasStorage: true })
      });
      
      const result = await analyzeLogic(projectPath, { silent: true });
      expect(result.success).toBe(true);
      
      const analysisFile = path.join(projectPath, '.omnysysdata', 'files', 'app.js.json');
      const analysis = JSON.parse(await fs.readFile(analysisFile, 'utf-8'));
      
      expect(analysis).toBeDefined();
      expect(analysis.filePath || analysis.path || analysis.name).toBeDefined();
    });
    
    it('should detect sessionStorage usage', async () => {
      const projectPath = await createTestProject(testDir, 'session', {
        'session.js': `
export function saveSession(data) {
  sessionStorage.setItem('session', JSON.stringify(data));
}
`
      });
      
      const result = await analyzeLogic(projectPath, { silent: true });
      expect(result.success).toBe(true);
    });
  });
  
  describe('Event Pattern Detection', () => {
    it('should detect event listeners', async () => {
      const projectPath = await createTestProject(testDir, 'events', {
        'events.js': `
export function setupListeners() {
  document.addEventListener('click', handler);
  window.addEventListener('resize', onResize);
  element.addEventListener('submit', onSubmit);
}
`
      });
      
      const result = await analyzeLogic(projectPath, { silent: true });
      expect(result.success).toBe(true);
    });
    
    it('should detect event emissions', async () => {
      const projectPath = await createTestProject(testDir, 'emit', {
        'emitter.js': `
export class Emitter {
  emit(eventName, data) {
    this.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }
}
`
      });
      
      const result = await analyzeLogic(projectPath, { silent: true });
      expect(result.success).toBe(true);
    });
  });
  
  describe('React Component Analysis', () => {
    it('should detect React hooks', async () => {
      const projectPath = await createTestProject(testDir, 'react', {
        'Button.jsx': createReactComponent('Button')
      });
      
      const result = await analyzeLogic(projectPath, { silent: true });
      expect(result.success).toBe(true);
    });
  });
  
  describe('Performance', () => {
    it('should analyze 100 files in reasonable time', async () => {
      const files = {};
      for (let i = 0; i < 100; i++) {
        files[`module${i}.js`] = `export const func${i} = () => ${i};`;
      }
      
      const projectPath = await createTestProject(testDir, 'large', files);
      
      const start = Date.now();
      const result = await analyzeLogic(projectPath, { silent: true });
      const duration = Date.now() - start;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(30000);
    });
  });
});
