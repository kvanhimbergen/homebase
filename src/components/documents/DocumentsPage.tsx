import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Upload,
  FileText,
  Download,
  Trash2,
  Clock,
  Star,
  FolderOpen,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useDocuments,
  useDocumentCategories,
  useDocumentCategoryTree,
  useDeleteDocument,
  useToggleFavorite,
} from "@/hooks/useDocuments";
import { useHousehold } from "@/hooks/useHousehold";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { seedDefaultDocumentCategories } from "@/services/household";
import { getDocumentUrl } from "@/services/documents";
import type { DocumentWithCategory } from "@/services/documents";
import type { DocumentFilterOptions } from "@/services/documents";
import { formatDate } from "@/lib/formatters";
import { DocumentCategoryIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { UploadDocumentDialog } from "./UploadDocumentDialog";
import { DocumentPreviewPanel } from "./DocumentPreviewPanel";

// Date.now() outside render to satisfy React compiler purity rules
function globalNow() {
  return Date.now();
}

type SidebarView = "all" | "favorites" | "expiring" | string; // string = categoryId

export function Component() {
  const [activeView, setActiveView] = useState<SidebarView>("all");
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentWithCategory | null>(
    null
  );
  const seededRef = useRef(false);

  const { currentHouseholdId } = useHousehold();
  const { data: categories, isLoading: categoriesLoading } =
    useDocumentCategories();
  const categoryTree = useDocumentCategoryTree();
  const { data: members } = useHouseholdMembers();
  const queryClient = useQueryClient();

  // Build filter options from sidebar view
  const filters: DocumentFilterOptions = {
    search: search || undefined,
    ...(activeView === "favorites" && { favoritesOnly: true }),
    ...(activeView === "expiring" && { expiringSoon: true }),
    ...(activeView !== "all" &&
      activeView !== "favorites" &&
      activeView !== "expiring" && { categoryId: activeView }),
  };

  const { data: documents, isLoading: docsLoading } = useDocuments(filters);
  const deleteDoc = useDeleteDocument();
  const toggleFav = useToggleFavorite();

  // Lazy backfill: seed categories if empty
  useEffect(() => {
    if (
      !categoriesLoading &&
      categories &&
      categories.length === 0 &&
      currentHouseholdId &&
      !seededRef.current
    ) {
      seededRef.current = true;
      seedDefaultDocumentCategories(currentHouseholdId)
        .then(() => {
          queryClient.invalidateQueries({
            queryKey: ["document-categories"],
          });
        })
        .catch(() => {
          // Silently fail — user can still use the page
        });
    }
  }, [categories, categoriesLoading, currentHouseholdId, queryClient]);

  async function handleDelete(id: string) {
    try {
      await deleteDoc.mutateAsync(id);
      toast.success("Document deleted");
      if (previewDoc?.id === id) setPreviewDoc(null);
    } catch {
      toast.error("Failed to delete document");
    }
  }

  async function handleDownload(doc: DocumentWithCategory) {
    const url = await getDocumentUrl(doc.storage_path);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name;
    a.click();
  }

  const handleToggleFavorite = useCallback(
    async (e: React.MouseEvent, doc: DocumentWithCategory) => {
      e.stopPropagation();
      try {
        await toggleFav.mutateAsync({
          id: doc.id,
          isFavorite: !doc.is_favorite,
        });
      } catch {
        toast.error("Failed to update favorite");
      }
    },
    [toggleFav]
  );

  const isExpiringSoon = useCallback(
    (doc: DocumentWithCategory) => {
      if (!doc.expires_at) return false;
      const expiresMs = new Date(doc.expires_at).getTime();
      const nowMs = globalNow();
      const diff = expiresMs - nowMs;
      return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
    },
    []
  );

  const isExpired = useCallback(
    (doc: DocumentWithCategory) => {
      if (!doc.expires_at) return false;
      return new Date(doc.expires_at).getTime() < globalNow();
    },
    []
  );

  // Compute view title
  const getViewTitle = () => {
    if (activeView === "all") return "All Documents";
    if (activeView === "favorites") return "Favorites";
    if (activeView === "expiring") return "Expiring Soon";
    const cat = categories?.find((c) => c.id === activeView);
    return cat?.name ?? "Documents";
  };

  // Find default category for upload
  const getUploadDefaultCategory = () => {
    if (
      activeView !== "all" &&
      activeView !== "favorites" &&
      activeView !== "expiring"
    ) {
      return activeView;
    }
    return undefined;
  };

  const getMemberName = (memberId: string | null) => {
    if (!memberId) return null;
    return members?.find((m) => m.user_id === memberId)?.display_name ?? null;
  };

  const isLoading = docsLoading || categoriesLoading;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Document Vault</h1>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-1" />
          Upload
        </Button>
      </div>

      {/* Main layout: sidebar + content */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-56 shrink-0">
          <ScrollArea className="h-[calc(100vh-160px)]">
            <div className="space-y-1 pr-2">
              {/* Special views */}
              <SidebarItem
                icon={FolderOpen}
                label="All Documents"
                active={activeView === "all"}
                onClick={() => setActiveView("all")}
              />
              <SidebarItem
                icon={Star}
                label="Favorites"
                active={activeView === "favorites"}
                onClick={() => setActiveView("favorites")}
              />
              <SidebarItem
                icon={AlertTriangle}
                label="Expiring Soon"
                active={activeView === "expiring"}
                onClick={() => setActiveView("expiring")}
              />

              <Separator className="my-2" />

              {/* Category list */}
              {categoriesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                categoryTree.map((cat) => {
                  const isActive = activeView === cat.id || cat.children.some(ch => activeView === ch.id);
                  return (
                    <div key={cat.id}>
                      <SidebarItem
                        iconName={cat.icon}
                        label={cat.name}
                        active={activeView === cat.id}
                        onClick={() => setActiveView(cat.id)}
                        color={cat.color ?? undefined}
                      />
                      {/* Show subcategories when parent is active */}
                      {isActive &&
                        cat.children.map((sub) => (
                          <SidebarItem
                            key={sub.id}
                            label={sub.name}
                            active={activeView === sub.id}
                            onClick={() => setActiveView(sub.id)}
                            indent
                          />
                        ))}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {/* Content header */}
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">{getViewTitle()}</h2>
            <div className="relative flex-1 max-w-sm ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Document grid */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-5 pb-4">
                    <Skeleton className="h-10 w-10 rounded-lg mb-3" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !documents || documents.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {activeView === "favorites"
                      ? "No favorite documents yet."
                      : activeView === "expiring"
                        ? "No documents expiring soon."
                        : search
                          ? "No documents match your search."
                          : "No documents in this category."}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload important household documents like insurance,
                    warranties, and tax records.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setUploadOpen(true)}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {documents.map((doc) => {
                const memberName = getMemberName(doc.member_id);

                return (
                  <Card
                    key={doc.id}
                    className="group cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => setPreviewDoc(doc)}
                  >
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-start justify-between mb-3">
                        <DocCardIcon
                          iconName={doc.document_categories?.icon ?? null}
                          color={doc.document_categories?.color ?? null}
                        />
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(e, doc);
                            }}
                          >
                            <Star
                              className={cn(
                                "h-3.5 w-3.5",
                                doc.is_favorite
                                  ? "fill-yellow-400 text-yellow-400"
                                  : ""
                              )}
                            />
                          </Button>
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
                      <p className="text-sm font-medium truncate mb-1">
                        {doc.name}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {formatDate(doc.created_at)}
                        {doc.file_size
                          ? ` · ${(doc.file_size / 1024).toFixed(0)} KB`
                          : ""}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {memberName && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5"
                          >
                            {memberName}
                          </Badge>
                        )}
                        {doc.version > 1 && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5"
                          >
                            v{doc.version}
                          </Badge>
                        )}
                        {doc.document_year && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5"
                          >
                            {doc.document_year}
                          </Badge>
                        )}
                        {doc.is_favorite && (
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        )}
                        {isExpired(doc) && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] h-5"
                          >
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        defaultCategoryId={getUploadDefaultCategory()}
      />

      {/* Preview Panel */}
      <DocumentPreviewPanel
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDelete={handleDelete}
      />
    </div>
  );
}

// Sidebar item component
function SidebarItem({
  icon: Icon,
  iconName,
  label,
  active,
  onClick,
  color,
  indent,
}: {
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconName?: string | null;
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
  indent?: boolean;
}) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
        indent && "pl-7",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      onClick={onClick}
    >
      {iconName != null ? (
        <DocumentCategoryIcon
          iconName={iconName}
          className="h-4 w-4 shrink-0"
          style={color ? { color } : undefined}
        />
      ) : Icon ? (
        <Icon
          className="h-4 w-4 shrink-0"
          style={color ? { color } : undefined}
        />
      ) : null}
      <span className="truncate">{label}</span>
    </button>
  );
}

// Document card icon component
function DocCardIcon({ iconName, color }: { iconName: string | null; color: string | null }) {
  return (
    <div
      className="h-10 w-10 rounded-lg flex items-center justify-center"
      style={{
        backgroundColor: color
          ? `color-mix(in oklch, ${color} 15%, transparent)`
          : undefined,
      }}
    >
      <DocumentCategoryIcon
        iconName={iconName}
        className="h-5 w-5"
        style={{ color: color ?? undefined }}
      />
    </div>
  );
}
