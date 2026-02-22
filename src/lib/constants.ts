export const CATEGORY_COLORS = [
  "var(--color-category-1)",
  "var(--color-category-2)",
  "var(--color-category-3)",
  "var(--color-category-4)",
  "var(--color-category-5)",
  "var(--color-category-6)",
  "var(--color-category-7)",
  "var(--color-category-8)",
  "var(--color-category-9)",
  "var(--color-category-10)",
  "var(--color-category-11)",
  "var(--color-category-12)",
  "var(--color-category-13)",
] as const;

export const TRANSACTION_SOURCES = [
  "plaid",
  "manual",
  "csv",
  "ofx",
  "email",
  "receipt",
] as const;

export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];
