import { useState, useRef } from "react";
import {
  Search,
  Upload,
  FileText,
  Download,
  Trash2,
  Tag,
  Clock,
  X,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useDocuments, useUploadDocument, useDeleteDocument } from "@/hooks/useDocuments";
import { DOCUMENT_TAGS, getDocumentUrl } from "@/services/documents";
import { formatDate } from "@/lib/formatters";
import type { Tables } from "@/types/database";
import { toast } from "sonner";

export function Component() {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Tables<"documents"> | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const { data: documents, isLoading } = useDocuments(search || undefined);
  const deleteDoc = useDeleteDocument();

  const filtered = tagFilter
    ? documents?.filter((d) => d.tags.includes(tagFilter))
    : documents;

  async function handlePreview(doc: Tables<"documents">) {
    setPreviewDoc(doc);
    const url = await getDocumentUrl(doc.storage_path);
    setPreviewUrl(url);
  }

  async function handleDownload(doc: Tables<"documents">) {
    const url = await getDocumentUrl(doc.storage_path);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name;
    a.click();
  }

  async function handleDelete(id: string) {
    try {
      await deleteDoc.mutateAsync(id);
      toast.success("Document deleted");
      if (previewDoc?.id === id) setPreviewDoc(null);
    } catch {
      toast.error("Failed to delete document");
    }
  }

  const isExpiringSoon = (doc: Tables<"documents">) => {
    if (!doc.expires_at) return false;
    const diff = new Date(doc.expires_at).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // 30 days
  };

  const isExpired = (doc: Tables<"documents">) => {
    if (!doc.expires_at) return false;
    return new Date(doc.expires_at).getTime() < Date.now();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documents</h1>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-1" />
          Upload
        </Button>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={tagFilter || "__all__"}
              onValueChange={(v) => setTagFilter(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="All tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All tags</SelectItem>
                {DOCUMENT_TAGS.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Document Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-12 w-12 mb-3" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                No documents uploaded yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Upload important household documents like insurance, warranties,
                and tax records.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <Card
              key={doc.id}
              className="group cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => handlePreview(doc)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(doc);
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm font-medium truncate mb-1">{doc.name}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {formatDate(doc.created_at)}
                  {doc.file_size
                    ? ` \u00b7 ${(doc.file_size / 1024).toFixed(0)} KB`
                    : ""}
                </p>
                <div className="flex flex-wrap gap-1">
                  {doc.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] h-5">
                      <Tag className="h-2.5 w-2.5 mr-0.5" />
                      {tag}
                    </Badge>
                  ))}
                  {isExpired(doc) && (
                    <Badge variant="destructive" className="text-[10px] h-5">
                      <Clock className="h-2.5 w-2.5 mr-0.5" />
                      Expired
                    </Badge>
                  )}
                  {isExpiringSoon(doc) && !isExpired(doc) && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 text-yellow-600 border-yellow-300"
                    >
                      <Clock className="h-2.5 w-2.5 mr-0.5" />
                      Expiring Soon
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />

      {/* Preview Panel */}
      <Sheet
        open={!!previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
      >
        <SheetContent className="w-[500px] sm:w-[600px]">
          {previewDoc && (
            <>
              <SheetHeader>
                <SheetTitle className="truncate">{previewDoc.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-1">
                  {previewDoc.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    {previewDoc.file_type}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Uploaded:</span>{" "}
                    {formatDate(previewDoc.created_at)}
                  </p>
                  {previewDoc.expires_at && (
                    <p>
                      <span className="text-muted-foreground">Expires:</span>{" "}
                      {formatDate(previewDoc.expires_at)}
                    </p>
                  )}
                </div>
                {previewUrl && (
                  <div className="border rounded-lg overflow-hidden">
                    {previewDoc.file_type.startsWith("image/") ? (
                      <img
                        src={previewUrl}
                        alt={previewDoc.name}
                        className="w-full"
                      />
                    ) : previewDoc.file_type === "application/pdf" ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-[500px]"
                        title={previewDoc.name}
                      />
                    ) : (
                      <div className="p-8 text-center">
                        <Eye className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Preview not available for this file type.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => handleDownload(previewDoc)}
                        >
                          <Download className="h-4 w-4 mr-1" /> Download
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDownload(previewDoc)}
                  >
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(previewDoc.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function UploadDocumentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadDoc = useUploadDocument();

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!name) setName(f.name);
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !name) return;

    try {
      await uploadDoc.mutateAsync({
        file,
        name,
        tags: selectedTags,
        expiresAt: expiresAt || undefined,
      });
      toast.success("Document uploaded");
      onOpenChange(false);
      setFile(null);
      setName("");
      setSelectedTags([]);
      setExpiresAt("");
    } catch {
      toast.error("Failed to upload document");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-2">
            <Label>Document Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Home Insurance Policy 2026"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {DOCUMENT_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expiration Date (optional)</Label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

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
