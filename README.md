# SplitBill

SplitBill is a shared-expense application that never loses a satang. It combines a strictly typed
FastAPI/SQLAlchemy backend with a Next.js single-page UI, integer-satang arithmetic, deterministic
remainder allocation, zero-sum balances, idempotent writes, and payer-only soft deletion.

The frontend follows the **Chowpa take-home PDF visual system**: warm `#FAF9F5` paper, white card
surfaces, amber section bars and callouts, Plus Jakarta Sans, and IBM Plex Mono for tabular money
figures.

**Stack:** Python 3.12+ · FastAPI · SQLAlchemy 2.0 · Alembic · Pydantic v2 · PostgreSQL 16 ·
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Pytest · Vitest · Ruff · ESLint

---

## 1. What is included

- Exact **equal** and **exact-amount** split allocation.
- Strict money validation: no floats, no more than two decimal places, no non-positive totals.
- Zero-sum balances (`sum(balances) == 0.00`) enforced as a domain invariant.
- `X-User` identity and group-level access control (`403` for non-members).
- Idempotent expense and repayment creation with a database unique constraint and race-safe handling.
- Immutable expenses with payer-only **soft delete** (`is_deleted`, `deleted_at`).
- Optional extension: greedy settle-up suggestions and repayment recording.
- Polished responsive UI with a live split preview that mirrors the backend algorithm exactly.
- Seeded users and groups, Alembic migration, Docker Compose orchestration.
- 68 backend tests and 12 frontend unit tests, all passing.

---

## 2. Architecture

### 2.1 High-level request flow

```text
Browser (Next.js client components)
        │  fetch + X-User + Idempotency-Key
        ▼
FastAPI router ── dependency: X-User, group membership
        │
        ▼
Service layer ── pure domain rules: money, allocation, balances, idempotency
        │                    │
        │                    └── integer satang, Decimal only
        ▼
Repository layer ── SQLAlchemy 2.0 queries
        │
        ▼
PostgreSQL 16 ── NUMERIC(12,2), unique (group_id, idempotency_key), soft-delete flags
```

### 2.2 Layer responsibilities

| Layer | Location | Responsibility |
|---|---|---|
| API / controllers | `backend/app/api` | HTTP contracts, dependency injection, status codes, error envelope |
| Schemas | `backend/app/schemas` | Pydantic v2 input validation and response serialization |
| Services | `backend/app/services` | Pure business rules: satang math, allocation, balances, settlement, idempotency orchestration |
| Repositories | `backend/app/repositories` | All SQLAlchemy query composition |
| Models | `backend/app/models` | SQLAlchemy 2.0 typed ORM models and database constraints |
| Core | `backend/app/core` | Settings, engine/session management, domain exception hierarchy |
| Frontend app | `frontend/src/app` | App Router layout and the single page |
| Frontend components | `frontend/src/components` | User/group selection, expense form, live preview, balances, expense table, settle-up |
| Frontend lib | `frontend/src/lib` | Typed API client, integer-satang math, Thai formatting, shared types |

The domain services (`money.py`, `allocation.py`, `balances.py`, `settlement.py`) are deliberately
framework-free and are tested without a database. Routers stay thin: they resolve dependencies,
call one service, and present the result.

