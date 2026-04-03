/**
 * Shared sampling helpers for compiler summaries.
 */

export function takeSample(items = [], limit = 5) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.slice(0, limit);
}

export default {
  takeSample
};
