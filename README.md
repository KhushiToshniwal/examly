# Examly (React + Tailwind + Express with CORS)

Two apps on two origins, so CORS is real:
- client: Vite + React + Tailwind on http://localhost:5173
- server: Express + `cors` on http://localhost:4000

## Run
```
cd server && npm install && npm start
cd client && npm install && npm run dev
```
\

## Try breaking CORS
- Run the client on another port: `npm run dev -- --port 5174`. The server rejects it and the inspector shows a blocked request.
- Allow it: `CLIENT_ORIGIN=http://localhost:5173,http://localhost:5174 npm start` in server.
- Deploying? Set `VITE_API_URL` in client and `CLIENT_ORIGIN` in server. For cookies across different sites use SameSite=None and Secure.
