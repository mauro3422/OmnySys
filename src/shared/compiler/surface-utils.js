export { normalizeCount } from './analysis-generation-counts.js';

function normalizeText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

export {
  normalizeText
};
