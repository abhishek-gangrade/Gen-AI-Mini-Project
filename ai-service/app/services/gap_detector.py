from typing import List, Dict, Any
from collections import defaultdict
from app.schemas.schemas import KnowledgeGapDetectResponse, KnowledgeGapItem

def detect_knowledge_gaps(queries: List[Dict[str, Any]]) -> KnowledgeGapDetectResponse:
    """
    Cluster low-confidence queries (similarity < 0.35) into actionable knowledge gap topics.
    """
    low_confidence_queries = [
        q for q in queries if float(q.get("similarity_score", 0.0)) < 0.35
    ]

    if not low_confidence_queries:
        return KnowledgeGapDetectResponse(
            total_gaps_identified=0,
            gaps=[]
        )

    # Topic clustering heuristics
    topic_buckets = defaultdict(list)
    for q in low_confidence_queries:
        text = q.get("query", "").lower()
        ticket_id = q.get("ticket_id", "TIC-UNKNOWN")
        score = float(q.get("similarity_score", 0.0))

        if any(w in text for w in ["tax", "exemption", "gst", "vat", "w9"]):
            topic = "Tax Exemption & Invoicing Compliance"
        elif any(w in text for w in ["api rate limit", "webhook", "token expiry", "sdk"]):
            topic = "Developer API & Webhook Specifications"
        elif any(w in text for w in ["wire", "swift", "international bank", "ach"]):
            topic = "International Wire & B2B Payment Timelines"
        elif any(w in text for w in ["gdpr", "hipaa", "soc2", "data deletion"]):
            topic = "Privacy Compliance & Data Retention Protocol"
        elif any(w in text for w in ["sso", "saml", "okta", "azure ad"]):
            topic = "Enterprise SSO & SAML Identity Federation"
        elif any(w in text for w in ["custom domain", "ssl certificate", "cname"]):
            topic = "Custom Domain & SSL Provisioning"
        else:
            # Fallback topic from words
            words = [w for w in text.split() if len(w) > 4][:3]
            topic = f"Uncovered Topic: {' '.join(words).title()}" if words else "General Undocumented Inquiries"

        topic_buckets[topic].append({"query": q.get("query", ""), "ticket_id": ticket_id, "score": score})

    gap_items: List[KnowledgeGapItem] = []
    for topic, items in topic_buckets.items():
        sample_query = items[0]["query"]
        freq = len(items)
        avg_score = round(sum(i["score"] for i in items) / freq, 2)
        ticket_ids = list(dict.fromkeys([i["ticket_id"] for i in items]))

        gap_items.append(KnowledgeGapItem(
            query=sample_query,
            frequency=freq,
            average_confidence=avg_score,
            suggested_topic=topic,
            ticket_ids=ticket_ids
        ))

    # Sort by frequency descending
    gap_items.sort(key=lambda x: x.frequency, reverse=True)

    return KnowledgeGapDetectResponse(
        total_gaps_identified=len(gap_items),
        gaps=gap_items
    )
