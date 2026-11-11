# AI_NOTES

This document discloses how AI was used, what it got wrong, and how the output was verified. The goal
is transparency: the repository is the result of an AI-assisted implementation, not unreviewed
"vibe coding." Every claim below is reproducible from the code and test commands.

---

## 1. AI tools used

| Tool | Role in this repository |
|---|---|
| **OpenCode coding agent** with **DeepSeek V4.1 Flash** | Generated and iterated on the backend (models, Alembic, services, FastAPI routes, pytest suite, Dockerfile), the Next.js frontend (API client, integer-satang library, components, Tailwind styling), and the documentation. |
| **Ruff** | Automated Python lint/format gate (not an AI tool, but used to reject generated code). |
| **ESLint / TypeScript / Vitest / Next build** | Automated frontend gates. |
| **Pytest** | Automated backend gate, including the concurrency test. |
| **PostgreSQL 16.15 portable + Docker CLI/Compose** | Real-database verification and Compose configuration validation. |
| **Playwright browser automation** | Manual/agent-driven browser verification of user switching, group scoping, live preview, submission, deletion, repayment, and responsive layout. |

No Claude, Gemini, GitHub Copilot, or other model was used in this build. The assistant had access to
the repository and shell, so it could run tests and inspect actual failures rather than guessing.

**Transparency:** AI generated most of the code and prose. The assistant also performed the automated
and browser verification described below. A human reviewer should still review the final diff,
especially security-sensitive choices (authentication, CORS, deployment secrets).

---

## 2. Effective prompts

These are representative prompts that produced high-leverage results.

### Prompt 1 — exact satang allocation

> Implement equal and exact expense splitting for a FastAPI/SQLAlchemy backend. Money must never use
> float. Keep an integer-satang domain service that is framework-free. Equal split must use divmod and
> distribute the remainder one satang at a time to members in the exact order supplied; `100.00` across
> three members must produce `33.34, 33.33, 33.33`. Exact split must reject shares whose sum differs
> from the total with a descriptive error. Add unit tests for the allocation and for `0.1 + 0.2` being
> `0.30`.

Why it worked: it constrained the representation (integer satang), the failure mode (floats), the
algorithm (divmod), the ordering semantics, and the observable tests in one request.

### Prompt 2 — concurrency-safe idempotency

> Harden `POST /groups/{group_id}/expenses` against concurrent retries with the same
> `Idempotency-Key`. A pre-read is required for the normal replay path, but it is not sufficient:
> two requests can both see no row and then insert. Use a database unique constraint on
> `(group_id, idempotency_key)` as the source of truth, catch the integrity violation, roll back, and
> return the row created by the winner. Do not distort balances. Add an integration test that fires at
> least eight simultaneous requests with the same key and asserts exactly one row and one `201`.

Why it worked: it named the race explicitly, required both the fast path and the conflict path, and
specified an executable proof (the concurrency test).

### Prompt 3 — no-float live preview

> Build a client-side live split preview that matches the backend exactly. Use JavaScript integers in
> satang; do not use `parseFloat` for money. Equal splits must allocate remainder satang in member
> order. Exact splits must show “Remaining: X THB” and disable submit until the remainder is exactly
> `0.00`. Format `100000` satang as `1,000.00`, and add Vitest coverage for the `0.1 + 0.2` case.

Why it worked: it specified the representation, the UI behavior, the formatting contract, and the
unit tests.

---

## 3. Incorrect or unsafe AI output and corrections

### Case 1 — floating-point precision loss

**What the AI initially produced (early draft, discarded before commit):**

```python
per_member = round(float(amount) / len(members), 2)
shares = {member: per_member for member in members}
```

This looks reasonable and fails the core requirement:

```text
100.00 / 3 = 33.333333...
round(..., 2) = 33.33
33.33 * 3 = 99.99  ← one satang disappeared
```

It also invites binary-float artifacts (`0.1 + 0.2 = 0.30000000000000004`) and breaks the zero-sum
invariant because the stored shares no longer equal the stored total.

