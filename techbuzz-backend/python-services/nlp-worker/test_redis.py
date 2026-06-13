import os
import redis

def check():
    url = os.getenv("REDIS_URL", "redis://redis:6379")
    print(f"Connecting to Redis at {url}...")
    client = redis.from_url(url)
    
    
    ping = client.ping()
    print(f"Ping result: {ping}")
    
    
    print("Reading from stream events:PostFilteredAsIT...")
    res = client.xreadgroup(
        groupname="nlp-group",
        consumername="test-consumer",
        streams={"events:PostFilteredAsIT": ">"},
        count=1,
        block=2000
    )
    print(f"Read result: {res}")

if __name__ == "__main__":
    check()
