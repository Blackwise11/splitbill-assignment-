import type {
  Balances,
  Expense,
  ExpenseCreate,
  ExpenseList,
  Group,
  Payment,
  PaymentCreate,
  SettleUp,
} from "@/lib/types";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  detail?: string | Array<{ msg?: string }>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, message: string, code = "request_failed", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) {
    return "Cannot reach the SplitBill API. Is the FastAPI server running on port 8000?";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

async function request<T>(
  path: string,
  user: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("X-User", user);
  if (init.body) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new TypeError("Network request failed");
  }

  if (!response.ok) {
    let body: ApiErrorBody = {};
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // Non-JSON error response.
    }
    const fallback =
      typeof body.detail === "string"
        ? body.detail
        : Array.isArray(body.detail)
          ? body.detail[0]?.msg
          : undefined;
    throw new ApiError(
      response.status,
      body.error?.message ?? fallback ?? `Request failed (${response.status}).`,
      body.error?.code ?? "request_failed",
      body.error?.details,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function getGroups(user: string): Promise<Group[]> {
  return request<Group[]>("/groups", user);
}

export function getExpenses(groupId: number, user: string): Promise<ExpenseList> {
  return request<ExpenseList>(`/groups/${groupId}/expenses`, user);
}

export function createExpense(
  groupId: number,
  user: string,
  payload: ExpenseCreate,
  idempotencyKey: string,
): Promise<Expense> {
  return request<Expense>(`/groups/${groupId}/expenses`, user, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
  });
}

export function deleteExpense(groupId: number, expenseId: number, user: string): Promise<void> {
  return request<void>(`/groups/${groupId}/expenses/${expenseId}`, user, {
    method: "DELETE",
  });
}

export function getBalances(groupId: number, user: string): Promise<Balances> {
  return request<Balances>(`/groups/${groupId}/balances`, user);
}

export function getSettleUp(groupId: number, user: string): Promise<SettleUp> {
  return request<SettleUp>(`/groups/${groupId}/settle-up`, user);
}

export function createPayment(
  groupId: number,
  user: string,
  payload: PaymentCreate,
  idempotencyKey: string,
): Promise<Payment> {
  return request<Payment>(`/groups/${groupId}/payments`, user, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
  });
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `splitbill-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
