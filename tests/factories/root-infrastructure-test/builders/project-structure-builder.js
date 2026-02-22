/**
 * @fileoverview Project Structure Builder - Constructor de estructura de proyectos
 */

export class ProjectStructureBuilder {
  constructor(rootPath = '/test-project') {
    this.rootPath = rootPath;
    this.files = new Map();
    this.packageJson = null;
    this.tsconfigJson = null;
    this.jsconfigJson = null;
  }

  static create(rootPath = '/test-project') {
    return new ProjectStructureBuilder(rootPath);
  }

  withFile(relativePath, content = '') {
    this.files.set(relativePath, {
      path: relativePath,
      content,
      isDirectory: false
    });
    return this;
  }

  withDirectory(relativePath) {
    this.files.set(relativePath, {
      path: relativePath,
      content: null,
      isDirectory: true
    });
    return this;
  }

  withPackageJson(overrides = {}) {
    this.packageJson = {
      name: 'test-project',
      version: '1.0.0',
      type: 'module',
      ...overrides
    };
    this.files.set('package.json', {
      path: 'package.json',
      content: JSON.stringify(this.packageJson, null, 2),
      isDirectory: false
    });
    return this;
  }

  withTsConfig(overrides = {}) {
    this.tsconfigJson = {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'node',
        baseUrl: '.',
        paths: {
          '@/*': ['src/*']
        },
        ...overrides.compilerOptions
      },
      ...overrides
    };
    this.files.set('tsconfig.json', {
      path: 'tsconfig.json',
      content: JSON.stringify(this.tsconfigJson, null, 2),
      isDirectory: false
    });
    return this;
  }

  withJsConfig(overrides = {}) {
    this.jsconfigJson = {
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@/*': ['src/*']
        },
        ...overrides.compilerOptions
      },
      ...overrides
    };
    this.files.set('jsconfig.json', {
      path: 'jsconfig.json',
      content: JSON.stringify(this.jsconfigJson, null, 2),
      isDirectory: false
    });
    return this;
  }

  withJavaScriptFiles(paths) {
    paths.forEach(p => {
      this.withFile(p, `// ${p}\nexport default {};`);
    });
    return this;
  }

  withTypeScriptFiles(paths) {
    paths.forEach(p => {
      this.withFile(p, `// ${p}\nexport default {};`);
    });
    return this;
  }

  withImports(filePath, imports) {
    const content = imports
      .map(imp => `import ${imp.name} from '${imp.source}';`)
      .join('\n');
    this.withFile(filePath, content);
    return this;
  }

  withNodeModules() {
    this.withDirectory('node_modules');
    return this;
  }

  build() {
    return {
      rootPath: this.rootPath,
      files: Array.from(this.files.values()),
      packageJson: this.packageJson,
      tsconfigJson: this.tsconfigJson,
      jsconfigJson: this.jsconfigJson
    };
  }
}