**How it was caught:** the required test
`test_equal_split_100_baht_three_ways_allocates_every_satang` asserts the exact list
`[3334, 3333, 3333]` and `sum == 10000`, not just a rounded display value. A separate unit test
asserts `0.1 + 0.2 == 0.30` via satang.

**Fix:** integer satang with divmod and deterministic remainder distribution:

```python
base, remainder = divmod(total_satang, len(members))
shares = [
    ShareLine(member, base + (1 if index < remainder else 0))
    for index, member in enumerate(members)
]
```

The database stores the result as `NUMERIC(12,2)`, but all arithmetic happens on whole satang. The
frontend mirrors the same algorithm with safe integers.

**Lesson:** rounded per-person amounts are not an allocation algorithm. The invariant must be
`sum(shares) == total`, not `abs(sum(shares) - total) < epsilon`.

### Case 2 — concurrency race in idempotency

**What the AI initially produced:** a check-then-insert service, committed as the first API iteration
(`6977f25`):

```python
existing = get_by_idempotency_key(session, group_id, key)
if existing is not None:
    return existing
expense = build_expense(...)
session.add(expense)
session.commit()
```

Under concurrency, both requests can execute the lookup before either commits:

```text
request A: SELECT → none
request B: SELECT → none
request A: INSERT + COMMIT
request B: INSERT + COMMIT   ← duplicate expense (or 500 if unique constraint fires)
```

A unique constraint alone is not enough if the service does not handle the violation: the second
request would return an internal error instead of the original expense, and the user might retry
again.

**How it was caught:** the concurrency integration test synchronizes eight threads with a barrier,
sends the same key to the real FastAPI app, and asserts:

- all responses are `200` or `201`,
- exactly one response is `201`,
- seven responses carry `Idempotent-Replayed: true`,
- all responses reference the same expense ID,
- the database contains exactly one row,
- balances reflect exactly one expense.

**Fix (`2f38566`):** keep the pre-read for the common case, make the unique constraint
`(group_id, idempotency_key)` the source of truth, and recover from the conflict by rolling back and
re-reading:

```python
try:
    session.add(expense)
    session.commit()
    return created
except IntegrityError:
    session.rollback()
    existing = get_by_idempotency_key(session, group_id, key)
    if existing is not None:
        return replayed(existing)
    raise
```

For SQLite test runs, a bounded retry also handles `database is locked`. PostgreSQL serializes the
unique-index conflict and the loser sees the committed winner.

**Lesson:** “check then insert” is not idempotent under concurrency. The database must enforce the
uniqueness, and the application must translate the violation into the correct replay response.

### Case 3 — signed balances rejected by an unsigned parser (found in a real browser run)

**What the AI initially produced:** a single frontend parser intended for money inputs:

```ts
export function parseSatang(raw: string): number | null {
  // regex only accepts digits and an optional positive decimal
}
```

The parser was reused by the balances panel to read API balance strings. A negative balance such as
`"-33.33"` returned `null`; `amountToSatang` threw, and React unmounted the page:

```text
Uncaught Error: Invalid money amount received from API: -33.33
    at amountToSatang (src/lib/money.ts:115)
    at BalancesPanel (src/components/BalancesPanel.tsx:36)
```

This was not caught by unit tests because the initial tests only parsed positive amounts. It was
caught during the manual browser flow after creating the first expense and rendering balances.

**Fix:** `amountToSatang` and `formatMoneyAmount` now parse an optional leading minus, apply the
unsigned parser to the magnitude, and reapply the sign. A regression test asserts
`amountToSatang("-33.33") === -3333` and `formatMoneyAmount("-1000.00") === "-1,000.00"`.

**Lesson:** input parsing and display parsing have different domains. Signed balances are not user
amount inputs. The browser test caught a gap that the unit suite did not initially cover.

---

## 4. Code review and verification protocol

Every AI-generated change went through four gates before a commit:

### Step 1 — static inspection

- Read the full diff; check imports, type signatures, error paths, transaction boundaries, and access
  checks.
- Verify that money never touches `float` and that every new query filters soft-deleted rows where
  appropriate.
- Check that new endpoints use the shared identity/group dependencies rather than ad-hoc checks.

### Step 2 — lint and format

```bash
cd backend
ruff check .
ruff format --check .

cd ../frontend
npm run lint
```

