import os
import requests
from typing import List, Dict, Any, Optional
from app.schemas.schemas import SourceCitation

class LLMProvider:
    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "local").lower()
        self.openai_key = os.getenv("OPENAI_API_KEY", "")
        self.gemini_key = os.getenv("GEMINI_API_KEY", "")
        self.ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.model_name = os.getenv("LLM_MODEL_NAME", "grounded-local-v1")

    def generate_grounded_response(
        self,
        customer_name: str,
        subject: str,
        latest_message: str,
        sources: List[SourceCitation],
        tone: str = "Professional",
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Generate grounded response based on retrieved sources and selected tone.
        """
        has_sufficient_context = len(sources) > 0 and sources[0].score >= 0.25

        # Check if an external provider is explicitly configured and has valid keys
        if self.gemini_key and self.provider == "gemini":
            try:
                external_res = self._call_gemini(customer_name, subject, latest_message, sources, tone, has_sufficient_context)
                if external_res:
                    return {
                        "text": external_res,
                        "provider": "Google Gemini",
                        "sufficient_context": has_sufficient_context,
                        "confidence": sources[0].score if sources else 0.4
                    }
            except Exception as e:
                print(f"[LLM Warning] Gemini call failed: {e}. Falling back to Grounded Engine.")

        if self.openai_key and self.provider == "openai":
            try:
                external_res = self._call_openai(customer_name, subject, latest_message, sources, tone, has_sufficient_context)
                if external_res:
                    return {
                        "text": external_res,
                        "provider": "OpenAI",
                        "sufficient_context": has_sufficient_context,
                        "confidence": sources[0].score if sources else 0.4
                    }
            except Exception as e:
                print(f"[LLM Warning] OpenAI call failed: {e}. Falling back to Grounded Engine.")

        # Default Grounded Local Synthesis Engine
        local_text = self._synthesize_grounded_local(
            customer_name, subject, latest_message, sources, tone, has_sufficient_context
        )
        conf = sources[0].score if sources else 0.2
        return {
            "text": local_text,
            "provider": "ResolveAI Grounded Engine (Local)",
            "sufficient_context": has_sufficient_context,
            "confidence": conf
        }

    def _synthesize_grounded_local(
        self,
        customer_name: str,
        subject: str,
        latest_message: str,
        sources: List[SourceCitation],
        tone: str,
        has_sufficient_context: bool
    ) -> str:
        name_greet = customer_name if customer_name and customer_name != "Customer" else "there"

        # Case 1: Insufficient or missing knowledge context
        if not has_sufficient_context:
            if tone == "Friendly":
                return (
                    f"Hi {name_greet}! 😊\n\n"
                    f"Thank you for reaching out regarding \"{subject}\". "
                    f"I wanted to let you know that our automated knowledge base doesn't currently contain "
                    f"verified documentation or specific policies covering this exact scenario.\n\n"
                    f"Because we want to ensure you receive 100% accurate assistance rather than guesswork, "
                    f"I have routed this ticket directly to a human support agent who is reviewing it now. "
                    f"We'll get back to you with a personalized update as soon as possible!"
                )
            elif tone == "Concise":
                return (
                    f"Hello {name_greet},\n\n"
                    f"Information regarding \"{subject}\" is not documented in our knowledge base. "
                    f"This ticket has been escalated for human verification. A specialist will follow up with you shortly."
                )
            elif tone == "Detailed":
                return (
                    f"Dear {name_greet},\n\n"
                    f"Thank you for contacting customer support concerning \"{subject}\".\n\n"
                    f"Our automated retrieval system conducted a search across our official knowledge base documents; "
                    f"however, no matching policy or protocol was identified with sufficient confidence.\n\n"
                    f"Protocol Requirement:\n"
                    f"• Under company guidelines, automated responses must not assume or speculate on undocumented procedures.\n"
                    f"• This ticket has been assigned to a human support specialist for manual review.\n"
                    f"• A representative will contact you with verified instructions once your account details have been audited."
                )
            else:  # Professional
                return (
                    f"Hello {name_greet},\n\n"
                    f"Thank you for reaching out to us regarding \"{subject}\".\n\n"
                    f"Our knowledge base does not currently contain verified documentation addressing this specific inquiry. "
                    f"To ensure you receive completely accurate details without speculation, this ticket has been flagged "
                    f"for human agent review.\n\n"
                    f"A member of our support team will inspect your request and reply directly."
                )

        # Case 2: Sufficient context found in Knowledge Base
        # Extract best snippet lines
        primary_source = sources[0]
        doc_title = primary_source.doc_title
        snippet_lines = [s.strip() for s in primary_source.snippet.split('\n') if s.strip()]
        core_snippet = " ".join(snippet_lines[:3])

        if tone == "Friendly":
            return (
                f"Hi {name_greet}! 👋\n\n"
                f"Thanks for reaching out! Regarding your inquiry on \"{subject}\", here is what our official {doc_title} policy states:\n\n"
                f"\"{core_snippet}\"\n\n"
                f"If you need any extra help following these steps or if anything isn't crystal clear, "
                f"just reply here and we'll gladly assist you further! Have a wonderful day!"
            )
        elif tone == "Concise":
            return (
                f"Hello {name_greet},\n\n"
                f"Regarding \"{subject}\" (Reference: {doc_title}):\n"
                f"{core_snippet}\n\n"
                f"Please let us know if you require any additional assistance."
            )
        elif tone == "Detailed":
            additional_notes = f"\n\nAdditional Guidance:\n{sources[1].snippet[:250]}..." if len(sources) > 1 else ""
            return (
                f"Dear {name_greet},\n\n"
                f"Thank you for contacting support regarding \"{subject}\".\n\n"
                f"Summary of Applicable Guidelines:\n"
                f"Based on our official documentation in [{doc_title}]:\n\n"
                f"{core_snippet}{additional_notes}\n\n"
                f"Next Steps:\n"
                f"1. Please verify that your account information aligns with the requirements outlined above.\n"
                f"2. If this addresses your concern, no further action is needed.\n"
                f"3. If your case requires an exception or further manual adjustment, simply reply to this ticket and an agent will process it immediately."
            )
        else:  # Professional
            return (
                f"Hello {name_greet},\n\n"
                f"Thank you for contacting support regarding \"{subject}\".\n\n"
                f"According to our official guidelines in [{doc_title}]:\n\n"
                f"{core_snippet}\n\n"
                f"Please let us know if you have any questions or if you need further clarification. "
                f"We are here to help."
            )

    def _call_gemini(self, customer_name, subject, message, sources, tone, has_context):
        headers = {"Content-Type": "application/json"}
        prompt = (
            f"You are ResolveAI customer support assistant. Customer: {customer_name}. Subject: {subject}.\n"
            f"Customer Message: {message}\n"
            f"Tone: {tone}\n"
            f"Knowledge Context:\n" + ("\n".join([f"- [{s.doc_title}]: {s.snippet}" for s in sources]) if has_context else "NO VERIFIED KNOWLEDGE BASE CONTEXT.") +
            f"\n\nInstructions: Ground your response strictly on the knowledge context. If no context, state clearly that human review is required. Do not invent facts."
        )
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_key}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        res = requests.post(url, headers=headers, json=payload, timeout=8)
        if res.status_code == 200:
            data = res.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        return None

    def _call_openai(self, customer_name, subject, message, sources, tone, has_context):
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.openai_key}"
        }
        context_str = "\n".join([f"- [{s.doc_title}]: {s.snippet}" for s in sources]) if has_context else "No documentation found."
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": f"You are ResolveAI support assistant. Ground response in context. Tone: {tone}. If no context, disclaim and request human agent verification."},
                {"role": "user", "content": f"Customer: {customer_name}\nSubject: {subject}\nMessage: {message}\nContext:\n{context_str}"}
            ],
            "temperature": 0.3
        }
        res = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=8)
        if res.status_code == 200:
            data = res.json()
            return data["choices"][0]["message"]["content"]
        return None

llm_provider = LLMProvider()
