# ResolveAI – System Architecture & Technical Specifications

ResolveAI is an enterprise-grade Intelligent Customer Support Platform engineered with a decoupled microservice architecture: a React Single Page Application (SPA), a Node.js Express API Gateway, a Python 3 FastAPI Generative AI service, a MongoDB operational database, and a ChromaDB persistent vector store.

---

## 1. High-Level Architectural Diagram

```mermaid
graph TD
    subgraph ClientLayer["Frontend Presentation (Port 5173)"]
        UI["React 18 + Vite SPA"]
        Tailwind["Tailwind CSS + Lucide Icons"]
        Recharts["Recharts Analytics Engine"]
        SocketClient["Socket.IO Real-time Client"]
    end

    subgraph BackendLayer["API & Business Logic (Port 5000)"]
        Express["Express.js Server"]
        AuthMiddleware["JWT & RBAC Middleware"]
        TenancyMiddleware["Organization Isolation"]
        TicketEngine["Ticket Lifecycle & SLA Engine"]
        SocketServer["Socket.IO Gateway"]
        Multer["Document Upload Stream"]
    end

    subgraph AILayer["AI & RAG Microservice (Port 8000)"]
        FastAPI["FastAPI Engine"]
        Classifier["Intent & Sentiment Classifier"]
        ChromaStore["ChromaDB Vector Store"]
        EmbeddingEngine["Hybrid Content Embedding Engine (dim=384)"]
        RAGRetriever["Semantic RAG Retriever (HNSW Cosine)"]
        LLMProvider["LLM Provider Abstraction (Local / Gemini / OpenAI)"]
        Summarizer["Multi-Turn Conversation Summarizer"]
        GapDetector["Knowledge Gap Cluster Engine"]
    end

    subgraph DataLayer["Persistence Layer"]
        MongoDB[("MongoDB 8.0 Operational Database")]
        VectorData[("ChromaDB Persistent Store (ai-service/data/chroma)")]
    end

    UI -->|REST APIs via Axios| Express
    SocketClient <-->|WebSocket Events| SocketServer
    Express --> AuthMiddleware
    AuthMiddleware --> TenancyMiddleware
    TenancyMiddleware --> TicketEngine
    TicketEngine -->|Mongoose Queries| MongoDB
    Multer -->|PDF / DOCX / TXT| Express
    Express -->|Service-to-Service REST Token Auth| FastAPI

    FastAPI --> Classifier
    FastAPI --> EmbeddingEngine
    EmbeddingEngine --> ChromaStore
    ChromaStore --> RAGRetriever
    RAGRetriever --> LLMProvider
    ChromaStore --> VectorData
```

---

## 2. Retrieval-Augmented Generation (RAG) Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer / Agent
    participant Backend as Node.js Backend
    participant AIService as FastAPI AI Service
    participant Chroma as ChromaDB Vector Store
    participant LLM as Grounded LLM Provider

    Note over Customer,Chroma: Phase 1: Ingestion & Vector Indexing
    Customer->>Backend: Upload Policy Document (PDF / DOCX / TXT)
    Backend->>AIService: Ingest Document (Multipart Stream)
    AIService->>AIService: Extract text, clean whitespace, and recursive character chunk (450 chars, 70 overlap)
    AIService->>AIService: Compute normalized dense embeddings (dim=384)
    AIService->>Chroma: Store chunks and metadata in org-specific collection
    AIService-->>Backend: Acknowledge indexing complete ({chunkCount})

    Note over Customer,LLM: Phase 2: Querying & Grounded Synthesis
    Customer->>Backend: Submit Customer Support Ticket
    Backend->>AIService: Classify & Retrieve Grounded Context
    AIService->>AIService: Analyze Intent, Category, Priority, Urgency & Sentiment
    AIService->>Chroma: HNSW Cosine Semantic Query (top-k=4)
    Chroma-->>AIService: Return relevant chunks with similarity scores
    alt Knowledge Base Context Found (score >= threshold)
        AIService->>LLM: Synthesize contextual response in selected tone (Professional, Friendly, Concise, Detailed)
        LLM-->>AIService: Context-grounded response with citations
    else Missing Context / Low Similarity (< threshold)
        AIService->>AIService: Generate non-hallucinated disclaimer & flag for human review
    end
    AIService-->>Backend: Draft response + source citations + sufficient_context flag
    Backend-->>Customer: Display editable draft to Agent (Human-in-the-Loop)
```

---

## 3. Data Isolation and Multi-Tenancy

Each organization in ResolveAI operates with complete logical data isolation:
1. **Database Level**: Every document in MongoDB (`Ticket`, `Message`, `KnowledgeDocument`, `AIAnalysis`, `GeneratedResponse`, `Escalation`, `AuditLog`) is indexed by `organization: ObjectId`. Middleware strictly injects `req.orgId` derived from verified JWT tokens, preventing cross-tenant leakage.
2. **Vector Database Level**: ChromaDB collections are partitioned per organization (`org_<slug>`). Vector searches are restricted to the calling tenant's isolated collection.
3. **Role-Based Access Control (RBAC)**:
   - **Admin**: Full platform management, user promotion, document upload/deletion, escalation configuration.
   - **Supervisor**: Ticket queues, reassignments, escalation resolution, agent performance auditing.
   - **Support Agent**: Ticket triage, AI suggested draft response editing, approval, and sending.
   - **Customer**: Ticket submission, conversation tracking, and thread replies.
