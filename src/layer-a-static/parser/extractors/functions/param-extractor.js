/**
 * @fileoverview Logic for extracting function parameters.
 */

import { walk, text } from '../utils.js';

export function extractParams(node, code) {
  const paramsNode = node.childForFieldName('parameters') || node.childForFieldName('parameter');
  const params = [];
  if (paramsNode) {
    walk(paramsNode, ['identifier', 'shorthand_property_identifier_pattern'], (pn) => {
      params.push(text(pn, code));
    });
  }
  return params;
}
