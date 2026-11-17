# ResolveAI – Production Deployment Guide

This guide walks you through deploying **ResolveAI** across two popular production setups:
1. **Option A: Containerized Docker Deployment** (Single VPS / AWS EC2 / DigitalOcean / Linode) – *Recommended & Complete*
2. **Option B: Managed Cloud PaaS** (MongoDB Atlas + Render / Railway + Vercel) – *Zero Server Management*

---

## 1. Option A: Docker Compose Deployment (Recommended)

Using Docker Compose packages all 4 tiers (Frontend Nginx, Backend Express, FastAPI AI Service, and MongoDB) into isolated, coordinated containers with persistent volumes.

### Prerequisites
- A virtual machine or server with **Docker** and **Docker Compose** installed.
- Open ports: `80` (HTTP) or `443` (HTTPS).

### Step-by-Step Instructions

1. **Clone the repository on your server:**
   ```bash
   git clone https://github.com/abhishek-gangrade/Gen-AI-Mini-Project.git
   cd Gen-AI-Mini-Project
   ```

2. **Verify or adjust environment configurations:**
   Review `docker-compose.yml`. You can override variables directly or create environment files:
   - `JWT_SECRET`: Generate a secure random string (e.g. `openssl rand -hex 32`).
   - `AI_SERVICE_SECRET`: Secret token for service-to-service communication.
   - `GEMINI_API_KEY` / `OPENAI_API_KEY`: *(Optional)* If using cloud LLM providers instead of the built-in local engine.

3. **Build and launch the containers:**
   ```bash
   docker compose up -d --build
   ```

4. **Verify container status:**
   ```bash
   docker compose ps
   ```
   All 4 containers (`resolveai-frontend`, `resolveai-backend`, `resolveai-ai-service`, `resolveai-mongodb`) should show `Up`.

5. **Seed initial demo data & ChromaDB vector policies (first-time only):**
   ```bash
   # Seed MongoDB collections
   docker compose exec backend node ../scripts/seed-demo-data.js

   # Index policy documents into ChromaDB
   docker compose exec ai-service python app/seed_chroma.py
   ```

6. **Access the Application:**
   Open your browser at `http://<your-server-ip>` or domain. The Nginx reverse proxy serves the React frontend and automatically routes `/api/` and `/socket.io/` to the backend.

---

## 2. Option B: Managed Cloud PaaS Deployment

If you prefer managed serverless hosting without maintaining Docker or VPS servers:

### Tier 1: Database – MongoDB Atlas (Free M0 Cluster)
1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free shared cluster (M0).
3. Under **Database Access**, create a user (e.g., `resolveai_user`) with read/write privileges.
4. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) or whitelist your hosting IPs.
5. Copy your connection string:
   ```
   mongodb+srv://resolveai_user:<password>@cluster0.mongodb.net/resolveai?retryWrites=true&w=majority
   ```

---

### Tier 2: AI Microservice – Render / Railway
Deploy `ai-service/` as a Python Web Service.

- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `PORT`: `8000` (or assigned by provider)
  - `AI_SERVICE_SECRET`: `your_secure_random_token`
  - `LLM_PROVIDER`: `local` (or `gemini` / `openai`)
  - `GEMINI_API_KEY`: *(Optional)*
  - `OPENAI_API_KEY`: *(Optional)*
  - `CHROMA_PERSIST_DIR`: `./data/chroma` (Mount a persistent disk if using persistent RAG).

*Copy the deployed URL: e.g. `https://resolveai-ai-service.onrender.com`.*

---

### Tier 3: Backend API – Render / Railway
Deploy `backend/` as a Node.js Web Service.

- **Build Command**: `npm ci --production`
- **Start Command**: `node src/server.js`
- **Environment Variables**:
  - `PORT`: `5001` (or assigned by provider)
  - `NODE_ENV`: `production`
  - `MONGODB_URI`: *Your MongoDB Atlas connection string from Tier 1*
  - `JWT_SECRET`: *Your secure random 32-character string*
  - `AI_SERVICE_URL`: *Your AI Service URL from Tier 2*
  - `AI_SERVICE_SECRET`: *Matching secret token*
  - `FRONTEND_URL`: *Your Frontend production URL from Tier 4*

*Copy the deployed URL: e.g. `https://resolveai-backend.onrender.com`.*

---

### Tier 4: Frontend UI – Vercel / Netlify
Deploy `frontend/` as a Vite Single-Page Application.

- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Rewrites for SPA Routing**:
  Create `frontend/vercel.json` or `frontend/_redirects`:
  ```
  /*    /index.html   200
  ```
- **Environment Variables**:
  - `VITE_API_URL`: `https://resolveai-backend.onrender.com/api`
  - `VITE_SOCKET_URL`: `https://resolveai-backend.onrender.com`

---

## 3. Production Environment Checklist

| Variable | Service | Description | Example / Recommendation |
| :--- | :--- | :--- | :--- |
| `MONGODB_URI` | Backend | MongoDB database connection URI | `mongodb+srv://user:pass@cluster.mongodb.net/resolveai` |
| `JWT_SECRET` | Backend | Cryptographic secret for signing JWTs | Random 32+ hex characters |
| `FRONTEND_URL` | Backend | Allowed CORS origin for web app | `https://resolveai.vercel.app` |
| `AI_SERVICE_URL` | Backend | Internal URL of the FastAPI service | `http://ai-service:8000` or cloud URL |
| `AI_SERVICE_SECRET` | Both | Mutual authentication token | Shared secret string |
| `LLM_PROVIDER` | AI Service | Active generative model provider | `local`, `gemini`, `openai`, `ollama` |
| `GEMINI_API_KEY` | AI Service | Google Gemini API key (optional) | `AIzaSy...` |
| `OPENAI_API_KEY` | AI Service | OpenAI API key (optional) | `sk-proj-...` |
| `CHROMA_PERSIST_DIR` | AI Service | Directory for persistent vector store | `./data/chroma` |

---

## 4. Post-Deployment Verification

After deployment, test the three health endpoints:

1. **AI Service Health**:
   ```bash
   curl https://<your-ai-service-url>/health
   # Returns: {"status":"ok","service":"ResolveAI AI Microservice","vector_store":"ChromaDB Persistent (Active)"}
   ```

2. **Backend API Health**:
   ```bash
   curl https://<your-backend-url>/health
   # Returns: {"status":"ok","service":"ResolveAI Backend API"}
   ```

3. **Frontend Application**:
   Navigate to your frontend URL in the browser. You should see the login screen with the pre-seeded demo accounts ready for evaluation!
