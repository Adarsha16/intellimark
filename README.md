
# Club Management System (CMS)

A modern, full-stack SaaS application for managing club members, sponsorships, and events.

---

## Tech Stack

- **Backend:** FastAPI (Python)  
- **Frontend:** React (TypeScript)  
- **Database:** PostgreSQL  
- **Styling:** TailwindCSS  

---

## Prerequisites

- Docker Desktop  
- Python 3.10+  
- Node.js 18+  
- `uv` package manager

  ```bash
  pip install uv
  ```

## Quick Start

### 1. Database Setup

Start the PostgreSQL container:

```bash
docker-compose up -d
```
---

### 2. Backend Setup

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

* Backend URL: [http://localhost:8000](http://localhost:8000)
* API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

* Frontend URL: [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```text
root/
├── backend/            # FastAPI application
├── frontend/           # React application
└── docker-compose.yml  # Database configuration
```

---

## Usage

1. Register a user at:
   [http://localhost:5173/register](http://localhost:5173/register)
2. Login with your credentials.
3. Access the dashboard to manage members, sponsors, and events.

---

## Troubleshooting

### Database Connection Issues

```bash
docker ps              # Verify club_db is running
docker-compose up -d   # Restart if needed
```

---

### Password Length Error

```bash
cd backend
uv add "bcrypt==4.0.1"
```

---

### CORS Errors

Ensure both services are running simultaneously:

* Backend on port **8000**
* Frontend on port **5173**

```
```
