import os
import re
from typing import List, Dict, Any, Optional
import chromadb
from app.rag.embeddings import HybridEmbeddingFunction
from app.schemas.schemas import SourceCitation

class VectorStoreManager:
    def __init__(self, persist_dir: str = None):
        if persist_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            persist_dir = os.path.join(base_dir, "data", "chroma")
        os.makedirs(persist_dir, exist_ok=True)
        self.persist_dir = persist_dir
        self.client = chromadb.PersistentClient(path=self.persist_dir)
        self.embedding_function = HybridEmbeddingFunction(dimension=384)

    def _safe_collection_name(self, org_id: str) -> str:
        # Chroma collection names must be 3-63 chars, alphanumeric or underscores/hyphens
        clean = re.sub(r'[^a-zA-Z0-9_-]', '_', str(org_id))
        name = f"org_{clean}"
        if len(name) < 3:
            name = f"{name}__col"
        return name[:63]

    def get_or_create_collection(self, org_id: str):
        col_name = self._safe_collection_name(org_id)
        return self.client.get_or_create_collection(
            name=col_name,
            embedding_function=self.embedding_function,
            metadata={"hnsw:space": "cosine"}
        )

    def add_document_chunks(
        self,
        org_id: str,
        doc_id: str,
        doc_title: str,
        chunks: List[Dict[str, Any]]
    ) -> int:
        if not chunks:
            return 0

        col = self.get_or_create_collection(org_id)
        # Delete existing chunks for this doc first if re-indexing
        try:
            col.delete(where={"doc_id": str(doc_id)})
        except Exception:
            pass

        ids = []
        documents = []
        metadatas = []

        for c in chunks:
            chunk_idx = c.get("chunk_index", 0)
            chunk_id = f"{doc_id}_chk_{chunk_idx}"
            ids.append(chunk_id)
            documents.append(c["text"])
            metadatas.append({
                "doc_id": str(doc_id),
                "doc_title": str(doc_title),
                "chunk_index": int(chunk_idx),
                "page": int(c.get("page", 1))
            })

        # Batch insert into ChromaDB
        batch_size = 50
        for i in range(0, len(ids), batch_size):
            col.add(
                ids=ids[i:i+batch_size],
                documents=documents[i:i+batch_size],
                metadatas=metadatas[i:i+batch_size]
            )

        return len(chunks)

    def query(
        self,
        org_id: str,
        query_text: str,
        top_k: int = 4,
        min_similarity: float = 0.20
    ) -> List[SourceCitation]:
        col = self.get_or_create_collection(org_id)
        count = col.count()
        if count == 0:
            return []

        actual_k = min(top_k, count)
        try:
            results = col.query(
                query_texts=[query_text],
                n_results=actual_k,
                include=["documents", "metadatas", "distances"]
            )
        except Exception as e:
            print(f"[VectorStore Error] Query failed: {e}")
            return []

        citations: List[SourceCitation] = []
        if not results or not results["documents"] or not results["documents"][0]:
            return citations

        docs = results["documents"][0]
        metas = results["metadatas"][0]
        distances = results.get("distances", [[0.0]])[0] if "distances" in results else [0.0] * len(docs)

        for doc_text, meta, dist in zip(docs, metas, distances):
            # For cosine distance, similarity = 1 - distance
            similarity = max(0.0, 1.0 - float(dist)) if dist is not None else 0.0
            if similarity >= min_similarity:
                citations.append(SourceCitation(
                    doc_id=str(meta.get("doc_id", "")),
                    doc_title=str(meta.get("doc_title", "Knowledge Document")),
                    chunk_index=int(meta.get("chunk_index", 0)),
                    snippet=doc_text,
                    score=round(similarity, 3)
                ))

        # Sort descending by score
        citations.sort(key=lambda x: x.score, reverse=True)
        return citations

    def delete_document(self, org_id: str, doc_id: str) -> bool:
        try:
            col = self.get_or_create_collection(org_id)
            col.delete(where={"doc_id": str(doc_id)})
            return True
        except Exception as e:
            print(f"[VectorStore Error] Delete failed: {e}")
            return False

    def get_stats(self, org_id: str) -> Dict[str, Any]:
        try:
            col = self.get_or_create_collection(org_id)
            return {
                "collection_name": col.name,
                "total_chunks": col.count()
            }
        except Exception:
            return {"total_chunks": 0}

vector_store_manager = VectorStoreManager()
