import { createStandardContext } from './guard-standards.js';

export function buildCircularContext({
  severity,
  atomId,
  atomName,
  suggestedAction,
  suggestedAlternatives,
  extraData
}) {
  return createStandardContext({
    guardName: 'circular-guard',
    atomId,
    atomName,
    severity,
    suggestedAction,
    suggestedAlternatives,
    extraData
  });
}
