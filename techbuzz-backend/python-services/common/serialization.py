import base64
import numpy as np

def encode_embedding(emb):
    """Encodes a float list into a base64 string"""
    if not emb:
        return ""
    
    arr = np.array(emb, dtype=np.float32)
    return base64.b64encode(arr.tobytes()).decode('ascii')

def decode_embedding(b64_str):
    """Decodes a base64 string back into a float list"""
    if not b64_str:
        return []
    bytes_data = base64.b64decode(b64_str)
    arr = np.frombuffer(bytes_data, dtype=np.float32)
    return arr.tolist()
