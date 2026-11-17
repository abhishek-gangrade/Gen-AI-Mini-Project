import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_SECRET = process.env.AI_SERVICE_SECRET || 'resolveai_internal_secret_key_2026';

const client = axios.create({
  baseURL: AI_URL,
  timeout: 15000,
  headers: {
    'X-Service-Token': AI_SECRET
  }
});

export const aiServiceClient = {
  // 1. Classification & Sentiment
  classifyTicket: async (subject, description, historyCount = 0) => {
    try {
      const response = await client.post('/api/classify', {
        subject,
        description,
        customer_history_count: historyCount
      });
      return response.data;
    } catch (error) {
      console.warn('[AI Client Warning] Classification service fallback:', error.message);
      // Fallback classification if AI service is starting
      return {
        intent: 'General Customer Support Request',
        category: 'General Inquiry',
        priority: 'Medium',
        sentiment: 'Neutral',
        main_issue: subject,
        keywords: ['support', 'customer', 'inquiry'],
        urgency_score: 0.5,
        confidence: 0.70
      };
    }
  },

  // 2. Ingest Document File
  ingestFile: async (orgId, docId, title, filePath, filename) => {
    try {
      const formData = new FormData();
      formData.append('org_id', orgId);
      formData.append('doc_id', docId);
      formData.append('title', title);
      formData.append('file', fs.createReadStream(filePath), filename);

      const response = await client.post('/api/rag/ingest-file', formData, {
        headers: {
          ...formData.getHeaders(),
          'X-Service-Token': AI_SECRET
        }
      });
      return response.data;
    } catch (error) {
      console.error('[AI Client Error] Document file ingestion failed:', error.message);
      throw error;
    }
  },

  // 3. Ingest Text Content Directly
  ingestText: async (orgId, docId, title, content) => {
    try {
      const formData = new FormData();
      formData.append('org_id', orgId);
      formData.append('doc_id', docId);
      formData.append('title', title);
      formData.append('content', content);

      const response = await client.post('/api/rag/ingest-text', formData, {
        headers: {
          ...formData.getHeaders(),
          'X-Service-Token': AI_SECRET
        }
      });
      return response.data;
    } catch (error) {
      console.error('[AI Client Error] Text ingestion failed:', error.message);
      throw error;
    }
  },

  // 4. Query RAG
  queryRAG: async (orgId, query, topK = 4, minSimilarity = 0.20) => {
    try {
      const response = await client.post('/api/rag/query', {
        org_id: orgId,
        query,
        top_k: topK,
        min_similarity: minSimilarity
      });
      return response.data;
    } catch (error) {
      console.warn('[AI Client Warning] RAG Query failed:', error.message);
      return {
        query,
        results_found: 0,
        sources: [],
        has_sufficient_context: false
      };
    }
  },

  // 5. Delete Document Chunks
  deleteDocumentChunks: async (orgId, docId) => {
    try {
      const response = await client.delete(`/api/rag/document/${orgId}/${docId}`);
      return response.data;
    } catch (error) {
      console.warn('[AI Client Warning] Delete chunks failed:', error.message);
      return { doc_id: docId, deleted: false };
    }
  },

  // 6. Generate Contextual Response
  generateResponse: async (payload) => {
    try {
      const response = await client.post('/api/response/generate', payload);
      return response.data;
    } catch (error) {
      console.warn('[AI Client Warning] Generate response failed:', error.message);
      return {
        suggested_response: `Hello ${payload.customer_name || 'Customer'},\n\nThank you for reaching out regarding "${payload.subject}". We have received your message and an agent is currently reviewing your inquiry. We will provide an update shortly.`,
        tone: payload.tone || 'Professional',
        confidence_score: 0.5,
        sources_used: [],
        sufficient_context: false,
        model_provider: 'ResolveAI Fallback',
        generation_note: 'AI microservice fallback applied.'
      };
    }
  },

  // 7. Conversation Summary
  summarizeConversation: async (ticketId, messages) => {
    try {
      const response = await client.post('/api/conversation/summary', {
        ticket_id: ticketId,
        messages
      });
      return response.data;
    } catch (error) {
      console.warn('[AI Client Warning] Summarization failed:', error.message);
      return {
        summary: 'Conversation with customer regarding support inquiry.',
        original_problem: messages[0]?.content?.slice(0, 100) || 'Problem inquiry',
        troubleshooting_attempted: [],
        unresolved_questions: [],
        promises_made: [],
        suggested_next_action: 'Review conversation history.'
      };
    }
  },

  // 8. Knowledge Gap Detection
  detectKnowledgeGaps: async (orgId, queries) => {
    try {
      const response = await client.post('/api/knowledge-gap/detect', {
        org_id: orgId,
        queries
      });
      return response.data;
    } catch (error) {
      console.warn('[AI Client Warning] Knowledge gap detection failed:', error.message);
      return { total_gaps_identified: 0, gaps: [] };
    }
  }
};
