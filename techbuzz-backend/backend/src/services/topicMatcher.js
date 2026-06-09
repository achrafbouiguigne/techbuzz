// ============================================================================
// InptPulse v2 — Topic Matcher (Stratégie B)
// ============================================================================

/**
 * Calcule la similarité cosinus entre deux vecteurs.
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number}
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Trouve le topic le plus proche dans le registre.
 * @param {number[]} postEmbedding - L'embedding du post (décodé)
 * @param {object} registry - Le topic_registry { "topic_47": { centroid: [...], label: "..." } }
 * @returns {object} { topicId, score, label }
 */
function findMatchingTopic(postEmbedding, registry) {
  let bestTopicId = null;
  let bestScore = -1;
  let bestLabel = null;

  for (const [topicIdStr, topicData] of Object.entries(registry)) {
    const score = cosineSimilarity(postEmbedding, topicData.centroid);
    if (score > bestScore) {
      bestScore = score;
      bestTopicId = parseInt(topicIdStr.replace('topic_', ''), 10);
      bestLabel = topicData.label;
    }
  }

  // Seuil de Stratégie B: > 0.7
  if (bestScore >= 0.7) {
    return { topicId: bestTopicId, score: bestScore, label: bestLabel };
  }
  
  return { topicId: null, score: null, label: null };
}

module.exports = { findMatchingTopic, cosineSimilarity };