`ruff` and ESLint were allowed to fail the change; errors were fixed rather than ignored. One
`react-hooks/set-state-in-effect` warning is intentionally suppressed at the client data-fetch effect
because it is the standard “fetch on selected group change” pattern and the rule cannot see the async
fetch. The suppression is scoped to one line with a comment.

### Step 3 — automated tests and build

```bash
cd backend
pytest -q

cd ../frontend
npm test
npm run build
```

Observed results at the final revision:

```text
backend (SQLite): 68 passed
backend (PostgreSQL 16.15): 68 passed
frontend: 9 passed
ruff check: All checks passed
ruff format --check: 57 files already formatted
eslint: no errors
next build: success (static / route)
docker compose config: valid
```

The build also catches TypeScript errors that lint does not, and the browser flow verifies behavior
that unit tests cannot (CORS, layout, state transitions).

### Step 4 — staged diff review

```bash
git diff --staged
git status --short
git commit -m "<conventional commit>"
```

Commits were intentionally incremental: schema, domain services, endpoints, idempotency hardening,
tests, three frontend slices, extension, docs. No single “dump everything” commit. The concurrency
case study can be inspected in history between `6977f25` and `2f38566`.

---

## 5. Verification evidence and environment limitations

| Check | Result |
|---|---|
| `pytest -q` (SQLite) | 68 passed |
| `pytest -q` with `TEST_DATABASE_URL` (PostgreSQL 16.15) | 68 passed, including the 8-thread race |
| Alembic upgrade + seed against PostgreSQL 16.15 | pass; groups 1/2, five memberships, `NUMERIC(12,2)` confirmed |
| `docker compose config` (Docker CLI 29.9.3 / Compose 5.7.0) | valid; services `db`, `api`, `web` |
| `npm test` | 9 passed |
| `ruff check .` / `ruff format --check .` | pass |
| `npm run lint` | pass |
| `npm run build` | pass |
| `alembic upgrade head --sql` | PostgreSQL-dialect SQL generated |
| Browser against PostgreSQL: equal split 100/3 | persisted shares 33.34 / 33.33 / 33.33, balances sum 0.00 |
| Browser: exact split | submit disabled with remainder, enabled at 0.00 |
| Browser: user/group scoping | Alice sees Group 1; Bob sees Groups 1 and 2 |
| Browser: delete | payer sees Delete; non-payer sees “payer only”; balances exclude the tombstone |
| Browser: repayment | Mark paid updates balances and settle-up |
| Browser: mobile | no horizontal overflow at 390px |

**Environment status:** PostgreSQL 16.15 was installed from the official portable Windows binaries,
initialized as a user-owned cluster on port 55432, migrated with Alembic, seeded, and used for the
full test suite and a browser run. Docker CLI and Compose were installed per-user; `docker compose
config` validates the project.

**Remaining limitation:** a Docker **engine** was not available. Docker Desktop/WSL2 requires an
elevated installation and a WSL2 setup, and the session runs at medium integrity (the user is an
administrator but UAC-elevated operations were unavailable). Consequently the `db`/`api`/`web`
containers were not built or booted locally. The Compose file, Dockerfiles, PostgreSQL migration,
seed, and full test suite were verified independently. Installing Docker Desktop and running
`docker compose up --build` remains the final environment check.

The optional PostgreSQL test mode is guarded: `TEST_DATABASE_URL` must name a database ending in
`_test`, so the fixture cannot drop a normal development database. The browser verification now runs
against real PostgreSQL, not SQLite.

These limitations are also listed in `README.md`. They are disclosed rather than hidden.

---

## 6. What was AI-assisted vs. human judgment

**AI-assisted:** implementation of models, migration, services, routes, tests, components, styling,
Dockerfiles, scripts, README, and this file.

**Human judgment required for submission:** security review (the `X-User` scheme is explicitly a
development shortcut), review of the 403/404 information-leak trade-off, PostgreSQL operational
hardening, dependency/version pinning policy, and any production deployment decisions. The
implementer should be able to explain every design choice in `README.md` during a review; the AI
notes are an audit trail, not a substitute for understanding.
