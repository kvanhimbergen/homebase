import { useState, useRef } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUploadDocument, useDocumentCategoryTree } from "@/hooks/useDocuments";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { DOCUMENT_METADATA_FIELDS } from "@/lib/constants";
import type { Json } from "@/types/database";
import { toast } from "sonner";

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategoryId?: string;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  defaultCategoryId,
}: UploadDocumentDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [documentYear, setDocumentYear] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadDoc = useUploadDocument();
  const categoryTree = useDocumentCategoryTree();
  const { data: members } = useHouseholdMembers();

  // Set default category on open
  const selectedParent = categoryTree.find((c) => c.id === parentCategoryId);
  const selectedCategoryId = subcategoryId || parentCategoryId;

  // Resolve default category to parent if needed
  function handleOpenChange(isOpen: boolean) {
    if (isOpen && defaultCategoryId) {
      const parent = categoryTree.find((c) => c.id === defaultCategoryId);
      if (parent) {
        setParentCategoryId(defaultCategoryId);
      } else {
        const parentOfSub = categoryTree.find((c) =>
          c.children.some((ch) => ch.id === defaultCategoryId)
        );
        if (parentOfSub) {
          setParentCategoryId(parentOfSub.id);
          setSubcategoryId(defaultCategoryId);
        }
      }
    }
    onOpenChange(isOpen);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!name) setName(f.name.replace(/\.[^/.]+$/, ""));
    }
  }

  function handleMetadataChange(key: string, value: string) {
    setMetadata((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setFile(null);
    setName("");
    setParentCategoryId("");
    setSubcategoryId("");
    setMemberId("");
    setDocumentYear("");
    setExpiresAt("");
    setNotes("");
    setMetadata({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !name) return;

    try {
      await uploadDoc.mutateAsync({
        file,
        name,
        categoryId: selectedCategoryId || undefined,
        memberId: memberId || undefined,
        documentYear: documentYear ? parseInt(documentYear) : undefined,
        expiresAt: expiresAt || undefined,
        notes: notes || undefined,
        metadata: Object.keys(metadata).length > 0 ? (metadata as Json) : undefined,
      });
      toast.success("Document uploaded");
      onOpenChange(false);
      resetForm();
    } catch {
      toast.error("Failed to upload document");
    }
  }

  const metadataFields = selectedParent
    ? DOCUMENT_METADATA_FIELDS[selectedParent.name]
    : undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File picker */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <div className="flex items-center gap-2 justify-center">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to select a file
                </p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Document name */}
          <div className="space-y-2">
            <Label>Document Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Home Insurance Policy 2026"
              required
            />
          </div>

          {/* Category - two level */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={parentCategoryId || "__none__"}
                onValueChange={(v) => {
                  setParentCategoryId(v === "__none__" ? "" : v);
                  setSubcategoryId("");
                  setMetadata({});
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {categoryTree.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedParent && selectedParent.children.length > 0 && (
              <div className="space-y-2">
                <Label>Subcategory</Label>
                <Select
                  value={subcategoryId || "__none__"}
                  onValueChange={(v) =>
                    setSubcategoryId(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">General</SelectItem>
                    {selectedParent.children.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Family member + Year */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Family Member</Label>
              <Select
                value={memberId || "__none__"}
                onValueChange={(v) =>
                  setMemberId(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {members?.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.display_name || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input
                type="number"
                value={documentYear}
                onChange={(e) => setDocumentYear(e.target.value)}
                placeholder="e.g. 2026"
                min={1900}
                max={2100}
              />
            </div>
          </div>

          {/* Dynamic metadata fields based on category */}
          {metadataFields && metadataFields.length > 0 && (
            <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {selectedParent!.name} Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                {metadataFields.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-xs">{field.label}</Label>
                    <Input
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                      value={metadata[field.key] ?? ""}
                      onChange={(e) =>
                        handleMetadataChange(field.key, e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expiration date */}
          <div className="space-y-2">
            <Label>Expiration Date (optional)</Label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!file || uploadDoc.isPending}>
              {uploadDoc.isPending ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
