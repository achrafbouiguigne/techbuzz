import json
from datetime import datetime

def publish_event(redis_client, stream_name, event_type, aggregate_id, producer, payload):
    """
    Publishes a business event to a Redis Stream with a standard envelope.
    """
    event_id = f"{event_type}:{aggregate_id}"
    
    envelope = {
        "eventId": event_id,
        "eventType": event_type,
        "eventVersion": "1.0",
        "occurredAt": datetime.utcnow().isoformat() + "Z",
        "aggregateId": aggregate_id,
        "producer": producer,
        "data": json.dumps(payload)
    }

    # xadd with MAXLEN ~ 500k to prevent unbounded memory growth
    redis_client.xadd(
        stream_name,
        fields=envelope,
        maxlen=500000,
        approximate=True
    )
    
    return event_id