### 2.3 Repository structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/                 # deps, error handlers, routers
│   │   ├── core/                # config, database, exceptions
│   │   ├── models/              # SQLAlchemy 2.0 ORM
│   │   ├── repositories/        # data access
│   │   ├── schemas/             # Pydantic v2 contracts
│   │   ├── services/            # domain logic and application services
│   │   ├── main.py
│   │   └── seed.py
│   ├── alembic/                 # migration environment + initial schema
│   ├── tests/                   # unit, integration, concurrency
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                 # layout, page, global CSS
│   │   ├── components/          # SplitBillApp, ExpenseForm, LiveSplitPreview, ...
│   │   └── lib/                 # api client, money math, formatting, types
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── docker-compose.yml
├── README.md
└── AI_NOTES.md
```

---

## 3. Quick start with Docker Compose (one command)

Prerequisites: Docker Desktop or Docker Engine with Compose v2.

```bash
docker compose up --build
```

This starts three services:

| Service | URL | Notes |
|---|---|---|
| Web UI | <http://localhost:3000> | Next.js production server |
| API | <http://localhost:8000> | FastAPI |
| API docs | <http://localhost:8000/docs> | OpenAPI / Swagger UI |
| PostgreSQL | `localhost:5432` | Override host port with `POSTGRES_PORT=5433` |

The API container runs `alembic upgrade head` and the idempotent seed script before starting
uvicorn. The seed creates:

- Users: `alice`, `bob`, `carol`, `dan`
- Group 1: **Chiang Mai trip** — `alice`, `bob`, `carol`
- Group 2: **Office lunch** — `bob`, `dan`

No expenses are seeded, so the UI starts clean.

Reset all data:

```bash
docker compose down -v
docker compose up --build
```

> If port 5432 is already in use, run `POSTGRES_PORT=5433 docker compose up --build`.

---

## 4. Local development (without Docker)

### 4.1 PostgreSQL 16

Create the role and database (adjust the superuser name if needed):

```bash
psql -U postgres -c "CREATE USER splitbill WITH PASSWORD 'splitbill';"
psql -U postgres -c "CREATE DATABASE splitbill OWNER splitbill;"
```

### 4.2 Backend

```bash
cd backend

python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS / Linux
# source .venv/bin/activate

pip install -e ".[dev]"

# Windows: Copy-Item .env.example .env
cp .env.example .env
# The default DATABASE_URL points at localhost:5432 with splitbill/splitbill.

alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

Health check: <http://localhost:8000/health>. Interactive docs: <http://localhost:8000/docs>.

### 4.3 Frontend

```bash
cd frontend
npm install

# Windows: Copy-Item .env.example .env.local
cp .env.example .env.local

npm run dev
```

Open <http://localhost:3000>. The browser calls `NEXT_PUBLIC_API_URL` (default
`http://localhost:8000`).

### 4.4 Seed data on an existing database

The seed script is idempotent:

```bash
cd backend
python -m app.seed
```

It updates display names, ensures all memberships, and advances the PostgreSQL `groups` identity
sequence past the explicitly seeded IDs.

---

## 5. Tests and quality gates

### Backend

```bash
cd backend
pytest
ruff check .
ruff format --check .
```

The suite covers:

1. `100.00` split three ways → `33.34`, `33.33`, `33.33`, balances sum to `0.00`.
2. Exact shares that do not sum to the total → descriptive `422`.
3. Three-decimal (`10.005`), zero, negative, and numeric-JSON amounts → `422`.
4. Repeated `Idempotency-Key` → one row, original expense returned on replay.
5. `alice` can neither read nor write Group 2 → `403`.
6. Non-payer deletion → `403`; payer deletion succeeds.
7. Soft-deleted expenses disappear from balances, lists, and settle-up.
8. Eight concurrent requests with the same key → exactly one expense.

Additional coverage: membership validation, payer validation, immutable routes, payments, seed
idempotency, and PostgreSQL `NUMERIC(12,2)` DDL compilation.

#### Running the suite against PostgreSQL

The default suite is hermetic SQLite. To exercise the real PostgreSQL path, create a dedicated test
database and point `TEST_DATABASE_URL` at it:

```bash
psql -U postgres -c "CREATE DATABASE splitbill_test OWNER splitbill;"

cd backend
# macOS / Linux
TEST_DATABASE_URL=postgresql+psycopg://splitbill:splitbill@localhost:5432/splitbill_test pytest
# Windows PowerShell
$env:TEST_DATABASE_URL='postgresql+psycopg://splitbill:splitbill@localhost:5432/splitbill_test'; pytest
```

