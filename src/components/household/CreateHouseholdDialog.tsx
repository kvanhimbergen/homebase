import { useState } from "react";
import { useHousehold } from "@/hooks/useHousehold";
import { seedDefaultCategories } from "@/services/household";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function CreateHouseholdDialog() {
  const [name, setName] = useState("");
  const { createHousehold } = useHousehold();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    createHousehold.mutate(name.trim(), {
      onSuccess: async (household) => {
        try {
          await seedDefaultCategories(household.id);
        } catch {
          // Categories can be added later
        }
        toast.success("Household created!");
      },
      onError: (error) => {
        toast.error(`Failed to create household: ${error.message}`);
      },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to HomeBase</CardTitle>
          <CardDescription>
            Create your household to get started tracking your finances.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="household-name">Household Name</Label>
              <Input
                id="household-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Smith Family"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={createHousehold.isPending}
            >
              {createHousehold.isPending
                ? "Creating..."
                : "Create Household"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
