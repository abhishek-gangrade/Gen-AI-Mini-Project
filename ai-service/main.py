import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import tempfile
import shutil

from app.schemas.schemas import (
    ClassificationRequest,
    ClassificationResponse,
    DocumentIngestResponse,
    RAGQueryRequest,
    RAGQueryResponse,
    GenerateResponseRequest,
    GenerateResponseResponse,
    SummarizeRequest,
    SummarizeResponse,
    KnowledgeGapDetectRequest,
    KnowledgeGapDetectResponse,
)
from app.services.classifier import analyze_ticket_text
from app.services.llm_provider import llm_provider
from app.services.summarizer import summarize_conversation
from app.services.gap_detector import detect_knowledge_gaps
from app.rag.vector_store import vector_store_manager
from app.document_processing.parser import parse_document, chunk_text

app = FastAPI(
    title="ResolveAI - AI Engine",
    description="Generative AI, Classification, RAG & ChromaDB Vector Store Service",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AI_SERVICE_SECRET = os.getenv("AI_SERVICE_SECRET", "resolveai_internal_secret_key_2026")

def verify_service_token(x_service_token: Optional[str] = Header(None)):
    if AI_SERVICE_SECRET and x_service_token and x_service_token != AI_SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Invalid service authorization token")
    return True

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ResolveAI AI Microservice",
        "vector_store": "ChromaDB Persistent (Active)",
        "llm_provider": llm_provider.provider
    }

@app.post("/api/classify", response_model=ClassificationResponse)
def classify_ticket(req: ClassificationRequest, authorized: bool = Depends(verify_service_token)):
    try:
        return analyze_ticket_text(
            subject=req.subject,
            description=req.description,
            customer_history_count=req.customer_history_count or 0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

@app.post("/api/rag/ingest-file", response_model=DocumentIngestResponse)
async def ingest_file(
    org_id: str = Form(...),
    doc_id: str = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
    authorized: bool = Depends(verify_service_token)
):
    try:
        file_ext = os.path.splitext(file.filename)[1].lower().strip('.')
        if file_ext not in ["pdf", "docx", "txt", "md"]:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, DOCX, or TXT.")

        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        try:
            pages_data = parse_document(tmp_path, file_ext)
            chunks = chunk_text(pages_data, chunk_size=450, chunk_overlap=70)
            added_count = vector_store_manager.add_document_chunks(
                org_id=org_id,
                doc_id=doc_id,
                doc_title=title,
                chunks=chunks
            )
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

        return DocumentIngestResponse(
            doc_id=doc_id,
            title=title,
            chunks_created=added_count,
            status="indexed"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document ingestion failed: {str(e)}")

@app.post("/api/rag/ingest-text", response_model=DocumentIngestResponse)
def ingest_text_endpoint(
    org_id: str = Form(...),
    doc_id: str = Form(...),
    title: str = Form(...),
    content: str = Form(...),
    authorized: bool = Depends(verify_service_token)
):
    try:
        pages_data = [{"page": 1, "text": content}]
        chunks = chunk_text(pages_data, chunk_size=450, chunk_overlap=70)
        added_count = vector_store_manager.add_document_chunks(
            org_id=org_id,
            doc_id=doc_id,
            doc_title=title,
            chunks=chunks
        )
        return DocumentIngestResponse(
            doc_id=doc_id,
            title=title,
            chunks_created=added_count,
            status="indexed"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text ingestion failed: {str(e)}")

@app.post("/api/rag/query", response_model=RAGQueryResponse)
def query_rag(req: RAGQueryRequest, authorized: bool = Depends(verify_service_token)):
    try:
        citations = vector_store_manager.query(
            org_id=req.org_id,
            query_text=req.query,
            top_k=req.top_k or 4,
            min_similarity=req.min_similarity or 0.20
        )
        has_sufficient = len(citations) > 0 and citations[0].score >= (req.min_similarity or 0.20)
        return RAGQueryResponse(
            query=req.query,
            results_found=len(citations),
            sources=citations,
            has_sufficient_context=has_sufficient
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")

@app.delete("/api/rag/document/{org_id}/{doc_id}")
def delete_rag_document(org_id: str, doc_id: str, authorized: bool = Depends(verify_service_token)):
    success = vector_store_manager.delete_document(org_id=org_id, doc_id=doc_id)
    return {"doc_id": doc_id, "deleted": success}

@app.post("/api/response/generate", response_model=GenerateResponseResponse)
def generate_response(req: GenerateResponseRequest, authorized: bool = Depends(verify_service_token)):
    try:
        # 1. Retrieve knowledge base sources via ChromaDB
        combined_query = f"{req.subject} {req.latest_message}"
        citations = vector_store_manager.query(
            org_id=req.org_id,
            query_text=combined_query,
            top_k=req.top_k or 4,
            min_similarity=0.20
        )

        # 2. Generate grounded response with specified tone
        result = llm_provider.generate_grounded_response(
            customer_name=req.customer_name or "Customer",
            subject=req.subject,
            latest_message=req.latest_message,
            sources=citations,
            tone=req.tone or "Professional",
            conversation_history=req.conversation_history
        )

        return GenerateResponseResponse(
            suggested_response=result["text"],
            tone=req.tone or "Professional",
            confidence_score=round(result.get("confidence", 0.0), 3),
            sources_used=citations,
            sufficient_context=result.get("sufficient_context", False),
            model_provider=result.get("provider", "ResolveAI Grounded Engine"),
            generation_note=None if result.get("sufficient_context") else "Knowledge base lacks direct policy documentation. Human review advised."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Response generation failed: {str(e)}")

@app.post("/api/conversation/summary", response_model=SummarizeResponse)
def summarize_conversation_endpoint(req: SummarizeRequest, authorized: bool = Depends(verify_service_token)):
    try:
        return summarize_conversation(ticket_id=req.ticket_id, messages=req.messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")

@app.post("/api/knowledge-gap/detect", response_model=KnowledgeGapDetectResponse)
def detect_knowledge_gaps_endpoint(req: KnowledgeGapDetectRequest, authorized: bool = Depends(verify_service_token)):
    try:
        return detect_knowledge_gaps(queries=req.queries)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gap detection failed: {str(e)}")
