/**
 * @fileoverview Registry of canonical derived features.
 *
 * Keeps the semantic surfaces explicit so we can reason about purpose,
 * topology, risk and governance features without re-deriving them in every
 * consumer.
 *
 * @module shared/compiler/registry
 */

const DEFAULT_DERIVED_FEATURES = [
  {
    key: 'purpose_type',
    family: 'semantic',
    sourceSurface: 'atoms',
    canonicalSource: 'atoms.purpose',
    description: 'Classifies atoms by intent or role.',
    canonical: true
  },
  {
    key: 'archetype_type',
    family: 'semantic',
    sourceSurface: 'atoms',
    canonicalSource: 'atoms.archetype',
    description: 'Classifies atoms by structural archetype.',
    canonical: true
  },
  {
    key: 'pattern_type',
    family: 'semantic',
    sourceSurface: 'temporal-patterns',
    canonicalSource: 'atoms.temporal.patterns',
    description: 'Captures behavioral patterns derived from execution traces.',
    canonical: true
  },
  {
    key: 'entrypoint_type',
    family: 'topology',
    sourceSurface: 'graph',
    canonicalSource: 'atoms.usedBy + imports',
    description: 'Marks modules and atoms that act as entry points.',
    canonical: true
  },
  {
    key: 'hub_type',
    family: 'topology',
    sourceSurface: 'graph',
    canonicalSource: 'atom_relations',
    description: 'Marks atoms that concentrate incoming or outgoing traffic.',
    canonical: true
  },
  {
    key: 'risk_level',
    family: 'risk',
    sourceSurface: 'atoms',
    canonicalSource: 'atoms.complexity + callers',
    description: 'Normalizes risk derived from complexity and reach.',
    canonical: true
  },
  {
    key: 'contract_surface',
    family: 'governance',
    sourceSurface: 'shared/compiler',
    canonicalSource: 'policy-conformance + contract-layer',
    description: 'Describes whether a module is canonical, advisory, or mirrored support.',
    canonical: true
  },
  {
    key: 'generation_epoch',
    family: 'lifecycle',
    sourceSurface: 'analysis',
    canonicalSource: 'analysis generation snapshot',
    description: 'Tracks the active analysis generation that published the current snapshot.',
    canonical: true
  }
];

function normalizeFeature(feature = {}) {
  return {
    key: feature.key || 'unknown_feature',
    family: feature.family || 'semantic',
    sourceSurface: feature.sourceSurface || 'unknown',
    canonicalSource: feature.canonicalSource || null,
    description: feature.description || '',
    canonical: feature.canonical !== false,
    status: feature.status || 'canonical'
  };
}

function tallyBy(list, getter) {
  return list.reduce((acc, item) => {
    const key = getter(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export function buildDerivedFeatureRegistry(extraFeatures = []) {
  const features = [...DEFAULT_DERIVED_FEATURES, ...extraFeatures].map(normalizeFeature);
  const byKey = Object.fromEntries(features.map((feature) => [feature.key, feature]));

  return {
    features,
    byKey,
    summary: {
      total: features.length,
      canonicalCount: features.filter((feature) => feature.canonical).length,
      byFamily: tallyBy(features, (feature) => feature.family),
      bySourceSurface: tallyBy(features, (feature) => feature.sourceSurface),
      canonicalKeys: features.filter((feature) => feature.canonical).map((feature) => feature.key),
      nextAction: features.length > 0
        ? 'Treat derived features as shared semantic surfaces. Extend the registry before wiring new pattern consumers.'
        : 'Register at least one derived feature before consuming semantic surfaces.'
    }
  };
}

export function summarizeDerivedFeatureRegistry(extraFeatures = []) {
  return buildDerivedFeatureRegistry(extraFeatures).summary;
}

export function findDerivedFeatureDefinition(key, extraFeatures = []) {
  return buildDerivedFeatureRegistry(extraFeatures).byKey[key] || null;
}

export default {
  buildDerivedFeatureRegistry,
  summarizeDerivedFeatureRegistry,
  findDerivedFeatureDefinition
};
