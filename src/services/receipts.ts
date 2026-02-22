import { supabase } from "@/lib/supabase";
import { invokeFn } from "@/lib/invoke-fn";
import type { InsertTables, Tables } from "@/types/database";

export interface ReceiptLineItem {
  name: string;
  amount: number;
  category: string;
  category_id: string | null;
  confidence: number;
}

export interface ReceiptExtractedData {
  merchant?: string;
  date?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  error?: string;
}

export interface ProcessReceiptResult {
  receipt_scan_id: string;
  status: "completed" | "failed";
}

export async function uploadReceiptImage(
  householdId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `receipts/${householdId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("household-files")
    .upload(path, file);

  if (error) throw error;
  return path;
}

export async function createReceiptScan(
  data: InsertTables<"receipt_scans">
): Promise<Tables<"receipt_scans">> {
  const { data: scan, error } = await supabase
    .from("receipt_scans")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return scan;
}

export async function getReceiptScan(
  id: string
): Promise<Tables<"receipt_scans">> {
  const { data, error } = await supabase
    .from("receipt_scans")
    .select()
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function processReceipt(
  receiptScanId: string,
  householdId: string
): Promise<ProcessReceiptResult> {
  return invokeFn<ProcessReceiptResult>("process-receipt", {
    receipt_scan_id: receiptScanId,
    household_id: householdId,
  });
}
