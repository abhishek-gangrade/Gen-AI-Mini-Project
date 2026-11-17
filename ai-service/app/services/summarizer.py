import re
from typing import List, Dict, Any
from app.schemas.schemas import SummarizeResponse

def summarize_conversation(ticket_id: str, messages: List[Dict[str, str]]) -> SummarizeResponse:
    if not messages:
        return SummarizeResponse(
            summary="No messages recorded in this conversation yet.",
            original_problem="No problem description available.",
            troubleshooting_attempted=[],
            unresolved_questions=[],
            promises_made=[],
            suggested_next_action="Awaiting customer message."
        )

    # First message is usually the customer's initial ticket description
    first_msg = messages[0].get("content", "").strip()
    first_sentence = first_msg.split('.')[0] if first_msg else "Initial inquiry submitted."
    original_problem = first_sentence if len(first_sentence) < 140 else first_sentence[:137] + "..."

    troubleshooting_attempted = []
    unresolved_questions = []
    promises_made = []

    troubleshoot_keywords = ["tried", "cleared cache", "restarted", "reinstalled", "checked spam", "attempted", "followed steps", "verified"]
    promise_keywords = ["will refund", "will send", "investigating", "within 24 hours", "escalated to", "promise", "processing your"]

    for msg in messages:
        content = msg.get("content", "")
        role = msg.get("role", msg.get("senderRole", "customer"))
        lines = [line.strip() for line in content.split('\n') if line.strip()]

        for line in lines:
            line_lower = line.lower()
            # Check troubleshooting
            if any(k in line_lower for k in troubleshoot_keywords):
                troubleshooting_attempted.append(line[:120])
            # Check promises by agent/system
            if role in ["agent", "admin", "supervisor", "system"] and any(k in line_lower for k in promise_keywords):
                promises_made.append(line[:120])
            # Check unresolved questions
            if "?" in line and role == "customer":
                unresolved_questions.append(line[:120])

    # De-duplicate
    troubleshooting_attempted = list(dict.fromkeys(troubleshooting_attempted))[:4]
    unresolved_questions = list(dict.fromkeys(unresolved_questions))[:4]
    promises_made = list(dict.fromkeys(promises_made))[:4]

    # Overall summary narrative
    total_turns = len(messages)
    customer_msgs = sum(1 for m in messages if m.get("role") == "customer" or m.get("senderRole") == "customer")
    agent_msgs = total_turns - customer_msgs

    summary_text = (
        f"Conversation consists of {total_turns} message(s) ({customer_msgs} from customer, {agent_msgs} from staff). "
        f"Customer initially reported: '{original_problem}'. "
    )
    if troubleshooting_attempted:
        summary_text += f"Reported actions attempted: {'; '.join(troubleshooting_attempted[:2])}. "
    if promises_made:
        summary_text += f"Agent commitments noted: {'; '.join(promises_made[:2])}. "
    if unresolved_questions:
        summary_text += f"Pending questions: {'; '.join(unresolved_questions[:2])}. "
    else:
        summary_text += "Awaiting final confirmation or closure."

    # Next action suggestion
    last_msg = messages[-1]
    last_role = last_msg.get("role", last_msg.get("senderRole", "customer"))
    if last_role == "customer":
        suggested_next_action = "Review customer's latest reply and respond with grounded instructions or confirmation."
    elif promises_made and "refund" in str(promises_made):
        suggested_next_action = "Verify payment gateway status and confirm transaction id with finance."
    else:
        suggested_next_action = "Awaiting customer response to verify resolution."

    return SummarizeResponse(
        summary=summary_text.strip(),
        original_problem=original_problem,
        troubleshooting_attempted=troubleshooting_attempted,
        unresolved_questions=unresolved_questions,
        promises_made=promises_made,
        suggested_next_action=suggested_next_action
    )
