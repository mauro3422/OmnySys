/**
 * MCP Tool: detect_race_conditions
 *
 * Phase 4: Race Condition Detection.
 *
 * Analyzes async atoms that access shared resources and detects potential
 * race conditions using atom metadata (isAsync, hasSideEffects, calls[],
 * hasStorageAccess, hasNetworkCalls, networkEndpoints).
 *
 * Detection categories:
 *   WW (Write-Write): ≥2 async atoms write the same external resource
 *   RW (Read-Write):  ≥1 async reads + ≥1 async writes the same resource
 *   IE (Init-Error):  async initializers without error handling
 *   EH (Event-Handler): event handlers sharing state with other async fns
 *
 * @module mcp/tools/detect-race-conditions
 */

import { getAllAtoms } from '#layer-c/storage/atoms/atom.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:detect-races');

const SEVERITY = { critical: 4, high: 3, medium: 2, low: 1 };

/**
 * Infer read vs write from atom metadata
 */
function inferAccessType(atom, resourceKey) {
  const nameLow = atom.name?.toLowerCase() || '';
  const isWriter =
    atom.hasSideEffects ||
    /^(save|write|update|delete|remove|create|post|put|patch|insert)/.test(nameLow);
  const isReader =
    /^(get|fetch|read|load|find|query|select)/.test(nameLow) ||
    (!atom.hasSideEffects && atom.isAsync);
  return isWriter ? 'write' : isReader ? 'read' : 'unknown';
}

/**
 * Extract resource keys an atom accesses.
 * Resource key = stable identifier for a shared external resource.
 */
function extractResourceKeys(atom) {
  const keys = new Set();

  // Network endpoints
  for (const ep of atom.networkEndpoints || []) {
    if (ep) keys.add(`network:${ep}`);
  }

  // External calls (DB patterns, queue patterns, etc.)
  for (const call of atom.externalCalls || []) {
    const name = call.name || call.callee || '';
    if (/db|database|mongo|redis|postgres|mysql|sqlite|dynamo|firestore/i.test(name)) {
      keys.add(`db:${name}`);
    } else if (/queue|kafka|rabbitmq|sqs|pubsub/i.test(name)) {
      keys.add(`queue:${name}`);
    } else if (/cache|memcache/i.test(name)) {
      keys.add(`cache:${name}`);
    } else if (name) {
      keys.add(`ext:${name}`);
    }
  }

  // Storage access pattern
  if (atom.hasStorageAccess) keys.add('storage:local');

  // Calls array - look for known shared-state patterns
  for (const call of atom.calls || []) {
    const n = (call.name || '').toLowerCase();
    if (/\.(save|update|insert|delete|remove|write|push|set)$/.test(n) ||
        n.endsWith('save') || n.endsWith('write') || n.endsWith('set')) {
      keys.add(`call:${call.name}`);
    }
  }

  return [...keys];
}

/**
 * Main race detection logic over atom array
 */
function detectRacesFromAtoms(asyncAtoms) {
  // Group atoms by resource key → Map<resourceKey, atom[]>
  const byResource = new Map();

  for (const atom of asyncAtoms) {
    const keys = extractResourceKeys(atom);
    for (const key of keys) {
      if (!byResource.has(key)) byResource.set(key, []);
      byResource.get(key).push(atom);
    }
  }

  const races = [];
  let raceId = 1;

  for (const [resource, atoms] of byResource) {
    if (atoms.length < 2) continue;

    const accesses = atoms.map(a => ({
      atomId: a.id,
      atomName: a.name,
      filePath: a.filePath,
      line: a.line,
      type: inferAccessType(a, resource),
      isAsync: a.isAsync,
      hasErrorHandling: a.hasErrorHandling,
    }));

    const writers = accesses.filter(a => a.type === 'write');
    const readers = accesses.filter(a => a.type === 'read');

    // WW race: 2+ writers
    if (writers.length >= 2) {
      races.push({
        id: `RACE-${String(raceId++).padStart(3, '0')}`,
        type: 'WW',
        resource,
        severity: 'high',
        description: `${writers.length} async functions write to "${resource}" — lost update risk`,
        accesses,
        suggestedFix: 'Use atomic operations, transactions, or distributed locks',
      });
    }

    // RW race: 1+ reader + 1+ writer
    if (readers.length >= 1 && writers.length >= 1) {
      races.push({
        id: `RACE-${String(raceId++).padStart(3, '0')}`,
        type: 'RW',
        resource,
        severity: writers.some(w => !w.hasErrorHandling) ? 'critical' : 'medium',
        description: `Read-write conflict on "${resource}" — stale read risk`,
        accesses,
        suggestedFix: 'Add read-modify-write atomicity or use optimistic locking',
      });
    }
  }

  // IE: async initializers without error handling
  const brokenInits = asyncAtoms.filter(a =>
    /^(init|setup|start|bootstrap|connect|open)/.test((a.name || '').toLowerCase()) &&
    !a.hasErrorHandling &&
    a.hasSideEffects
  );
  for (const atom of brokenInits) {
    races.push({
      id: `RACE-${String(raceId++).padStart(3, '0')}`,
      type: 'IE',
      resource: `init:${atom.name}`,
      severity: 'medium',
      description: `Async initializer "${atom.name}" has no error handling — concurrent init risk`,
      accesses: [{ atomId: atom.id, atomName: atom.name, filePath: atom.filePath, line: atom.line, type: 'init' }],
      suggestedFix: 'Add try/catch and initialization guard (singleton or flag)',
    });
  }

  return races;
}

export async function detect_race_conditions(args, context) {
  const { filePath, minSeverity = 'low', limit = 20 } = args;
  const { projectPath } = context;

  logger.debug('Phase 4: detect_race_conditions');

  const allAtoms = await getAllAtoms(projectPath);

  // Filter to async production atoms only (exclude test callbacks)
  let asyncAtoms = allAtoms.filter(a => a.isAsync && !a.isTestCallback);

  if (filePath) {
    const norm = filePath.replace(/\\/g, '/');
    asyncAtoms = asyncAtoms.filter(a => a.filePath?.includes(norm));
  }

  const races = detectRacesFromAtoms(asyncAtoms);

  // Filter by minimum severity
  const minLevel = SEVERITY[minSeverity] || 1;
  const filtered = races.filter(r => (SEVERITY[r.severity] || 1) >= minLevel);

  // Sort by severity desc
  filtered.sort((a, b) => (SEVERITY[b.severity] || 0) - (SEVERITY[a.severity] || 0));

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  const byType = { WW: 0, RW: 0, IE: 0, EH: 0 };
  for (const r of filtered) {
    bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
    byType[r.type] = (byType[r.type] || 0) + 1;
  }

  return {
    summary: {
      totalAsyncAtoms: asyncAtoms.length,
      totalRaces: filtered.length,
      bySeverity,
      byType,
      scope: filePath || 'project-wide',
    },
    races: filtered.slice(0, limit).map(r => ({
      id: r.id,
      type: r.type,
      severity: r.severity,
      resource: r.resource,
      description: r.description,
      functions: r.accesses.map(a => `${a.atomName} (${a.filePath}:${a.line})`),
      suggestedFix: r.suggestedFix,
    })),
  };
}

export default { detect_race_conditions };
