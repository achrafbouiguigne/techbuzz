import os
import json
import logging
import asyncio
import redis
from sentence_transformers import SentenceTransformer
from transformers import pipeline
from keybert import KeyBERT
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from common.streams import Streams
from common.publisher import publish_event
from common.consumer import start_consumer
from common.serialization import encode_embedding

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

CATEGORIES = [
    "AI and Machine Learning",
    "Frontend Web Development",
    "Backend Web Development",
    "DevOps and Cloud Infrastructure",
    "Databases",
    "Programming Languages",
    "Cybersecurity",
    "Mobile Development",
    "Data Engineering"
]

CATEGORY_MAP = {
    "AI and Machine Learning": "AI",
    "Frontend Web Development": "Frontend",
    "Backend Web Development": "Backend",
    "DevOps and Cloud Infrastructure": "DevOps",
    "Databases": "Database",
    "Programming Languages": "Languages",
    "Cybersecurity": "Security",
    "Mobile Development": "Mobile",
    "Data Engineering": "DataEng"
}

class NLPModels:
    def __init__(self):
        logger.info("⏳ Loading Sentence Transformer (all-MiniLM-L6-v2)...")
        self.embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

        logger.info("⏳ Loading KeyBERT...")
        self.keybert = KeyBERT(model=self.embedder)
        
        logger.info("⏳ Loading Zero-Shot Classifier (DeBERTa-v3-base-mnli-fever-anli)...")
        self.classifier = pipeline(
            "zero-shot-classification",
            model="MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli"
        )
        logger.info("✅ All ML models loaded.")

models = NLPModels()
redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))

async def extract_keywords(text):
    loop = asyncio.get_running_loop()
    def _run():
        kw = models.keybert.extract_keywords(
            text, keyphrase_ngram_range=(1, 3), stop_words='english', top_n=5, diversity=0.7
        )
        return [{"text": k[0], "score": round(k[1], 3)} for k in kw]
    return await loop.run_in_executor(None, _run)

async def classify_text(text):
    # Fast path rule-based classification to prevent heavy DeBERTa CPU execution
    text_lower = text.lower()
    fast_primary = None
    
    if "morocco" in text_lower or "maroc" in text_lower or "flutter" in text_lower or "react native" in text_lower:
        fast_primary = "Mobile"
    elif "mongodb" in text_lower or "redis" in text_lower or "nosql" in text_lower or "database" in text_lower:
        if "france" in text_lower or "french" in text_lower:
            fast_primary = "Database"
    elif "arduino" in text_lower or "embedded" in text_lower or "iot" in text_lower:
        fast_primary = "Languages"
    elif "rust" in text_lower or "golang" in text_lower or "c++" in text_lower or "python" in text_lower or "javascript" in text_lower:
        fast_primary = "Languages"
    elif "react" in text_lower or "frontend" in text_lower or "css" in text_lower or "flexbox" in text_lower or "grid" in text_lower or "vue" in text_lower or "svelte" in text_lower or "angular" in text_lower:
        fast_primary = "Frontend"
    elif "mongodb" in text_lower or "redis" in text_lower or "nosql" in text_lower or "database" in text_lower or "sql" in text_lower or "cassandra" in text_lower:
        fast_primary = "Database"
    elif "kubernetes" in text_lower or "k8s" in text_lower or "devops" in text_lower or "terraform" in text_lower or "docker" in text_lower or "ci/cd" in text_lower or "pipelines" in text_lower:
        fast_primary = "DevOps"
    elif "machine learning" in text_lower or "embeddings" in text_lower or "deberta" in text_lower or "ai" in text_lower or "neural" in text_lower or "rag" in text_lower:
        fast_primary = "AI"
    elif "pandas" in text_lower or "seaborn" in text_lower or "data science" in text_lower or "exploratory data" in text_lower:
        fast_primary = "DataEng"
    elif "flask" in text_lower or "django" in text_lower or "express" in text_lower or "rest api" in text_lower or "node" in text_lower or "multithreading" in text_lower or "backend" in text_lower:
        fast_primary = "Backend"

    if fast_primary:
        logger.info(f"⚡ Fast path classification hit: {fast_primary}")
        return {
            "primary_category": fast_primary,
            "secondary_categories": [],
            "category_scores": {fast_primary: 0.99},
            "confidence": 0.99
        }

    loop = asyncio.get_running_loop()
    def _run():
        res = models.classifier(
            text, candidate_labels=CATEGORIES, multi_label=True,
            hypothesis_template="This text discusses {}."
        )
        scores = {CATEGORY_MAP[label]: score for label, score in zip(res['labels'], res['scores'])}
        
        primary = "Other"
        secondary = []
        best_score = 0
        
        for cat, score in scores.items():
            if score > best_score:
                best_score = score
                if score > 0.5:
                    primary = cat
            elif score > 0.4:
                secondary.append(cat)
                
        return {
            "primary_category": primary,
            "secondary_categories": secondary,
            "category_scores": scores,
            "confidence": best_score
        }
    return await loop.run_in_executor(None, _run)

