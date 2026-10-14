# Salesforce Learning Academy

A mobile-first e-learning platform for Salesforce CRM and Platform concepts:
five units of lessons, one quiz per unit, server-verified course completion,
and an academy course-completion certificate (PDF + e-mail + public
verification).

> **Certificate disclaimer:** certificates are issued by this academy to record
> course completion. They are **not** official Salesforce certifications and
> are not endorsed by Salesforce.

---

## 1. How the project is organised

Two **separate projects** live side by side:

| Folder | Project | Stack | Port |
|---|---|---|---|
| `/` (repo root) | **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind 4, Framer Motion, GSAP | 3000 |
| `backend/` | **Backend API** | Node.js, Express 4, TypeScript, MySQL 8, express-session, Argon2id | 4000 |

Each folder has its **own `package.json`, `node_modules` and `.env`**.

```
salesforce/
├── src/                    # Frontend source (Next.js App Router)
│   ├── app/                #   routes: /, /course, /learn, /quizzes, /dashboard,
│   │                       #           /certificates, /verify-certificate, /admin, /login...
│   ├── components/         #   ui/, layout/, home/, admin/, providers/
│   └── lib/                #   api-client, validators, markdown renderer, utils
├── backend/
│   ├── migrations/         # 001_init.sql (18 tables, utf8mb4)
│   ├── src/
│   │   ├── config/         # env validation, MySQL pool, transactions
│   │   ├── controllers/    # request handlers
│   │   ├── db/             # migrate, seed, createAdmin, reset, seed-data/
│   │   ├── middleware/     # auth, csrf, rate limits, validation, errors
│   │   ├── repositories/   # SQL access layer
│   │   ├── routes/         # /api route map
│   │   ├── services/       # auth, quiz scoring, completion, PDF, mailer
│   │   └── validators/     # Zod request schemas
│   ├── storage/            # generated certificate PDFs + dev e-mails (.eml)
│   └── tests/              # Vitest API integration suite
└── package.json            # scripts that drive both projects
```

---

## 2. Requirements

- **Node.js 20+** (verified on Node 24)
- **MySQL 8.0** running locally (Windows service `MySQL80`, port `3306`)
- npm 10+

---

## 3. One-time setup

```powershell
# 1. Install dependencies for both projects
npm run setup

# 2. Create your database credentials
#    Open backend/.env and fill in:
#      DATABASE_USER=your_mysql_user
#      DATABASE_PASSWORD=your_mysql_password
#      SESSION_SECRET=<random string, 32+ characters>
#    (SESSION_SECRET can be generated with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 3. Create the database and apply migrations
npm run db:migrate

# 4. Load the curriculum (5 units, 30 lessons, 5 quizzes) + default settings
npm run db:seed
#    - asks interactively for the administrator e-mail + password
#    - or pre-fill ADMIN_SETUP_EMAIL / ADMIN_SETUP_PASSWORD in backend/.env

# 5. (Optional) create/promote an admin account later
npm run db:admin
```

`npm run db:seed` is **safe to run again**: it updates course, unit and lesson
content by slug, but never deletes existing quiz questions, attempts or
certificates.

---

## 4. Running the site

```powershell
npm run dev
```

This starts **both** projects (frontend on `http://localhost:3000`, API on
`http://localhost:4000`) with one command.

Run them separately if you prefer:

```powershell
npm run dev:frontend     # Next.js on 3000
npm run dev:backend      # Express  on 4000
```

### On a phone (same Wi-Fi)

1. Find your PC's IP: `ipconfig` → e.g. `192.168.1.50`
2. Open `http://192.168.1.50:3000` on the phone.

That is all. The frontend calls the API on the **relative** path `/api`, which
the Next dev server proxies to the backend (see `API_PROXY_TARGET` in
`next.config.ts` / `.env.local`). No CORS, no cookies problem, no per-device
configuration. In development the API also accepts requests whose origin is a
private-network address, so nothing blocks the phone.

---

## 5. Environment variables

### `backend/.env` (server only — never ship to the browser)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_HOST` / `DATABASE_PORT` | yes | MySQL location (default `localhost:3306`) |
| `DATABASE_USER` / `DATABASE_PASSWORD` | yes | MySQL credentials |
| `DATABASE_NAME` | no | database name (default `salesforce_academy`) |
| `SESSION_SECRET` | **yes** | ≥32 chars; signs the session cookie |
| `FRONTEND_URL` | yes | `http://localhost:3000` |
| `APP_BASE_URL` | no | `http://localhost:4000` |
| `SMTP_ENABLED` | no | `false` = development mail (writes `.eml` files) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | with SMTP | real mail delivery |
| `ADMIN_SETUP_EMAIL` / `ADMIN_SETUP_PASSWORD` | no | non-interactive admin creation |

With SMTP disabled, certificate e-mails are written to
`backend/storage/mail/*.eml` and the admin dashboard shows a clear banner —
nothing is silently lost.

### `.env.local` (frontend)

`NEXT_PUBLIC_API_URL=/api` (the default) uses the proxy. Only set an absolute
URL if the API is on another machine.

---

## 6. The learning flow (what the code enforces)

```
Register → Sign in → Enroll → Study lessons → Complete every required lesson
        → Pass all five unit quizzes (server-side scoring, 70% from DB)
        → Server verifies completion → Certificate issued exactly once
        → PDF generated → E-mail dispatched → Public verification page
```

