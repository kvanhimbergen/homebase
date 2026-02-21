import { useState } from "react";
import { useHousehold } from "@/hooks/useHousehold";
import { inviteHouseholdMember } from "@/services/household";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";

export function InviteMemberDialog() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [open, setOpen] = useState(false);
  const { currentHouseholdId } = useHousehold();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentHouseholdId || !email.trim()) return;
    setError("");
    setLoading(true);
    try {
      await inviteHouseholdMember(currentHouseholdId, email.trim());
      setSuccess(true);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setSuccess(false);
          setError("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a Household Member</DialogTitle>
          <DialogDescription>
            Send an email invitation to join your household.
          </DialogDescription>
        </DialogHeader>
        {success ? (
          <p className="text-sm text-income">Invitation sent to {email || "member"}!</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="member@example.com"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
