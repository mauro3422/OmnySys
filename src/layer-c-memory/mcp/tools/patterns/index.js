/**
 * @fileoverview index.js
 * MCP Tool: detect_patterns
 * 
 * Orquestador que coordina todos los detectores de patrones.
 * Cada detector está en su propio módulo para mantener archivos pequeños.
 * 
 * @module patterns
 */

import { getAllAtoms } from '#layer-c/storage/index.js';
import { findDuplicates } from './duplicates.js';
import { findComplexityHotspots } from './complexity-hotspots.js';
import { findGodFunctions } from './god-functions.js';
import { findFragileNetworkCalls } from './fragile-network.js';
import { findDeadCode } from './dead-code.js';
import { findUnusualPatterns } from './unusual-patterns.js';
import { findByArchetypePattern } from './archetype-patterns.js';
import { findCircularDependencies } from './circular-deps.js';
import { findTestCoverageGaps } from './test-coverage.js';
import { findArchitecturalDebt } from './architectural-debt.js';
import { findLargeMonolithic } from './large-monolithic.js';

/**
 * Detecta patrones de código
 * @param {Object} args - Argumentos
 * @param {string} args.patternType - Tipo de patrón ('all', 'duplicates', 'god-functions', etc.)
 * @param {number} args.minOccurrences - Mínimo de ocurrencias para duplicados
 * @param {Object} context - Contexto del MCP
 * @returns {Object} Resultados del análisis
 */
export async function detect_patterns(args, context) {
  const { patternType = 'all', minOccurrences = 2 } = args;
  const { projectPath } = context;
  
  try {
    const atoms = await getAllAtoms(projectPath);
    
    const result = {
      summary: {
        totalAtoms: atoms.length,
        withDna: atoms.filter(a => a.dna?.structuralHash).length,
        withPatternHash: atoms.filter(a => a.dna?.patternHash).length,
        analyzedAt: new Date().toISOString()
      }
    };
    
    if (patternType === 'all') {
      // Overview mode: top 5 per category + counts
      const dups = findDuplicates(atoms, minOccurrences);
      const godFns = findGodFunctions(atoms);
      const fragile = findFragileNetworkCalls(atoms);
      const dead = findDeadCode(atoms);
      const unusual = findUnusualPatterns(atoms);
      const cycles = findCircularDependencies(atoms);
      const testCoverage = findTestCoverageGaps(atoms);
      const archDebt = findArchitecturalDebt(atoms);

      result.overview = {
        note: 'Use patternType: "duplicates" | "god-functions" | "fragile-network" | "complexity" | "archetype" | "circular" | "test-coverage" | "architectural-debt" | "large-monolithic" | "unused-exports" for full details',
        duplicates: { 
          exact: dups.summary.exactDuplicatesFound, 
          contextual: dups.summary.contextualDuplicatesFound,
          structuralPatterns: dups.summary.structuralPatternsFound,
          atomsExcluded: dups.summary.atomsExcluded,
          potentialSavingsLOC: dups.summary.potentialSavingsLOC,
          avgDuplicabilityScore: dups.summary.avgDuplicabilityScore,
          top3: dups.exactDuplicates.slice(0, 3).map(d => ({ 
            hash: d.hash, 
            count: d.count, 
            hashType: d.hashType,
            avgDuplicabilityScore: d.avgDuplicabilityScore,
            example: d.atoms[0] 
          })) 
        },
        godFunctions: { 
          count: godFns.length, 
          top5: godFns.slice(0, 5).map(g => ({ name: g.name, file: g.file, complexity: g.complexity, linesOfCode: g.linesOfCode })) 
        },
        fragileNetwork: { 
          fragile: fragile.fragile.length, 
          wellHandled: fragile.wellHandled.length, 
          top5: fragile.fragile.slice(0, 5).map(f => ({ name: f.name, file: f.file, risk: f.risk, issue: f.issue })) 
        },
        deadCode: { 
          count: dead.length, 
          top5: dead.slice(0, 5).map(d => ({ name: d.name, file: d.file, linesOfCode: d.linesOfCode })) 
        },
        unusualPatterns: { 
          unusedExports: unusual.unusedExports.length, 
          top5: unusual.unusedExports.slice(0, 5) 
        },
        complexityHotspots: findComplexityHotspots(atoms).slice(0, 5).map(h => ({ file: h.file, totalComplexity: h.totalComplexity, atomCount: h.atomCount })),
        circularDependencies: { 
          count: cycles.length, 
          top3: cycles.slice(0, 3).map(c => ({ files: c.files.slice(0, 3), length: c.length, severity: c.severity })) 
        },
        testCoverage: {
          stats: testCoverage.stats,
          gapsCount: testCoverage.gaps.length,
          orphanedTestsCount: testCoverage.orphanedTests.length,
          top3: testCoverage.gaps.slice(0, 3).map(t => ({ name: t.name, file: t.file, riskScore: t.riskScore }))
        },
        architecturalDebt: {
          count: archDebt.length,
          critical: archDebt.filter(d => d.severity === 'critical').length,
          top3: archDebt.slice(0, 3).map(d => ({ 
            file: d.file, 
            lines: d.lines, 
            violations: d.violations,
            debtScore: d.debtScore 
          }))
        },
        largeMonolithic: {
          count: findLargeMonolithic(atoms).length,
          note: 'Files >250 lines with SINGLE dominant purpose but multiple technical operations',
          top3: findLargeMonolithic(atoms).slice(0, 3).map(d => ({
            file: d.file,
            lines: d.lines,
            dominantPurpose: d.dominantPurpose || d.dominantArchetype,
            operationCount: d.operationCount,
            solidViolations: Object.entries(d.solidViolations).filter(([k,v]) => v).map(([k]) => k)
          }))
        }
      };
    }

    if (patternType === 'duplicates') {
      result.duplicates = findDuplicates(atoms, minOccurrences);
    }

    if (patternType === 'complexity') {
      result.complexityHotspots = findComplexityHotspots(atoms);
    }

    if (patternType === 'archetype') {
      result.archetypePatterns = findByArchetypePattern(atoms).slice(0, 20);
    }

    if (patternType === 'god-functions') {
      result.godFunctions = findGodFunctions(atoms);
    }

    if (patternType === 'fragile-network') {
      result.fragileNetwork = findFragileNetworkCalls(atoms);
    }

    if (patternType === 'circular') {
      result.circularDependencies = findCircularDependencies(atoms);
    }

    if (patternType === 'test-coverage') {
      result.testCoverage = findTestCoverageGaps(atoms);
    }

    if (patternType === 'architectural-debt') {
      result.architecturalDebt = findArchitecturalDebt(atoms);
      result.summary.debtExplanation = 'Files > 250 lines with multiple responsibilities, duplicates, or high complexity. Consider splitting into smaller modules (< 250 lines each).';
    }

    if (patternType === 'large-monolithic') {
      result.largeMonolithic = findLargeMonolithic(atoms);
      result.summary.monolithicExplanation = 'Files > 250 lines with a SINGLE dominant purpose but multiple technical operations (violates SRP). Unlike architectural-debt which detects multiple purposes, this detects monoliths that do one thing but in many ways.';
    }

    if (patternType === 'unused-exports') {
      const unusual = findUnusualPatterns(atoms);
      result.unusedExports = unusual.unusedExports;
      result.summary.unusedExportsCount = unusual.unusedExports.length;
      result.summary.unusedExportsExplanation = 'Functions/const that are exported but never called from other code. These are dead code candidates - consider removing or verifying they are actually used.';
    }

    return result;
  } catch (error) {
    return { error: error.message };
  }
}