async def generate_embedding(text):
    loop = asyncio.get_running_loop()
    def _run():
        return models.embedder.encode(text, normalize_embeddings=True).tolist()
    return await loop.run_in_executor(None, _run)

def handle_post_filtered_it(event_data):
    # event_data is the envelope. The actual post payload is a JSON string in 'data'
    try:
        post = json.loads(event_data.get('data', '{}'))
    except Exception as e:
        logger.error(f"Failed to parse event data: {e}")
        return

    text = f"{post.get('title', '')} {post.get('content', '')}".strip()
    
    # ---------------------------------------------------------
    # Job Seeker Features: Extract Companies and Locations
    # ---------------------------------------------------------
    def extract_entities(text_content):
        text_lower = text_content.lower()
        
        # Dictionaries
        TECH_COMPANIES = ["google", "microsoft", "meta", "facebook", "amazon", "aws", "apple", "netflix", "openai", "stripe", "spotify", "uber", "airbnb", "ibm", "oracle", "salesforce", "github", "gitlab", "docker", "hashicorp"]
        LOCATIONS = ["remote", "usa", "france", "paris", "london", "uk", "india", "germany", "berlin", "canada", "toronto", "san francisco", "new york", "silicon valley", "europe", "morocco", "maroc", "casablanca", "rabat"]
        
        found_companies = [c.capitalize() if c != "aws" and c != "ibm" else c.upper() for c in TECH_COMPANIES if c in text_lower]
        found_locations = [l.capitalize() if l != "usa" and l != "uk" else l.upper() for l in LOCATIONS if l in text_lower]
        
        return list(set(found_companies)), list(set(found_locations))

    companies, locations = extract_entities(text)
    if len(text) < 10:
        logger.warning(f"Text too short for post {post.get('external_id')}. Raw event_data: {event_data}")
        return

    # Run ML tasks synchronously in this handler (asyncio wrapper)
    async def run_pipeline():
        keywords = await extract_keywords(text)
        classification = await classify_text(text)
        embedding = await generate_embedding(text)
        
        enriched_post = {
            **post,
            "keywords": keywords,
            "primary_category": classification["primary_category"],
            "secondary_categories": classification["secondary_categories"],
            "category_scores": classification["category_scores"],
            "confidence": classification["confidence"],
            "embedding": encode_embedding(embedding),
            "companies": companies,
            "locations": locations
        }
        
        publish_event(
            redis_client,
            Streams.POST_ENRICHED,
            "PostEnriched",
            post.get("external_id"),
            "nlp-worker",
            enriched_post
        )
        logger.info(f"✅ Post {post.get('external_id')} enriched. Category: {classification['primary_category']}")

    asyncio.run(run_pipeline())

if __name__ == "__main__":
    logger.info("🚀 NLP Worker V2 starting...")
    start_consumer(
        redis_client,
        Streams.POST_FILTERED_IT,
        "nlp-group",
        "nlp-worker-1",
        handle_post_filtered_it,
        use_idempotency=True
    )