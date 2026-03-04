import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

export type UserProfile = Tables<"user_profiles">;

export function useUserProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userId = user?.id ?? "anon";

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        // Profile might not exist yet if trigger hasn't fired
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return data;
    },
    // Always enabled — queryFn returns null when user is absent.
    // Using `enabled: !!user` causes React Query v5 to change its
    // internal hook count when the flag flips, which breaks React's
    // rules-of-hooks for any downstream hooks in the same component.
    staleTime: 2 * 60 * 1000, // 2 min
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["user-profile", userId] });
  };

  return {
    profile: profile ?? null,
    isLoading,
    isAuthenticated: !!user,
    invalidate,
  } as const;
}
