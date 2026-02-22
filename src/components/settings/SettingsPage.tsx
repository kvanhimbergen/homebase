import { useState } from "react";
import {
  Settings,
  Users,
  Tag,
  Plus,
  Trash2,
  LogOut,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useCategories,
  useCategoryTree,
  useCreateCategory,
  useDeleteCategory,
} from "@/hooks/useCategories";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { InviteMemberDialog } from "@/components/household/InviteMemberDialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { CATEGORY_COLORS } from "@/lib/constants";

export function Component() {
  const { user, signOut } = useAuth();
  const { currentHousehold, currentRole, memberships, updateHousehold } = useHousehold();

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">
            <Tag className="h-4 w-4 mr-1" /> Categories
          </TabsTrigger>
          <TabsTrigger value="household">
            <Users className="h-4 w-4 mr-1" /> Household
          </TabsTrigger>
          <TabsTrigger value="profile">
            <Settings className="h-4 w-4 mr-1" /> Profile
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-4">
          <CategoriesSettings />
        </TabsContent>

        {/* Household Tab */}
        <TabsContent value="household" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Household</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Name</Label>
                <p className="text-sm font-medium">
                  {currentHousehold?.name ?? "—"}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">
                  Your Role
                </Label>
                <p className="text-sm font-medium capitalize">
                  {currentRole ?? "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-classify imports</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically categorize transactions using AI after CSV or QFX import
                  </p>
                </div>
                <Switch
                  checked={currentHousehold?.auto_classify_imports ?? false}
                  onCheckedChange={async (checked: boolean) => {
                    try {
                      await updateHousehold.mutateAsync({ auto_classify_imports: checked });
                      toast.success(checked ? "Auto-classify enabled" : "Auto-classify disabled");
                    } catch {
                      toast.error("Failed to update setting");
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Members</CardTitle>
              {(currentRole === "owner" || currentRole === "admin") && (
                <InviteMemberDialog />
              )}
            </CardHeader>
            <CardContent>
              <HouseholdMembers />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <p className="text-sm font-medium">{user?.email ?? "—"}</p>
              </div>
              <Separator />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Households:
                </span>
                <span className="text-sm">{memberships.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button variant="outline" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-1" /> Sign Out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CategoriesSettings() {
  const { data: categories } = useCategories();
  const categoryTree = useCategoryTree();
  const deleteCategory = useDeleteCategory();

  const customCategories = categories?.filter((c) => !c.is_system) ?? [];
  const systemTree = categoryTree.filter((n) => n.parent.is_system);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Custom Categories</CardTitle>
          <AddCategoryDialog />
        </CardHeader>
        <CardContent>
          {customCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No custom categories yet.
            </p>
          ) : (
            <div className="space-y-2">
              {customCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: cat.color ?? "#94a3b8" }}
                    />
                    <span className="text-sm font-medium">{cat.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={async () => {
                      try {
                        await deleteCategory.mutateAsync(cat.id);
                        toast.success("Category deleted");
                      } catch {
                        toast.error(
                          "Cannot delete — category may be in use"
                        );
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {systemTree.map(({ parent, children }) => (
              <div key={parent.id}>
                <div className="flex items-center gap-3 py-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: parent.color ?? "#94a3b8" }}
                  />
                  <span className="text-sm font-medium">{parent.name}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">
                    System
                  </Badge>
                </div>
                {children.filter((c) => c.is_system).map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center gap-3 py-1.5 pl-7"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: child.color ?? "#94a3b8" }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {child.name}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AddCategoryDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [colorIndex, setColorIndex] = useState(0);

  const { currentHouseholdId } = useHousehold();
  const createCategory = useCreateCategory();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !currentHouseholdId) return;

    try {
      await createCategory.mutateAsync({
        household_id: currentHouseholdId,
        name,
        color: CATEGORY_COLORS[colorIndex],
        is_system: false,
      });
      toast.success("Category created");
      setOpen(false);
      setName("");
    } catch {
      toast.error("Failed to create category");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pet Expenses"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((color, i) => (
                <button
                  key={i}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    colorIndex === i
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setColorIndex(i)}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createCategory.isPending}>
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HouseholdMembers() {
  const { currentHouseholdId } = useHousehold();
  const [members, setMembers] = useState<
    { id: string; user_id: string; role: string; email?: string }[]
  >([]);
  const [loaded, setLoaded] = useState(false);

  if (!loaded && currentHouseholdId) {
    supabase
      .from("household_members")
      .select("id, user_id, role")
      .eq("household_id", currentHouseholdId)
      .then(({ data }) => {
        setMembers(
          (data ?? []).map((m) => ({
            ...m,
            email: undefined,
          }))
        );
        setLoaded(true);
      });
  }

  return (
    <div className="space-y-2">
      {members.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between py-2"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {m.user_id.slice(0, 8)}...
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {m.role}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs capitalize">
            {m.role}
          </Badge>
        </div>
      ))}
    </div>
  );
}
