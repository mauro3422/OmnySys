/**
 * @fileoverview investigate-graph-opportunities.js
 *
 * Analyzes available metadata and proposes graph improvements based on
 * purpose, archetype, temporal patterns, and other metadata.
 *
 * Usage: node scripts/investigate-graph-opportunities.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { readAllAtoms } from './utils/script-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');
const TOP_RESULTS = 5;
const HUB_LIMIT = 10;

function incrementCounter(counter, key, amount = 1) {
  counter.set(key, (counter.get(key) || 0) + amount);
}

function pushGrouped(map, key, value) {
  if (!map.has(key)) {
    map.set(key, []);
  }

  map.get(key).push(value);
}

function sortEntriesByCount(entries) {
  return [...entries].sort((a, b) => b[1] - a[1]);
}

function sortGroupsBySize(groups) {
  return [...groups].sort((a, b) => b[1].length - a[1].length);
}

function buildOpportunitySummary(atoms) {
  const summary = {
    byPurpose: new Map(),
    byArchetype: new Map(),
    byPurposeArchetype: new Map(),
    byFile: new Map(),
    eventTypes: new Map(),
    transformOps: new Map(),
    purposeStats: new Map(),
    counts: {
      eventHandlers: 0,
      timerUsers: 0,
      lifecycleHooks: 0,
      asyncFlows: 0,
      withDataFlow: 0,
      withInputs: 0,
      withOutputs: 0,
      withTransformations: 0,
      withCalledBy: 0,
      withCalls: 0,
      isolated: 0
    },
    hubs: []
  };

  for (const atom of atoms) {
    const purpose = atom.purpose || 'UNKNOWN';
    const archetype = atom.archetype?.type || 'unknown';
    const filePath = atom.filePath || 'unknown';
    const calledByCount = atom.calledBy?.length || 0;
    const callsCount = atom.calls?.length || 0;

    pushGrouped(summary.byPurpose, purpose, atom);
    pushGrouped(summary.byArchetype, archetype, atom);
    pushGrouped(summary.byPurposeArchetype, `${purpose}:${archetype}`, atom);
    pushGrouped(summary.byFile, filePath, atom);

    if (!summary.purposeStats.has(purpose)) {
      summary.purposeStats.set(purpose, {
        exported: 0,
        withCallers: 0,
        asyncAtoms: 0
      });
    }

    const purposeStats = summary.purposeStats.get(purpose);
    if (atom.isExported) {
      purposeStats.exported += 1;
    }
    if (calledByCount > 0) {
      purposeStats.withCallers += 1;
      summary.counts.withCalledBy += 1;
    }
    if (atom.isAsync) {
      purposeStats.asyncAtoms += 1;
    }

    if (callsCount > 0) {
      summary.counts.withCalls += 1;
    }
    if (!calledByCount && !callsCount) {
      summary.counts.isolated += 1;
    }

    if (atom.temporal?.patterns?.events?.length) {
      summary.counts.eventHandlers += 1;
      for (const event of atom.temporal.patterns.events) {
        incrementCounter(summary.eventTypes, event.type || event.name || 'unknown');
      }
    }

    if (atom.temporal?.patterns?.timers?.length) {
      summary.counts.timerUsers += 1;
    }

    if (atom.lifecycleHooks?.length) {
      summary.counts.lifecycleHooks += 1;
    }

    if (atom.temporal?.patterns?.asyncPatterns) {
      summary.counts.asyncFlows += 1;
    }

    if (atom.hasDataFlow) {
      summary.counts.withDataFlow += 1;
    }

    if (atom.dataFlow?.inputs?.length) {
      summary.counts.withInputs += 1;
    }

    if (atom.dataFlow?.outputs?.length) {
      summary.counts.withOutputs += 1;
    }

    if (atom.dataFlow?.transformations?.length) {
      summary.counts.withTransformations += 1;
      for (const transformation of atom.dataFlow.transformations) {
        incrementCounter(summary.transformOps, transformation.operation || 'unknown');
      }
    }

    if (calledByCount > 0) {
      summary.hubs.push({
        name: atom.name,
        filePath,
        callers: calledByCount,
        purpose
      });
    }
  }

  summary.hubs.sort((a, b) => b.callers - a.callers);

  return summary;
}

function printPurposeAnalysis(summary) {
  console.log('\n1. PURPOSE ANALYSIS');
  console.log('-'.repeat(50));

  for (const [purpose, items] of sortGroupsBySize(summary.byPurpose.entries())) {
    const stats = summary.purposeStats.get(purpose);
    console.log(`\n   ${purpose} (${items.length} atoms)`);
    console.log(`      Exported: ${stats.exported} (${((stats.exported / items.length) * 100).toFixed(1)}%)`);
    console.log(`      With callers: ${stats.withCallers} (${((stats.withCallers / items.length) * 100).toFixed(1)}%)`);
    console.log(`      Async: ${stats.asyncAtoms} (${((stats.asyncAtoms / items.length) * 100).toFixed(1)}%)`);
  }
}

function printTemporalAnalysis(summary) {
  console.log('\n2. TEMPORAL PATTERNS');
  console.log('-'.repeat(50));
  console.log(`   Event handlers: ${summary.counts.eventHandlers}`);
  console.log(`   Timer users: ${summary.counts.timerUsers}`);
  console.log(`   Lifecycle hooks: ${summary.counts.lifecycleHooks}`);
  console.log(`   Async patterns: ${summary.counts.asyncFlows}`);

  if (summary.eventTypes.size > 0) {
    console.log('\n   Top event types:');
    for (const [type, count] of sortEntriesByCount(summary.eventTypes.entries()).slice(0, TOP_RESULTS)) {
      console.log(`      - ${type}: ${count}`);
    }
  }
}

function printDataFlowAnalysis(summary) {
  console.log('\n3. DATA FLOW');
  console.log('-'.repeat(50));
  console.log(`   With inputs: ${summary.counts.withInputs}`);
  console.log(`   With outputs: ${summary.counts.withOutputs}`);
  console.log(`   With transformations: ${summary.counts.withTransformations}`);

  if (summary.transformOps.size > 0) {
    console.log('\n   Most common transformation ops:');
    for (const [operation, count] of sortEntriesByCount(summary.transformOps.entries()).slice(0, TOP_RESULTS)) {
      console.log(`      - ${operation}: ${count}`);
    }
  }
}

function printConnectionAnalysis(summary) {
  console.log('\n4. CONNECTION ANALYSIS');
  console.log('-'.repeat(50));
  console.log(`   With callers: ${summary.counts.withCalledBy}`);
  console.log(`   With calls: ${summary.counts.withCalls}`);
  console.log(`   Isolated: ${summary.counts.isolated}`);

  console.log('\n   Top hubs:');
  for (const hub of summary.hubs.slice(0, HUB_LIMIT)) {
    console.log(`      - ${hub.name} (${hub.callers} callers) - ${hub.purpose}`);
  }
}

function printArchetypeAnalysis(summary) {
  console.log('\n5. ARCHETYPE ANALYSIS');
  console.log('-'.repeat(50));

  for (const [archetype, items] of sortGroupsBySize(summary.byArchetype.entries())) {
    console.log(`   ${archetype}: ${items.length}`);
  }
}

function printClusteringAnalysis(summary) {
  console.log('\n6. CLUSTERING OPPORTUNITIES');
  console.log('-'.repeat(50));

  const filesWithManyAtoms = sortGroupsBySize(summary.byFile.entries())
    .filter(([, atoms]) => atoms.length > 10)
    .slice(0, TOP_RESULTS);

  console.log('\n   Files with many atoms:');
  for (const [filePath, fileAtoms] of filesWithManyAtoms) {
    const purposes = [...new Set(fileAtoms.map((atom) => atom.purpose || 'UNKNOWN'))];
    console.log(`      - ${filePath}: ${fileAtoms.length} atoms`);
    console.log(`        Purposes: ${purposes.join(', ')}`);
  }

  console.log('\n   Top purpose + archetype combinations:');
  for (const [key, items] of sortGroupsBySize(summary.byPurposeArchetype.entries()).slice(0, TOP_RESULTS)) {
    console.log(`      - ${key}: ${items.length}`);
  }
}

function printRecommendations() {
  console.log('\n' + '='.repeat(70));
  console.log('GRAPH RECOMMENDATIONS');
  console.log('='.repeat(70));
  console.log(`
  1. Purpose-based graph partitions
     - Build dedicated subgraphs by purpose.
     - Keep test helpers outside the main operational graph.

  2. Event graph
     - Model events as explicit nodes.
     - Connect handlers through emitted/listened event chains.

  3. Data-flow graph
     - Track typed transformation edges.
     - Highlight full input -> transform -> output pipelines.

  4. Automatic clustering
     - Group atoms by file and cohesive module boundaries.
     - Flag boundary violations automatically.

  5. Weighted edges
     - Weight by call frequency, archetype severity, and transformation complexity.

  6. Special-purpose subgraphs
     - Tests
     - Scripts
     - Public API
`);
}

function analyzeOpportunities(atoms) {
  console.log('\nGraph improvement opportunity scan');
  console.log('='.repeat(70));

  const summary = buildOpportunitySummary(atoms);

  printPurposeAnalysis(summary);
  printTemporalAnalysis(summary);
  printDataFlowAnalysis(summary);
  printConnectionAnalysis(summary);
  printArchetypeAnalysis(summary);
  printClusteringAnalysis(summary);
  printRecommendations();
  console.log('');
}

async function main() {
  console.log('\nLoading atoms...');
  const atomsMap = await readAllAtoms(ROOT_PATH);
  const atoms = Array.from(atomsMap.values(), ({ data }) => data);

  console.log(`   Atoms: ${atoms.length}`);
  analyzeOpportunities(atoms);
}

main().catch(console.error);
