# AI Code Reviewer - Server

This is the Express backend for the AI Code Reviewer app. It exposes two endpoints:

- `POST /api/review` - accepts `{ code, language }` and returns a review
- `POST /api/generate` - accepts `{ description, language }` and returns generated code

Configuration:
- Copy `server/.env.example` to `server/.env` and set `GROQ_API_URL` and `GROQ_API_KEY`.

Run:

```bash
cd server
npm install
npm run start
```

During development you can run `npm run dev` if you install `nodemon` globally or add it as a dev dependency.
