import re
from typing import List, Dict, Any
from app.schemas.schemas import ClassificationResponse

CATEGORY_KEYWORDS = {
    "Billing & Payments": [
        "payment", "charged", "deducted", "refund", "invoice", "billing", "receipt",
        "bank", "credit card", "debit", "transaction", "subscription", "pricing",
        "renewal", "stripe", "double charge", "overcharge", "money"
    ],
    "Account & Access": [
        "login", "password", "reset", "2fa", "mfa", "locked", "account", "access",
        "verification", "email", "credentials", "sign in", "sign up", "two-factor",
        "authentication", "sso", "profile", "permission", "unauthorized access"
    ],
    "Shipping & Delivery": [
        "shipping", "delivery", "track", "tracking", "courier", "package", "parcel",
        "delayed", "dispatch", "address", "customs", "lost package", "order status",
        "shipped", "transit", "estimated delivery"
    ],
    "Technical Support": [
        "error", "bug", "crash", "failure", "broken", "500", "404", "exception",
        "not loading", "stuck", "slow", "timeout", "api", "integration", "app crashed",
        "code", "database", "latency", "system down", "console"
    ],
    "Product & Feature": [
        "feature", "request", "suggestion", "upgrade", "integration request", "export",
        "customization", "roadmap", "enhancement", "how do i use", "settings"
    ],
    "General Inquiry": [
        "hours", "contact", "pricing details", "about", "information", "policy",
        "question", "inquiry", "sales", "partnership"
    ]
}

FRUSTRATED_INDICATORS = [
    "unacceptable", "furious", "terrible", "worst", "scam", "ridiculous",
    "disaster", "lawyer", "sue", "immediately", "urgent", "horrible",
    "wasted my time", "fed up", "escalate this", "incompetent", "stealing"
]

NEGATIVE_INDICATORS = [
    "not working", "failed", "broken", "problem", "issue", "error", "delayed",
    "wrong", "cannot", "disappointed", "poor", "frustrating", "missing", "loss",
    "still pending", "no confirmation", "no order", "deducted", "taken out"
]

POSITIVE_INDICATORS = [
    "thank you", "thanks", "great", "helpful", "awesome", "excellent",
    "appreciate", "good job", "resolved", "wonderful", "perfect"
]

CRITICAL_INDICATORS = [
    "production down", "system outage", "security breach", "data leak",
    "unauthorized transaction", "completely blocked", "catastrophic", "emergency"
]

HIGH_INDICATORS = [
    "payment deducted", "money taken", "charged twice", "cannot access account",
    "locked out", "urgent", "deadline", "financial loss", "crucial"
]

def analyze_ticket_text(subject: str, description: str, customer_history_count: int = 0) -> ClassificationResponse:
    combined = f"{subject} {description}".lower()
    words = re.findall(r'\b[a-z0-9_-]+\b', combined)
    word_set = set(words)

    # 1. Category Detection
    category_scores = {}
    for cat, kws in CATEGORY_KEYWORDS.items():
        score = 0
        for kw in kws:
            if " " in kw:
                if kw in combined:
                    score += 3
            elif kw in word_set:
                score += 2
        category_scores[cat] = score

    # Find highest scoring category
    best_category = max(category_scores.items(), key=lambda x: x[1])
    assigned_category = best_category[0] if best_category[1] > 0 else "General Inquiry"

    # 2. Sentiment Analysis
    frustrated_hits = sum(1 for ind in FRUSTRATED_INDICATORS if ind in combined)
    negative_hits = sum(1 for ind in NEGATIVE_INDICATORS if ind in combined)
    positive_hits = sum(1 for ind in POSITIVE_INDICATORS if ind in combined)
    exclamation_count = combined.count("!")

    if frustrated_hits >= 1 or (negative_hits >= 2 and exclamation_count >= 2):
        sentiment = "Frustrated"
    elif negative_hits > positive_hits or "not" in combined:
        sentiment = "Negative"
    elif positive_hits > negative_hits:
        sentiment = "Positive"
    else:
        sentiment = "Neutral"

    # 3. Priority & Urgency Calculation
    urgency_score = 0.3
    if any(ind in combined for ind in CRITICAL_INDICATORS):
        priority = "Critical"
        urgency_score = 0.95
    elif any(ind in combined for ind in HIGH_INDICATORS) or sentiment == "Frustrated":
        priority = "High"
        urgency_score = 0.80
    elif sentiment == "Negative" or customer_history_count > 2:
        priority = "Medium"
        urgency_score = 0.55
    else:
        priority = "Low"
        urgency_score = 0.30

    # 4. Intent Identification
    if "refund" in combined or "money back" in combined:
        intent = "Refund Request"
    elif "deducted" in combined or "charged" in combined:
        intent = "Payment Dispute / Deduction Verification"
    elif "password" in combined or "login" in combined or "reset" in combined:
        intent = "Account Recovery & Authentication"
    elif "where is" in combined or "tracking" in combined or "delivery" in combined:
        intent = "Order Status & Shipment Inquiry"
    elif "bug" in combined or "error" in combined or "fail" in combined:
        intent = "Technical Defect & Troubleshooting"
    elif "cancel" in combined:
        intent = "Subscription / Order Cancellation"
    else:
        intent = f"Assistance regarding {assigned_category.lower()}"

    # 5. Extract Keywords
    common_stopwords = {
        "the", "a", "an", "is", "it", "to", "and", "or", "for", "with", "my", "i",
        "in", "on", "at", "by", "from", "of", "this", "that", "was", "be", "have",
        "has", "had", "do", "does", "did", "but", "so", "as", "if", "when", "can",
        "could", "would", "should", "all", "any", "no", "not", "we", "you", "me"
    }
    meaningful_words = [w for w in words if len(w) > 3 and w not in common_stopwords]
    # Count frequencies
    from collections import Counter
    top_keywords = [w for w, _ in Counter(meaningful_words).most_common(6)]

    # 6. Main Issue Summary
    first_sentence = description.split('.')[0].strip()
    if len(first_sentence) > 100:
        first_sentence = first_sentence[:97] + "..."
    main_issue = f"{subject} - {first_sentence}" if first_sentence else subject

    confidence = round(min(0.98, max(0.65, 0.60 + (best_category[1] * 0.05))), 2)

    return ClassificationResponse(
        intent=intent,
        category=assigned_category,
        priority=priority,
        sentiment=sentiment,
        main_issue=main_issue,
        keywords=top_keywords,
        urgency_score=round(urgency_score, 2),
        confidence=confidence
    )
