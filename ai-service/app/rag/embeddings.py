import numpy as np
import hashlib
from typing import List, Union, Any
import re
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings

STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "to", "at", "in", "for",
    "on", "by", "with", "about", "against", "between", "into", "through",
    "during", "before", "after", "above", "below", "from", "up", "down",
    "of", "off", "over", "under", "again", "further", "then", "once",
    "here", "there", "when", "where", "why", "how", "all", "any", "both",
    "each", "few", "more", "most", "other", "some", "such", "no", "nor",
    "not", "only", "own", "same", "so", "than", "too", "very", "s", "t",
    "can", "will", "just", "don", "should", "now", "i", "me", "my", "myself",
    "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself",
    "yourselves", "he", "him", "his", "himself", "she", "her", "hers",
    "it", "its", "itself", "they", "them", "their", "theirs", "what", "which", "who"
}

def deterministic_hash(word: str) -> int:
    """Return deterministic integer hash invariant across Python runs."""
    digest = hashlib.md5(word.encode('utf-8')).hexdigest()
    return int(digest[:8], 16)

class HybridEmbeddingFunction(EmbeddingFunction[Documents]):
    """
    Embedding function compatible with ChromaDB.
    Filters common stopwords, hashes content words and subwords, and applies L2 normalization.
    """
    def __init__(self, dimension: int = 384):
        self.dimension = dimension

    def name(self) -> str:
        return "hybrid_content_embedding_v3"

    def _text_to_vector(self, text: str) -> List[float]:
        if not text:
            return [0.0] * self.dimension

        vec = np.zeros(self.dimension, dtype=np.float32)
        text_lower = text.lower()
        words = re.findall(r'\b[a-z0-9_-]+\b', text_lower)

        content_words = [w for w in words if w not in STOPWORDS and len(w) > 2]
        if not content_words:
            # If only stopwords, return unit random direction or zero
            return [0.0] * self.dimension

        for w in content_words:
            h = deterministic_hash(w) % self.dimension
            vec[h] += 4.0
            # Also hash character trigrams for content words
            if len(w) >= 3:
                for i in range(len(w) - 2):
                    sub = w[i:i+3]
                    sh = deterministic_hash(sub) % self.dimension
                    vec[sh] += 0.8

        norm = float(np.linalg.norm(vec))
        if norm > 0:
            vec = vec / norm
        return [float(x) for x in vec]

    def __call__(self, input: Documents) -> Embeddings:
        if isinstance(input, str):
            return [self._text_to_vector(input)]
        return [self._text_to_vector(t) for t in input]

    def embed_documents(self, *args, **kwargs) -> Embeddings:
        input_data = kwargs.get("input", args[0] if args else [])
        if isinstance(input_data, str):
            return [self._text_to_vector(input_data)]
        return [self._text_to_vector(t) for t in input_data]

    def embed_query(self, *args, **kwargs) -> Embeddings:
        input_data = kwargs.get("input", args[0] if args else "")
        if isinstance(input_data, str):
            return [self._text_to_vector(input_data)]
        return [self._text_to_vector(t) for t in input_data]
