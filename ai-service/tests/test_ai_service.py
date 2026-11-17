import os
import sys

# Add ai-service to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from app.services.classifier import analyze_ticket_text
from app.rag.vector_store import vector_store_manager
from app.services.llm_provider import llm_provider
from app.services.summarizer import summarize_conversation
from app.services.gap_detector import detect_knowledge_gaps
from app.seed_chroma import seed_chroma

def test_ai_classification_categories():
    # 1. Payment inquiry
    res1 = analyze_ticket_text(
        "Payment deducted from my bank account, but my order is still pending",
        "The money was taken out of my Chase account but no order confirmation arrived."
    )
    assert res1.category == "Billing & Payments"
    assert res1.priority in ["High", "Critical"]
    assert res1.sentiment in ["Negative", "Frustrated"]
    assert "payment" in [k.lower() for k in res1.keywords] or "deducted" in [k.lower() for k in res1.keywords]

    # 2. Account Lockout
    res2 = analyze_ticket_text(
        "Locked out of account, 2FA not working",
        "My phone broke and I cannot enter the 2FA token to log into the console."
    )
    assert res2.category == "Account & Access"
    assert res2.priority in ["High", "Critical"]

    # 3. Shipping Tracking
    res3 = analyze_ticket_text(
        "Where is my package? Tracking number is not updating",
        "The courier tracking page has not updated for 4 days."
    )
    assert res3.category == "Shipping & Delivery"

def test_priority_and_urgency_escalation():
    # Production outage should be Critical
    res = analyze_ticket_text(
        "EMERGENCY: Production system outage! Customers completely blocked!",
        "Our entire application is returning 500 errors and our users cannot check out."
    )
    assert res.priority == "Critical"
    assert res.urgency_score >= 0.90

def test_sentiment_analysis_frustrated():
    res = analyze_ticket_text(
        "This is completely unacceptable service and ridiculous delay!",
        "I have been waiting for two weeks and your support has wasted my time. Escalate this immediately!"
    )
    assert res.sentiment == "Frustrated"

def test_rag_semantic_retrieval_and_citations():
    # Ensure technova org has policy documents
    seed_chroma("technova")

    # Test query about refund window
    citations = vector_store_manager.query(
        "technova",
        "What is your refund policy? How many days do I have to return an item?",
        top_k=3,
        min_similarity=0.20
    )
    assert len(citations) > 0
    doc_titles = [c.doc_title for c in citations]
    assert any("Refund" in t for t in doc_titles)
    refund_doc = next(c for c in citations if "Refund" in c.doc_title)
    assert "refund" in refund_doc.snippet.lower() or "policy" in refund_doc.snippet.lower()
    assert refund_doc.score >= 0.20

def test_missing_document_behavior_no_hallucination():
    """
    CRITICAL REQUIREMENT: Verify that the system does NOT invent policies
    when no relevant knowledge document exists in the knowledge base.
    """
    unknown_query = "What is the policy for claiming cryptocurrency token rewards on hardware quantum devices?"
    citations = vector_store_manager.query("technova", unknown_query, min_similarity=0.30)

    res = llm_provider.generate_grounded_response(
        customer_name="Alice",
        subject=unknown_query,
        latest_message="Please clarify the quantum cryptocurrency refund terms immediately.",
        sources=citations,
        tone="Professional"
    )

    # Must disclaim and require human agent verification
    assert res["sufficient_context"] is False
    assert "human" in res["text"].lower() or "flagged" in res["text"].lower()
    assert "verified documentation" in res["text"].lower() or "not currently contain" in res["text"].lower()

def test_conversation_summarizer():
    messages = [
        {"role": "customer", "content": "I cannot access my dashboard. I tried clearing cache and restarting the browser."},
        {"role": "agent", "content": "Hello, we are investigating your account permission. We will refund the overcharge within 24 hours."},
        {"role": "customer", "content": "Will my API keys still work while this is being investigated?"}
    ]
    summary = summarize_conversation("TIC-TEST", messages)
    assert "clearing cache" in str(summary.troubleshooting_attempted).lower()
    assert "refund" in str(summary.promises_made).lower()
    assert "?" in str(summary.unresolved_questions)
    assert len(summary.summary) > 20

def test_knowledge_gap_detection():
    unanswered_queries = [
        {"query": "How do I upload a tax exemption certificate for VAT exemption?", "ticket_id": "TIC-101", "similarity_score": 0.18},
        {"query": "Where can I submit our state tax exemption form?", "ticket_id": "TIC-102", "similarity_score": 0.22},
        {"query": "How do I configure Enterprise Okta SAML SSO?", "ticket_id": "TIC-103", "similarity_score": 0.15}
    ]
    gaps_res = detect_knowledge_gaps(unanswered_queries)
    assert gaps_res.total_gaps_identified >= 1
    assert any("Tax" in g.suggested_topic for g in gaps_res.gaps)

if __name__ == "__main__":
    test_ai_classification_categories()
    test_priority_and_urgency_escalation()
    test_sentiment_analysis_frustrated()
    test_rag_semantic_retrieval_and_citations()
    test_missing_document_behavior_no_hallucination()
    test_conversation_summarizer()
    test_knowledge_gap_detection()
    print("All AI Service Unit Tests Passed Successfully!")
