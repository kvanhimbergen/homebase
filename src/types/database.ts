export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          auto_classify_imports: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          auto_classify_imports?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          auto_classify_imports?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string;
          role?: "owner" | "admin" | "member";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          id: string;
          household_id: string;
          email: string;
          token: string;
          status: "pending" | "accepted" | "expired";
          invited_by: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          email: string;
          token?: string;
          status?: "pending" | "accepted" | "expired";
          invited_by: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          email?: string;
          token?: string;
          status?: "pending" | "accepted" | "expired";
          invited_by?: string;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      user_profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          default_household_id: string | null;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          default_household_id?: string | null;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          default_household_id?: string | null;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          icon: string | null;
          color: string | null;
          parent_id: string | null;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          icon?: string | null;
          color?: string | null;
          parent_id?: string | null;
          is_system?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          icon?: string | null;
          color?: string | null;
          parent_id?: string | null;
          is_system?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      plaid_items: {
        Row: {
          id: string;
          household_id: string;
          plaid_item_id: string;
          plaid_access_token: string;
          institution_name: string | null;
          cursor: string | null;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          plaid_item_id: string;
          plaid_access_token: string;
          institution_name?: string | null;
          cursor?: string | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          plaid_item_id?: string;
          plaid_access_token?: string;
          institution_name?: string | null;
          cursor?: string | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plaid_items_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      accounts: {
        Row: {
          id: string;
          household_id: string;
          plaid_item_id: string | null;
          plaid_account_id: string | null;
          name: string;
          official_name: string | null;
          type: string;
          subtype: string | null;
          mask: string | null;
          balance_current: number | null;
          balance_available: number | null;
          is_hidden: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          plaid_item_id?: string | null;
          plaid_account_id?: string | null;
          name: string;
          official_name?: string | null;
          type: string;
          subtype?: string | null;
          mask?: string | null;
          balance_current?: number | null;
          balance_available?: number | null;
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          plaid_item_id?: string | null;
          plaid_account_id?: string | null;
          name?: string;
          official_name?: string | null;
          type?: string;
          subtype?: string | null;
          mask?: string | null;
          balance_current?: number | null;
          balance_available?: number | null;
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          household_id: string;
          account_id: string | null;
          category_id: string | null;
          plaid_transaction_id: string | null;
          amount: number;
          date: string;
          name: string;
          merchant_name: string | null;
          notes: string | null;
          source: "plaid" | "manual" | "csv" | "ofx" | "email" | "receipt";
          ai_category_confidence: number | null;
          classified_by: "user" | "ai" | "plaid" | null;
          is_split: boolean;
          parent_transaction_id: string | null;
          import_hash: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          account_id?: string | null;
          category_id?: string | null;
          plaid_transaction_id?: string | null;
          amount: number;
          date: string;
          name: string;
          merchant_name?: string | null;
          notes?: string | null;
          source: "plaid" | "manual" | "csv" | "ofx" | "email" | "receipt";
          ai_category_confidence?: number | null;
          classified_by?: "user" | "ai" | "plaid" | null;
          is_split?: boolean;
          parent_transaction_id?: string | null;
          import_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          account_id?: string | null;
          category_id?: string | null;
          plaid_transaction_id?: string | null;
          amount?: number;
          date?: string;
          name?: string;
          merchant_name?: string | null;
          notes?: string | null;
          source?: "plaid" | "manual" | "csv" | "ofx" | "email" | "receipt";
          ai_category_confidence?: number | null;
          classified_by?: "user" | "ai" | "plaid" | null;
          is_split?: boolean;
          parent_transaction_id?: string | null;
          import_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      budgets: {
        Row: {
          id: string;
          household_id: string;
          category_id: string;
          amount: number;
          period: "monthly" | "weekly" | "yearly";
          start_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          category_id: string;
          amount: number;
          period?: "monthly" | "weekly" | "yearly";
          start_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          category_id?: string;
          amount?: number;
          period?: "monthly" | "weekly" | "yearly";
          start_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "budgets_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      receipt_scans: {
        Row: {
          id: string;
          household_id: string;
          storage_path: string;
          status: "pending" | "processing" | "completed" | "failed";
          extracted_data: Json;
          line_items: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          storage_path: string;
          status?: "pending" | "processing" | "completed" | "failed";
          extracted_data?: Json;
          line_items?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          storage_path?: string;
          status?: "pending" | "processing" | "completed" | "failed";
          extracted_data?: Json;
          line_items?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "receipt_scans_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          storage_path: string;
          file_type: string;
          file_size: number | null;
          tags: string[];
          expires_at: string | null;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          storage_path: string;
          file_type: string;
          file_size?: number | null;
          tags?: string[];
          expires_at?: string | null;
          uploaded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          storage_path?: string;
          file_type?: string;
          file_size?: number | null;
          tags?: string[];
          expires_at?: string | null;
          uploaded_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      email_rules: {
        Row: {
          id: string;
          household_id: string;
          sender_pattern: string;
          subject_pattern: string | null;
          action: "create_transaction" | "attach_receipt" | "ignore";
          category_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          sender_pattern: string;
          subject_pattern?: string | null;
          action: "create_transaction" | "attach_receipt" | "ignore";
          category_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          sender_pattern?: string;
          subject_pattern?: string | null;
          action?: "create_transaction" | "attach_receipt" | "ignore";
          category_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_rules_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      user_household_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      spending_by_category: {
        Args: {
          p_household_id: string;
          p_start: string;
          p_end: string;
        };
        Returns: {
          category_id: string;
          category_name: string;
          category_color: string | null;
          category_icon: string | null;
          total: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    Views: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
