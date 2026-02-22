import { supabase } from "@/lib/supabase";
import { addDays } from "date-fns";

export async function inviteHouseholdMember(
  householdId: string,
  email: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("invitations").insert({
    household_id: householdId,
    email,
    invited_by: user.id,
    expires_at: addDays(new Date(), 7).toISOString(),
  });

  if (error) throw error;
}

export async function acceptInvitation(token: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: invitation, error: fetchError } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (fetchError || !invitation) throw new Error("Invalid or expired invitation");

  if (new Date(invitation.expires_at) < new Date()) {
    await supabase
      .from("invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id);
    throw new Error("This invitation has expired");
  }

  const { error: memberError } = await supabase
    .from("household_members")
    .insert({
      household_id: invitation.household_id,
      user_id: user.id,
      role: "member",
    });

  if (memberError) throw memberError;

  await supabase
    .from("invitations")
    .update({ status: "accepted" })
    .eq("id", invitation.id);

  await supabase
    .from("user_profiles")
    .update({ default_household_id: invitation.household_id })
    .eq("id", user.id);
}

export async function seedDefaultCategories(householdId: string) {
  const defaults = [
    { name: "Housing", icon: "home", color: "var(--color-category-1)" },
    { name: "Food & Dining", icon: "utensils", color: "var(--color-category-2)" },
    { name: "Transportation", icon: "car", color: "var(--color-category-3)" },
    { name: "Shopping", icon: "shopping-bag", color: "var(--color-category-4)" },
    { name: "Entertainment", icon: "tv", color: "var(--color-category-5)" },
    { name: "Health", icon: "heart-pulse", color: "var(--color-category-6)" },
    { name: "Utilities", icon: "zap", color: "var(--color-category-7)" },
    { name: "Insurance", icon: "shield", color: "var(--color-category-8)" },
    { name: "Education", icon: "graduation-cap", color: "var(--color-category-9)" },
    { name: "Personal Care", icon: "scissors", color: "var(--color-category-10)" },
    { name: "Income", icon: "wallet", color: "var(--color-category-11)" },
    { name: "Savings & Investments", icon: "trending-up", color: "var(--color-category-12)" },
    { name: "Transfer", icon: "arrow-left-right", color: "var(--color-category-13)" },
  ];

  const { error } = await supabase.from("categories").insert(
    defaults.map((c) => ({
      household_id: householdId,
      ...c,
      is_system: true,
    }))
  );

  if (error) throw error;
}
