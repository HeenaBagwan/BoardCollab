# Free Production Deployment Guide: BoardCollab 🚀

This guide walks you through deploying **BoardCollab** 100% free with **zero expiration** using a production-ready stack:

- **Frontend (Client)**: [Vercel](https://vercel.com) (Global edge CDN, automated CI/CD, free SSL — **Free Forever**).
- **Backend (Server)**: [Render](https://render.com) (Node.js & Socket.IO Web Service, auto-deploy, free SSL — **Free Forever**).
- **Database (MySQL)**: [TiDB Cloud (Serverless)](https://tidbcloud.com) (100% MySQL-compatible, 5 GB storage, TLS/SSL, no credit card — **Free Forever, Never Expires**).

---

## 🏛️ Deployment Architecture & Roles

```mermaid
graph LR
    Browser[User Browser / Device]
    Vercel[Vercel Edge CDN<br/>Static Vite React App<br/>https://your-app.vercel.app]
    Render[Render Web Service<br/>Node.js + Socket.IO Server<br/>https://your-server.onrender.com]
    TiDB[(TiDB Cloud Serverless<br/>MySQL-Compatible Database<br/>Free Forever 5GB with SSL)]

    Browser -->|1. Loads SPA Assets| Vercel
    Browser <-->|2. REST API & Cookies (HTTPS)<br/>withCredentials: true| Render
    Browser <-->|3. WebSocket Collaboration (WSS)| Render
    Render <-->|4. Batched SQL Transactions (SSL)| TiDB
```

### What Each Service Does:
1. **Vercel**: Serves your bundled React + Tailwind CSS client at high speed from edge servers around the world. Because it is a Single Page Application (SPA), Vercel uses `vercel.json` to route deep links (e.g. `/board/:id`, `/dashboard`) to `index.html`.
2. **Render**: Runs your Node.js application 24/7. It listens for incoming HTTP requests (`/api/*`), manages real-time collaborative rooms with Socket.IO, resolves CRDT concurrency, and flushes drawing strokes to MySQL.
3. **TiDB Cloud**: Provides a 100% MySQL-compatible managed database with automated scaling, built-in TLS/SSL encryption, and 5 GB storage free forever (no trial cutoff, no credit card required).

---

## 📋 Environment Variables Reference

### Backend (Server) Environment Variables on Render

| Variable | Required? | Example Value | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` | Enables production cookie security (`SameSite=None; Secure`) and optimizations. |
| `PORT` | Auto | `10000` | Port provided automatically by Render. The server listens on `process.env.PORT`. |
| `CLIENT_URL` | **Yes** | `https://your-client.vercel.app` | Exact URL of your deployed Vercel frontend. Strictly allowed by CORS. |
| `DB_HOST` | **Yes** | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` | Hostname from TiDB Cloud connection details. |
| `DB_PORT` | **Yes** | `4000` | Port for TiDB Cloud MySQL (default is `4000`). |
| `DB_USER` | **Yes** | `2xxxx.root` | Generated username provided by TiDB Cloud. |
| `DB_PASSWORD` | **Yes** | `your_tidb_password` | Master password set in TiDB Cloud console. |
| `DB_NAME` | **Yes** | `test` (or `boardcollab`) | Database name (TiDB provides `test` out of the box). |
| `DB_SSL` | **Yes** | `true` | Tells MySQL client to establish an encrypted SSL/TLS handshake (required by TiDB). |
| `DB_SSL_REJECT_UNAUTHORIZED` | **Yes** | `false` | Accepts TiDB Cloud's TLS certificate without requiring manual CA cert upload. |
| `DB_CONNECTION_LIMIT` | Optional | `15` | Maximum active connections in the MySQL pool. |
| `JWT_ACCESS_SECRET` | **Yes** | `64_char_random_hex_string` | Secret key used to sign 15-minute access tokens. |
| `JWT_REFRESH_SECRET` | **Yes** | `64_char_random_hex_string` | Secret key used to sign 7-day refresh tokens. |
| `JWT_ACCESS_EXPIRES_IN` | Optional | `15m` | Token lifetime for access tokens (defaults to `15m`). |
| `JWT_REFRESH_EXPIRES_IN` | Optional | `7d` | Token lifetime for refresh tokens (defaults to `7d`). |
| `ADMIN_EMAILS` | Optional | `admin@boardcollab.com` | Comma-separated list of user emails granted access to `/admin`. |
| `REDIS_URL` | Optional | *(Leave empty)* | Omit or leave empty to use in-memory adapter (recommended for free single-instance setups). |

### Frontend (Client) Environment Variables on Vercel

| Variable | Required? | Example Value | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | **Yes** | `https://your-server.onrender.com/api` | Base URL of your backend Express REST API on Render. |
| `VITE_SOCKET_URL` | **Yes** | `https://your-server.onrender.com` | Base URL of your Socket.IO real-time server on Render. |

---

## 🛠️ Step-by-Step Deployment Guide

### Step 1: Set Up MySQL Database on TiDB Cloud (Free Forever, Never Expires)

1. Sign up for a free account at [tidbcloud.com](https://tidbcloud.com) (you can log in directly with GitHub or Google — **no credit card needed**).
2. Click **Create Cluster**.
3. Choose **Serverless** (Free $0/month, includes **5 GB storage free forever** with no trial expiration).
4. Select the cloud region closest to you (e.g. AWS Singapore, Tokyo, N. Virginia, Frankfurt).
5. Name your cluster (e.g., `boardcollab`) and click **Create**.
6. Once created (takes ~15 seconds), click the **Connect** button on the top right:
   - **Type**: Select **General** (or **Node.js**).
   - Generate or set a strong root **Password** and copy it.
   - Note the connection parameters shown on screen:
     - **Host** (e.g., `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`)
     - **Port** (`4000`)
     - **User** (e.g., `3w0x...root`)
     - **Database** (`test`)
7. **Run Database Migrations Once**:
   Open a terminal on your computer and run the migration script with your TiDB Cloud credentials:
   ```bash
   cd server
   DB_HOST=gateway01.xxxx.tidbcloud.com DB_PORT=4000 DB_USER=xxxx.root DB_PASSWORD=your_tidb_password DB_NAME=test DB_SSL=true DB_SSL_REJECT_UNAUTHORIZED=false npm run migrate
   ```
   *(On Windows PowerShell, use `$env:DB_HOST="gateway01.xxxx..."` before running `npm run migrate`)*.
   You will see: `[Migrate] ✓ Database schema applied successfully`.

---

### Step 2: Deploy Backend Server on Render (Free)

1. Sign up or log into [render.com](https://render.com).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository containing the BoardCollab code.
4. Fill in the service configuration:
   - **Name**: `boardcollab-server` (or any unique name).
   - **Region**: Choose the same or closest region as your Aiven database to minimize network latency.
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Expand **Advanced**:
   - **Health Check Path**: `/health` (Render will periodically ping this to verify your server is running).
   - **Auto-Deploy**: `Yes`
6. Click **Add Environment Variable** and enter the values:
   - `NODE_ENV`: `production`
   - `DB_HOST`: *(Your TiDB Host, e.g. gateway01.xxxx.tidbcloud.com)*
   - `DB_PORT`: `4000`
   - `DB_USER`: *(Your TiDB User, e.g. xxxx.root)*
   - `DB_PASSWORD`: *(Your TiDB Password)*
   - `DB_NAME`: `test` (or `boardcollab`)
   - `DB_SSL`: `true`
   - `DB_SSL_REJECT_UNAUTHORIZED`: `false`
   - `JWT_ACCESS_SECRET`: *(Generate a secure random string, e.g. run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)*
   - `JWT_REFRESH_SECRET`: *(Generate another distinct 64-char random string)*
   - `ADMIN_EMAILS`: `your_email@example.com`
   - `CLIENT_URL`: `https://placeholder-temporarily.vercel.app` *(You will update this with your exact Vercel URL in Step 3)*.
7. Click **Create Web Service**.
8. Wait for Render to build and start your service. Once running, copy your Render server URL from the top of the dashboard (e.g., `https://boardcollab-server.onrender.com`).

---

### Step 3: Deploy Frontend Client on Vercel (Free)

1. Sign up or log into [vercel.com](https://vercel.com).
2. Click **Add New...** > **Project**.
3. Import your GitHub repository.
4. In the configuration screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `client`.
   - **Build and Output Settings**: Defaults are correct (`npm run build`, output `dist`).
5. Expand the **Environment Variables** section and add:
   - `VITE_API_URL`: `https://boardcollab-server.onrender.com/api` *(Your Render URL + `/api`)*
   - `VITE_SOCKET_URL`: `https://boardcollab-server.onrender.com` *(Your Render URL without trailing slash)*
6. Click **Deploy**.
7. Vercel will install dependencies, build the TypeScript bundle, and provide your live frontend URL (e.g., `https://boardcollab.vercel.app`).

---

### Step 4: Link Frontend & Backend URLs (Complete CORS Handshake)

Now that both services are deployed, update Render with your real Vercel URL:

1. Go back to your **Render Dashboard** > select your `boardcollab-server` Web Service.
2. Go to **Environment** tab.
3. Edit `CLIENT_URL` to match your exact Vercel URL (e.g. `https://boardcollab.vercel.app` — **without a trailing slash**).
4. Click **Save Changes**. Render will automatically redeploy with the new origin allowed.

🎉 **Deployment is complete!** Open your Vercel URL in your browser, register an account, and invite collaborators to a whiteboard.

---

## 💡 Key Technical Concepts Explained

### 1. Why CORS is Necessary
Web browsers implement the **Same-Origin Policy** for security. When a webpage running on `https://boardcollab.vercel.app` tries to fetch data from `https://boardcollab-server.onrender.com`, the browser recognizes that the domain, origin, or port is different.
- Unless the server responds with header `Access-Control-Allow-Origin: https://boardcollab.vercel.app` and `Access-Control-Allow-Credentials: true`, the browser blocks the response.
- BoardCollab dynamically reads `CLIENT_URL` from the environment and allows only your verified Vercel frontend.

### 2. Why `SameSite=None` and `Secure` are Required
BoardCollab stores user refresh tokens in an **httpOnly cookie** so malicious JavaScript cannot steal user credentials via XSS attacks.
- Because your frontend (`.vercel.app`) and backend (`.onrender.com`) have different top-level domains, this cookie is considered a **cross-site (third-party) cookie**.
- By default, modern browsers refuse to send cross-site cookies unless:
  1. `SameSite=None`: Explicitly authorizes sending cookies across different domains.
  2. `Secure`: Forces the cookie to only be transmitted over encrypted HTTPS connections (HTTP will reject it).
  3. Frontend requests specify `withCredentials: true` (which BoardCollab's Axios and Socket.IO client do).

### 3. Why `vercel.json` SPA Rewrite is Essential
React uses client-side routing (`react-router-dom`). When a user navigates to `/board/8K4P9W2X`, the URL changes in the browser address bar, but no request is sent to a server.
- However, if the user hits **Refresh** or copies the link directly into a new tab, the browser asks Vercel for the file `/board/8K4P9W2X`. Since that physical file does not exist on disk, Vercel would return a `404 Not Found`.
- `vercel.json` instructs Vercel:
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
  This rewrites all incoming requests back to `/index.html`, allowing React Router to take over and render the board cleanly.

### 4. How Auto-Deploy Works
Both Vercel and Render connect directly to your GitHub repository via webhooks:
- When you execute `git push origin main`, GitHub triggers automated webhooks to Vercel and Render simultaneously.
- Vercel automatically runs `npm run build` on the `client/` directory and swaps the CDN assets with zero downtime.
- Render automatically runs `npm install` and restarts the Node process on `server/`.

### 5. How to Read and Troubleshoot Logs
- **Render Server Logs**:
  1. Navigate to your Render service and click **Logs** in the left sidebar.
  2. You will see streaming stdout/stderr logs. Look for:
     ```
     [Server] Connecting to MySQL database...
     [Server] ✓ MySQL connected successfully
     [Server] ✓ BoardCollab backend running on port 10000
     [Server] Socket.IO hub active and ready for collaborative sessions
     ```
  3. If database credentials or SSL are misconfigured, the exact MySQL error (e.g. `ER_ACCESS_DENIED_ERROR` or `HANDSHAKE_SSL_ERROR`) will be printed here.
- **Vercel Build Logs**:
  1. Navigate to your Vercel project > **Deployments** > click the latest deployment.
  2. Inspect the **Building** log to verify TypeScript compilation and Vite bundling completed with exit code 0.
- **Browser Developer Tools**:
  1. Press `F12` in Chrome/Firefox and switch to the **Console** and **Network** tabs.
  2. Filter by `Fetch/XHR` to inspect HTTP status codes (`200 OK`, `401 Unauthorized`).
  3. Filter by `WS` to inspect the live Socket.IO WebSocket connection status.

---

## ⚡ Free Tier Gotchas & Troubleshooting

1. **Render Free Tier Spin-Down (Cold Start)**:
   - Render's free web services automatically spin down (sleep) after 15 minutes of inactivity.
   - When the first visitor accesses the app after a quiet period, the server takes **~45–60 seconds** to wake up.
   - You can verify server status by visiting `https://your-server.onrender.com/health` in your browser. When awake, it returns `{"status":"ok"}`.
2. **CORS Blocked Error**:
   - Verify that `CLIENT_URL` on Render matches your Vercel URL **exactly**, including `https://`, and contains **no trailing slash** (e.g. `https://boardcollab.vercel.app`).
3. **Third-Party Cookies Blocked**:
   - Some browsers with ultra-strict privacy settings (e.g. Brave shields or Chrome "Block all third-party cookies") may block cookies across domains. Ensure your browser is set to default standard cookie protection.
4. **Database Connection Issues**:
   - Double-check that `DB_SSL=true` and `DB_SSL_REJECT_UNAUTHORIZED=false` are set in your Render environment variables. Managed cloud MySQL providers (like TiDB Cloud and Aiven) require SSL connections. Ensure port `4000` is used for TiDB Cloud.
