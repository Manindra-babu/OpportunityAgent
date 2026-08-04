# OpportunityAgent — Autonomous Multi-Agent Platform

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.11%2B-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-v0.100%2B-009688?logo=fastapi)
![React](https://img.shields.io/badge/React-v18-61DAFB?logo=react)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwindcss)
![Groq LLM](https://img.shields.io/badge/Groq_LLM-llama--3.3--70b-orange?logo=groq)
![Playwright](https://img.shields.io/badge/Playwright-Automated_Forms-2EAD33?logo=playwright)
![Theme](https://img.shields.io/badge/UI_Theme-Strict_Light_SaaS-indigo)

**OpportunityAgent** is an end-to-end, multi-user, BYOK (Bring-Your-Own-Key) agentic platform that discovers internships and hackathons, filters them against each user's profile using Groq LLM, alerts users via Gmail, auto-registers qualified applicants using Playwright browser automation, and self-heals from form registration errors by learning site-specific rules over time.

---

## 🌟 Key Features

- **🔐 Multi-User BYOK Architecture:**
  - JWT session cookie authentication (`httpOnly`).
  - Every user manages their own Groq API key and connects their own Gmail account.
  - API keys and OAuth tokens are encrypted at rest using **Fernet** symmetric encryption (`cryptography` library) — decrypted credentials are never exposed in API payloads.
  - Every table (`profile`, `opportunity_scores`, `registrations`, `failure_memory`, `field_mapping_rules`, `activity_logs`) is filtered strictly by `user_id`.

- **📄 Master Profile Builder:**
  - Parses PDF & DOCX resumes (`pdfplumber` / `python-docx`) and extracts structured skills, projects, education, and CGPA using Groq LLM.
  - Syncs public GitHub repositories via GitHub REST API to extract programming languages and framework proficiencies.
  - Merges new skills automatically, flags removed skills, and triggers automatic re-evaluation of recent opportunities from the past 14 days.

- **🤖 Pluggable Scraper Engine (Playwright):**
  - Direct & aggregator scrapers for **Devfolio**, **Unstop**, **Internshala**, **Microsoft Careers**, **Google Careers**, and **Infosys Careers**.
  - In-process `APScheduler` runs background discovery pipelines every 6 hours with SQLite URL deduplication.

- **📊 Groq LLM Match Scoring:**
  - Evaluates each posting against the candidate's profile using `llama-3.3-70b-versatile` and `llama-3.1-8b-instant`.
  - Generates a 0–100 match score, role category, and concise match reasoning.

- **📩 Notification & Gmail OAuth Agent:**
  - Sends formatted alert emails for qualifying opportunities (score >= threshold) with match reasoning and direct apply links.
  - Supports Gmail OAuth2 token integration and reply parsing.

- **🤖 Playwright Form Registration Agent:**
  - On user confirmation, launches headless Chromium, checks `FailureMemory` for site quirks, and auto-fills candidate name, email, GitHub URL, phone, and CGPA.
  - Automatically stops and flags security walls (CAPTCHA / OTP / login walls) as manual intervention.

- **🧠 Self-Healing Failure Memory Loop:**
  - Classifies form filling failures (`missing_field`, `format_mismatch`, `structure_change`).
  - Prompts candidate for corrective input and persists learned mapping rules in `FailureMemory` and `FieldMappingRule` SQLite tables.
  - Automatically reuses learned rules on future runs, driving manual intervention rates down toward 0%.

- **📰 Live AI News Feed:**
  - Aggregates real-time RSS XML feeds from **Hacker News AI**, **ArXiv AI Research**, and **TechCrunch AI**.

- **🎨 Premium Light SaaS Web Dashboard:**
  - Built with React, Vite, and TailwindCSS (Notion/Linear light aesthetic, strictly `#FAFAFA` / `#FFFFFF` palette with `#4F46E5` indigo accent).
  - Real-time search bar across all corporate listings, companies, and skills.
  - Expandable accordion execution logs and self-healing learning curve chart.

---

## 🏗️ System Architecture

```
                                  ┌───────────────────────────────┐
                                  │      Resume & GitHub Data     │
                                  └───────────────┬───────────────┘
                                                  │
                                                  ▼
┌───────────────────────────┐     ┌───────────────────────────────┐
│     Discovery Agent       │     │   Profile Builder (Diff/Merge)│
│ (Devfolio, Unstop,        ├────►│   Master Candidate Profile    │
│ Microsoft, Google, etc.)  │     └───────────────┬───────────────┘
└─────────────┬─────────────┘                     │
              │                                   │
              ▼                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│              Relevance / Filter Agent (Groq LLM)                │
│       Scores 0-100% against Candidate Profile & Threshold       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ (Score >= Threshold)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Notification Agent (Gmail OAuth)                │
│            Sends Alert Email ("Reply YES to Register")           │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ (User Replies YES / Confirms)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│            Registration Agent (Playwright Automation)           │
│         Checks Failure Memory Store -> Fills & Submits          │
└────────────────┬────────────────────────────────┬───────────────┘
        (Success)│                                │(Failure / Missing Field)
                 ▼                                ▼
┌───────────────────────────┐     ┌───────────────────────────────┐
│ Confirmation & Logged DB  │     │   Failure Detection Agent     │
└───────────────────────────┘     └───────────────┬───────────────┘
                                                  │ (Prompts User for Fix)
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │    Fix-Application Agent      │
                                  │ Updates Profile / Field Rules │
                                  │ & Persists to Failure Memory  │
                                  └───────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, TailwindCSS v4, Recharts, Lucide Icons | Responsive Light SaaS Dashboard |
| **Backend** | Python 3.11+, FastAPI, Uvicorn | RESTful Microservice Engine |
| **Database** | SQLite / PostgreSQL (SQLAlchemy ORM) | Multi-User Scoped Data Persistence |
| **LLM Engine** | Groq API (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) | Profile Parsing & Match Scoring |
| **Automation** | Playwright (Python async Chromium) | Headless Web Scraping & Form Filling |
| **Security** | PyJWT, Fernet (`cryptography`), Passlib/Bcrypt | Cookie Sessions & Credential Encryption |
| **Scheduler** | APScheduler | Background Discovery & RSS News Jobs |
| **Document Parsing**| `pdfplumber`, `python-docx` | Resume Text Extraction |
| **News Feed** | `feedparser` | RSS XML News Aggregator |

---

## 📁 Repository Structure

```
OpportunityAgent/
├── Dockerfile                  # Multi-stage production container build
├── render.yaml                 # Render Blueprint 1-click cloud manifest
├── Procfile                    # Heroku / Railway startup command
├── docker-compose.yml          # Container compose deployment
├── start.bat                   # Windows 1-click local launch script
├── README.md                   # Platform documentation
├── backend/
│   ├── requirements.txt        # Python backend dependencies
│   └── app/
│       ├── main.py             # FastAPI entrypoint & static asset server
│       ├── config.py           # Config loader (JWT, Fernet, PORT, DB)
│       ├── database.py         # SQLAlchemy engine & session setup
│       ├── models.py           # SQLAlchemy database schemas
│       ├── schemas.py          # Pydantic request/response schemas
│       ├── llm_client.py       # Groq API BYOK client wrapper
│       ├── security/
│       │   ├── auth.py         # JWT session auth & password hashing
│       │   └── crypto.py       # Fernet credential encryption at rest
│       ├── services/
│       │   ├── profile_builder.py
│       │   ├── discovery_agent.py
│       │   ├── relevance_agent.py
│       │   ├── notification_agent.py
│       │   ├── registration_agent.py
│       │   ├── failure_agent.py
│       │   ├── news_agent.py
│       │   └── scheduler.py
│       └── routers/
│           ├── auth.py
│           ├── credentials.py
│           ├── profile.py
│           ├── opportunities.py
│           ├── news.py
│           ├── settings.py
│           └── activity.py
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── api/client.js
        └── components/
            ├── Header.jsx
            ├── AuthModal.jsx
            ├── FeedPage.jsx
            ├── ProfilePage.jsx
            ├── NewsPage.jsx
            ├── SettingsPage.jsx
            └── ActivityPage.jsx
```

---

## ⚡ Quick Start & Installation

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- Git

### 1. Clone Repository
```bash
git clone https://github.com/Manindra-babu/OpportunityAgent.git
cd OpportunityAgent
```

### 2. Set Up Backend
```bash
cd backend
pip install -r requirements.txt
playwright install chromium
```

### 3. Set Up Frontend
```bash
cd ../frontend
npm install
npm run build
```

### 4. Launch Application (Local Development)

**Windows 1-Click Launch:**
```cmd
start.bat
```

**Or Run Manually:**
- **Backend:** `cd backend && uvicorn app.main:app --reload --port 8000`
- **Frontend:** `cd frontend && npm run dev`

Open your browser at:
- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173) (or `http://localhost:8000` when built)
- **API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🚀 Production Cloud Deployment Guide

### Option 1: Deploy on Render (100% Free - 1 Click)

1. Fork or push this repository to your GitHub account.
2. Log into **[dashboard.render.com](https://dashboard.render.com)**.
3. Click **New +** → select **Blueprints**.
4. Connect repository `OpportunityAgent`. Render will automatically detect `render.yaml` and configure:
   - Single-container Docker build.
   - Pre-installed Playwright Chromium dependencies.
   - Auto-generated `JWT_SECRET` and `CREDENTIAL_ENCRYPTION_KEY`.
5. Click **Apply**. Your app will be live on `https://your-app-name.onrender.com` in ~3 minutes!

### Option 2: Deploy with Docker Container
```bash
docker build -t opportunity-agent .
docker run -p 8000:8000 -e PORT=8000 opportunity-agent
```

---

## 🔑 Environment Variable Reference

| Environment Variable | Required? | Purpose | Default |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Optional | SQLite or PostgreSQL connection string | `sqlite:///./opportunity_agent.db` |
| `PORT` | Optional | Server port (Render/Railway dynamic binding) | `8000` |
| `JWT_SECRET` | Optional | Secret key for signing session tokens | Auto-generated / Fallback |
| `CREDENTIAL_ENCRYPTION_KEY` | Optional | Base64 Fernet key for encrypting DB secrets | Auto-generated if blank |
| `GMAIL_CLIENT_ID` | Optional | Google OAuth 2.0 Client ID for Gmail API | Blank (Runs simulation mode if empty) |
| `GMAIL_CLIENT_SECRET` | Optional | Google OAuth 2.0 Client Secret for Gmail API | Blank |
| `GITHUB_TOKEN` | Optional | Increases GitHub API rate limit for profile sync | Blank |

*(Note: Every user inputs their own `GROQ_API_KEY` on their Profile page. It is stored encrypted in the database per user).*

---

## 📜 License & Author

- **Author:** [Manindra-babu](https://github.com/Manindra-babu)
- **License:** MIT License — Open-source and free for commercial or educational use.