For safety, the test fixture refuses a PostgreSQL URL whose database name does not end in `_test`.
It drops and recreates the test schema for each test.

**Verified on PostgreSQL 16.15:** all 68 tests passed, including the eight-thread idempotency race.
The migration and seed script were also applied to a real PostgreSQL 16.15 cluster, and the money
columns were confirmed as `NUMERIC(12,2)`.

### Frontend

```bash
cd frontend
npm test          # Vitest
npm run lint      # ESLint
npm run build     # Next.js production + TypeScript check
```

Vitest covers integer-satang allocation, `0.1 + 0.2 → 0.30`, Thai formatting, exact-split remainder,
and signed API balances.

---

## 6. API reference

All group endpoints require:

```http
X-User: alice
```

Write endpoints accept an optional `Idempotency-Key` header:

```http
Idempotency-Key: 6f2b0c1e-...
```

If omitted, the server generates a key. Replaying the same key for the same group returns the
original record with `200 OK` and `Idempotent-Replayed: true`; the first creation returns `201`.

### 6.1 Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/groups` | Groups of the requesting user |
| `GET` | `/groups/{group_id}` | Group detail with member list |
| `POST` | `/groups/{group_id}/expenses` | Record an immutable expense |
| `GET` | `/groups/{group_id}/expenses` | Active expenses, newest first |
| `DELETE` | `/groups/{group_id}/expenses/{expense_id}` | Payer-only soft delete (`204`) |
| `GET` | `/groups/{group_id}/balances` | Net balances for every member |
| `GET` | `/groups/{group_id}/settle-up` | Greedy settlement suggestions |
| `POST` | `/groups/{group_id}/payments` | Record a repayment (extension) |
| `GET` | `/groups/{group_id}/payments` | List repayments (extension) |
| `GET` | `/health` | Liveness probe |

### 6.2 Error envelope

All expected failures use one shape:

```json
{
  "error": {
    "code": "shares_do_not_match_total",
    "message": "The shares do not add up to the total. Shares total 900.00 THB but the expense is 1000.00 THB (100.00 THB unallocated).",
    "details": { "total": "1000.00", "allocated": "900.00", "difference": "100.00" }
  }
}
```

| Status | When |
|---|---|
| `401` | Missing/blank/unknown `X-User` |
| `403` | Authenticated user is not a member of the group, or is not the expense payer |
| `404` | Group or expense does not exist (for an otherwise valid user) |
| `422` | Validation or business-rule failure |
| `409` | Reserved for conflicts (not currently emitted) |
| `500` | Unexpected invariant/internal failure |

### 6.3 Equal split example

```http
POST /groups/1/expenses
X-User: alice
Idempotency-Key: dinner-2026-11-11
Content-Type: application/json

{
  "description": "Dinner at the night market",
  "paid_by": "alice",
  "amount": "1000.00",
  "split": { "type": "equal", "members": ["alice", "bob", "carol"] }
}
```

`1000.00` becomes `100000` satang. `100000 ÷ 3 = 33333` remainder `1`, so the first listed member
receives the extra satang:

```json
{
  "amount": "1000.00",
  "shares": {
    "alice": "333.34",
    "bob": "333.33",
    "carol": "333.33"
  }
}
```

### 6.4 Exact split example

```json
{
  "description": "Lunch",
  "paid_by": "bob",
  "amount": "1000.00",
  "split": {
    "type": "exact",
    "shares": { "alice": "500.00", "bob": "300.00", "carol": "200.00" }
  }
}
```

If the shares total anything other than `1000.00`, the API rejects the request with
`422 shares_do_not_match_total` and a message stating the difference.

### 6.5 Balance example

```json
{
  "group_id": 1,
  "currency": "THB",
  "members": [
    { "username": "alice", "paid": "1000.00", "owed": "333.34", "balance": "666.66" },
    { "username": "bob", "paid": "0.00", "owed": "333.33", "balance": "-333.33" },
    { "username": "carol", "paid": "0.00", "owed": "333.33", "balance": "-333.33" }
  ],
  "total": "0.00"
}
```

