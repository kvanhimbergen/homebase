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
  "var(--color-category-14)",
  "var(--color-category-15)",
  "var(--color-category-16)",
  "var(--color-category-17)",
  "var(--color-category-18)",
  "var(--color-category-19)",
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

export interface MetadataFieldConfig {
  key: string;
  label: string;
  type: "text" | "date" | "number";
}

export const DOCUMENT_METADATA_FIELDS: Record<string, MetadataFieldConfig[]> = {
  Identity: [
    { key: "id_number", label: "ID Number", type: "text" },
    { key: "issuing_authority", label: "Issuing Authority", type: "text" },
    { key: "issue_date", label: "Issue Date", type: "date" },
    { key: "expiry_date", label: "Expiry Date", type: "date" },
  ],
  Medical: [
    { key: "provider", label: "Provider", type: "text" },
    { key: "member_id", label: "Member ID", type: "text" },
    { key: "group_number", label: "Group Number", type: "text" },
  ],
  Tax: [
    { key: "tax_year", label: "Tax Year", type: "number" },
    { key: "form_type", label: "Form Type", type: "text" },
  ],
  Insurance: [
    { key: "policy_number", label: "Policy Number", type: "text" },
    { key: "provider", label: "Provider", type: "text" },
    { key: "premium", label: "Premium", type: "number" },
    { key: "coverage_start", label: "Coverage Start", type: "date" },
    { key: "coverage_end", label: "Coverage End", type: "date" },
  ],
  "Loans & Debt": [
    { key: "lender", label: "Lender", type: "text" },
    { key: "account_number", label: "Account Number", type: "text" },
    { key: "interest_rate", label: "Interest Rate (%)", type: "number" },
  ],
  Financial: [
    { key: "institution", label: "Institution", type: "text" },
    { key: "account_number", label: "Account Number", type: "text" },
    { key: "statement_period", label: "Statement Period", type: "text" },
  ],
  Legal: [
    { key: "attorney", label: "Attorney", type: "text" },
    { key: "effective_date", label: "Effective Date", type: "date" },
  ],
  Home: [
    { key: "property_address", label: "Property Address", type: "text" },
    { key: "purchase_date", label: "Purchase Date", type: "date" },
  ],
  Auto: [
    { key: "vin", label: "VIN", type: "text" },
    { key: "make_model", label: "Make/Model", type: "text" },
    { key: "year", label: "Year", type: "number" },
  ],
  Education: [
    { key: "institution", label: "Institution", type: "text" },
    { key: "student_name", label: "Student Name", type: "text" },
  ],
  Employment: [
    { key: "employer", label: "Employer", type: "text" },
    { key: "position", label: "Position", type: "text" },
  ],
  Pets: [
    { key: "pet_name", label: "Pet Name", type: "text" },
    { key: "veterinarian", label: "Veterinarian", type: "text" },
  ],
};
