/**
 * @fileoverview Query Scenarios
 * Factory for creating common query test scenarios
 */

import { QueryBuilder } from './query-builder.js';
import { FileDataBuilder } from './file-data-builder.js';
import { ConnectionBuilder } from './connection-builder.js';

export class QueryScenarios {
  static emptyProject() {
    return QueryBuilder.create().build();
  }

  static singleFileProject(filePath = 'src/index.js') {
    return QueryBuilder.create()
      .withFile(filePath, FileDataBuilder.create(filePath)
        .withAtom({ name: 'main', type: 'function', line: 1 })
        .build())
      .build();
  }

  static multiFileProject(fileCount = 3) {
    const builder = QueryBuilder.create();
    for (let i = 0; i < fileCount; i++) {
      builder.withFile(`src/file${i}.js`, FileDataBuilder.create(`src/file${i}.js`)
        .withAtom({ name: `func${i}`, type: 'function', line: 1 })
        .build());
    }
    return builder.build();
  }

  static projectWithImports() {
    return QueryBuilder.create()
      .withFile('src/main.js', FileDataBuilder.create('src/main.js')
        .withImport('./utils.js', { resolvedPath: 'src/utils.js', line: 1 })
        .withAtom({ name: 'main', type: 'function', line: 5 })
        .build())
      .withFile('src/utils.js', FileDataBuilder.create('src/utils.js')
        .withExport('helper', { line: 1 })
        .withAtom({ name: 'helper', type: 'function', line: 1, isExported: true })
        .withUsedBy(['src/main.js'])
        .build())
      .build();
  }

  static projectWithConnections() {
    return QueryBuilder.create()
      .withFile('src/store.js', FileDataBuilder.create('src/store.js')
        .withAtom({ name: 'state', type: 'variable', line: 1 })
        .build())
      .withFile('src/component.js', FileDataBuilder.create('src/component.js')
        .withAtom({ name: 'render', type: 'function', line: 1 })
        .build())
      .withConnections(ConnectionBuilder.create()
        .withSharedStateConnection({
          source: 'src/store.js',
          target: 'src/component.js',
          variable: 'appState',
          line: 5
        }))
      .build();
  }

  static projectWithRisks() {
    return QueryBuilder.create()
      .withFile('src/critical.js', FileDataBuilder.create('src/critical.js')
        .withComplexity(50)
        .withAtom({ name: 'complexFunc', type: 'function', line: 1, complexity: 50 })
        .build())
      .withRisks({
        report: {
          summary: { criticalCount: 1, highCount: 0, mediumCount: 0, lowCount: 0, totalFiles: 1 },
          criticalRiskFiles: [{ file: 'src/critical.js', reason: 'High complexity' }],
          highRiskFiles: [],
          mediumRiskFiles: []
        },
        scores: { 'src/critical.js': 95 }
      })
      .build();
  }

  static projectWithAtoms() {
    return QueryBuilder.create()
      .withFile('src/atoms.js', FileDataBuilder.create('src/atoms.js')
        .withAtom({ 
          name: 'exportedFunc', 
          type: 'function', 
          line: 1, 
          isExported: true,
          complexity: 5,
          archetype: { type: 'hot-path', confidence: 0.8 }
        })
        .withAtom({ 
          name: 'internalFunc', 
          type: 'function', 
          line: 10, 
          isExported: false,
          complexity: 2
        })
        .withAtom({ 
          name: 'deadFunc', 
          type: 'function', 
          line: 20, 
          isExported: false,
          archetype: { type: 'dead-function', confidence: 0.9 }
        })
        .build())
      .build();
  }

  static circularDependency() {
    return QueryBuilder.create()
      .withFile('src/a.js', FileDataBuilder.create('src/a.js')
        .withImport('./b.js', { resolvedPath: 'src/b.js' })
        .build())
      .withFile('src/b.js', FileDataBuilder.create('src/b.js')
        .withImport('./a.js', { resolvedPath: 'src/a.js' })
        .build())
      .build();
  }

  static deepDependencyTree(depth = 3) {
    const builder = QueryBuilder.create();
    for (let i = 0; i < depth; i++) {
      const nextFile = i < depth - 1 ? `src/level${i + 1}.js` : null;
      builder.withFile(`src/level${i}.js`, FileDataBuilder.create(`src/level${i}.js`)
        .withImport(nextFile ? `./level${i + 1}.js` : './leaf.js', 
          nextFile ? { resolvedPath: nextFile } : { resolvedPath: 'src/leaf.js' })
        .build());
    }
    builder.withFile('src/leaf.js', FileDataBuilder.create('src/leaf.js').build());
    return builder.build();
  }
}
