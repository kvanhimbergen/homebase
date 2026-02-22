import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useHousehold } from "./useHousehold";

export interface HouseholdMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function useHouseholdMembers() {
  const { currentHouseholdId } = useHousehold();

  return useQuery({
    queryKey: ["household-members", currentHouseholdId],
    queryFn: async () => {
      const { data: members, error: membersError } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", currentHouseholdId!);

      if (membersError) throw membersError;

      const userIds = members.map((m) => m.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      return profiles.map((p) => ({
        user_id: p.id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      })) as HouseholdMember[];
    },
    enabled: !!currentHouseholdId,
  });
}
