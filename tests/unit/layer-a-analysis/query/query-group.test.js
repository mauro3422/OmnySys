/**
 * @fileoverview Query System - Meta-Factory Test Suite
 * 
 * Agrupa TODOS los módulos de query:
 * - Project API (metadata, stats, file search)
 * - File API (file analysis, atoms, dependencies)
 * - Dependency API (dependency graphs)
 * - Connections API (semantic connections)
 * - Risk API (risk assessment queries)
 * - Export API (data export)
 * - Readers (JSON reader utilities)
 * 
 * @module tests/unit/layer-a-analysis/query/query-group
 */

import { describe, it, expect } from 'vitest';
import * as queryApis from '#layer-c/query/apis/index.js';
import * as projectQuery from '#layer-c/query/queries/project-query.js';
import * as fileQuery from '#layer-c/query/queries/file-query.js';
import * as dependencyQuery from '#layer-c/query/queries/dependency-query.js';
import * as connectionsQuery from '#layer-c/query/queries/connections-query.js';
import * as riskQuery from '#layer-c/query/queries/risk-query.js';
import * as exportApi from '#layer-c/query/export.js';
import * as jsonReader from '#layer-c/query/readers/json-reader.js';

describe('Query System - Project API', () => {
  it('exports all project query functions', () => {
    expect(typeof projectQuery.getProjectMetadata).toBe('function');
    expect(typeof projectQuery.getAnalyzedFiles).toBe('function');
    expect(typeof projectQuery.getProjectStats).toBe('function');
    expect(typeof projectQuery.findFiles).toBe('function');
  });
});

describe('Query System - File API', () => {
  it('exports all file query functions', () => {
    expect(typeof fileQuery.getFileAnalysis).toBe('function');
    expect(typeof fileQuery.getMultipleFileAnalysis).toBe('function');
    expect(typeof fileQuery.getFileDependencies).toBe('function');
    expect(typeof fileQuery.getFileDependents).toBe('function');
    expect(typeof fileQuery.getFileAnalysisWithAtoms).toBe('function');
    expect(typeof fileQuery.getAtomDetails).toBe('function');
    expect(typeof fileQuery.findAtomsByArchetype).toBe('function');
  });
});

describe('Query System - Dependency API', () => {
  it('exports all dependency query functions', () => {
    expect(typeof dependencyQuery.getDependencyGraph).toBe('function');
  });
});

describe('Query System - Connections API', () => {
  it('exports all connections query functions', () => {
    expect(typeof connectionsQuery.getAllConnections).toBe('function');
  });
});

describe('Query System - Risk API', () => {
  it('exports all risk query functions', () => {
    expect(typeof riskQuery.getRiskAssessment).toBe('function');
  });
});

describe('Query System - Export API', () => {
  it('exports exportFullSystemMapToFile function', () => {
    expect(typeof exportApi.exportFullSystemMapToFile).toBe('function');
  });

  it('exportFullSystemMapToFile accepts projectPath parameter', () => {
    expect(exportApi.exportFullSystemMapToFile.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Query System - JSON Reader', () => {
  it('exports all json reader functions', () => {
    expect(typeof jsonReader.readJSON).toBe('function');
    expect(typeof jsonReader.readMultipleJSON).toBe('function');
    expect(typeof jsonReader.fileExists).toBe('function');
  });
});

describe('Query System - APIs Index', () => {
  it('exports all project API functions', () => {
    expect(typeof queryApis.getProjectMetadata).toBe('function');
    expect(typeof queryApis.getAnalyzedFiles).toBe('function');
    expect(typeof queryApis.getProjectStats).toBe('function');
    expect(typeof queryApis.findFiles).toBe('function');
  });

  it('exports all file API functions', () => {
    expect(typeof queryApis.getFileAnalysis).toBe('function');
    expect(typeof queryApis.getMultipleFileAnalysis).toBe('function');
    expect(typeof queryApis.getFileDependencies).toBe('function');
    expect(typeof queryApis.getFileDependents).toBe('function');
    expect(typeof queryApis.getFileAnalysisWithAtoms).toBe('function');
    expect(typeof queryApis.getAtomDetails).toBe('function');
    expect(typeof queryApis.findAtomsByArchetype).toBe('function');
  });

  it('exports all dependency API functions', () => {
    expect(typeof queryApis.getDependencyGraph).toBe('function');
  });

  it('exports all connections API functions', () => {
    expect(typeof queryApis.getAllConnections).toBe('function');
  });

  it('exports all risk API functions', () => {
    expect(typeof queryApis.getRiskAssessment).toBe('function');
  });

  it('exports all reader functions', () => {
    expect(typeof queryApis.readJSON).toBe('function');
    expect(typeof queryApis.readMultipleJSON).toBe('function');
    expect(typeof queryApis.fileExists).toBe('function');
  });
});
