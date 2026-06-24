# Government Integration API Demo

> A REST API built to simulate two Dominican government systems integrated via an [OpenFn](https://www.openfn.org) workflow. Built as part of a social protection data sync pipeline for the OpenFn Services team.

---

## Overview

This project exposes two protected API endpoints that simulate real institutional systems:

| System | Endpoint | Description |
|--------|----------|-------------|
| Beneficiary Registry | `GET /api/beneficiaries` | Returns citizens enrolled in a social protection program |
| Payment Disbursement | `POST /api/payments` | Registers payment records for active beneficiaries |

These APIs are consumed by an OpenFn workflow that automates the end-to-end data sync between both systems — fetching active beneficiaries, transforming the data, and registering disbursements — with no manual intervention.

---

## Integration Architecture

```
OpenFn Workflow
│
├── Step 1: Fetch Active Beneficiaries
│   └── GET /api/beneficiaries?active=true
│       └── Returns citizens with active: true
│
├── Step 2: Process Payments
│   └── POST /api/payments (one request per beneficiary)
│       └── Registers payment with idempotency check
│
└── state flows between steps via OpenFn's state object
```

The OpenFn workflow uses:
- `get()` with custom Bearer token header for Step 1
- `request('POST', ...)` with `each()` for Step 2 — required due to a header propagation behavior in `@openfn/language-http` v7.x where `post()` inside `fn()` or `each()` does not correctly forward custom headers. `request()` is the low-level function that `get()` and `post()` are built upon and provides full header control.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24 + TypeScript |
| Framework | Express 5 |
| API Docs | Swagger UI (OpenAPI 3.0) |
| Data layer | JSON files (simulating DB for demo) |
| Deploy | Render (production) |
| Auth | Bearer token (RFC 6750) |

---

## Security Design

Authentication uses **Bearer token** (RFC 6750) on all `/api/*` routes:

```
Authorization: Bearer <token>
```

**Why Bearer over API Key in header (`x-api-key`)?**

- Bearer is natively supported by the OpenFn HTTP adaptor via `state.configuration.token`
- Universally recognized by API clients and documentation tools (Swagger, Postman)
- Token can be rotated in OpenFn Credentials without code changes

**Why not query parameters?**

Query parameters are explicitly avoided for credentials because:
- They appear in server logs, CDN logs (Cloudflare), and browser history
- Unacceptable for APIs handling citizen data

The `apiKeyAuth` middleware also accepts `x-api-key` header for backward compatibility with direct API calls.

**Token storage:**
- Local: `.env` file (never committed to version control)
- Production: Render environment variables
- OpenFn: Stored in Credentials (`state.configuration`) — never hardcoded in Job code

---

## Idempotency

The `POST /api/payments` endpoint implements idempotency using the citizen ID (`cédula`) as a natural unique key:

```
POST /api/payments { id: "001-1234567-8", ... }
→ First call:  201 Created
→ Second call: 409 Conflict — "Payment for beneficiary 001-1234567-8 already registered"
```

This allows the OpenFn workflow to be safely retried or re-run after failures without creating duplicate payment records — a critical requirement for financial data pipelines.

---

## API Documentation

Interactive Swagger UI is available at:

- **Production:** [https://government-api-demo.onrender.com/api-docs](https://government-api-demo.onrender.com/api-docs)
- **Local:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

Raw OpenAPI 3.0 spec (JSON):
- [https://government-api-demo.onrender.com/api-docs.json](https://government-api-demo.onrender.com/api-docs.json)

To authorize in Swagger UI:
1. Click **Authorize**
2. Enter: `gov-demo-secret-2026`
3. Click **Authorize** and close

---

## Project Structure

```
src/
├── data/
│   ├── beneficiaries.json    # Beneficiary registry data (5 citizens)
│   └── payments.json         # Payment records (written by POST endpoint)
├── middleware/
│   └── auth.ts               # Bearer token authentication middleware
├── routes/
│   ├── beneficiaries.ts      # GET /api/beneficiaries — with OpenAPI docs
│   └── payments.ts           # GET/POST /api/payments — with OpenAPI docs
├── swagger.ts                # OpenAPI 3.0 spec configuration
└── index.ts                  # Express app, middleware, route registration
```

---

## Local Development

**Prerequisites:** Node.js 18+, npm

```bash
# Clone the repo
git clone https://github.com/fcruzp/apisdemo.git
cd apisdemo

# Install dependencies
npm install

# Create environment file
echo "API_KEY=gov-demo-secret-2026\nPORT=3000" > .env

# Start development server (hot reload)
npm run dev
```

**Test the endpoints:**

```bash
# Health check (no auth)
curl http://localhost:3000/health

# All beneficiaries
curl http://localhost:3000/api/beneficiaries \
  -H "Authorization: Bearer gov-demo-secret-2026"

# Active beneficiaries only
curl http://localhost:3000/api/beneficiaries?active=true \
  -H "Authorization: Bearer gov-demo-secret-2026"

# Register a payment
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer gov-demo-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{"id":"001-1234567-8","fullName":"María Pérez","amount":2500,"municipality":"Santo Domingo"}'

# View all payments
curl http://localhost:3000/api/payments \
  -H "Authorization: Bearer gov-demo-secret-2026"
```

---

## Deployment

Deployed on **Render** (free tier). Auto-deploys on every push to `master`.

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

**Render configuration:**
- Build Command: `npm install && npm run build`
- Start Command: `node dist/index.js`
- Environment Variables: `API_KEY`, `NODE_ENV=production`

**Note on Render free tier:** The service spins down after 15 minutes of inactivity. First request after inactivity may take 30-60 seconds to respond.

---

## OpenFn Workflow Code

**Step 1 — Fetch Active Beneficiaries (`@openfn/language-http`):**

```javascript
get('/api/beneficiaries?active=true', {
  headers: {
    'Authorization': 'Bearer gov-demo-secret-2026'
  }
});

fn(state => {
  console.log(`✓ Beneficiaries received: ${state.data.count}`);
  return state;
});
```

**Step 2 — Process Payments (`@openfn/language-http`):**

```javascript
fn(state => {
  state.beneficiaries = state.data.data;
  console.log(`Processing ${state.beneficiaries.length} beneficiaries...`);
  return state;
});

each(
  '$.beneficiaries[*]',
  request('POST', '/api/payments', {
    body: state => ({
      id:           state.data.id,
      fullName:     state.data.fullName,
      amount:       state.data.amount,
      municipality: state.data.municipality
    }),
    headers: {
      'Authorization': 'Bearer gov-demo-secret-2026',
      'content-type': 'application/json'
    }
  })
);

fn(state => {
  console.log(`✓ All payments processed`);
  return state;
});
```

---

## Production Considerations

This demo uses JSON files as a data layer for simplicity. In a real government integration:

| Concern | Demo approach | Production approach |
|---------|--------------|---------------------|
| Data storage | JSON files | PostgreSQL with WAL for audit |
| Authentication | Single static token | OAuth 2.0 or rotating API keys per institution |
| Idempotency | In-memory ID check | DB unique constraint + idempotency key table |
| Error handling | Try/catch + HTTP codes | Dead letter queue + alerting |
| Logging | console.log | Structured logging (Winston/Datadog) |
| Secrets | .env / Render env vars | HashiCorp Vault or AWS Secrets Manager |

---

## Author

**Francisco Cruz** — Santo Domingo, República Dominicana  
Built as part of the OpenFn Services integration project for Dominican government systems.