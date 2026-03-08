/**
 * @fileoverview Canonical integrity-analysis helpers.
 *
 * Shared heuristics for watcher/MCP/compiler integrity surfaces so local guards
 * stop reimplementing atom-wrapper and unused-input filtering logic.
 *
 * @module shared/compiler/integrity-analysis
 */

import { normalizeName } from '../../layer-a-static/analyses/tier3/utils/name-utils.js';

export function normalizeUnusedInputName(input) {
  if (typeof input === 'object' && input !== null) {
    return String(input.name || '').trim();
  }

  return String(input || '').trim();
}

export function isLikelyParserNoiseUnusedInput(name = '') {
  const rawName = String(name || '').trim();
  if (!rawName) return true;
  if (rawName === '__destructured_0') return true;
  if (/\s/.test(rawName)) return true;
  if (/['"`]/.test(rawName)) return true;
  if (/[;(){}]/.test(rawName)) return true;
  if (rawName.length < 2) return true;
  return false;
}

export function getActionableUnusedInputs(analysis = {}) {
  const inputCount = analysis.inputs?.length || 0;
  if (inputCount === 0) {
    return [];
  }

  return (analysis.unusedInputs || [])
    .map(normalizeUnusedInputName)
    .filter((name) => !isLikelyParserNoiseUnusedInput(name))
    .map((name) => ({ raw: name, normalized: normalizeName(name) }))
    .filter((entry, index, collection) => (
      collection.findIndex((candidate) => candidate.normalized === entry.normalized) === index
    ))
    .map((entry) => entry.raw);
}

export function isLikelyToolWrapperAtom(atom = {}) {
  const semanticFingerprint = String(
    atom?.semanticFingerprint
    || atom?.dna?.semanticFingerprint
    || atom?.dnaJson?.semanticFingerprint
    || ''
  ).toLowerCase();
  const name = String(atom?.name || '');
  const atomType = String(atom?.type || atom?.functionType || '').toLowerCase();

  if (atomType !== 'class') {
    return false;
  }

  if (semanticFingerprint.endsWith(':tool')) {
    return true;
  }

  return name.endsWith('Tool');
}

function getBoundaryAtomContext(atom = {}) {
  return {
    name: String(atom?.name || ''),
    atomType: String(atom?.type || atom?.functionType || '').toLowerCase(),
    filePath: String(atom?.file_path || atom?.filePath || '').replace(/\\/g, '/').toLowerCase(),
    semanticFingerprint: String(
      atom?.semanticFingerprint
      || atom?.dna?.semanticFingerprint
      || atom?.dnaJson?.semanticFingerprint
      || ''
    ).toLowerCase()
  };
}

function hasBoundaryContainerName(name = '') {
  return /(Repository|Operations|Handler|Adapter|Service|Manager)$/i.test(name);
}

function hasBoundaryContainerPath(filePath = '') {
  return /\/(storage|repository|adapters|handlers|mcp|watcher)\//.test(filePath);
}

function hasBoundaryContainerFingerprint(semanticFingerprint = '') {
  return semanticFingerprint === 'process:core:operations' ||
    semanticFingerprint === 'process:core:manager' ||
    semanticFingerprint.endsWith(':repository') ||
    semanticFingerprint.endsWith(':adapter') ||
    semanticFingerprint.endsWith(':handler') ||
    semanticFingerprint.endsWith(':manager');
}

function hasOrchestratorContainerPath(filePath = '') {
  return /\/(mcp\/core|core\/orchestrator|core\/file-watcher)\//.test(filePath);
}

function hasOrchestratorContainerFingerprint(semanticFingerprint = '') {
  return semanticFingerprint.endsWith(':manager') ||
    semanticFingerprint.endsWith(':orchestrator');
}

export function isLikelyBoundaryContainerAtom(atom = {}) {
  const { name, atomType, filePath, semanticFingerprint } = getBoundaryAtomContext(atom);

  if (atomType !== 'class') {
    return false;
  }

  if (isLikelyToolWrapperAtom(atom)) {
    return true;
  }

  const boundaryName = hasBoundaryContainerName(name);
  const boundaryPath = hasBoundaryContainerPath(filePath);
  const boundaryFingerprint = hasBoundaryContainerFingerprint(semanticFingerprint);
  const orchestratorPath = hasOrchestratorContainerPath(filePath);
  const orchestratorFingerprint = hasOrchestratorContainerFingerprint(semanticFingerprint);

  return (boundaryName && boundaryPath) ||
    (boundaryName && orchestratorPath) ||
    boundaryFingerprint ||
    orchestratorFingerprint;
}

export function hasAsyncNamingMismatch(atom = {}) {
  const name = String(atom?.name || '');
  return atom?.is_async === 0 && name.toLowerCase().includes('async');
}
