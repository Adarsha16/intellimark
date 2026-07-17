# IntelliMark

**IntelliMark** is a next-generation Executive Club Management & Sponsorship Platform. It leverages localized AI to provide strategic insights, predictive success modeling, and comprehensive management of sponsors, members, and events.

---

## Key Features

- ** Executive Dashboard:** Real-time visualization of growth trends, revenue pipeline, and system audit logs using responsive Line and Bar charts.
- ** AI Chief Strategist:** In-app AI agent that analyzes your database to generate actionable strategic reports for club growth.
- ** AI Success Predictor:** Advanced ML models (Transformers) that predict the potential success score of upcoming events based on historical data.
- ** Automated PDF Reporting:** One-click executive report generation compiling financial stats and AI-driven strategies.
- ** Geo-Aware Event Management:** Integrated Map picking and reverse geocoding for precise event location tracking.
- ** Member & Sponsor CRM:** Robust management of membership lifecycle and sponsorship pipeline status.

---

## 🛠️ Tech Stack

### Backend
- **Core:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **Dependency Management:** [uv](https://github.com/astral-sh/uv)
- **Database:** [PostgreSQL](https://www.postgresql.org/) with [SQLAlchemy 2.0](https://www.sqlalchemy.org/)
- **Migrations:** [Alembic](https://alembic.sqlalchemy.org/)
- **AI/ML Engine:** 
  - [Transformers](https://huggingface.co/docs/transformers/index) (Local LLM/Analysis)
  - [Diffusers](https://huggingface.co/docs/diffusers/index) & [Torch](https://pytorch.org/) (Model execution)
  - [Sentence-Transformers](https://www.sbert.net/) (Semantic analysis)
- **Reporting:** [fpdf2](https://github.com/fpdf2/fpdf2)

### Frontend
- **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [TailwindCSS](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Charts:** [Recharts](https://recharts.org/)
- **Maps:** [Leaflet](https://leafletjs.com/)

---

##  Project Structure

```text
intellimark/
├── backend/            # FastAPI Project
│   ├── app/
│   │   ├── api/        # REST Endpoints
│   │   ├── models/     # SQLAlchemy Models
│   │   ├── services/   # Business Logic (AI, PDF, etc.)
│   │   └── core/       # Config & Security
│   └── alembic/        # DB Migrations
├── frontend/           # Vite + React Project
│   ├── src/
│   │   ├── components/ # Reusable UI Components
│   │   ├── pages/      # Dashboard, Groups, Settings
│   │   └── services/   # API Client
└── docker-compose.yml  # Database (Postgres) Container
```

---

##  Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose
- [Python 3.11+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/)
- [uv](https://github.com/astral-sh/uv) (`pip install uv`)

### 1. Database Setup
Start the local PostgreSQL service:
```bash
docker-compose up -d
```

### 2. Backend Initialization
```bash
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```
*   **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Frontend Initialization
```bash
cd frontend
npm install
npm run dev
```
*   **App URL:** [http://localhost:5173](http://localhost:5173)

---

##  Usage Workflow
1.  **Onboard:** Register at `/register` and login safely.
2.  **Manage:** Add your club sponsors and upcoming events.
3.  **Analyze:** Use the **AI Chief Strategist** on the dashboard to get performance insights.
4.  **Predict:** Open an event and use the **Success Predictor** to see AI-estimated outcomes.
5.  **Report:** Click **Export PDF** to get a formatted executive summary.

---

## 🛡️ Troubleshooting
- **DB Connection:** Ensure `docker ps` shows `club_db` running.
- **Python Errors:** Verify you are using `uv` for consistent environment management.
- **CORS:** Ensure both backend (8000) and frontend (5173) are running concurrently.

---

