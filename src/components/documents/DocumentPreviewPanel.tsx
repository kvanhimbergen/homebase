import { useState, useRef, useEffect } from "react";
import {
  Download,
  Trash2,
  Eye,
  Star,
  Upload,
  History,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
  useDocumentCategoryTree,
  useDocumentVersions,
  useUpdateDocument,
  useToggleFavorite,
  useUploadNewVersion,
} from "@/hooks/useDocuments";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { getDocumentUrl } from "@/services/documents";
import type { DocumentWithCategory } from "@/services/documents";
import { formatDate } from "@/lib/formatters";
import { DOCUMENT_METADATA_FIELDS } from "@/lib/constants";
import { DocumentCategoryIcon } from "@/lib/icons";
import type { Json } from "@/types/database";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DocumentPreviewPanelProps {
  document: DocumentWithCategory | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function DocumentPreviewPanel({
  document: doc,
  onClose,
  onDelete,
}: DocumentPreviewPanelProps) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editMemberId, setEditMemberId] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editMetadata, setEditMetadata] = useState<Record<string, string>>({});
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [showVersions, setShowVersions] = useState(false);
  const versionFileRef = useRef<HTMLInputElement>(null);

  const categoryTree = useDocumentCategoryTree();
  const { data: members } = useHouseholdMembers();
  const { data: versions } = useDocumentVersions(
    showVersions ? doc?.version_group_id ?? null : null
  );
  const updateDoc = useUpdateDocument();
  const toggleFav = useToggleFavorite();
  const uploadVersion = useUploadNewVersion();

  // Reset state when document changes
  const docId = doc?.id ?? null;
  useEffect(() => {
    setIsEditing(false);
    setShowVersions(false);
    if (doc) {
      getDocumentUrl(doc.storage_path).then(setPreviewUrl);
    } else {
      setPreviewUrl("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  function startEditing() {
    if (!doc) return;
    setEditName(doc.name);
    setEditCategoryId(doc.category_id ?? "");
    setEditMemberId(doc.member_id ?? "");
    setEditYear(doc.document_year?.toString() ?? "");
    setEditNotes(doc.notes ?? "");
    setEditExpiresAt(doc.expires_at ? doc.expires_at.split("T")[0] : "");
    setEditMetadata(
      typeof doc.metadata === "object" && doc.metadata !== null
        ? (doc.metadata as Record<string, string>)
        : {}
    );
    setIsEditing(true);
  }

  async function saveEdits() {
    if (!doc) return;
    try {
      await updateDoc.mutateAsync({
        id: doc.id,
        data: {
          name: editName,
          category_id: editCategoryId || null,
          member_id: editMemberId || null,
          document_year: editYear ? parseInt(editYear) : null,
          notes: editNotes || null,
          expires_at: editExpiresAt || null,
          metadata: (Object.keys(editMetadata).length > 0
            ? editMetadata
            : {}) as Json,
        },
      });
      toast.success("Document updated");
      setIsEditing(false);
    } catch {
      toast.error("Failed to update document");
    }
  }

  async function handleToggleFavorite() {
    if (!doc) return;
    try {
      await toggleFav.mutateAsync({
        id: doc.id,
        isFavorite: !doc.is_favorite,
      });
    } catch {
      toast.error("Failed to update favorite");
    }
  }

  async function handleDownload() {
    if (!doc) return;
    const url = await getDocumentUrl(doc.storage_path);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = doc.name;
    a.click();
  }

  async function handleVersionUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !doc) return;
    try {
      await uploadVersion.mutateAsync({ existingDoc: doc, file });
      toast.success("New version uploaded");
    } catch {
      toast.error("Failed to upload new version");
    }
    e.target.value = "";
  }

  async function handleVersionDownload(storagePath: string, name: string) {
    const url = await getDocumentUrl(storagePath);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  }

  // Find parent category for metadata fields
  const parentCategory = (() => {
    const catId = isEditing ? editCategoryId : doc?.category_id;
    if (!catId) return null;
    const direct = categoryTree.find((c) => c.id === catId);
    if (direct) return direct;
    return categoryTree.find((c) => c.children.some((ch) => ch.id === catId)) ?? null;
  })();

  const metadataFields = parentCategory
    ? DOCUMENT_METADATA_FIELDS[parentCategory.name]
    : undefined;

  const memberName = members?.find(
    (m) => m.user_id === doc?.member_id
  )?.display_name;

  const categoryName = doc?.document_categories?.name;

  return (
    <Sheet open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
        {doc && (
          <>
            <SheetHeader>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <SheetTitle className="truncate">{doc.name}</SheetTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(doc.created_at)}
                    {doc.file_size
                      ? ` · ${(doc.file_size / 1024).toFixed(0)} KB`
                      : ""}
                    {doc.version > 1 ? ` · v${doc.version}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleToggleFavorite}
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      doc.is_favorite
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    )}
                  />
                </Button>
              </div>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              {/* Category + Member badges */}
              <div className="flex flex-wrap gap-2">
                {categoryName && (
                  <Badge
                    variant="secondary"
                    className="gap-1"
                    style={{
                      borderColor: doc.document_categories?.color
                        ? doc.document_categories.color
                        : undefined,
                    }}
                  >
                    <DocumentCategoryIcon iconName={doc?.document_categories?.icon ?? null} className="h-3 w-3" />
                    {categoryName}
                  </Badge>
                )}
                {memberName && (
                  <Badge variant="outline">{memberName}</Badge>
                )}
                {doc.document_year && (
                  <Badge variant="outline">{doc.document_year}</Badge>
                )}
              </div>

              {/* Info section (read-only or edit mode) */}
              {isEditing ? (
                <div className="space-y-3 border rounded-lg p-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Category</Label>
                      <Select
                        value={editCategoryId || "__none__"}
                        onValueChange={(v) =>
                          setEditCategoryId(v === "__none__" ? "" : v)
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {categoryTree.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                          {categoryTree.flatMap((cat) =>
                            cat.children.map((sub) => (
                              <SelectItem key={sub.id} value={sub.id}>
                                &nbsp;&nbsp;{sub.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Family Member</Label>
                      <Select
                        value={editMemberId || "__none__"}
                        onValueChange={(v) =>
                          setEditMemberId(v === "__none__" ? "" : v)
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
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
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Year</Label>
                      <Input
                        type="number"
                        value={editYear}
                        onChange={(e) => setEditYear(e.target.value)}
                        className="h-8 text-sm"
                        min={1900}
                        max={2100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Expires</Label>
                      <Input
                        type="date"
                        value={editExpiresAt}
                        onChange={(e) => setEditExpiresAt(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  {metadataFields && metadataFields.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {metadataFields.map((field) => (
                        <div key={field.key} className="space-y-1">
                          <Label className="text-xs">{field.label}</Label>
                          <Input
                            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                            value={editMetadata[field.key] ?? ""}
                            onChange={(e) =>
                              setEditMetadata((prev) => ({
                                ...prev,
                                [field.key]: e.target.value,
                              }))
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs">Notes</Label>
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdits} disabled={updateDoc.isPending}>
                      {updateDoc.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    {doc.file_type}
                  </p>
                  {doc.expires_at && (
                    <p>
                      <span className="text-muted-foreground">Expires:</span>{" "}
                      {formatDate(doc.expires_at)}
                    </p>
                  )}
                  {doc.notes && (
                    <p>
                      <span className="text-muted-foreground">Notes:</span>{" "}
                      {doc.notes}
                    </p>
                  )}
                  {/* Metadata fields display */}
                  {metadataFields &&
                    doc.metadata &&
                    typeof doc.metadata === "object" &&
                    Object.entries(doc.metadata as Record<string, string>)
                      .filter(([, v]) => v)
                      .map(([key, value]) => {
                        const field = metadataFields.find(
                          (f) => f.key === key
                        );
                        return (
                          <p key={key}>
                            <span className="text-muted-foreground">
                              {field?.label ?? key}:
                            </span>{" "}
                            {value}
                          </p>
                        );
                      })}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-xs"
                    onClick={startEditing}
                  >
                    Edit details
                  </Button>
                </div>
              )}

              {/* Preview */}
              {previewUrl && (
                <div className="border rounded-lg overflow-hidden">
                  {doc.file_type.startsWith("image/") ? (
                    <img
                      src={previewUrl}
                      alt={doc.name}
                      className="w-full"
                    />
                  ) : doc.file_type === "application/pdf" ? (
                    <iframe
                      src={previewUrl}
                      className="w-full h-[400px]"
                      title={doc.name}
                    />
                  ) : (
                    <div className="p-8 text-center">
                      <Eye className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Preview not available for this file type.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Version history */}
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => setShowVersions(!showVersions)}
                >
                  <History className="h-3.5 w-3.5" />
                  {showVersions ? "Hide" : "Show"} Version History
                  {doc.version > 1 && ` (${doc.version} versions)`}
                </Button>
                {showVersions && versions && (
                  <div className="mt-2 space-y-1">
                    {versions.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between text-xs p-2 rounded hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>
                            v{v.version} — {formatDate(v.created_at)}
                          </span>
                          {v.is_latest_version && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-4"
                            >
                              Current
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            handleVersionDownload(v.storage_path, v.name)
                          }
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-1" /> Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => versionFileRef.current?.click()}
                  disabled={uploadVersion.isPending}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {uploadVersion.isPending ? "Uploading..." : "New Version"}
                </Button>
                <input
                  ref={versionFileRef}
                  type="file"
                  className="hidden"
                  onChange={handleVersionUpload}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(doc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