### 6.6 Repayment example

```json
{
  "from_user": "bob",
  "to_user": "alice",
  "amount": "333.33",
  "note": "PromptPay"
}
```

A repayment is treated as: `from_user` paid the amount; `to_user` received it. Net balances move in
the correct direction while the group total remains `0.00`.

---

## 7. Key design decisions

### 7.1 Money storage and precision

- **PostgreSQL:** every monetary column is `NUMERIC(12,2)` (`amount` on expenses, shares, and
  payments). The maximum supported value is `9,999,999,999.99` THB.
- **Python:** money is parsed into `Decimal` from a validated string and immediately converted to
  integer satang for allocation and balance math. No `float` appears in any monetary calculation.
- **API:** amounts are always JSON strings (`"1000.00"`), never JSON numbers. This prevents clients
  and intermediaries from rounding them as binary floats.
- **Validation:** the regex-based parser rejects `1e3`, `1,000.00`, surrounding whitespace, negative
  values, more than two decimals (`10.005`), zero totals, and values outside `NUMERIC(12,2)`.
- **Database defense:** `CHECK (amount > 0)` on expenses/payments and `CHECK (amount >= 0)` on
  shares provide a second line of defense.

### 7.2 Satang allocation algorithm

The rule is implemented exactly as specified:

```text
total_satang = amount in satang
base, remainder = divmod(total_satang, member_count)
each member gets base
the first `remainder` members (in request order) get base + 1
```

For `100.00` across `["alice", "bob", "carol"]`:

```text
10000 divmod 3 = (3333, 1)
alice 3334, bob 3333, carol 3333
```

Sum: `10000` satang = `100.00`. The frontend implements the identical algorithm in
`frontend/src/lib/money.ts` using JavaScript integers. Values are bounded by
`999,999,999,999` satang, far below `Number.MAX_SAFE_INTEGER`.

Exact splits are validated with `sum(shares) == total`. Zero shares are permitted for individual
members (necessary for very small equal splits and for intentionally excluded members), but the
total and all expense amounts must be positive.

### 7.3 Zero-sum invariant

Net balance = paid − owed. Every active expense has shares that sum exactly to its amount; every
repayment is a transfer between two members. Therefore the sum of all net balances must be zero.
`calculate_balances` computes the report in satang and raises an `InvariantError` if the total is not
zero. Tests assert the invariant directly and through the API.

### 7.4 403 Forbidden vs 404 Not Found

Group access uses two distinct outcomes:

- **Group exists, requester is not a member → `403 Forbidden`.**
- **Group ID does not exist → `404 Not Found`.**

Rationale:

- The caller is authenticated as a known user, so the failure is authorization, not authentication.
  `403` is the RFC 9110-correct semantic for “the server understood the request but refuses to
  authorize it.”
- It makes API debugging and client behavior unambiguous: “you are not in this group” is different
  from “this group does not exist.”
- **Trade-off:** `403` reveals that a group ID exists. If information leakage were the dominant
  concern, the alternative is to return `404` for both cases. That hides group existence but makes
  operational debugging harder and conflates authorization with absence. This implementation chooses
  explicit authorization errors, as requested by the assessment.

Unknown/missing `X-User` is an authentication failure and returns `401`.

### 7.5 Idempotency and concurrency

The database is the source of truth:

```sql
UNIQUE (group_id, idempotency_key)
```

Flow for `POST /groups/{id}/expenses`:

1. Validate group access.
2. Look up `(group_id, idempotency_key)`. If found, return the original row and `200`.
3. Validate payer, split members, amount, and allocation.
4. Insert the expense and shares in one transaction.
5. If the unique constraint fires because a concurrent request won the race, roll back, re-read the
   original row, and return it.
