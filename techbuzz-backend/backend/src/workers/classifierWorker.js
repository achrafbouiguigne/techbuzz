



const { startConsumer } = require('../events/consumer');
const { publishEvent } = require('../events/publisher');
const STREAMS = require('../events/streams');
const logger = require('../utils/logger');

const IT_INDICATORS = [
  'python','javascript','typescript','rust','golang','java','kotlin',
  'react','vue','angular','svelte','django','flask','express','spring',
  'aws','azure','gcp','docker','kubernetes','k8s','terraform',
  'postgres','mongodb','redis','sql','nosql',
  'ai','ml','llm','gpt','openai','model','neural',
  'api','code','coding','programming','developer','engineer','software',
  'github','stack','framework','library','bug','debug'
];

function isITRelated(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return IT_INDICATORS.some(term => lower.includes(term));
}

async function handlePostCollected(event) {
  const post = JSON.parse(event.data);
  const textToAnalyze = `${post.title} ${post.content}`;

  const isIT = isITRelated(textToAnalyze);

  if (isIT) {
    await publishEvent(
      STREAMS.POST_FILTERED_IT,
      'PostFilteredAsIT',
      event.aggregateId,
      'classifierWorker',
      post
    );
    logger.debug(`✅ Post ${event.aggregateId} is IT related.`);
  } else {
    
    await publishEvent(
      STREAMS.POST_FILTERED_NON_IT,
      'PostFilteredAsNonIT',
      event.aggregateId,
      'classifierWorker',
      post
    );
    logger.debug(`⏭️ Post ${event.aggregateId} is NOT IT related, ignoring.`);
  }
}


startConsumer(
  STREAMS.POST_COLLECTED,
  'classifier-group',
  'classifier-worker-1',
  handlePostCollected,
  true 
).catch(err => logger.error('Consumer crashed:', err));
