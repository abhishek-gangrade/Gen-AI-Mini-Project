import os
import sys

# Ensure PYTHONPATH includes ai-service
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from app.rag.vector_store import vector_store_manager
from app.document_processing.parser import chunk_text

SAMPLE_DOCS = [
    {
        "doc_id": "refund_policy_001",
        "title": "Refund and Cancellation Policy",
        "content": """
TECHNOVA REFUND AND RETURN POLICY

1. 30-Day Money Back Guarantee:
Customers may request a complete refund for digital products and standard software subscriptions within 30 days of initial purchase. No penalties apply if requested within this window.

2. Processing Timelines:
Approved refunds are transmitted back to the original funding source (credit card, debit card, or bank account) within 3 to 5 business days. The timing depends on the acquiring banking institution.

3. Payment Deductions and Double Charges:
If your bank account reflects a deduction but the order status remains "Pending" or unconfirmed, our automated reconciliation system releases the temporary pre-authorization hold within 24 to 48 hours. If the duplicate transaction settles, submitting a transaction receipt guarantees immediate manual reversal by our finance department.

4. Non-Refundable Services:
Custom enterprise onboarding services, dedicated architecture consulting hours, and consumed third-party API token overages are strictly non-refundable once work has commenced.
"""
    },
    {
        "doc_id": "auth_policy_002",
        "title": "Account Security and Two-Factor Authentication Guide",
        "content": """
TECHNOVA ACCOUNT SECURITY AND AUTHENTICATION PROTOCOL

1. Password Reset Procedures:
Users can initiate a secure password reset via the self-service portal. Reset links expire within 15 minutes for cryptographic security. Passwords must contain a minimum of 10 characters including uppercase, lowercase, numbers, and symbols.

2. Two-Factor Authentication (2FA / MFA) Recovery:
If a user loses access to their authenticator device, they can utilize one of their 10 emergency one-time recovery codes generated during initial enrollment.
If backup recovery codes are lost, identity verification requires submitting an account verification form accompanied by government ID or verification through registered corporate domain DNS.

3. Account Lockout Policies:
Accounts undergo a mandatory 30-minute security lockdown following 5 consecutive failed authentication attempts. Support agents can manually unlock verified accounts after affirmative caller authentication.
"""
    },
    {
        "doc_id": "shipping_policy_003",
        "title": "Shipping and Delivery Timelines",
        "content": """
TECHNOVA GLOBAL SHIPPING & LOGISTICS GUIDELINES

1. Standard Shipping:
Standard domestic transit requires 3 to 5 business days from dispatch. Tracking links are updated by our regional carriers within 24 hours of package handoff.

2. Express Delivery:
Express courier services guarantee delivery within 1 to 2 business days for orders confirmed prior to 2:00 PM EST.

3. Lost or Delayed Shipments:
If tracking status does not update for 5 consecutive business days past the estimated delivery date, customers are entitled to an immediate replacement dispatch or full refund upon submitting a lost shipment claim.
"""
    },
    {
        "doc_id": "billing_policy_004",
        "title": "Enterprise Billing and Invoicing FAQ",
        "content": """
TECHNOVA SUBSCRIPTION AND INVOICE MANAGEMENT

1. Annual Billing Discount:
Customers choosing annual upfront commitments receive a 20% discount applied immediately at checkout.

2. Invoices and Tax Compliance:
Tax-compliant PDF invoices featuring corporate VAT/GST identification numbers are automatically generated on the 1st of every calendar month and available under Organization Settings -> Invoices.

3. Wire Transfers and ACH:
Enterprise tiers supporting Net-30 payment terms can settle accounts through domestic ACH or international SWIFT wire transfers. Reconciliations require 2 business days after wire arrival.
"""
    }
]

def seed_chroma(org_id: str = "technova"):
    print(f"[Chroma Seed] Indexing official knowledge base policies for org: {org_id}...")
    total_chunks = 0
    for doc in SAMPLE_DOCS:
        pages = [{"page": 1, "text": doc["content"]}]
        chunks = chunk_text(pages, chunk_size=400, chunk_overlap=60)
        count = vector_store_manager.add_document_chunks(
            org_id=org_id,
            doc_id=doc["doc_id"],
            doc_title=doc["title"],
            chunks=chunks
        )
        total_chunks += count
        print(f"  -> Indexed '{doc['title']}' ({count} chunks)")
    print(f"[Chroma Seed] Completed! Total chunks indexed in ChromaDB: {total_chunks}")

if __name__ == "__main__":
    seed_chroma("technova")