Security-relevant rules, all enforced on the **server**:

- **Completion is never trusted from the browser.** The engine recomputes
  `(completed required lessons + passed required quizzes) / total required`
  inside a transaction, and only then issues the certificate (single unique
  row per user+course).
- **Quiz answers never leave the server before submission.** Only question ids
  and option ids are sent to the client; explanations appear afterwards.
- **Sessions** are server-side rows in MySQL; the cookie is `HttpOnly`.
- **CSRF**: origin check + double-submit token (`sla_csrf` / `x-csrf-token`).
- **Passwords**: Argon2id; rate-limited login with lockout; no default admin
  account anywhere in the code.
- **Lesson content** is rendered by a hand-written Markdown → React renderer:
  no `dangerouslySetInnerHTML` anywhere, so hostile content stays inert.
- **Public verification** exposes only holder name, course, date and number —
  never the e-mail address.

---

## 7. Tests

```powershell
npm test                 # backend API suite + frontend unit tests
npm run test:frontend    # only src/** tests (Vitest + jsdom)
npm --prefix backend run test   # only the API integration suite
```

The backend suite runs against a **separate** test database
(`salesforce_academy_test`) and covers registration/login/lockout, CSRF,
enrollment, progress maths, quiz scoring and attempt limits, certificate
idempotency + PDF + public verification, and the whole admin surface.

---

## 8. Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | frontend + backend together |
| `npm run build` / `npm start` | production frontend build |
| `npm run typecheck` | TypeScript across both projects |
| `npm run db:migrate` | create database + apply migrations |
| `npm run db:seed` | curriculum + settings + first admin |
| `npm run db:admin` | create/promote an administrator |
| `npm run db:reset` | drop and recreate the database (dev only) |
| `npm test` | all tests |

---

## 9. Admin area

Visit `/admin` and sign in with the administrator account created by
`npm run db:seed` or `npm run db:admin`. The dashboard manages students,
courses, units, lessons, quizzes and questions, certificates (download /
re-send e-mail), settings (including `manual` vs `auto` lesson completion) and
an audit log.

---

## 10. Deploying to Vercel (free tier)

The whole stack deploys as **one Vercel project**:

- the Next.js frontend is served as usual;
- the Express API runs as a serverless function (`api/index.ts` exports the
  same `createApp()` app that `backend/src/server.ts` runs locally) and
  `vercel.json` routes `/api/*` to it — same origin, so session cookies and
  CSRF keep working exactly like locally;
- sessions already live in **MySQL** (no in-memory state), and certificate
  PDFs / captured e-mails fall back to Vercel's writable `/tmp`.

### One-time: hosted MySQL (TiDB Serverless — free)

Vercel has no localhost MySQL. Any MySQL-compatible host works; TiDB
Serverless has a free tier and requires TLS:

1. Create a free project on tidbcloud.com → Serverless cluster → copy the
   connection host, port, user and password.
2. Point the local tooling at it (same variable names as `backend/.env`):

   ```ini
   DATABASE_HOST=<cluster>.mysql.tidbcloud.com
   DATABASE_PORT=4000
   DATABASE_USER=...
   DATABASE_PASSWORD=...
   DATABASE_NAME=salesforce_academy
   DATABASE_SSL=true
   SESSION_SECRET=<new 32+ character random string>
   ```

3. Create the schema and load the curriculum from this machine:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

### Deploy

```bash
npm i -g vercel     # once
vercel login        # once
vercel              # first deployment (preview) from the repo root
```

Then in vercel.com → your project → **Settings → Environment Variables** add
the production values from the table below and run `vercel --prod`.

### Environment variables (Vercel → Settings → Environment Variables)

| Variable | Value |
|---|---|
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` | your hosted MySQL |
| `DATABASE_SSL` | `true` (required by TiDB; optional elsewhere) |
| `SESSION_SECRET` | new random string, 32+ characters |
| `FRONTEND_URL` | `https://<project>.vercel.app` |
| `APP_BASE_URL` | `https://<project>.vercel.app` |

Nothing else is required: the browser calls `/api` on the same origin
(`NEXT_PUBLIC_API_URL` defaults to `/api`), and with SMTP off, development
mail capture writes to `/tmp/sla-mail` instead of `backend/storage/mail`.

### Free-tier notes

- Vercel Hobby is free for personal/non-commercial projects; API calls here
  are short (certificate PDF generation is a few hundred ms).
- Rate-limit counters are per serverless instance (fine for a demo/learning
  site).
- Real certificate e-mail delivery: set `SMTP_ENABLED=true` plus `SMTP_HOST`,
  `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` (e.g. a Gmail app
  password) in the Vercel environment — file-mode `.eml` files are not
  retrievable from a deployment's `/tmp`.

### Verify a deployment end-to-end

With the site live, the same E2E suite that runs locally works against it:

```bash
E2E_BASE_URL=https://<project>.vercel.app/api node backend/e2e.mjs
```

---

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| "Could not connect to MySQL" | check `DATABASE_*` in `backend/.env`, service running, then `npm run db:migrate` |
| Session secret error | set `SESSION_SECRET` to a random 32+ character string |
| E-mail not arriving | expected with SMTP off: check `backend/storage/mail/*.eml`, or configure SMTP and restart |
| Phone cannot open the site | PC and phone on the same Wi-Fi; allow Node through the Windows firewall for private networks |
| Port already in use | another dev server is running: stop it, or use `next dev -p 3001` |
