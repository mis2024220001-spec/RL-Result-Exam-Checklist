# Exam Results Checklist

A single-file, easy-to-host web app for tracking exam registration/submission records. Supports live sharing between teammates through a tiny built-in JSON server — no Firebase, no databases, no `npm install`.

## What you get

- **`RL_Result_Checklist.html`** — the entire app: view, add, edit, delete, bulk-actions, search, filters, drag-to-reorder, dark mode, CSV/JSON export & import.
- **`server.js`** — a zero-dependency Node server that serves the page AND exposes a JSON CRUD API. Data is stored as plain text in `data.json` next to it.

Either file can run on its own:

- Open the HTML directly → works fully offline, data saved in the browser (localStorage).
- Run both through `server.js` → the sync feature lets you and a teammate see and edit the same records live on the same URL.

---

## Quick start (local)

Requirements: [Node.js](https://nodejs.org) 14 or newer. No packages to install.

```sh
node server.js
```

Open **http://localhost:3000** in your browser.

To share with someone on the same network, use your computer's local IP (e.g. `http://192.168.1.20:3000`) instead of `localhost`.

---

## Sharing between two people

1. Host the two files somewhere Node can run (see [Hosting](#hosting)).
2. The host gives you a public URL, e.g. `https://your-app.onrender.com`.
3. In the app, click **Sync** ▸ paste the URL ▸ **Save & Connect**.
4. Do the same on the teammate's browser (same URL).
5. Stay on the same URL from now on. Changes appear for all connected users within ~3 seconds.

Data is stored in **`data.json`** on the server. Local browsers keep their own copy too, so nobody loses work if the network drops.

> Keep your host protected. Anyone who can reach the server URL can edit the same checklist.

---

## Hosting

Keep `server.js` and `RL_Result_Checklist.html` in the **same folder** — `data.json` is created automatically in that folder on first save.

> Glitch used to be the easiest option, but has wound down its project hosting, so it's no longer recommended.

### Bonto (closest Glitch replacement, free)

1. https://bontohost.com → sign in (or connect GitHub).
2. **New Project ▸ Import from GitHub** (or remix one of their templates and upload files).
3. Add your files, set the run command to `node server.js`, click **Deploy**.
4. You get a public subdomain (e.g. `https://your-app.bontohost.id`). Apps sleep after 30 min idle and wake on the next request.

### Render (free tier)

1. https://render.com → **New ▸ Web Service**.
2. Connect a GitHub/GitLab repo, or the folder containing both files.
3. Settings: **Build Command** `(leave empty / None)`, **Start Command** `node server.js`.
4. Deploy and copy the `https://*.onrender.com` URL. Note: free instances spin down after ~15 min idle and take up to a minute to wake.

### Railway

1. https://railway.com → **Start a New Project ▸ Deploy from repo** (or upload files).
2. It auto-detects `package.json` and runs `node server.js`.
3. Copy the generated `.up.railway.app` URL. Free trial credits available.

### Replit

1. https://replit.com → **Create Repl ▸ Node.js** (or import from GitHub).
2. Upload `server.js` + `RL_Result_Checklist.html`.
3. The Run button starts `node server.js`; use **Deploy ▸ Deploy** for a public URL (`.replit.app`).
4. Caveat: free Repls paused long-term may be deleted after ~7 days of inactivity.

### Koyeb

1. https://koyeb.com → **Create Web Service** from GitHub or upload.
2. Set **Run command** to `node server.js`.
3. Free tier gives an always-on instance with a public URL (e.g. `https://*.koyeb.app`).

---

## JSON CRUD API

The server exposes a small REST API. Everything is JSON.

| Method | Path                | Description                                      |
| ------ | ------------------- | ------------------------------------------------ |
| GET    | `/api/records`      | List all records                                 |
| PUT    | `/api/records`      | Replace the whole list with an array of records  |
| GET    | `/api/records/:id`  | Get one record                                   |
| PUT    | `/api/records/:id`  | Create or update one record                      |
| POST   | `/api/records`      | Add a record (id optional, auto-generated)       |
| DELETE | `/api/records/:id`  | Delete a record                                  |

Each record looks like:

```json
{
  "id": "7",
  "examination": "Math Exam",
  "year": "2026",
  "type": "New Register",
  "status": "Done",
  "sentDate": "2026-03-15",
  "notes": "Completed on time",
  "checked": false
}
```

Allowed values: `year` `2025–2030`, `type` `New Register | Recertified`, `status` `Done | In Progress | Not yet`. Invalid values are sanitized on write.

The app uses `GET /api/records` (poll every 3s) + `PUT /api/records` (debounced on each edit). Sync uses last-write-wins — if two people edit at the exact same time, the later save wins.

---

## How the pieces fit together

```
browser ──GET/PUT /api/records──▶ server.js ──▶ data.json
      ▲                              ▲
      └──── served by server.js ◀────┘
```

- The browser loads `RL_Result_Checklist.html` from `server.js`, then talks to it over the JSON API.
- `server.js` reads/writes the shared `data.json` file — one request at a time, so concurrent editors don't corrupt it.

---

## FAQ

**Do I need a Firestore project or a JS server?** No — Firebase was removed in favor of the built-in JSON server.

**Why does my Read say `data.json` is the database?** Because that's literally where everything is stored. Back it up with **Export ▸ JSON** regularly, or copy `data.json` directly.

**Can I rename `index.html`?** The server currently maps `/`, `/index.html`, and `/RL_Result_Checklist.html` to the HTML file. If you rename it, update `HTML_FILE` at the top of `server.js`.

**The sync shows "Could not connect"?** Confirm the URL is `http(s)://...`, that the server is running, and that the port is reachable. On local setups, firewall/antivirus may block incoming connections.

---

## Workflows

- **Live sync (recommended for you two):** host once, both open the same URL and connect. Great when you edit the same checklist together.
- **Backups:** use **Export ▸ JSON** after a working session, or copy `data.json` directly from the server.
- **Distribute read-only copies:** **Export ▸ CSV** for people who just need the list and don't need to edit.
- **Bulk edits:** **Export ▸ JSON** → edit the file → **Import ▸ JSON**.