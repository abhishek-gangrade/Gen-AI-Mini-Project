# ResolveAI – Intelligent Customer Support Platform

**ResolveAI** is an enterprise-grade, full-stack Generative AI customer support platform. It integrates **Retrieval-Augmented Generation (RAG)**, **ChromaDB vector persistence**, **multi-turn conversation summarization**, **AI ticket triage**, **automated sentiment analysis**, and a **human-in-the-loop review engine** to deliver context-grounded, policy-compliant support responses without hallucination.

---

## 1. Real-World Problem Statement

Modern customer support teams struggle with:
- **High Inbound Volume**: Repetitive inquiries about refunds, account lockouts, delivery tracking, and billing consume hundreds of human agent hours weekly.
- **Inconsistent Knowledge Application**: Support agents frequently misquote policies or rely on outdated guidelines across multiple internal documents.
- **Hallucination Risk in Generic AI**: Standard chatbots invent delivery dates, unauthorized refund commitments, or nonexistent technical solutions when given open-ended prompts.
- **SLA Breaches & Slow Escalation**: Critical business-impacting issues (outages, payment double charges) get lost in flat ticket queues without deterministic prioritization.
- **Knowledge Gaps**: Support leadership lacks visibility into which policies are missing from company documentation based on real customer inquiries.

---

## 2. Proposed Solution

ResolveAI solves these challenges through an end-to-end multi-tier architecture:
1. **Automated Triage & Classification**: Analyzes incoming customer messages to predict **Intent**, **Category**, **Priority** (Low, Medium, High, Critical), **Customer Sentiment** (Positive, Neutral, Negative, Frustrated), and urgency scores.
2. **Deterministic & AI Escalation Engine**: Critical urgency or frustrated customers with repeated inquiries are immediately flagged for supervisory intervention.
3. **Strictly Grounded RAG with ChromaDB**: Customer tickets trigger semantic retrieval against verified company policy documents in ChromaDB. Responses cite exact source paragraphs.
4. **Zero-Hallucination Disclaimer**: If knowledge base coverage is below the similarity threshold, ResolveAI explicitly informs the customer that human verification is required, preventing unauthorized policy commitments.
5. **Human-in-the-Loop Review**: Support agents can switch response tone styles (Professional, Friendly, Concise, Detailed), edit suggested drafts, and approve before dispatch.
6. **Automated Knowledge Gap Detection**: Clusters low-confidence customer queries to highlight missing policy documentation for support leadership.

---

## 3. Technology Stack

### Frontend (`frontend/`)
- **React.js 18** & **Vite**: Ultra-fast single-page application framework.
- **Tailwind CSS**: Modern, responsive SaaS design system with an indigo/slate palette.
- **Lucide React**: Clean vector iconography.
- **Recharts**: Data visualization for operational KPIs, sentiment distributions, and category analytics.
- **React Router Dom v6**: Client-side routing with role-based route guards.
- **Socket.IO Client**: Real-time ticket updates, escalations, and conversation replies.

### Backend (`backend/`)
- **Node.js** & **Express.js**: REST API gateway, business logic, and ticket lifecycle orchestration.
- **MongoDB** & **Mongoose**: Operational database with multi-tenant logical data isolation.
- **JWT & bcryptjs**: Secure password hashing and stateless token-based authentication.
- **Multer**: Streaming file upload handler for PDF, DOCX, and TXT knowledge documents.
- **Socket.IO Server**: Low-latency event gateway for live support queues.

### AI Microservice (`ai-service/`)
- **Python 3** & **FastAPI**: High-performance asynchronous AI microservice.
- **ChromaDB**: Persistent vector database with HNSW Cosine distance metrics.
- **Hybrid Content Embeddings**: Deterministic dense semantic vector generator (dim=384) with subword hashing and stopword normalization.
- **PyPDF** & **python-docx**: Document text extraction and recursive character chunking with overlap.
- **LLM Provider Abstraction**: Built-in zero-latency Grounded Synthesis Engine, with plug-and-play support for Google Gemini, OpenAI, and Ollama.

---

## 4. System Architecture

