// ============================================================================
// InptPulse v2 — Serialization Utils
// ============================================================================

/**
 * Encode an array of floats into a Base64 string for efficient event transmission.
 * @param {number[]} emb - Array of floats (e.g. 384 dimensions)
 * @returns {string} base64 string
 */
function encodeEmbedding(emb) {
  if (!emb || !emb.length) return '';
  const buf = Buffer.alloc(emb.length * 4);
  emb.forEach((v, i) => buf.writeFloatLE(v, i * 4));
  return buf.toString('base64');
}

/**
 * Decode a Base64 string back into an array of floats.
 * @param {string} b64 - Base64 encoded embedding
 * @returns {number[]} Array of floats
 */
function decodeEmbedding(b64) {
  if (!b64) return [];
  const buf = Buffer.from(b64, 'base64');
  const out = [];
  for (let i = 0; i < buf.length; i += 4) {
    out.push(buf.readFloatLE(i));
  }
  return out;
}

module.exports = { encodeEmbedding, decodeEmbedding };
