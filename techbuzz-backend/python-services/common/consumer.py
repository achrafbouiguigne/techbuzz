import time
import json
import logging
from redis.exceptions import ResponseError
from .idempotency import is_already_processed, clear_idempotency

logger = logging.getLogger(__name__)

def ensure_consumer_group(redis_client, stream_name, group_name, start_id='$'):
    """Ensures that the consumer group exists."""
    try:
        redis_client.xgroup_create(stream_name, group_name, id=start_id, mkstream=True)
        logger.info(f"✅ Consumer group {group_name} created on {stream_name}")
    except ResponseError as e:
        if 'BUSYGROUP' not in str(e):
            raise

def start_consumer(redis_client, stream_name, group_name, consumer_name, handler, use_idempotency=True):
    """
    Robust consumer loop handling idempotency, retries, and Dead Letter Queues (DLQ).
    """
    ensure_consumer_group(redis_client, stream_name, group_name, start_id='0')
    logger.info(f"🚀 Starting consumer {consumer_name} on group {group_name} ({stream_name})")

    while True:
        try:
            
            results = redis_client.xreadgroup(
                groupname=group_name,
                consumername=consumer_name,
                streams={stream_name: '>'},
                count=10,
                block=5000
            )

            if not results:
                continue

            for stream, messages in results:
                for message_id, event in messages:
                    
                    event_decoded = {k.decode('utf-8') if isinstance(k, bytes) else k: 
                                     v.decode('utf-8') if isinstance(v, bytes) else v 
                                     for k, v in event.items()}
                    
                    event_id = event_decoded.get('eventId')
                    
                    if use_idempotency:
                        if is_already_processed(redis_client, event_id, group_name):
                            logger.warning(f"⚠️ Event {event_id} already processed by {group_name}, skipping.")
                            redis_client.xack(stream_name, group_name, message_id)
                            continue

                    try:
                        handler(event_decoded)
                        redis_client.xack(stream_name, group_name, message_id)
                    except Exception as e:
                        logger.error(f"❌ Error processing event {event_id}: {e}")
                        
                        attempt_key = f"attempts:{group_name}:{event_id}"
                        attempts = redis_client.incr(attempt_key)
                        redis_client.expire(attempt_key, 7 * 86400)

                        if use_idempotency:
                            clear_idempotency(redis_client, event_id, group_name)

                        if attempts >= 3:
                            logger.error(f"🚨 Event {event_id} failed 3 times, moving to DLQ.")
                            redis_client.xadd(
                                f"{stream_name}:dlq",
                                fields={
                                    "originalEvent": json.dumps(event_decoded),
                                    "error": str(e),
                                    "failedAt": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                                    "attempts": str(attempts)
                                }
                            )
                            redis_client.xack(stream_name, group_name, message_id)
                        

        except Exception as e:
            logger.error(f"❌ Consumer loop error: {e}")
            time.sleep(2)