6. On SQLite test runs, a brief retry handles `database is locked`; PostgreSQL relies on unique-index
   serialization.

A pure check-then-insert is not safe: two requests can both pass the lookup before either commits.
The unique constraint plus `IntegrityError` recovery is the concurrency boundary. The integration
test fires eight simultaneous HTTP requests with the same key and asserts exactly one row, one `201`,
seven replays, and unchanged balances.

### 7.6 Immutability and soft delete

- There is no update endpoint; expenses are immutable by contract.
- `DELETE` checks that the actor equals `paid_by`; otherwise `403 not_expense_payer`.
- Deletion sets `is_deleted = true` and `deleted_at = now()`, returning `204`.
- Every balance, expense-list, and settle-up query filters `is_deleted = false`.
- The row and its shares remain in PostgreSQL for audit/history.
- Deleting twice is idempotent (`204`) and does not change balances again.

### 7.7 Frontend float elimination

The frontend stores and calculates whole satang using JavaScript integers. It does **not** use
`parseFloat` for money. Input strings are parsed by regex, split into whole/fraction parts, and
converted with integer multiplication and addition. Formatting is manual integer grouping, so
`100000` satang renders as `1,000.00` without a locale-dependent float round-trip.

`frontend/src/lib/format.ts` exposes the Chowpa utility names:
`formatThaiBaht`, `formatSatangThaiBaht`, and `calculateEqualSplit`. They are implemented on top of the
integer-satang helpers rather than the `parseFloat` sample, preserving the zero-float guarantee while
producing the same displayed values.

Examples:

```text
0.1 THB + 0.2 THB → 10 + 20 satang → "0.30"
100.00 / 3        → 3334, 3333, 3333 satang → "33.34", "33.33", "33.33"
```

The live preview mirrors backend order semantics: the frontend sends members in group order, and the
backend distributes remainder satang in exactly that order.

### 7.8 Settle-up (optional extension)

`settle_up` repeatedly matches the largest debtor with the largest creditor until all balances are
zero. It emits at most `n − 1` transfers for `n` members and is deterministic via username tie-breaks.
This is the standard greedy min-cash-flow heuristic. It is **not guaranteed** to find the
mathematically minimum number of transactions for every possible graph (that problem is NP-hard), but
it always produces a valid settlement.

---

## 8. Assumptions and interpretations

1. **`X-User` is authentication.** The four seeded usernames are trusted identities. No passwords, JWT,
   sessions, or cookies are involved.
2. **Any group member may record an expense on behalf of another member.** The payer must belong to
   the group; `X-User` does not have to equal `paid_by`. Deletion is still payer-only. The UI defaults
   the payer to the active user but allows selecting another member.
3. **Equal-split order is meaningful.** The exact list order is preserved by the backend and used for
   remainder distribution. The UI displays and submits group members in their canonical group order.
4. **Exact splits may omit members.** Omitted members owe nothing for that expense. Every listed
   participant must be a group member, and the listed shares must sum exactly to the total.
5. **Zero individual shares are allowed.** This is required for one-satang splits across many members;
   it also allows an explicitly zero share. The total expense must still be > 0.
6. **Idempotency keys are optional.** If absent, the server generates a UUID and the request is not
   replayable by the client. If present, the key is scoped to the group.
7. **Replay returns the original record.** The same key with a different payload does not create a new
   expense and does not error; it returns the originally stored expense. This matches common
   idempotency-key semantics.
8. **Replaying a key whose expense was soft-deleted returns the tombstone** (`is_deleted: true`) rather
   than resurrecting or duplicating it.
9. **Expense ordering is `created_at DESC, id DESC`.** The ID tie-break makes ordering deterministic
   when multiple rows share a timestamp.
10. **Soft-deleted expenses remain visible in the database only.** They are excluded from lists,
    balances, and settlements.
