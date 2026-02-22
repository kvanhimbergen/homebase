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
  const parents = [
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
    { name: "Kids & Family", icon: "baby", color: "var(--color-category-14)" },
    { name: "Pets", icon: "paw-print", color: "var(--color-category-15)" },
    { name: "Travel", icon: "plane", color: "var(--color-category-16)" },
    { name: "Gifts & Donations", icon: "gift", color: "var(--color-category-17)" },
    { name: "Taxes & Fees", icon: "receipt", color: "var(--color-category-18)" },
    { name: "Subscriptions", icon: "repeat", color: "var(--color-category-19)" },
  ];

  const { data: inserted, error: parentError } = await supabase
    .from("categories")
    .insert(
      parents.map((c) => ({
        household_id: householdId,
        ...c,
        is_system: true,
      }))
    )
    .select("id, name, color");

  if (parentError) throw parentError;
  if (!inserted) return;

  const parentMap = new Map(inserted.map((p) => [p.name, p]));

  const subcategoryMap: Record<string, string[]> = {
    "Housing": ["Mortgage/Rent", "Property Tax", "HOA/Condo Fees", "Home Maintenance", "Home Improvement"],
    "Food & Dining": ["Groceries", "Restaurants", "Coffee Shops", "Fast Food", "Alcohol & Bars"],
    "Transportation": ["Gas/Fuel", "Car Payment", "Parking", "Public Transit", "Ride Share", "Car Maintenance"],
    "Shopping": ["Clothing", "Electronics", "Home Goods", "Gifts", "Online Shopping"],
    "Entertainment": ["Streaming Services", "Movies & Events", "Hobbies", "Books", "Games"],
    "Health": ["Doctor/Dentist", "Pharmacy", "Vision/Optical", "Gym/Fitness", "Mental Health"],
    "Utilities": ["Electric", "Gas/Heat", "Water/Sewer", "Internet", "Phone", "Trash/Recycling"],
    "Insurance": ["Health Insurance", "Life Insurance", "Home/Renters Insurance", "Auto Insurance"],
    "Education": ["Tuition", "Student Loans", "Books & Supplies", "Courses/Training"],
    "Personal Care": ["Haircuts/Salon", "Spa/Massage", "Cosmetics/Toiletries"],
    "Income": ["Salary/Wages", "Freelance/Side Hustle", "Interest/Dividends", "Refunds", "Gifts Received"],
    "Savings & Investments": ["401k/IRA", "Brokerage", "Emergency Fund", "Crypto"],
    "Kids & Family": ["Childcare/Daycare", "Activities", "School Supplies", "Allowance", "Baby Supplies"],
    "Pets": ["Vet", "Food & Supplies", "Grooming"],
    "Travel": ["Flights", "Hotels", "Rental Cars", "Vacation Activities"],
    "Gifts & Donations": ["Charitable Giving", "Gifts Given", "Tithing"],
    "Taxes & Fees": ["Federal Tax", "State Tax", "Bank Fees", "ATM Fees", "Late Fees"],
    "Subscriptions": ["Software", "Memberships", "Newspapers/Magazines"],
  };

  const subcategoryRows = Object.entries(subcategoryMap).flatMap(
    ([parentName, children]) => {
      const parent = parentMap.get(parentName);
      if (!parent) return [];
      return children.map((name) => ({
        household_id: householdId,
        name,
        color: parent.color,
        parent_id: parent.id,
        is_system: true,
      }));
    }
  );

  if (subcategoryRows.length > 0) {
    const { error: subError } = await supabase
      .from("categories")
      .insert(subcategoryRows);
    if (subError) throw subError;
  }
}
