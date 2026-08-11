# PulseOps

### Application Performance & Reliability Analytics Platform

PulseOps is a full-stack application performance analytics platform that helps engineering teams monitor API health, identify performance bottlenecks, detect incidents, and investigate application reliability issues.

It transforms raw application logs into actionable insights across **services, endpoints, releases, regions, and incidents**, with an AI-powered investigation layer using **Ollama + Llama 3.2**.

---

## ✨ Features

### 📊 Performance Dashboard
- Total requests and active services
- Error rate and availability
- Average, P95 and P99 latency
- Slow request monitoring
- Historical latency trends
- Service health overview

### 🧩 Service & Endpoint Monitoring
- Service-level performance analysis
- Endpoint-level request and latency metrics
- Error-rate comparison
- Slowest endpoint identification
- Detailed service and endpoint views

### 🚀 Release Analytics
- Release-level performance comparison
- Average, P95 and P99 latency by release
- Error-rate comparison
- Release regression detection

### 🌍 Regional Analytics
Analyze application performance across regions using:

- Request volume
- Average latency
- P95 latency
- Error rate
- Availability

### 🚨 Incident Detection
Automatically detects potential reliability issues based on configurable thresholds such as:

- High error rate
- High API latency
- Sudden latency increases

Incidents include severity, status, affected service, trigger and timestamp.

### 📜 Log Explorer
Search and analyze individual API requests using filters for:

- Service
- Endpoint
- Status code
- Release
- Region

### 🤖 AI Analyst

PulseOps includes an AI-powered investigation assistant using **Ollama + Llama 3.2**.

The AI Analyst can answer questions such as:

> Why is the application slow?

> Which endpoint is the slowest?

> Which service has the highest error rate?

> Which region is performing worst?

> What should I investigate first?

The AI receives **computed performance metrics rather than raw logs**, helping keep responses grounded in the application's actual telemetry.

---

## 🏗️ Architecture

```text
                ┌─────────────────────┐
                │   React Frontend    │
                │  TypeScript + MUI   │
                └──────────┬──────────┘
                           │
                        REST API
                           │
                           ▼
                ┌─────────────────────┐
                │    FastAPI Backend  │
                └──────────┬──────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌───────────┐ ┌──────────┐
        │  SQLite  │ │  Pandas   │ │ Ollama   │
        │ Database │ │ Analytics │ │Llama 3.2 │
        └──────────┘ └───────────┘ └──────────┘
                           │
                           ▼
                  Performance Metrics
                           │
                           ▼
                    AI Investigation
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Material UI |
| Charts | Recharts |
| Backend | Python, FastAPI, Pydantic |
| Analytics | Pandas, NumPy, SciPy |
| Database | SQLite, SQLAlchemy |
| Authentication | JWT, bcrypt |
| AI | Ollama, Llama 3.2 |
| API Communication | REST, Axios |
| Development | Git, ESLint, Uvicorn |

---

## 📈 Analytics

PulseOps processes application logs and calculates performance metrics including:

- Average latency
- P95 latency
- P99 latency
- Error rate
- 4xx / 5xx error rates
- Availability
- Slow requests
- Latency trends
- Service performance
- Endpoint performance
- Release performance
- Regional performance

It also supports latency outlier analysis using statistical techniques such as **IQR, P99 and Z-score**.

---

## 🚨 Incident Detection

PulseOps uses deterministic rules to identify potential incidents.

Examples:

```text
High Error Rate
    → Error rate exceeds configured threshold

High API Latency
    → P95 latency exceeds configured threshold

Latency Regression
    → Current latency significantly exceeds baseline
```

This separates deterministic monitoring logic from the AI layer, making incident detection predictable and explainable.

---

## 🤖 AI Investigation

The AI layer is intentionally built on top of the analytics engine.

```text
Raw Logs
   ↓
Data Cleaning
   ↓
Analytics
   ↓
Performance Metrics
   ↓
Ollama / Llama 3.2
   ↓
Investigation Insights
```

Instead of sending the complete raw dataset to the LLM, PulseOps provides structured metrics and context.

This allows the AI Analyst to help engineers:

- Identify potential problem areas
- Prioritize investigations
- Compare service performance
- Interpret latency and error metrics
- Investigate incidents

---

## 📁 Project Structure

```text
application-performance-analytics/
│
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── api/
│       │   └── routes/
│       │       ├── ai.py
│       │       ├── analytics.py
│       │       ├── auth.py
│       │       ├── datasets.py
│       │       ├── endpoints.py
│       │       ├── incidents.py
│       │       ├── logs.py
│       │       ├── regions.py
│       │       ├── releases.py
│       │       └── services.py
│       │
│       ├── core/
│       ├── db/
│       ├── models/
│       ├── schemas/
│       └── services/
│           ├── ai_client.py
│           ├── analytics.py
│           ├── cleaning.py
│           ├── data_access.py
│           ├── incidents.py
│           ├── ingestion.py
│           └── outliers.py
│
├── data/
│   └── scripts/
│       └── application_log.py
│
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── contexts/
│       ├── layouts/
│       ├── pages/
│       ├── types/
│       └── utils/
│
└── legacy/
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have:

- Python 3.10+
- Node.js 18+
- npm
- Ollama *(required only for AI features)*

---

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd application-performance-analytics
```

---

### 2. Setup Backend

```bash
cd backend

python -m venv venv
```

Activate the environment.

**Windows:**

```bash
venv\Scripts\activate
```

**macOS/Linux:**

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

Backend:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

---

### 3. Setup Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

### 4. Setup Ollama

Install Ollama and pull the Llama 3.2 model:

```bash
ollama pull llama3.2
```

Start Ollama if required:

```bash
ollama serve
```

The default Ollama configuration is:

```text
http://localhost:11434
```

---

## 🔐 Authentication

PulseOps uses JWT-based authentication with bcrypt password hashing.

The application supports:

- User registration
- Login
- Protected routes
- JWT authorization
- Authenticated API requests

---

## 🔮 Future Improvements

Potential future enhancements include:

- Real-time log ingestion
- WebSocket-based monitoring
- PostgreSQL support
- Redis caching
- Background data processing
- Configurable alert rules
- Slack / email notifications
- Service dependency visualization
- Distributed tracing
- Infrastructure monitoring
- Docker deployment
- Kubernetes deployment
- Advanced anomaly detection

---

⭐ If you found PulseOps interesting, consider giving the repository a star!
