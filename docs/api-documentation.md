# ResolveAI – REST API & Real-Time Events Documentation

All REST API endpoints are served with prefix `/api` from the Express backend on `http://localhost:5000`. Authenticated endpoints require an `Authorization: Bearer <token>` header.

---

## 1. Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user and organization; returns JWT and user profile. |
| `POST` | `/api/auth/login` | Public | Authenticate user with email and password; returns JWT token. |
| `GET` | `/api/auth/me` | Protected | Fetch currently authenticated user object and organization. |
| `GET` | `/api/auth/demo-accounts` | Public | Returns pre-seeded demo user credentials for instant evaluation. |

---

## 2. Tickets Endpoints (`/api/tickets`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/tickets` | Protected | Create ticket, run AI classification, save initial message, check escalations. |
| `GET` | `/api/tickets` | Protected | Get paginated tickets with filters (`status`, `priority`, `category`, `search`). |
| `GET` | `/api/tickets/:id` | Protected | Get full ticket details, messages, AI analysis, draft response, and escalations. |
| `PATCH` | `/api/tickets/:id` | Staff | Update ticket attributes (`status`, `priority`, `category`, `assignedAgent`). |
| `POST` | `/api/tickets/:id/escalate` | Staff | Escalate ticket to Critical priority, change status to Escalated, alert supervisors. |
| `PATCH` | `/api/tickets/:id/override-analysis` | Staff | Human agent override of predicted category, priority, or sentiment. |

---

## 3. Messages & Conversations (`/api/messages`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/messages` | Protected | Send public reply or staff internal note. Updates conversation summary. |
| `GET` | `/api/messages/summary/:ticketId` | Protected | Retrieve AI multi-turn conversation summary and next action recommendations. |

---

## 4. Knowledge Base & RAG (`/api/knowledge`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/knowledge/upload` | Admin / Supervisor | Upload and chunk PDF, TXT, or DOCX document into ChromaDB. |
| `POST` | `/api/knowledge/direct` | Admin / Supervisor | Create direct text policy document and index into ChromaDB. |
| `GET` | `/api/knowledge` | Protected | List all documents and chunk counts for the organization. |
| `DELETE` | `/api/knowledge/:id` | Admin / Supervisor | Delete document from MongoDB and purge vector embeddings from ChromaDB. |
| `POST` | `/api/knowledge/test-query` | Protected | Test semantic retrieval against ChromaDB and inspect similarity scores. |

---

## 5. AI Service Endpoints (`/api/ai`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/draft-response` | Staff | Synthesize context-aware draft response with chosen tone (Professional, Friendly, Concise, Detailed). |
| `POST` | `/api/ai/approve-response` | Staff | Human-in-the-loop review: approve and send edited response to customer. |
| `GET` | `/api/ai/knowledge-gaps` | Admin / Supervisor | Cluster unanswered / low-similarity inquiries into missing documentation topics. |
| `POST` | `/api/ai/classify` | Protected | Direct ticket classification tester on raw text. |

---

## 6. Analytics & Team (`/api/analytics`, `/api/team`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/analytics/dashboard` | Staff | Operational KPIs, priority breakdown, sentiment analysis, agent workloads. |
| `GET` | `/api/analytics/export-csv` | Staff | Stream tickets and SLA resolution metrics as a CSV spreadsheet. |
| `GET` | `/api/team/users` | Admin / Supervisor | List all organization users with role filter. |
| `GET` | `/api/team/agents` | Protected | List active support agents for ticket assignment. |
| `PATCH` | `/api/team/users/:userId/role` | Admin | Update user role (promote agent/supervisor). |

---

## 7. Socket.IO Real-Time Events

- `org:join`: Subscribes client socket to organization room updates.
- `ticket:join` / `ticket:leave`: Subscribes socket to live updates for a specific ticket.
- `ticket:new`: Emitted when a new ticket is submitted and classified.
- `ticket:updated`: Emitted on status, priority, or assignment changes.
- `ticket:escalated`: Emitted when a ticket breaches SLA or is escalated.
- `message:new`: Broadcasts new customer replies and agent responses live.
