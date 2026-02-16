/**
 * @fileoverview Tests for tier2/coupling.js - Meta-Factory Pattern
 * 
 * Analyzes coupling between files (how much they depend on each other)
 * 
 * @module tests/unit/layer-a-analysis/analyses/tier2/coupling
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { analyzeCoupling } from '#layer-a/analyses/tier2/coupling.js';
import { SystemMapBuilder } from '../../../../factories/root-infrastructure-test.factory.js';

createAnalysisTestSuite({
  module: 'analyses/tier2/coupling',
  exports: { analyzeCoupling },
  analyzeFn: analyzeCoupling,
  expectedFields: {
    total: 'number',
    coupledFiles: 'array',
    maxCoupling: 'number',
    concern: 'string'
  },
  contractOptions: {
    async: false,
    exportNames: ['analyzeCoupling'],
    expectedSafeResult: {
      total: 0,
      coupledFiles: [],
      maxCoupling: 0,
      concern: 'LOW'
    }
  },
  specificTests: [
    {
      name: 'returns empty result for empty systemMap',
      fn: () => {
        const systemMap = SystemMapBuilder.create().build();
        const result = analyzeCoupling(systemMap);
        expect(result.total).toBe(0);
        expect(result.coupledFiles).toHaveLength(0);
        expect(result.concern).toBe('LOW');
      }
    },
    {
      name: 'detects bidirectional coupling',
      fn: () => {
        const systemMap = SystemMapBuilder.create()
          .withFile('src/a.js', { dependsOn: ['src/b.js'] })
          .withFile('src/b.js', { dependsOn: ['src/a.js'] })
          .build();
        
        // Add usedBy relationships
        systemMap.files['src/a.js'].usedBy = ['src/b.js'];
        systemMap.files['src/b.js'].usedBy = ['src/a.js'];
        
        const result = analyzeCoupling(systemMap);
        expect(result.total).toBeGreaterThan(0);
      }
    },
    {
      name: 'identifies high coupling concern',
      fn: () => {
        const builder = SystemMapBuilder.create();
        
        // Create many coupled files
        for (let i = 0; i < 6; i++) {
          builder.withFile(`src/file${i}.js`);
        }
        
        const systemMap = builder.build();
        
        // Add bidirectional dependencies
        for (let i = 0; i < 6; i++) {
          const file = systemMap.files[`src/file${i}.js`];
          file.dependsOn = [`src/file${(i + 1) % 6}.js`];
          file.usedBy = [`src/file${(i + 5) % 6}.js`];
        }
        
        const result = analyzeCoupling(systemMap);
        expect(result.concern).toBe('HIGH');
      }
    },
    {
      name: 'sorts couplings by strength descending',
      fn: () => {
        const systemMap = SystemMapBuilder.create()
          .withFile('src/weak.js')
          .withFile('src/strong.js')
          .withFile('src/medium.js')
          .build();
        
        // Add dependencies with different strengths
        systemMap.files['src/weak.js'].dependsOn = ['dep1'];
        systemMap.files['src/weak.js'].usedBy = [];
        
        systemMap.files['src/strong.js'].dependsOn = ['dep1', 'dep2', 'dep3'];
        systemMap.files['src/strong.js'].usedBy = [];
        
        systemMap.files['src/medium.js'].dependsOn = ['dep1', 'dep2'];
        systemMap.files['src/medium.js'].usedBy = [];
        
        // Mock files for dependencies
        systemMap.files['dep1'] = { usedBy: ['src/weak.js', 'src/strong.js', 'src/medium.js'] };
        systemMap.files['dep2'] = { usedBy: ['src/strong.js', 'src/medium.js'] };
        systemMap.files['dep3'] = { usedBy: ['src/strong.js'] };
        
        const result = analyzeCoupling(systemMap);
        
        // Should be sorted by couplingStrength descending
        for (let i = 1; i < result.coupledFiles.length; i++) {
          expect(result.coupledFiles[i-1].couplingStrength)
            .toBeGreaterThanOrEqual(result.coupledFiles[i].couplingStrength);
        }
      }
    },
    {
      name: 'calculates maxCoupling correctly',
      fn: () => {
        const systemMap = SystemMapBuilder.create()
          .withFile('src/high.js')
          .withFile('src/low.js')
          .build();
        
        systemMap.files['src/high.js'].dependsOn = ['a', 'b', 'c', 'd', 'e'];
        systemMap.files['src/high.js'].usedBy = [];
        
        systemMap.files['src/low.js'].dependsOn = ['f'];
        systemMap.files['src/low.js'].usedBy = [];
        
        // Mock dependency files
        systemMap.files['a'] = { usedBy: ['src/high.js'] };
        systemMap.files['b'] = { usedBy: ['src/high.js'] };
        systemMap.files['c'] = { usedBy: ['src/high.js'] };
        systemMap.files['d'] = { usedBy: ['src/high.js'] };
        systemMap.files['e'] = { usedBy: ['src/high.js'] };
        systemMap.files['f'] = { usedBy: ['src/low.js'] };
        
        const result = analyzeCoupling(systemMap);
        expect(result.maxCoupling).toBe(5);
      }
    }
  ]
});