11. **Timestamps are stored with timezone (UTC on the server) and displayed in Asia/Bangkok.**
12. **Currency is THB only.** Amounts are not converted; the API and UI label values as THB.
13. **Group membership is read-only.** There is no group creation or membership management endpoint in
    this assessment; seeded membership defines access.
14. **Repayments are immutable transfers.** They reduce/increase net balances and cannot be edited or
    deleted through the API.

---

## 9. Verification performed

| Gate | Result |
|---|---|
| `pytest` (backend, SQLite) | **68 passed** |
| `pytest` (backend, PostgreSQL 16.15) | **68 passed**, including the concurrency test |
| Alembic upgrade + seed against PostgreSQL 16.15 | pass |
| `docker compose config` (Compose 5.7.0) | pass |
| `docker compose up --build` (Docker Desktop 4.99 / WSL 3.0.5) | **built and booted**; `db` + `api` healthy, `web` serving |
| Containerized migration + seed | pass; 4 users, 2 groups, 5 memberships |
| Browser flow through Compose stack | **verified**: create, balance, repay, soft-delete, list exclusion |
| `ruff check .` | pass |
| `ruff format --check .` | pass |
| `npm test` (Vitest) | **12 passed** |
| `npm run lint` | pass |
| `npm run build` | pass |
| Alembic offline SQL generation (`alembic upgrade head --sql`) | pass, PostgreSQL dialect |

PostgreSQL 16.15 was installed locally (portable binaries, no admin service) and the entire suite was
run against it. Docker Desktop 4.99 with WSL2 3.0.5 was then installed, the stack was built with
`docker compose up --build`, and the browser flow was verified against the containerized PostgreSQL
database. The soft-deleted row and its three shares were confirmed to remain in PostgreSQL while
being excluded from API balances, lists, and settle-up. The demo database was reset to a clean seeded
state afterward. See `AI_NOTES.md` for the exact verification protocol.

---

## 10. Known limitations and next steps

- **Authentication:** replace `X-User` with JWT/OIDC or passkeys, server-side sessions, and proper
  authorization claims.
- **Group management:** add create/rename/archive group, invite/remove member, and membership history.
- **Pagination and search:** expense lists currently return all active rows for a group.
- **Editing:** expenses are intentionally immutable; a future “void and replace” workflow could keep
  the audit trail while supporting corrections.
- **Settlement optimality:** the greedy algorithm is a heuristic; an exact solver could be added for
  small groups where minimum transaction count matters.
- **Payments:** add reversal/refund records and a payment history UI with notes.
- **Real-time:** WebSocket/SSE updates for multi-user sessions.
- **Multi-currency:** store currency per group, convert explicitly with rate snapshots, and never mix
  currencies in one balance report.
- **Operations:** rate limiting, structured audit logs, request IDs, metrics/tracing, backups, and
  migration rollback drills.
- **Test matrix:** an optional `TEST_DATABASE_URL` mode already runs the full suite against PostgreSQL
  16; wire it into CI as a PostgreSQL-service job alongside the hermetic SQLite run. Add a Playwright
  end-to-end suite for the browser flows.
- **Container hardening:** the images are development-grade; add image scanning, pinned base-image
  digests, and production secret management before deployment.

---

## 11. Approximate time spent

| Area | Hours |
|---|---:|
| Backend schema, Alembic, seed | 3.0 |
| Domain services (satang math, allocation, balances, settlement) | 4.0 |
| API, access control, idempotency/concurrency | 6.0 |
| Backend tests and concurrency debugging | 4.0 |
| Frontend UI, live preview, balances, deletion, responsive polish | 7.0 |
| Docker, documentation, manual browser verification | 3.0 |
| **Total** | **27.0** |

---

## 12. Useful commands

```bash
# Backend
cd backend
pytest -q
ruff check .
ruff format --check .
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload

# Frontend
cd frontend
npm test
npm run lint
npm run build
npm run dev

# Everything
docker compose up --build
docker compose down -v
```
