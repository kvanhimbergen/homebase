import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";
import { useAuth } from "./useAuth";

export function useHousehold() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const membershipsQuery = useQuery({
    queryKey: ["household-memberships", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("household_members")
        .select("*, households(*)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as (Tables<"household_members"> & {
        households: Tables<"households">;
      })[];
    },
    enabled: !!user,
  });

  const profileQuery = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const currentHouseholdId =
    profileQuery.data?.default_household_id ??
    membershipsQuery.data?.[0]?.household_id;

  const currentHousehold = membershipsQuery.data?.find(
    (m) => m.household_id === currentHouseholdId
  )?.households;

  const currentRole = membershipsQuery.data?.find(
    (m) => m.household_id === currentHouseholdId
  )?.role;

  const createHousehold = useMutation({
    mutationFn: async (name: string) => {
      const { data: household, error: hError } = await supabase
        .from("households")
        .insert({ name, owner_id: user!.id })
        .select()
        .single();
      if (hError) throw hError;

      const { error: mError } = await supabase
        .from("household_members")
        .insert({
          household_id: household.id,
          user_id: user!.id,
          role: "owner",
        });
      if (mError) throw mError;

      await supabase
        .from("user_profiles")
        .update({ default_household_id: household.id })
        .eq("id", user!.id);

      return household;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });

  const switchHousehold = useMutation({
    mutationFn: async (householdId: string) => {
      const { error } = await supabase
        .from("user_profiles")
        .update({ default_household_id: householdId })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });

  return {
    memberships: membershipsQuery.data ?? [],
    currentHousehold,
    currentHouseholdId,
    currentRole,
    loading: membershipsQuery.isLoading || profileQuery.isLoading,
    hasHousehold: (membershipsQuery.data?.length ?? 0) > 0,
    createHousehold,
    switchHousehold,
  };
}