```
ResolveAI/
├── frontend/               # React 18 + Vite + Tailwind CSS SPA
├── backend/                # Node.js + Express + Mongoose + Socket.IO API
├── ai-service/             # FastAPI + ChromaDB + Grounded RAG Engine
├── docs/                   # Technical architecture, API docs & test reports
├── scripts/                # Database seed scripts
├── .env.example            # Environment configuration template
└── README.md
```

For full details, review [docs/architecture.md](file:///Users/apple/Desktop/Gen%20AI%20Mini%20Project/docs/architecture.md).

---

## 5. User Roles & Access Control (RBAC)

ResolveAI enforces strict Role-Based Access Control and organization-level multi-tenancy:
- **Admin**: Full access. Manage organization settings, team members, document upload/deletion, and organization-wide analytics.
- **Supervisor**: Ticket queues, reassignments, review of AI classifications, and escalation management.
- **Support Agent**: View assigned tickets, review AI classification, select response tones, edit drafts, and approve responses.
- **Customer**: Submit tickets, track resolution status, and reply to conversation threads.

---

## 6. Pre-Seeded Demo Accounts (1-Click Switcher)

ResolveAI includes pre-seeded demo accounts with rich support data. On the login page or top navigation bar, use the **Quick Role Switcher**:

| Persona | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Sarah Chen** | Administrator | `admin@technova.com` | `adminpassword123` |
| **Marcus Vance** | Supervisor | `supervisor@technova.com` | `supervisorpassword123` |
| **Alex Rivera** | Support Agent | `agent@technova.com` | `agentpassword123` |
| **David Miller** | Customer | `customer@gmail.com` | `customerpassword123` |

---

## 7. Installation & Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on v25.6.0)
- **Python**: 3.10+ (tested on 3.14.3)
- **MongoDB**: Local MongoDB instance running on standard port `mongodb://127.0.0.1:27017`

### Step 1: Clone & Configure Environments
```bash
# Backend environment
cp backend/.env.example backend/.env

# AI Service environment
cp ai-service/.env.example ai-service/.env

# Frontend environment
cp frontend/.env.example frontend/.env
```

### Step 2: Install Dependencies
```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Setup python environment and dependencies
cd ../ai-service
pip install -r requirements.txt
```

### Step 3: Seed Database and ChromaDB Vector Store
```bash
# Seed MongoDB operational data
cd ..
node scripts/seed-demo-data.js

# Seed ChromaDB vector database with official policies
PYTHONPATH=ai-service python3 ai-service/app/seed_chroma.py
```

### Step 4: Run the Application
Open three terminal tabs:

**Terminal 1: Start AI Microservice (Port 8000)**
```bash
cd ai-service
PYTHONPATH=. uvicorn main:app --host 0.0.0.0 --port 8000
```

**Terminal 2: Start Node.js Backend API (Port 5000)**
```bash
cd backend
npm start
```

**Terminal 3: Start React Frontend (Port 5173)**
```bash
cd frontend
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 8. Running the Automated Test Suites

### AI Microservice Unit Tests
```bash
PYTHONPATH=ai-service python3 ai-service/tests/test_ai_service.py
```
*Verifies category classification, priority escalation, frustrated sentiment analysis, ChromaDB semantic search, hallucination prevention, summarization, and gap detection.*

### Backend Integration Tests
```bash
cd backend
npm test
```
*Verifies JWT auth, bcrypt hashing, multi-tenant isolation, ticket lifecycle, staff notes, and audit logs.*

---

## 9. API & Test Documentation

- Detailed REST API specification: [docs/api-documentation.md](file:///Users/apple/Desktop/Gen%20AI%20Mini%20Project/docs/api-documentation.md)
- Complete Verification & Test Report: [docs/testing-report.md](file:///Users/apple/Desktop/Gen%20AI%20Mini%20Project/docs/testing-report.md)
- Architecture Deep-Dive & Mermaid Diagrams: [docs/architecture.md](file:///Users/apple/Desktop/Gen%20AI%20Mini%20Project/docs/architecture.md)

---

## 10. License
Academic and commercial evaluation license. Built with Google Antigravity.
