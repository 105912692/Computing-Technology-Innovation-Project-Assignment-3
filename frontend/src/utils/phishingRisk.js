// src/utils/phishingRisk.js - one consistent scale for every result: the model's phishing probability.
//
// The API returns `phishing_probability` (0-1). Older saved entries and files only have `confidence`
// (how sure the model was of its label), so the probability is worked out from that:
//   phishing -> confidence      benign -> 1 - confidence
// This gives exactly the value the API would return for the same URL.

/**
 * The phishing probability (0-1) of a result or saved entry.
 * @param {object} entry - API result or history entry
 * @returns {number} 0-1
 */
export function getPhishingProbability(entry) {
  const direct = Number(entry?.phishingProbability ?? entry?.phishing_probability)
  if (Number.isFinite(direct)) return Math.min(1, Math.max(0, direct))

  const confidence = Number(entry?.confidence)
  if (!Number.isFinite(confidence)) return 0
  const probability = entry?.label === 'phishing' ? confidence : 1 - confidence
  return Math.round(Math.min(1, Math.max(0, probability)) * 10000) / 10000   // 4 decimals, like the API (0.2, not 0.19999…)
}

/**
 * The phishing risk as a whole percentage, e.g. 0.473 -> 47.
 * @param {object} entry - API result or history entry
 * @returns {number} 0-100
 */
export function getPhishingRiskPercent(entry) {
  return Math.round(getPhishingProbability(entry) * 100)
}
