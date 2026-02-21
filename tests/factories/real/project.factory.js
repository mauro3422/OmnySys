/**
 * @fileoverview project.factory.js
 * 
 * Factory REAL para crear proyectos completos de prueba.
 * Reemplaza mocks de proyectos con proyectos reales en filesystem.
 * 
 * @module tests/factories/real/project
 */

import { FileSystemFactory } from './filesystem.factory.js';

/**
 * Proyectos predefinidos para tests
 */
export const PROJECT_TEMPLATES = {
  /**
   * Proyecto simple con una funcion
   */
  simple: {
    'index.js': `export function greet(name) { return "Hello, " + name + "!"; }`
  },

  /**
   * Proyecto con imports/exports
   */
  withImports: {
    'src/utils.js': `export function helper() { return 'helper'; }`,
    'src/main.js': `import { helper } from './utils.js'; export function main() { return helper(); }`
  },

  /**
   * Proyecto con clases
   */
  withClasses: {
    'src/Calculator.js': `export class Calculator { add(a, b) { return a + b; } }`,
    'src/index.js': `import { Calculator } from './Calculator.js'; export default Calculator;`
  },

  /**
   * Proyecto con async/await
   */
  asyncProject: {
    'src/api.js': `export async function fetchData(url) { return fetch(url); }`,
    'src/main.js': `import { fetchData } from './api.js'; export async function main() { return await fetchData('/api'); }`
  },

  /**
   * Proyecto con side effects
   */
  withSideEffects: {
    'src/storage.js': `export function saveUser(user) { localStorage.setItem('user', JSON.stringify(user)); }`
  },

  /**
   * Proyecto con eventos
   */
  withEvents: {
    'src/events.js': `export function emit(event, data) { document.dispatchEvent(new CustomEvent(event, { detail: data })); }`
  },

  /**
   * Proyecto complejo
   */
  complex: {
    'package.json': JSON.stringify({ name: 'complex-project', version: '1.0.0', type: 'module' }, null, 2),
    'src/index.js': `import { UserService } from './services/UserService.js'; export const app = { userService: new UserService() };`,
    'src/services/UserService.js': `export class UserService { constructor() { this.users = []; } addUser(user) { this.users.push(user); } }`
  }
};

/**
 * Factory para crear proyectos de prueba
 */
export class ProjectFactory {
  constructor(baseDir = null) {
    this.fs = null;
    this.baseDir = baseDir;
  }

  static async create(templateName = 'simple', customFiles = {}, baseDir = null) {
    const factory = new ProjectFactory(baseDir);
    await factory.init();
    return await factory.createProject(templateName, customFiles);
  }

  async init() {
    this.fs = await FileSystemFactory.create(this.baseDir);
  }

  async createProject(templateName, customFiles = {}) {
    const template = PROJECT_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Unknown template: ${templateName}`);
    }

    const files = { ...template, ...customFiles };
    const projectName = `test-project-${Date.now()}`;
    const project = await this.fs.createProject(projectName, files);
    
    return {
      name: projectName,
      path: project.path,
      files: project.files,
      fs: this.fs,
      cleanup: () => this.fs.cleanup()
    };
  }
}

export async function createTestProject(templateName = 'simple', files = {}) {
  return await ProjectFactory.create(templateName, files);
}

export async function withProject(templateName, callback, customFiles = {}) {
  const project = await createTestProject(templateName, customFiles);
  try {
    return await callback(project);
  } finally {
    await project.cleanup();
  }
}

export default {
  ProjectFactory,
  PROJECT_TEMPLATES,
  createTestProject,
  withProject
};
