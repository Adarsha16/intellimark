# Ngrok Setup Guide for Mobile Access

This guide explains how to access your IntelliMark app on mobile devices using ngrok.

## Prerequisites

1. Install ngrok: https://ngrok.com/download
2. Sign up for a free ngrok account (required for custom domains)
3. Get your ngrok authtoken from https://dashboard.ngrok.com/get-started/your-authtoken

## Setup Steps

### 1. Configure Ngrok

```bash
# Authenticate ngrok
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### 2. Start Your Services

**Terminal 1 - Backend:**
```bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Database (if not running):**
```bash
docker-compose up -d
```

### 3. Create Ngrok Tunnels

You need **TWO** ngrok tunnels - one for frontend and one for backend.

**Terminal 4 - Frontend Tunnel:**
```bash
ngrok http 5173
```

**Terminal 5 - Backend Tunnel:**
```bash
ngrok http 8000
```

### 4. Configure Environment Variables

Copy the ngrok URLs from the tunnels and create a `.env` file in the `frontend` directory:

```bash
cd frontend
cp .env.example .env
```

Edit `.env` and set your backend ngrok URL:
```
VITE_API_URL=https://your-backend-ngrok-url.ngrok-free.dev
```

**Example:**
```
VITE_API_URL=https://abc123.ngrok-free.dev
```

### 5. Restart Frontend

After creating/updating `.env`, restart the frontend dev server:

```bash
# Stop the current server (Ctrl+C) and restart:
npm run dev
```

### 6. Access on Mobile

1. Open the **frontend ngrok URL** in your mobile browser
2. The app should load and connect to the backend via the ngrok tunnel

## Important Notes

### Docker Compatibility

✅ **Docker works fine with ngrok!** 

- The database runs in Docker (port 5434) - this stays local, no ngrok needed
- Backend runs directly (not in Docker) - needs ngrok tunnel on port 8000
- Frontend runs directly (not in Docker) - needs ngrok tunnel on port 5173

### Ngrok Free Tier Limitations

- URLs change every time you restart ngrok (unless you have a paid plan)
- You'll need to update `.env` file when URLs change
- Some ngrok domains may show a warning page (click "Visit Site" to proceed)

### Troubleshooting

**Issue: 403 Forbidden**
- Make sure you've updated `vite.config.ts` with your ngrok domain
- Restart the Vite dev server after updating config

**Issue: CORS Errors**
- Backend CORS is configured to allow ngrok domains automatically
- Check that both tunnels are running

**Issue: API Connection Failed**
- Verify `VITE_API_URL` in `.env` matches your backend ngrok URL
- Make sure backend ngrok tunnel is running
- Check that backend is running on `0.0.0.0:8000` (not just localhost)

**Issue: Database Connection**
- Database runs locally in Docker - no ngrok needed
- Make sure `docker-compose up -d` is running

## Quick Start Script

Create a script to start everything:

```bash
# start-all.sh (Linux/Mac) or start-all.bat (Windows)

# Start database
docker-compose up -d

# Start backend (in background)
cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &

# Start frontend
cd frontend && npm run dev

# Then manually start ngrok tunnels in separate terminals
```

## Alternative: Single Tunnel (Advanced)

If you want to use a single ngrok tunnel, you can:

1. Use ngrok's path-based routing
2. Or use a reverse proxy (nginx) to route `/api` to backend and `/` to frontend
3. This is more complex but gives you one URL

For most use cases, two tunnels (frontend + backend) is simpler and recommended.
