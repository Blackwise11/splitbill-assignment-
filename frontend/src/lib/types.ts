export const USERS = ["alice", "bob", "carol", "dan"] as const;
export type User = (typeof USERS)[number];

export interface Group {
  id: number;
  name: string;
  members: string[];
  member_count: number;
}

export type SplitType = "equal" | "exact";

export interface EqualSplitInput {
  type: "equal";
  members: string[];
}

export interface ExactSplitInput {
  type: "exact";
  shares: Record<string, string>;
}

export type SplitInput = EqualSplitInput | ExactSplitInput;

export interface ExpenseCreate {
  description: string;
  paid_by: string;
  amount: string;
  split: SplitInput;
}

export interface Expense {
  id: number;
  group_id: number;
  description: string;
  amount: string;
  paid_by: string;
  split_type: SplitType;
  shares: Record<string, string>;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
}

export interface ExpenseList {
  expenses: Expense[];
  count: number;
}

export interface BalanceLine {
  username: string;
  paid: string;
  owed: string;
  balance: string;
}

export interface Balances {
  group_id: number;
  currency: string;
  members: BalanceLine[];
  total: string;
}

export interface Transfer {
  from_user: string;
  to_user: string;
  amount: string;
}

export interface SettleUp {
  group_id: number;
  currency: string;
  transactions: Transfer[];
  transaction_count: number;
}

export interface PaymentCreate {
  from_user: string;
  to_user: string;
  amount: string;
  note?: string | null;
}

export interface Payment {
  id: number;
  group_id: number;
  from_user: string;
  to_user: string;
  amount: string;
  note: string | null;
  created_at: string;
}

export interface PaymentList {
  payments: Payment[];
  count: number;
}
