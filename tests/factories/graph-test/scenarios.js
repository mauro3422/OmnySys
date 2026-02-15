/**
 * @fileoverview Graph Test Factory - Scenarios
 */

import { GraphBuilder } from './builders.js';

export const GraphScenarios = {
  /**
   * Empty graph
   */
  empty: () => GraphBuilder.create().build(),

  /**
   * Single file with no dependencies
   */
  singleFile: () => GraphBuilder.create()
    .withFile('src/index.js')
    .build(),

  /**
   * Linear dependency chain: A -> B -> C -> D
   */
  linearChain: () => GraphBuilder.create()
    .withFiles(['src/a.js', 'src/b.js', 'src/c.js', 'src/d.js'])
    .withDependencyChain(['src/a.js', 'src/b.js', 'src/c.js', 'src/d.js'])
    .build(),

  /**
   * Simple cycle: A -> B -> C -> A
   */
  simpleCycle: () => GraphBuilder.create()
    .withCycle(['src/a.js', 'src/b.js', 'src/c.js'])
    .build(),

  /**
   * Multiple cycles
   */
  multipleCycles: () => GraphBuilder.create()
    .withCycle(['src/a.js', 'src/b.js', 'src/c.js'])
    .withCycle(['src/d.js', 'src/e.js', 'src/f.js'])
    .build(),

  /**
   * Diamond dependency: A -> B, A -> C, B -> D, C -> D
   */
  diamond: () => GraphBuilder.create()
    .withFiles(['src/a.js', 'src/b.js', 'src/c.js', 'src/d.js'])
    .withDependency('src/a.js', 'src/b.js')
    .withDependency('src/a.js', 'src/c.js')
    .withDependency('src/b.js', 'src/d.js')
    .withDependency('src/c.js', 'src/d.js')
    .build(),

  /**
   * Star pattern: center file used by many
   */
  star: () => {
    const builder = GraphBuilder.create().withFile('src/utils.js');
    for (let i = 0; i < 10; i++) {
      builder.withFile(`src/feature${i}.js`);
      builder.withDependency(`src/feature${i}.js`, 'src/utils.js');
    }
    return builder.build();
  },

  /**
   * Deep tree structure
   */
  deepTree: () => GraphBuilder.create()
    .withFiles([
      'src/root.js',
      'src/level1/a.js',
      'src/level1/b.js',
      'src/level2/a1.js',
      'src/level2/a2.js',
      'src/level2/b1.js',
      'src/level3/leaf.js'
    ])
    .withDependency('src/root.js', 'src/level1/a.js')
    .withDependency('src/root.js', 'src/level1/b.js')
    .withDependency('src/level1/a.js', 'src/level2/a1.js')
    .withDependency('src/level1/a.js', 'src/level2/a2.js')
    .withDependency('src/level1/b.js', 'src/level2/b1.js')
    .withDependency('src/level2/a1.js', 'src/level3/leaf.js')
    .withDependency('src/level2/a2.js', 'src/level3/leaf.js')
    .build(),

  /**
   * Self-cycle: A -> A
   */
  selfCycle: () => GraphBuilder.create()
    .withFile('src/a.js')
    .withDependency('src/a.js', 'src/a.js')
    .build(),

  /**
   * Complex graph with multiple patterns
   */
  complex: () => GraphBuilder.create()
    .withFiles([
      'src/main.js',
      'src/utils.js',
      'src/helpers.js',
      'src/core/a.js',
      'src/core/b.js',
      'src/features/x.js',
      'src/features/y.js'
    ])
    .withDependency('src/main.js', 'src/utils.js')
    .withDependency('src/main.js', 'src/helpers.js')
    .withDependency('src/main.js', 'src/core/a.js')
    .withDependency('src/utils.js', 'src/helpers.js')
    .withDependency('src/helpers.js', 'src/core/a.js')
    .withDependency('src/helpers.js', 'src/core/b.js')
    .withDependency('src/features/x.js', 'src/utils.js')
    .withDependency('src/features/y.js', 'src/utils.js')
    .withDependency('src/features/x.js', 'src/core/a.js')
    .withDependency('src/features/y.js', 'src/core/b.js')
    .build()
};

// ============================================
// Factory Helper Class
// ============================================

/**
 * Main factory for creating graph test data
 */
