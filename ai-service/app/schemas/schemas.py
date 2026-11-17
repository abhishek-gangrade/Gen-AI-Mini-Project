from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ClassificationRequest(BaseModel):
    subject: str = Field(..., description="Ticket subject line")
    description: str = Field(..., description="Initial customer problem description")
    customer_history_count: Optional[int] = Field(0, description="Previous tickets submitted by this customer")

class ClassificationResponse(BaseModel):
    intent: str
    category: str
    priority: str
    sentiment: str
    main_issue: str
    keywords: List[str]
    urgency_score: float
    confidence: float

class ChunkMetadata(BaseModel):
    doc_id: str
    doc_title: str
    chunk_index: int
    source_type: str
    page: Optional[int] = 1

class DocumentIngestRequest(BaseModel):
    org_id: str
    doc_id: str
    title: str
    file_type: str
    text_content: Optional[str] = None

class DocumentIngestResponse(BaseModel):
    doc_id: str
    title: str
    chunks_created: int
    status: str

class SourceCitation(BaseModel):
    doc_id: str
    doc_title: str
    chunk_index: int
    snippet: str
    score: float

class RAGQueryRequest(BaseModel):
    org_id: str
    query: str
    top_k: Optional[int] = 4
    min_similarity: Optional[float] = 0.30

class RAGQueryResponse(BaseModel):
    query: str
    results_found: int
    sources: List[SourceCitation]
    has_sufficient_context: bool

class GenerateResponseRequest(BaseModel):
    org_id: str
    ticket_id: str
    customer_name: Optional[str] = "Customer"
    subject: str
    latest_message: str
    conversation_history: Optional[List[Dict[str, str]]] = []
    tone: Optional[str] = "Professional"  # Professional, Friendly, Concise, Detailed
    top_k: Optional[int] = 4

class GenerateResponseResponse(BaseModel):
    suggested_response: str
    tone: str
    confidence_score: float
    sources_used: List[SourceCitation]
    sufficient_context: bool
    model_provider: str
    generation_note: Optional[str] = None

class SummarizeRequest(BaseModel):
    ticket_id: str
    messages: List[Dict[str, str]]

class SummarizeResponse(BaseModel):
    summary: str
    original_problem: str
    troubleshooting_attempted: List[str]
    unresolved_questions: List[str]
    promises_made: List[str]
    suggested_next_action: str

class KnowledgeGapDetectRequest(BaseModel):
    org_id: str
    queries: List[Dict[str, Any]]  # [{query: str, ticket_id: str, similarity_score: float}]

class KnowledgeGapItem(BaseModel):
    query: str
    frequency: int
    average_confidence: float
    suggested_topic: str
    ticket_ids: List[str]

class KnowledgeGapDetectResponse(BaseModel):
    total_gaps_identified: int
    gaps: List[KnowledgeGapItem]
