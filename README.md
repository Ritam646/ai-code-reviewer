# ai-code-reviewer

Full-stack AI Code Reviewer and Generator (React + Vite frontend, Express backend).

Overview
- Frontend: `client` — Vite + React dashboard to submit code for review and request generated code.
- Backend: `server` — Express API that forwards requests to a configurable GROQ-compatible inference endpoint.

Quickstart (development)

1. Start the backend

```bash
cd server
npm install
# copy server/.env.example to server/.env and set GROQ_API_URL and GROQ_API_KEY
npm run start
```

2. Start the frontend

```bash
cd client
npm install
npm run dev
```

Notes
- The server expects the following env vars in `server/.env`: `GROQ_API_URL` and `GROQ_API_KEY`.
- Do NOT commit your real API key. Use `server/.env.example` as a template.
- If the GROQ API is not configured, the server returns helpful mock responses so you can try the UI locally.

Next steps
- Replace `GROQ_API_URL` and `GROQ_API_KEY` with your provider's values to enable real AI-powered reviews and generation.
- Add authentication, usage limits, and logging for production.