/**
 * @fileoverview Root Infrastructure Test Factory - Scenarios
 */

import { AtomsIndexBuilder, ProjectStructureBuilder, SystemMapBuilder } from './builders/index.js';

export const InfrastructureScenarios = {
  emptyProject() {
    return {
      systemMap: SystemMapBuilder.create().build(),
      project: ProjectStructureBuilder.create().withPackageJson().build()
    };
  },

  simpleProject() {
    const systemMap = SystemMapBuilder.create()
      .withFile('src/index.js', { exports: [{ name: 'main' }] })
      .withFile('src/utils.js', { exports: [{ name: 'helper' }] })
      .withFunction('src/index.js', 'main', { isExported: true })
      .withFunction('src/utils.js', 'helper', { isExported: true })
      .withImport('src/index.js', './utils', [{ imported: 'helper' }])
      .build();

    const project = ProjectStructureBuilder.create()
      .withPackageJson()
      .withJavaScriptFiles(['src/index.js', 'src/utils.js'])
      .build();

    return { systemMap, project };
  },

  projectWithCycles() {
    const systemMap = SystemMapBuilder.create()
      .withFile('src/a.js')
      .withFile('src/b.js')
      .withFile('src/c.js')
      .withImport('src/a.js', './b', [{ imported: 'b' }])
      .withImport('src/b.js', './c', [{ imported: 'c' }])
      .withImport('src/c.js', './a', [{ imported: 'a' }])
      .withCycle(['src/a.js', 'src/b.js', 'src/c.js'])
      .build();

    return { systemMap };
  },

  projectWithFunctionCycles() {
    const systemMap = SystemMapBuilder.create()
      .withFile('src/mutual.js')
      .withFunction('src/mutual.js', 'funcA', { isExported: true })
      .withFunction('src/mutual.js', 'funcB', { isExported: true })
      .withFunctionLink('src/mutual.js:funcA', 'src/mutual.js:funcB')
      .withFunctionLink('src/mutual.js:funcB', 'src/mutual.js:funcA')
      .build();

    return { systemMap };
  },

  projectWithDeepChains() {
    const systemMap = SystemMapBuilder.create();
    
    // Create a chain: a -> b -> c -> d -> e -> f
    const files = ['a.js', 'b.js', 'c.js', 'd.js', 'e.js', 'f.js'];
    files.forEach((f, i) => {
      systemMap.withFile(`src/${f}`);
      if (i > 0) {
        systemMap.withFunctionLink(
          `src/${files[i-1]}:func`,
          `src/${f}:func`
        );
      }
    });

    return { systemMap: systemMap.build() };
  },

  projectWithTypeScript() {
    const project = ProjectStructureBuilder.create()
      .withPackageJson({ dependencies: { typescript: '^5.0.0' } })
      .withTsConfig()
      .withTypeScriptFiles(['src/index.ts', 'src/types.ts'])
      .build();

    const systemMap = SystemMapBuilder.create()
      .withFile('src/index.ts')
      .withFile('src/types.ts')
      .withType('src/types.ts', 'User', { kind: 'interface' })
      .withTypeUsage('src/index.ts', 'User')
      .build();

    return { systemMap, project };
  },

  projectWithAliases() {
    const project = ProjectStructureBuilder.create()
      .withPackageJson({
        imports: {
          '#utils/*': './src/utils/*',
          '#config': './src/config/index.js'
        }
      })
      .withJavaScriptFiles([
        'src/utils/helpers.js',
        'src/config/index.js',
        'src/main.js'
      ])
      .build();

    return { project };
  }
};

// ============================================================================
// TEST UTILITIES
// ============================================================================


