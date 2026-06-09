# ============================================================================
# InptPulse v2 — Idempotency Utils
# ============================================================================

def is_already_processed(redis_client, event_id, consumer_name):
    """
    Pattern A Idempotency: Redis SET NX.
    Returns True if already processed, False if it's the first time.
    """
    key = f'processed:{consumer_name}:{event_id}'
    # setnx returns 1 if set, 0 if not set.
    # We set an expiry of 1 day (86400s)
    was_set = redis_client.set(key, '1', nx=True, ex=86400)
    return not was_set

def clear_idempotency(redis_client, event_id, consumer_name):
    """ Clears the idempotency key so we can retry on failure. """
    key = f'processed:{consumer_name}:{event_id}'
    redis_client.delete(key)
